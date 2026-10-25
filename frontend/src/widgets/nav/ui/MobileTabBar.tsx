import { LayoutGrid } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';

import { NAV_ITEMS, type NavItemConfig } from '../model/nav.config';

import { useUserQuery } from '@/entities/user/api/queries';
import { useUnreadCountQuery } from '@/features/message';
import { cn } from '@/shared/lib/utils';

/** 하단 탭에 노출할 메뉴 (나머지는 '전체' 드로어에서 접근) */
const TAB_KEYS = ['dashboard', 'schedule', 'pay', 'community'] as const;

interface MobileTabBarProps {
  onMenuClick: () => void;
  menuOpen?: boolean;
}

/** 모바일 하단 탭바 (lg 미만) */
const MobileTabBar = ({ onMenuClick, menuOpen = false }: MobileTabBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user } = useUserQuery();
  const { data: messageUnread } = useUnreadCountQuery();

  const tabs = TAB_KEYS.map((key) => NAV_ITEMS.find((item) => item.key === key)).filter(
    (item): item is NavItemConfig =>
      !!item && (!item.requiredRoles || (!!user && item.requiredRoles.includes(user.position))),
  );

  const isActive = (item: NavItemConfig) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  const anyTabActive = tabs.some(isActive);
  const hasUnread = (messageUnread?.count ?? 0) > 0;

  const itemClass = (active: boolean) =>
    cn(
      'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[11px] font-semibold transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40',
      active ? 'text-mega-secondary' : 'text-gray-400 active:text-gray-600',
    );

  return (
    <nav
      data-mobile-tabbar
      aria-label="주요 메뉴"
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-gray-200/80 bg-white/95 backdrop-blur-md pb-safe"
    >
      <div className="mx-auto flex h-tabbar max-w-xl items-stretch">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => void navigate(item.path)}
              aria-current={active ? 'page' : undefined}
              className={itemClass(active)}
            >
              {active && (
                <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-b-full bg-mega-secondary" />
              )}
              <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.9} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onMenuClick}
          aria-label={hasUnread ? '전체 메뉴 (읽지 않은 메시지 있음)' : '전체 메뉴'}
          aria-expanded={menuOpen}
          className={itemClass(menuOpen || !anyTabActive)}
        >
          <span className="relative">
            <LayoutGrid className="size-[22px]" strokeWidth={1.9} />
            {hasUnread && (
              <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </span>
          <span>전체</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileTabBar;
