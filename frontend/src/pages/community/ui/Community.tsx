import { Megaphone, MessagesSquare, TextAlignStart } from 'lucide-react';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { useCategoryCountsQuery } from '@/features/community/api/queries';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { cn } from '@/shared/lib/utils';

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
    <div className="flex flex-col gap-5">
      {/* ── 페이지 헤더 ── */}
      <PageHeader
        icon={<MessagesSquare className="size-5 text-mega" />}
        iconBg="bg-mega/10"
        title="커뮤니티"
        description="공지사항, 자유게시판"
      />

      {/* ── 탭 네비게이션 ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              tab.path === currentSegment || (currentSegment === '' && tab.path === 'community');
            const count = categoryCounts[tab.categoryKey] ?? 0;

            return (
              <button
                key={tab.path}
                onClick={() => void navigate(tab.path)}
                className={cn(
                  'flex items-center gap-2 shrink-0 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-mega text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold',
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500',
                    )}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 서브 라우트 콘텐츠 ── */}
      <div>
        <Outlet />
      </div>
    </div>
  );
}
