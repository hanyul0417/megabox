import { Megaphone, MessagesSquare, TextAlignStart } from 'lucide-react';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { useCategoryCountsQuery } from '@/features/community/api/queries';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { SegmentedTabs } from '@/shared/components/ui/segmented-tabs';

const TABS = [
  {
    label: '전체',
    path: 'community',
    icon: TextAlignStart,
    categoryKey: '전체',
    color: 'bg-mega',
  },
  {
    label: '공지사항',
    path: 'notice',
    icon: Megaphone,
    categoryKey: '공지',
    color: 'bg-red-500',
  },
  {
    label: '자유게시판',
    path: 'freeboard',
    icon: MessagesSquare,
    categoryKey: '자유게시판',
    color: 'bg-mega',
  },
] as const;

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────

export default function Community() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useCategoryCountsQuery();

  useEffect(() => {
    void refetch();
  }, [location.pathname, refetch]);

  if (isLoading) return null;

  const categoryCounts = data?.counts ?? {};

  // 현재 활성 탭 계산
  const currentSegment = location.pathname.split('/').pop() ?? 'community';

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* ── 페이지 헤더 ── */}
      <PageHeader
        icon={<MessagesSquare className="size-5 text-mega" />}
        iconBg="bg-mega-soft"
        title="게시판"
        description="공지사항, 자유게시판"
      />

      {/* ── 탭 네비게이션 ── */}
      <SegmentedTabs
        aria-label="게시판 분류"
        items={TABS.map((tab) => ({
          key: tab.path,
          label: tab.label,
          icon: tab.icon,
          count: categoryCounts[tab.categoryKey] ?? 0,
          countTone: 'neutral' as const,
        }))}
        value={
          TABS.find(
            (tab) =>
              tab.path === currentSegment || (currentSegment === '' && tab.path === 'community'),
          )?.path ?? ('' as (typeof TABS)[number]['path'])
        }
        onChange={(path) => void navigate(path)}
      />

      {/* ── 서브 라우트 콘텐츠 ── */}
      <div>
        <Outlet />
      </div>
    </div>
  );
}
