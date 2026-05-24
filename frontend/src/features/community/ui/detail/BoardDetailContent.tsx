import { Download, FileText, X, ZoomIn } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useDeletePostMutation } from '../../api/queries';
import { formatRelativeTime } from '../../model/formatData';
import CommentSection from '../comment/CommentSection';

import type { AttachmentDTO, CommunityPostDTO } from '../../api/dto';

import { useUserQuery } from '@/entities/user/api/queries';

interface BoardDetailContentProps {
  post: CommunityPostDTO;
  icon?: React.ReactNode;
  title?: string;
  onEdit?: (post: CommunityPostDTO) => void;
  onClose?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BoardDetailContent({
  post,
  icon,
  title,
  onClose,
  onEdit,
}: BoardDetailContentProps) {
  const { data: user } = useUserQuery();
  const deleteMutation = useDeletePostMutation();

  // 이미지 확대 뷰어
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!user) return <div>로그인이 필요합니다.</div>;

  const isMine = post.author_id === user.id;
  const formattedDate = formatRelativeTime(post.created_at);

  const attachments = post.attachments ?? [];
  const imageAttachments = attachments.filter((a) => a.is_image);
  const fileAttachments = attachments.filter((a) => !a.is_image);

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deleteMutation.mutateAsync(post.id);
      toast.success('삭제되었습니다.');
      onClose?.();
    } catch {
      toast.error('삭제가 실패되었습니다.');
    }
  };

  return (
    <>
      <div className="flex flex-col">
        <div className="bg-gradient-to-r from-mega to-mega/90 text-white px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm font-medium">
              {icon}
              {title}
            </div>

            <button onClick={onClose} className="text-2xl text-white/80 hover:text-white">
              ×
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-lg font-bold">{post.title}</div>
              <div className="text-xs text-gray-500">
                {post.author_name} · {formattedDate}
                {post.updated_at !== post.created_at ? ' · (수정됨)' : ''}
              </div>
            </div>

            {isMine && (
              <div className="flex gap-2 opacity-70">
                <button
                  onClick={() => onEdit?.(post)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  수정
                </button>
                <span>|</span>
                <button
                  onClick={() => {
                    void handleDelete();
                  }}
                  className="text-sm text-red-600 hover:underline"
                >
                  삭제
                </button>
              </div>
            )}
          </div>

          {/* 본문 */}
          <div className="whitespace-pre-line leading-7 text-sm text-gray-600">{post.content}</div>

          {/* 이미지 첨부파일 */}
          {imageAttachments.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                이미지 ({imageAttachments.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {imageAttachments.map((att) => (
                  <ImageThumbnail
                    key={att.id}
                    attachment={att}
                    onClick={() => setLightboxUrl(att.url)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 일반 파일 첨부파일 */}
          {fileAttachments.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                첨부파일 ({fileAttachments.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {fileAttachments.map((att) => (
                  <FileAttachmentItem key={att.id} attachment={att} />
                ))}
              </div>
            </div>
          )}
        </div>

        <CommentSection postId={post.id} currentUserId={user.id} />
      </div>

      {/* 이미지 라이트박스 */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="size-8" />
          </button>
          <img
            src={lightboxUrl}
            alt="첨부 이미지"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ── 이미지 썸네일 ─────────────────────────────────────────────────────────
function ImageThumbnail({
  attachment,
  onClick,
}: {
  attachment: AttachmentDTO;
  onClick: () => void;
}) {
  return (
    <div
      className="relative group rounded-xl overflow-hidden border border-gray-100 aspect-square cursor-pointer"
      onClick={onClick}
    >
      <img
        src={attachment.url}
        alt={attachment.original_filename}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
        <ZoomIn className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

// ── 일반 파일 아이템 ──────────────────────────────────────────────────────
function FileAttachmentItem({ attachment }: { attachment: AttachmentDTO }) {
  return (
    <a
      href={attachment.url}
      download={attachment.original_filename}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all group"
    >
      <div className="w-9 h-9 flex items-center justify-center bg-blue-100 rounded-lg flex-shrink-0">
        <FileText className="size-4 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate group-hover:text-blue-700 transition-colors">
          {attachment.original_filename}
        </p>
        <p className="text-[11px] text-gray-400">{formatBytes(attachment.file_size)}</p>
      </div>
      <Download className="size-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
    </a>
  );
}
