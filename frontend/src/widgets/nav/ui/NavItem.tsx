import type { ComponentType } from 'react';

import { cn } from '@/shared/lib/utils';

interface NavItemProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
  badge?: number;
}

const NavItem = ({ icon: Icon, label, active, onClick, collapsed, badge }: NavItemProps) => {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
        active
          ? 'bg-white/15 text-white shadow-sm'
          : 'text-white/60 hover:text-white hover:bg-white/8',
        collapsed && 'justify-center px-2',
      )}
    >
      <Icon className={cn('shrink-0', collapsed ? 'size-5' : 'size-[18px]')} />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badge != null && badge > 0 && (
        <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      {active && !collapsed && !(badge != null && badge > 0) && (
        <span className="ml-auto size-1.5 rounded-full bg-white/60" />
      )}
    </button>
  );
};

export default NavItem;
