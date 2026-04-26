import { useState } from 'react';
import { Outlet } from 'react-router';

import { SideNav, TopNav } from '@/widgets/nav';
import { MobileHeader } from '@/widgets/ui/MobileHeader';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-app-bg">
      {/* 데스크탑 상단 네비 (lg+, TopNav 내부에서 hidden lg:flex 처리) */}
      <TopNav />

      {/* 모바일 사이드 드로워 (lg 미만에서 사용) */}
      <SideNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 콘텐츠 영역 */}
      <div className="flex flex-col lg:pt-[60px] min-h-screen">
        {/* 모바일 헤더 (lg 미만에서만 표시) */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
