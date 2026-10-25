import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';

import { usePushSubscriptionSync } from '@/features/notification';
import { useAuthStore } from '@/shared/model/authStore';
import { MobileTabBar, SideNav, TopNav } from '@/widgets/nav';
import { MobileHeader } from '@/widgets/ui/MobileHeader';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { pathname } = useLocation();
  usePushSubscriptionSync(isAuthenticated);

  // 페이지 이동 시 드로어 닫기 + 맨 위로
  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-app-bg">
      {/* 데스크탑 상단 네비 (lg+, TopNav 내부에서 hidden lg:flex 처리) */}
      <TopNav />

      {/* 모바일 사이드 드로워 (lg 미만에서 사용) */}
      <SideNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 콘텐츠 영역 */}
      <div className="flex min-h-dvh flex-col lg:pt-16">
        {/* 모바일 헤더 (lg 미만에서만 표시) */}
        <MobileHeader />

        <main className="flex-1 pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+1.5rem)] lg:pb-0">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* 모바일 하단 탭바 (lg 미만) */}
      <MobileTabBar menuOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
};
