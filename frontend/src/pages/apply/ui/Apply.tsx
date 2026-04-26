import { CalendarCheck, CalendarSync, CloudOff } from 'lucide-react';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { PageHeader } from '@/shared/components/ui/PageHeader';
import { cn } from '@/shared/lib/utils';

const TABS = [
  { label: '휴무신청', path: 'dayoff', icon: CloudOff },
  { label: '근무교대', path: 'shift', icon: CalendarSync },
  { label: '고정휴무', path: 'fixed-dayoff', icon: CalendarCheck },
] as const;

export default function Apply() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentSegment = location.pathname.split('/').pop() ?? 'dayoff';

  useEffect(() => {
    if (location.pathname === '/apply' || location.pathname === '/apply/') {
      void navigate('dayoff', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={<CloudOff className="size-5 text-mega" />}
        iconBg="bg-mega/10"
        title="휴무신청"
        description="휴무, 근무교대, 고정휴무를 신청하세요"
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.path === currentSegment;
            return (
              <button
                key={tab.path}
                onClick={() => void navigate(tab.path)}
                className={cn(
                  'flex items-center gap-2 flex-1 justify-center px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-mega text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Outlet />
      </div>
    </div>
  );
}
