import { FileText, ImageIcon, PenLine, Paperclip, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useCreatePostMutation, useUpdatePostMutation, useDeleteAttachmentMutation } from '../api/queries';
import { uploadAttachment } from '../api/service';

import type { AttachmentDTO } from '../api/dto';

import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';

type Category = '공지' | '자유게시판';

interface PostEditorProps {
  open: boolean;
  onClose: () => void;
  editTarget?: {
    id: number;
    title: string;
    content: string;
    category: Category;
    attachments?: AttachmentDTO[];
  };
  fixedCategory?: Category;
}

// 직접 작성 가능한 카테고리만 (근무교대/휴무신청은 시스템 자동생성)
const WRITABLE_CATEGORIES: Category[] = ['공지', '자유게시판'];

const CATEGORY_STYLE: Record<Category, string> = {
  공지: 'border-red-300 bg-red-50 text-red-700',
  자유게시판: 'border-purple-300 bg-purple-50 text-purple-700',
};

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

interface PendingFile {
  file: File;
  preview?: string; // 이미지 미리보기 URL
  id: string;       // 임시 식별자
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PostEditor({ open, onClose, editTarget, fixedCategory }: PostEditorProps) {
  const isEdit = !!editTarget;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>(fixedCategory ?? '자유게시판');

  // 새로 추가할 파일 (아직 업로드 안 된 것)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  // 수정 시 기존 첨부파일 (서버에 있는 것)
  const [existingAttachments, setExistingAttachments] = useState<AttachmentDTO[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: createPost, isPending: isCreating } = useCreatePostMutation();
  const { mutateAsync: updatePost, isPending: isUpdating } = useUpdatePostMutation();
  const deleteAttachmentMutation = useDeleteAttachmentMutation(editTarget?.id ?? 0);

  const [isUploading, setIsUploading] = useState(false);
  const isPending = isCreating || isUpdating || isUploading;

  useEffect(() => {
    if (editTarget) {
      setTitle(editTarget.title);
      setContent(editTarget.content);
      setCategory(editTarget.category);
      setExistingAttachments(editTarget.attachments ?? []);
    } else {
      setTitle('');
      setContent('');
      setCategory(fixedCategory ?? '자유게시판');
      setExistingAttachments([]);
    }
    setPendingFiles([]);
  }, [editTarget, fixedCategory, open]);

  // 파일 선택 처리
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const total = pendingFiles.length + existingAttachments.length + files.length;
    if (total > MAX_FILES) {
      toast.error(`첨부파일은 최대 ${MAX_FILES}개까지 가능합니다.`);
      return;
    }

    const newFiles: PendingFile[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: 허용되지 않는 파일 형식입니다.`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`${file.name}: 파일 크기는 10MB 이하만 가능합니다.`);
        continue;
      }

      const id = `${Date.now()}-${Math.random()}`;
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      newFiles.push({ file, preview, id });
    }

    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  // 드래그 앤 드롭
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  // 새 파일 제거 (업로드 전)
  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  // 기존 첨부파일 삭제 (서버에서)
  const removeExistingAttachment = async (attachmentId: number) => {
    try {
      await deleteAttachmentMutation.mutateAsync(attachmentId);
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch {
      toast.error('첨부파일 삭제에 실패했습니다.');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      toast.error('내용을 입력해주세요.');
      return;
    }

    try {
      let postId: number;

      if (isEdit && editTarget) {
        const updated = await updatePost({ id: editTarget.id, data: { title, content } });
        postId = updated.id;
        toast.success('게시글이 수정되었습니다.');
      } else {
        const created = await createPost({ title, content, category });
        postId = created.id;
        toast.success('게시글이 등록되었습니다.');
      }

      // 첨부파일 업로드
      if (pendingFiles.length > 0) {
        setIsUploading(true);
        try {
          for (const { file } of pendingFiles) {
            await uploadAttachment(postId, file);
          }
        } catch {
          toast.error('일부 파일 업로드에 실패했습니다.');
        } finally {
          setIsUploading(false);
        }
      }

      // 미리보기 URL 해제
      pendingFiles.forEach(({ preview }) => preview && URL.revokeObjectURL(preview));

      onClose();
    } catch {
      toast.error(isEdit ? '수정에 실패했습니다.' : '등록에 실패했습니다.');
    }
  };

  const totalAttachments = pendingFiles.length + existingAttachments.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden" showCloseButton={false}>
        {/* 헤더 */}
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <PenLine className="size-4 text-mega-secondary" />
            {isEdit ? '게시글 수정' : '새 게시글 작성'}
          </DialogTitle>
        </DialogHeader>

        {/* 본문 */}
        <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          {/* 카테고리 선택 (고정이 아닐 때만) */}
          {!fixedCategory && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                게시판
              </label>
              <div className="flex flex-wrap gap-2">
                {WRITABLE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                      category === cat
                        ? CATEGORY_STYLE[cat]
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 제목 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              제목
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={100}
              className="h-11 text-sm font-medium"
            />
          </div>

          {/* 내용 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={8}
              className="w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm leading-relaxed placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mega-secondary/30 focus:border-mega-secondary/50 transition-all"
            />
            <div className="text-right text-[11px] text-gray-400">{content.length}자</div>
          </div>

          {/* 첨부파일 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <Paperclip className="size-3" />
              첨부파일
              <span className="text-gray-400 font-normal">({totalAttachments}/{MAX_FILES})</span>
            </label>

            {/* 드래그 앤 드롭 영역 */}
            {totalAttachments < MAX_FILES && (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-mega-secondary/50 hover:bg-mega-secondary/5 transition-all"
              >
                <Paperclip className="size-5 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500">
                  클릭하거나 파일을 여기에 드래그하세요
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  jpg, png, webp, gif, pdf, xlsx, docx · 최대 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.xlsx,.xls,.docx,.doc"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>
            )}

            {/* 기존 첨부파일 목록 (수정 시) */}
            {existingAttachments.length > 0 && (
              <div className="flex flex-col gap-2">
                {existingAttachments.map((att) => (
                  <ExistingAttachmentItem
                    key={att.id}
                    attachment={att}
                    onRemove={() => void removeExistingAttachment(att.id)}
                  />
                ))}
              </div>
            )}

            {/* 새로 추가한 파일 목록 */}
            {pendingFiles.length > 0 && (
              <div className="flex flex-col gap-2">
                {pendingFiles.map((pf) => (
                  <PendingFileItem
                    key={pf.id}
                    pendingFile={pf}
                    onRemove={() => removePendingFile(pf.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 안내 */}
          <div className="text-[11px] text-gray-400 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">
            게시글 작성 시 실명이 공개됩니다. 댓글에서 @username 으로 동료를 태그할 수 있습니다.
          </div>
        </div>

        {/* 푸터 버튼 */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="rounded-xl">
            취소
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isPending}
            className="bg-mega hover:bg-nav-bg text-white rounded-xl min-w-[72px]"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {isUploading ? '업로드 중' : '처리 중'}
              </span>
            ) : isEdit ? (
              '수정 완료'
            ) : (
              '등록'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── 기존 첨부파일 아이템 ──────────────────────────────────────────────────
function ExistingAttachmentItem({
  attachment,
  onRemove,
}: {
  attachment: AttachmentDTO;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
      {attachment.is_image ? (
        <img
          src={attachment.url}
          alt={attachment.original_filename}
          className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-blue-50 rounded-lg flex-shrink-0">
          <FileText className="size-5 text-blue-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate">{attachment.original_filename}</p>
        <p className="text-[11px] text-gray-400">{formatBytes(attachment.file_size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

// ── 새로 추가한 파일 아이템 ───────────────────────────────────────────────
function PendingFileItem({
  pendingFile,
  onRemove,
}: {
  pendingFile: PendingFile;
  onRemove: () => void;
}) {
  const isImage = pendingFile.file.type.startsWith('image/');

  return (
    <div className="flex items-center gap-3 p-2.5 bg-blue-50/60 rounded-xl border border-blue-100">
      {isImage && pendingFile.preview ? (
        <img
          src={pendingFile.preview}
          alt={pendingFile.file.name}
          className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
        />
      ) : isImage ? (
        <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-lg flex-shrink-0">
          <ImageIcon className="size-5 text-blue-400" />
        </div>
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-lg flex-shrink-0">
          <FileText className="size-5 text-blue-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate">{pendingFile.file.name}</p>
        <p className="text-[11px] text-gray-400">{formatBytes(pendingFile.file.size)} · 업로드 예정</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
