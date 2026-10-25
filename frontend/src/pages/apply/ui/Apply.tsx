import { CalendarCheck, CalendarSync, CloudOff } from 'lucide-react';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { PageHeader } from '@/shared/components/ui/PageHeader';
import { SegmentedTabs } from '@/shared/components/ui/segmented-tabs';

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
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        icon={<CloudOff className="size-5 text-mega" />}
        iconBg="bg-mega-soft"
        title="휴무신청"
        description="휴무, 근무교대, 고정휴무를 신청하세요"
      />

      <SegmentedTabs
        aria-label="신청 종류"
        items={TABS.map((tab) => ({ key: tab.path, label: tab.label, icon: tab.icon }))}
        value={currentSegment as (typeof TABS)[number]['path']}
        onChange={(path) => void navigate(path)}
      />

      <div>
        <Outlet />
      </div>
    </div>
  );
}
