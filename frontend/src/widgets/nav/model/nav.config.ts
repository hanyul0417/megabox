import { Calendar, ClipboardList, DollarSign, LayoutGrid, Mail, MessageSquare, ShieldUser } from 'lucide-react';

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
    label: '대시보드',
    path: ROUTES.ROOT,
    icon: LayoutGrid,
    exact: true,
    requiredRoles: [USER_ROLES.ADMIN, USER_ROLES.LEADER, USER_ROLES.CREW, USER_ROLES.CLEANER],
  },
  {
    key: 'pay',
    label: '급여',
    path: ROUTES.PAY,
    icon: DollarSign,
    requiredRoles: [USER_ROLES.ADMIN, USER_ROLES.LEADER, USER_ROLES.CREW, USER_ROLES.CLEANER],
  },
  {
    key: 'schedule',
    label: '스케줄',
    path: ROUTES.SCHEDULE,
    icon: Calendar,
    requiredRoles: [USER_ROLES.ADMIN, USER_ROLES.LEADER, USER_ROLES.CREW, USER_ROLES.CLEANER],
  },
  {
    key: 'apply',
    label: '신청',
    path: ROUTES.APPLY,
    icon: ClipboardList,
    requiredRoles: [USER_ROLES.ADMIN, USER_ROLES.LEADER, USER_ROLES.CREW, USER_ROLES.CLEANER],
  },
  {
    key: 'community',
    label: '커뮤니티',
    path: ROUTES.COMMUNITY,
    icon: MessageSquare,
    requiredRoles: [USER_ROLES.ADMIN, USER_ROLES.LEADER, USER_ROLES.CREW, USER_ROLES.CLEANER],
  },
  {
    key: 'messages',
    label: '쪽지',
    path: ROUTES.MESSAGES,
    icon: Mail,
    requiredRoles: [USER_ROLES.ADMIN, USER_ROLES.LEADER, USER_ROLES.CREW, USER_ROLES.CLEANER],
  },
  {
    key: 'admin',
    label: '관리자',
    path: ROUTES.ADMIN,
    icon: ShieldUser,
    requiredRoles: [USER_ROLES.ADMIN],
  },
];
