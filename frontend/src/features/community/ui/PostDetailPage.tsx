import { ArrowLeft, Download, FileText, MoreHorizontal, Pencil, Trash2, Pin, ZoomIn, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

// ── 인라인 이미지 렌더러 ─────────────────────────────────────────────────
const _IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

type _ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; alt: string; url: string };

function _parseContent(content: string): _ContentPart[] {
  const parts: _ContentPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  _IMAGE_RE.lastIndex = 0;
  while ((match = _IMAGE_RE.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'image', alt: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.slice(lastIndex) });
  }
  return parts.length > 0 ? parts : [{ type: 'text', text: content }];
}

function _InlineImage({ alt, url, onOpen }: { alt: string; url: string; onOpen: (u: string) => void }) {
  return (
    <span className="block my-2">
      <img
        src={url}
        alt={alt || '이미지'}
        className="max-w-full rounded-xl cursor-zoom-in hover:opacity-95 transition-opacity border border-gray-100 shadow-sm"
        onClick={() => onOpen(url)}
      />
    </span>
  );
}

function ContentRenderer({ content, onOpenLightbox }: { content: string; onOpenLightbox: (url: string) => void }) {
  const parts = _parseContent(content);
  return (
    <div className="text-sm text-gray-700 leading-relaxed break-words">
      {parts.map((part, i) =>
        part.type === 'image' ? (
          <_InlineImage key={i} alt={part.alt} url={part.url} onOpen={onOpenLightbox} />
        ) : (
          <span key={i} className="whitespace-pre-wrap">
            {part.text}
          </span>
        ),
      )}
    </div>
  );
}

import { useCommunityPostDetailQuery, useDeletePostMutation } from '../api/queries';
import { formatRelativeTime } from '../model/formatData';

import CommentSection from './comment/CommentSection';
import { LikeButton } from './LikeButton';
import { PostEditor } from './PostEditor';

import { useUserQuery } from '@/entities/user/api/queries';
import { hasAdminAccess, ROLE_STYLES } from '@/entities/user/model/role';
import { Button } from '@/shared/components/ui/button';
import { getProfileImageUrl } from '@/shared/lib/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Category = '공지' | '자유게시판' | '근무교대' | '휴무신청';
type WritableCategory = '공지' | '자유게시판';

const CATEGORY_CONFIG: Record<Category, { label: string; border: string; badge: string }> = {
  공지: {
    label: '공지',
    border: 'border-l-red-400',
    badge: 'bg-red-50 text-red-600 border-red-200',
  },
  자유게시판: {
    label: '자유게시판',
    border: 'border-l-mega-secondary',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  근무교대: {
    label: '근무교대',
    border: 'border-l-green-400',
    badge: 'bg-green-50 text-green-700 border-green-200',
  },
  휴무신청: {
    label: '휴무신청',
    border: 'border-l-sky-400',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
  },
};

interface PostDetailPageProps {
  postId: number;
  canWrite?: boolean;
  fixedCategory?: Category;
}

export function PostDetailPage({ postId, canWrite = true, fixedCategory }: PostDetailPageProps) {
  const navigate = useNavigate();
  const [editorOpen, setEditorOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { data: user } = useUserQuery();
  const { data: post, isLoading } = useCommunityPostDetailQuery(postId);
  const deleteMutation = useDeletePostMutation();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 w-1/3 bg-gray-100 rounded-xl" />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
          <div className="h-7 w-2/3 bg-gray-100 rounded" />
          <div className="h-4 w-1/4 bg-gray-100 rounded" />
          <div className="space-y-2 mt-4">
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-3/4 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-gray-500 text-sm">존재하지 않는 게시글입니다.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void navigate(-1)}
          className="rounded-xl"
        >
          목록으로
        </Button>
      </div>
    );
  }

  const isMine = !!user && post.author_id === user.id;
  const isAdmin = !!user && hasAdminAccess(user.position);
  const profileImageUrl = getProfileImageUrl(post.author_profile_image);
  const canDelete = isMine || isAdmin;
  const config = CATEGORY_CONFIG[post.category] ?? CATEGORY_CONFIG['자유게시판'];
  const isEdited = post.updated_at !== post.created_at;
  const isNotice = post.category === '공지';

  const attachments = post.attachments ?? [];
  // 본문에 이미 인라인으로 사용된 이미지 URL 목록
  const inlineUrls = new Set(
    _parseContent(post.content)
      .filter((p): p is { type: 'image'; alt: string; url: string } => p.type === 'image')
      .map((p) => p.url),
  );
  const imageAttachments = attachments.filter((a) => a.is_image && !inlineUrls.has(a.url));
  const fileAttachments = attachments.filter((a) => !a.is_image);

  // 수정 에디터에 전달할 카테고리 (작성 가능한 카테고리만)
  const writableCategory =
    post.category === '공지' || post.category === '자유게시판'
      ? (post.category as WritableCategory)
      : undefined;
  const writableFixedCategory =
    fixedCategory === '공지' || fixedCategory === '자유게시판'
      ? (fixedCategory as WritableCategory)
      : undefined;

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteMutation.mutateAsync(post.id);
      toast.success('삭제되었습니다.');
      void navigate(-1);
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={() => void navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors self-start"
      >
        <ArrowLeft className="size-4" />
        목록으로
      </button>

      {/* 게시글 카드 */}
      <div
        className={cn(
          'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-l-4',
          config.border,
          isNotice && 'bg-gradient-to-r from-red-50/20 to-white',
        )}
      >
        <div className="p-6 flex flex-col gap-5">
          {/* 헤더 영역 */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2 min-w-0">
              {/* 카테고리 + 수정됨 */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border',
                    config.badge,
                  )}
                >
                  {isNotice && <Pin className="size-2.5" />}
                  {config.label}
                </span>
                {post.system_generated && (
                  <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                    시스템 생성
                  </span>
                )}
                {isEdited && <span className="text-[11px] text-gray-400">(수정됨)</span>}
              </div>

              {/* 제목 */}
              <h1 className="text-xl font-bold text-gray-900 leading-snug break-words">
                {post.title}
              </h1>

              {/* 작성자 정보 */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-mega-secondary/10 shrink-0 overflow-hidden">
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt={post.author_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-mega-secondary">
                      {post.author_name.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-800">{post.author_name}</span>
                {post.author_position && (
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-md font-medium border',
                      ROLE_STYLES[post.author_position] ??
                        'bg-gray-100 text-gray-600 border-gray-200',
                    )}
                  >
                    {post.author_position}
                  </span>
                )}
                <span className="text-[11px] text-gray-400">
                  {formatRelativeTime(post.created_at)}
                </span>
              </div>
            </div>

            {/* 내 게시글 메뉴 */}
            {(isMine || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[110px]">
                  {isMine && (canWrite ?? true) && writableCategory && (
                    <DropdownMenuItem
                      onClick={() => setEditorOpen(true)}
                      className="gap-2 cursor-pointer"
                    >
                      <Pencil className="size-3.5" />
                      수정
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => void handleDelete()}
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                      삭제
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* 본문 (인라인 이미지 포함) */}
          <div className="border-t border-gray-50 pt-5 min-h-[80px]">
            <ContentRenderer content={post.content} onOpenLightbox={setLightboxUrl} />
          </div>

          {/* 이미지 첨부파일 */}
          {imageAttachments.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-gray-50 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                이미지 ({imageAttachments.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {imageAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative group rounded-xl overflow-hidden border border-gray-100 aspect-square cursor-pointer"
                    onClick={() => setLightboxUrl(att.url)}
                  >
                    <img
                      src={att.url}
                      alt={att.original_filename}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <ZoomIn className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 일반 파일 첨부파일 */}
          {fileAttachments.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-gray-50 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                첨부파일 ({fileAttachments.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {fileAttachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    download={att.original_filename}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all group"
                  >
                    <div className="w-9 h-9 flex items-center justify-center bg-blue-100 rounded-lg flex-shrink-0">
                      <FileText className="size-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate group-hover:text-blue-700 transition-colors">
                        {att.original_filename}
                      </p>
                      <p className="text-[11px] text-gray-400">{formatBytes(att.file_size)}</p>
                    </div>
                    <Download className="size-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 좋아요 + 댓글 수 */}
          <div className="flex items-center justify-between border-t border-gray-50 pt-4">
            <LikeButton
              postId={post.id}
              likesCount={post.likes_count ?? 0}
              likedByMe={post.liked_by_me ?? false}
              size="lg"
            />
            <span className="text-xs text-gray-400">
              댓글 {post.comments_count ?? post.comments?.length ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* 댓글 섹션 */}
      {user && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <CommentSection postId={post.id} currentUserId={user.id} />
        </div>
      )}

      {/* 수정 에디터 */}
      {writableCategory && (
        <PostEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          editTarget={
            post
              ? {
                  id: post.id,
                  title: post.title,
                  content: post.content,
                  category: writableCategory,
                  attachments: post.attachments,
                }
              : undefined
          }
          fixedCategory={writableFixedCategory}
        />
      )}

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
    </div>
  );
}
