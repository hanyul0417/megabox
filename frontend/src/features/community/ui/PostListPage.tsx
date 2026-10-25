import { PenLine, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  pageSize = 5,
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

  // 페이지 변경 시 목록 상단으로 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

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
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        {/* 검색 */}
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목, 내용 검색..."
            className="h-11 rounded-xl pl-9 pr-10 sm:h-10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="검색어 지우기"
              className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
        {/* 정렬 */}
        <div className="flex flex-1 items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-xs sm:flex-none">
          <SlidersHorizontal className="size-3.5 text-gray-400 ml-2 shrink-0" />
          {ORDER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setOrder(opt.key)}
              className={cn(
                'flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors duration-150 sm:flex-none sm:py-1.5',
                order === opt.key
                  ? 'bg-mega-soft text-mega'
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
            className="h-11 shrink-0 gap-2 rounded-xl bg-mega px-4 text-white hover:bg-nav-bg sm:h-10"
          >
            <PenLine className="size-4" />
            <span>글쓰기</span>
          </Button>
        )}
        </div>
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
      {!isLoading && totalPages >= 1 && (
        <div className="flex items-center justify-between mt-2">
          {/* 페이지 정보 */}
          <span className="text-xs text-gray-400">
            {page} / {totalPages} 페이지
          </span>

          <div className="flex items-center gap-1">
            {/* 이전 버튼 */}
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex size-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>

            {/* 페이지 번호 */}
            {(() => {
              const maxButtons = 5;
              let start = Math.max(1, page - Math.floor(maxButtons / 2));
              const end = Math.min(totalPages, start + maxButtons - 1);
              if (end - start < maxButtons - 1) {
                start = Math.max(1, end - maxButtons + 1);
              }
              return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    'size-9 rounded-xl text-[13px] font-semibold tabular-nums transition-colors',
                    page === n
                      ? 'bg-mega text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200',
                  )}
                >
                  {n}
                </button>
              ));
            })()}

            {/* 다음 버튼 */}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex size-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* 총 게시글 수 */}
          <span className="text-xs text-gray-400">{total}개</span>
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
