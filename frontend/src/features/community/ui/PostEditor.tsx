import { FileText, ImageIcon, PenLine, Paperclip, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useCreatePostMutation, useUpdatePostMutation, useDeleteAttachmentMutation } from '../api/queries';
import { uploadAttachment, uploadInlineImage } from '../api/service';

import type { AttachmentDTO } from '../api/dto';

import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { getUploadUrl } from '@/shared/lib/avatar';

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

const WRITABLE_CATEGORIES: Category[] = ['공지', '자유게시판'];

const CATEGORY_STYLE: Record<Category, string> = {
  공지: 'border-red-300 bg-red-50 text-red-700',
  자유게시판: 'border-purple-300 bg-purple-50 text-purple-700',
};

// 문서 파일만 첨부파일 영역에서 허용 (이미지는 인라인으로)
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;

interface PendingFile {
  file: File;
  id: string;
}

interface InlineImage {
  id: string;
  url: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 본문에서 인라인 이미지 URL 추출 + 텍스트 분리 (수정 진입 시)
const _EDIT_IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
function parseContentForEdit(content: string): { text: string; imageUrls: string[] } {
  const imageUrls: string[] = [];
  let match: RegExpExecArray | null;
  _EDIT_IMG_RE.lastIndex = 0;
  while ((match = _EDIT_IMG_RE.exec(content)) !== null) {
    imageUrls.push(match[2]);
  }
  const text = content
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { text, imageUrls };
}

// 텍스트 + 인라인 이미지 → 저장될 최종 content 조합
function buildContent(text: string, images: InlineImage[]): string {
  const textPart = text.trim();
  const imagePart = images.map((img) => `![이미지](${img.url})`).join('\n');
  if (!textPart && !imagePart) return '';
  if (!textPart) return imagePart;
  if (!imagePart) return textPart;
  return `${textPart}\n\n${imagePart}`;
}

export function PostEditor({ open, onClose, editTarget, fixedCategory }: PostEditorProps) {
  const isEdit = !!editTarget;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');           // 텍스트 전용
  const [category, setCategory] = useState<Category>(fixedCategory ?? '자유게시판');
  const [inlineImages, setInlineImages] = useState<InlineImage[]>([]);   // 인라인 이미지
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);   // 문서 첨부
  const [existingAttachments, setExistingAttachments] = useState<AttachmentDTO[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutateAsync: createPost, isPending: isCreating } = useCreatePostMutation();
  const { mutateAsync: updatePost, isPending: isUpdating } = useUpdatePostMutation();
  const deleteAttachmentMutation = useDeleteAttachmentMutation(editTarget?.id ?? 0);

  const isPending = isCreating || isUpdating || isUploading;

  // 열릴 때마다 상태 초기화
  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      setTitle(editTarget.title);
      const { text, imageUrls } = parseContentForEdit(editTarget.content);
      setContent(text);
      setInlineImages(imageUrls.map((url) => ({ id: `${Date.now()}-${Math.random()}`, url })));
      setExistingAttachments(editTarget.attachments?.filter((a) => !a.is_image) ?? []);
    } else {
      setTitle('');
      setContent('');
      setCategory(fixedCategory ?? '자유게시판');
      setInlineImages([]);
      setExistingAttachments([]);
    }
    setPendingFiles([]);
  }, [editTarget, fixedCategory, open]);

  // ── 인라인 이미지 업로드 ──────────────────────────────────────────────────
  const addInlineImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 삽입할 수 있습니다.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('이미지 크기는 10MB 이하만 가능합니다.');
      return;
    }
    setIsUploading(true);
    try {
      const { url } = await uploadInlineImage(file);
      setInlineImages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, url }]);
      toast.success('이미지가 추가되었습니다.');
    } catch {
      toast.error('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeInlineImage = (id: string) => {
    setInlineImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Ctrl+V 붙여넣기
  const handleContentPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(e.clipboardData.items).find((item) =>
      item.type.startsWith('image/'),
    );
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) await addInlineImage(file);
  };

  // textarea 드래그&드롭 (이미지만)
  const handleTextareaDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    const imageFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (imageFiles.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    for (const file of imageFiles) await addInlineImage(file);
  };

  // 이미지 삽입 버튼
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await addInlineImage(file);
  };

  // ── 문서 첨부 ────────────────────────────────────────────────────────────
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const total = pendingFiles.length + existingAttachments.length + files.length;
    if (total > MAX_FILES) {
      toast.error(`첨부파일은 최대 ${MAX_FILES}개까지 가능합니다.`);
      return;
    }
    const newFiles: PendingFile[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED_DOC_TYPES.includes(file.type)) {
        toast.error(`${file.name}: 허용되지 않는 파일 형식입니다.`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`${file.name}: 파일 크기는 10MB 이하만 가능합니다.`);
        continue;
      }
      newFiles.push({ file, id: `${Date.now()}-${Math.random()}` });
    }
    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  const removeExistingAttachment = async (attachmentId: number) => {
    try {
      await deleteAttachmentMutation.mutateAsync(attachmentId);
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch {
      toast.error('첨부파일 삭제에 실패했습니다.');
    }
  };

  // ── 제출 ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('제목을 입력해주세요.'); return; }
    const finalContent = buildContent(content, inlineImages);
    if (!finalContent) { toast.error('내용 또는 이미지를 입력해주세요.'); return; }

    try {
      let postId: number;
      if (isEdit && editTarget) {
        const updated = await updatePost({ id: editTarget.id, data: { title, content: finalContent } });
        postId = updated.id;
        toast.success('게시글이 수정되었습니다.');
      } else {
        const created = await createPost({ title, content: finalContent, category });
        postId = created.id;
        toast.success('게시글이 등록되었습니다.');
      }

      if (pendingFiles.length > 0) {
        setIsUploading(true);
        try {
          for (const { file } of pendingFiles) await uploadAttachment(postId, file);
        } catch {
          toast.error('일부 파일 업로드에 실패했습니다.');
        } finally {
          setIsUploading(false);
        }
      }

      onClose();
    } catch {
      toast.error(isEdit ? '수정에 실패했습니다.' : '등록에 실패했습니다.');
    }
  };

  const totalAttachments = pendingFiles.length + existingAttachments.length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-2xl w-full p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* 헤더 */}
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <PenLine className="size-4 text-mega-secondary" />
            {isEdit ? '게시글 수정' : '새 게시글 작성'}
          </DialogTitle>
        </DialogHeader>

        {/* 본문 */}
        <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          {/* 카테고리 */}
          {!fixedCategory && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">게시판</label>
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
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">제목</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={100}
              className="h-11 text-sm font-medium"
            />
          </div>

          {/* 내용 텍스트 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">내용</label>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isPending}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-mega-secondary hover:bg-mega-secondary/5 rounded-lg transition-all border border-gray-200 hover:border-mega-secondary/30 disabled:opacity-40"
              >
                <ImageIcon className="size-3.5" />
                이미지 추가
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => { void handleImageSelect(e); }}
              />
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={(e) => { void handleContentPaste(e); }}
                onDrop={(e) => { void handleTextareaDrop(e); }}
                onDragOver={(e) => {
                  if (Array.from(e.dataTransfer.types).includes('Files')) e.preventDefault();
                }}
                placeholder={'내용을 입력하세요\n📷 이미지: Ctrl+V 붙여넣기 또는 드래그하여 추가'}
                rows={7}
                disabled={isUploading}
                className={`w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm leading-relaxed placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mega-secondary/30 focus:border-mega-secondary/50 transition-all ${
                  isUploading ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
                  <div className="flex items-center gap-2 text-xs text-mega-secondary font-medium">
                    <span className="w-3.5 h-3.5 border-2 border-mega-secondary/30 border-t-mega-secondary rounded-full animate-spin" />
                    이미지 업로드 중...
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end text-[11px] text-gray-400">{content.length}자</div>
          </div>

          {/* 인라인 이미지 썸네일 그리드 */}
          {inlineImages.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <ImageIcon className="size-3" />
                첨부 이미지 ({inlineImages.length})
              </label>
              <div className="grid grid-cols-3 gap-2">
                {inlineImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
                  >
                    <img
                      src={getUploadUrl(img.url)}
                      alt="첨부 이미지"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeInlineImage(img.id)}
                      className="absolute top-1 right-1 p-1 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                {/* 추가 버튼 */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isPending}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-mega-secondary/50 hover:text-mega-secondary hover:bg-mega-secondary/5 transition-all disabled:opacity-40"
                >
                  <ImageIcon className="size-5" />
                  <span className="text-[10px] font-medium">이미지 추가</span>
                </button>
              </div>
            </div>
          )}

          {/* 파일 첨부 (문서) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <Paperclip className="size-3" />
              파일 첨부
              <span className="text-gray-400 font-normal">({totalAttachments}/{MAX_FILES}) · PDF, Excel, Word</span>
            </label>
            {totalAttachments < MAX_FILES && (
              <div
                onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-mega-secondary/50 hover:bg-mega-secondary/5 transition-all"
              >
                <Paperclip className="size-5 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500">클릭하거나 파일을 여기에 드래그하세요</p>
                <p className="text-[11px] text-gray-400 mt-0.5">pdf, xlsx, docx · 최대 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.docx,.doc"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>
            )}
            {existingAttachments.map((att) => (
              <div key={att.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-50 rounded-lg flex-shrink-0">
                  <FileText className="size-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{att.original_filename}</p>
                  <p className="text-[11px] text-gray-400">{formatBytes(att.file_size)}</p>
                </div>
                <button type="button" onClick={() => void removeExistingAttachment(att.id)} className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <X className="size-4" />
                </button>
              </div>
            ))}
            {pendingFiles.map((pf) => (
              <div key={pf.id} className="flex items-center gap-3 p-2.5 bg-blue-50/60 rounded-xl border border-blue-100">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-lg flex-shrink-0">
                  <FileText className="size-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{pf.file.name}</p>
                  <p className="text-[11px] text-gray-400">{formatBytes(pf.file.size)} · 업로드 예정</p>
                </div>
                <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((f) => f.id !== pf.id))} className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>

          {/* 안내 */}
          <div className="text-[11px] text-gray-400 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">
            게시글 작성 시 실명이 공개됩니다. 댓글에서 @username 으로 동료를 태그할 수 있습니다.
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="rounded-xl">취소</Button>
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
            ) : isEdit ? '수정 완료' : '등록'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
