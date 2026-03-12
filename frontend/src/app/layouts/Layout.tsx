import { useState } from 'react';
import { Outlet } from 'react-router';

import { SideNav } from '@/widgets/nav';
import { MobileHeader } from '@/widgets/ui/MobileHeader';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      {/* Sidebar: fixed on desktop, drawer on mobile */}
      <SideNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex flex-col flex-1 lg:pl-[240px] min-w-0 overflow-hidden">
        {/* Mobile header (hidden on lg+) */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
