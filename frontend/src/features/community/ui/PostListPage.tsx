import { PenLine, Search, SlidersHorizontal, X } from 'lucide-react';
import { memo, useCallback, useDeferredValue, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useCommunityPostsQuery } from '../api/queries';

import { PostCard } from './PostCard';
import { PostEditor } from './PostEditor';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

type Category = '공지' | '자유게시판' | '근무교대' | '휴무신청';
type WritableCategory = '공지' | '자유게시판';
type OrderType = 'latest' | 'popular';

interface PostListPageProps {
  category?: Category;
  canWrite?: boolean;
  fixedCategory?: Category;
  pageSize?: number;
  excludeSystem?: boolean;
}

const ORDER_OPTIONS: { key: OrderType; label: string }[] = [
  { key: 'latest', label: '최신순' },
  { key: 'popular', label: '인기순' },
];

// ── 스켈레톤 ────────────────────────────────────────────────────────────────
const PostCardSkeleton = memo(() => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
    <div className="pl-5 pr-5 py-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="h-5 w-14 bg-gray-100 rounded-md" />
        <div className="h-3 w-16 bg-gray-100 rounded" />
      </div>
      <div className="h-4 w-3/4 bg-gray-100 rounded mb-2" />
      <div className="h-3 w-full bg-gray-100 rounded mb-1" />
      <div className="h-3 w-2/3 bg-gray-100 rounded mb-3" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="h-3 w-16 bg-gray-100 rounded" />
      </div>
    </div>
  </div>
));

PostCardSkeleton.displayName = 'PostCardSkeleton';

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export function PostListPage({
  category,
  canWrite = false,
  fixedCategory,
  pageSize = 10,
  excludeSystem = false,
}: PostListPageProps) {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [order, setOrder] = useState<OrderType>('latest');
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, category, order]);

  const { data, isLoading } = useCommunityPostsQuery({
    category,
    exclude_system: excludeSystem || undefined,
    page,
    page_size: pageSize,
    order,
    search: deferredSearch || undefined,
  });

  const posts = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;

  const handleCardClick = useCallback(
    (id: number) => {
      void navigate(String(id));
    },
    [navigate],
  );

  // fixedCategory가 '공지' 또는 '자유게시판'인 경우에만 에디터 표시
  const writableFixedCategory =
    fixedCategory === '공지' || fixedCategory === '자유게시판'
      ? (fixedCategory as WritableCategory)
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* ── 검색 + 정렬 + 글쓰기 툴바 ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* 검색 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목, 내용 검색..."
            className="pl-9 h-10 bg-white rounded-xl border-gray-200 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* 정렬 */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          <SlidersHorizontal className="size-3.5 text-gray-400 ml-2 shrink-0" />
          {ORDER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setOrder(opt.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                order === opt.key
                  ? 'bg-mega text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 글쓰기 (근무교대/휴무신청은 숨김) */}
        {canWrite && (
          <Button
            onClick={() => setEditorOpen(true)}
            className="bg-mega hover:bg-nav-bg text-white rounded-xl h-10 gap-2 shrink-0"
          >
            <PenLine className="size-4" />
            <span>글쓰기</span>
          </Button>
        )}
      </div>

      {/* ── 게시글 수 표시 ──────────────────────────────────────── */}
      {!isLoading && (
        <div className="text-xs text-gray-400">
          {deferredSearch ? `"${deferredSearch}" 검색 결과 ${total}개` : `전체 ${total}개`}
        </div>
      )}

      {/* ── 게시글 목록 ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 5 }, (_, i) => <PostCardSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border-2 border-dashed border-gray-200 bg-white">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm font-medium text-gray-600">
              {deferredSearch ? '검색 결과가 없습니다.' : '아직 게시글이 없습니다.'}
            </p>
            {canWrite && !deferredSearch && (
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="mt-3 text-sm text-mega-secondary hover:underline font-medium"
              >
                첫 번째 글을 작성해보세요 →
              </button>
            )}
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => handleCardClick(post.id)}
              showCategory={!fixedCategory}
            />
          ))
        )}
      </div>

      {/* ── 페이지네이션 ──────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl h-9 px-3 text-xs"
          >
            이전
          </Button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setPage(pageNum)}
                className={cn(
                  'w-9 h-9 rounded-xl text-xs font-medium transition-all',
                  page === pageNum
                    ? 'bg-mega text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {pageNum}
              </button>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-xl h-9 px-3 text-xs"
          >
            다음
          </Button>
        </div>
      )}

      {/* ── 글쓰기 에디터 ─────────────────────────────────────── */}
      <PostEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        fixedCategory={writableFixedCategory}
      />
    </div>
  );
}
