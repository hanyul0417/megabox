import { MessageSquare } from 'lucide-react';
import { memo, useState } from 'react';
import { toast } from 'sonner';

import {
  useCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useUpdateCommentMutation,
} from '../../api/queries';

import CommentForm from './CommentForm';
import { CommentItem } from './CommentItem';

import { useUserQuery } from '@/entities/user/api/queries';
import { hasAdminAccess } from '@/entities/user/model/role';
import { cn } from '@/shared/lib/utils';

interface CommentSectionProps {
  postId: number;
  currentUserId: number;
}

const CommentSection = memo(({ postId, currentUserId }: CommentSectionProps) => {
  const [page, setPage] = useState(1);

  const { data: currentUser } = useUserQuery();
  const isAdmin = !!currentUser && hasAdminAccess(currentUser.position);

  const { data, isLoading } = useCommentsQuery(postId, page);
  const createMutation = useCreateCommentMutation(postId);
  const updateMutation = useUpdateCommentMutation(postId);
  const deleteMutation = useDeleteCommentMutation(postId);

  const comments = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;

  const handleCreate = (content: string) => {
    createMutation.mutate(content, {
      onSuccess: () => setPage(1),
      onError: () => toast.error('댓글 작성에 실패했습니다.'),
    });
  };

  const handleUpdate = (id: number, content: string) => {
    updateMutation.mutate(
      { id, content },
      {
        onSuccess: () => toast.success('댓글이 수정되었습니다.'),
        onError: () => toast.error('댓글 수정에 실패했습니다.'),
      },
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('댓글이 삭제되었습니다.');
        if (page > 1 && comments.length === 1) {
          setPage((p) => Math.max(1, p - 1));
        }
      },
      onError: () => toast.error('댓글 삭제에 실패했습니다.'),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
        <MessageSquare className="size-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-800">
          댓글
          {total > 0 && <span className="ml-1.5 text-mega-secondary font-bold">{total}</span>}
        </h3>
      </div>

      {/* 댓글 입력 (상단 배치) */}
      <CommentForm onSubmit={handleCreate} isLoading={createMutation.isPending} />

      {/* 댓글 목록 */}
      {isLoading ? (
        <div className="flex flex-col gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1">
                <div className="h-3 w-24 bg-gray-100 rounded mb-2" />
                <div className="h-4 w-full bg-gray-100 rounded mb-1" />
                <div className="h-4 w-2/3 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-gray-50">
          {comments.map((comment) => (
            <div key={comment.id} className="py-4 first:pt-0">
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={cn(
                'w-7 h-7 rounded-lg text-xs font-medium transition-all',
                page === p ? 'bg-mega text-white' : 'text-gray-500 hover:bg-gray-100',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

CommentSection.displayName = 'CommentSection';
export default CommentSection;
