import { CalendarDays, ClipboardCheck, House, MessageCircle, Newspaper, Receipt, Settings2 } from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import { USER_ROLES, type UserRole } from '@/entities/user/model/role';
import { ROUTES } from '@/shared/constants/routes';

export type NavItemConfig = {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  exact?: boolean;
  requiredRoles?: UserRole[];
};

export const NAV_ITEMS: NavItemConfig[] = [
  {
    key: 'dashboard',
    label: '홈',
    path: ROUTES.ROOT,
    icon: House,
    exact: true,
    requiredRoles: [USER_ROLES.ADMIN, USER_ROLES.LEADER, USER_ROLES.CREW, USER_ROLES.CLEANER],
  },
  {
    key: 'pay',
    label: '급여명세',
    path: ROUTES.PAY,
    icon: Receipt,
    requiredRoles: [USER_ROLES.ADMIN, USER_ROLES.LEADER, USER_ROLES.CREW, USER_ROLES.CLEANER],
  },
  {
    key: 'schedule',
    label: '근무표',
    path: ROUTES.SCHEDULE,
    icon: CalendarDays,
    requiredRoles: [USER_ROLES.ADMIN, USER_ROLES.LEADER, USER_ROLES.CREW, USER_ROLES.CLEANER],
  },
  {
    key: 'apply',
    label: '휴무신청',
    path: ROUTES.APPLY,
    icon: ClipboardCheck,
    requiredRoles: [USER_ROLES.ADMIN, USER_ROLES.LEADER, USER_ROLES.CREW, USER_ROLES.CLEANER],
  },
  {
    key: 'community',
    label: '게시판',
    path: ROUTES.COMMUNITY,
    icon: Newspaper,
    requiredRoles: [USER_ROLES.ADMIN, USER_ROLES.LEADER, USER_ROLES.CREW, USER_ROLES.CLEANER],
  },
  {
    key: 'messages',
    label: '메시지',
    path: ROUTES.MESSAGES,
    icon: MessageCircle,
    requiredRoles: [USER_ROLES.ADMIN, USER_ROLES.LEADER, USER_ROLES.CREW, USER_ROLES.CLEANER],
  },
  {
    key: 'admin',
    label: '관리',
    path: ROUTES.ADMIN,
    icon: Settings2,
    requiredRoles: [USER_ROLES.ADMIN],
  },
];
