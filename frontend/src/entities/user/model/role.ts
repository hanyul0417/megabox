export const USER_ROLES = {
  ADMIN: '관리자', // 통합 관리자 (구 점장 + 매니저 + 바이저)
  LEADER: '리더',
  CREW: '크루',
  CLEANER: '미화',
  SYSTEM: '시스템',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// 역할별 권한 체크
export const hasAdminAccess = (position: string): boolean => {
  return position === USER_ROLES.ADMIN;
};

export const hasCrewAccess = (position: string): boolean => {
  return (
    position === USER_ROLES.CREW ||
    position === USER_ROLES.LEADER ||
    position === USER_ROLES.CLEANER ||
    position === USER_ROLES.ADMIN
  );
};

export const isSystemAccount = (position: string): boolean => {
  return position === USER_ROLES.SYSTEM;
};

export const ROLE_STYLES: Record<string, string> = {
  관리자: 'bg-mega/10 text-mega',
  리더: 'bg-blue-100 text-blue-700',
  크루: 'bg-gray-100 text-gray-700',
  미화: 'bg-green-100 text-green-700',
  시스템: 'bg-orange-100 text-orange-700',
};

export const ROLE_LABEL: Record<string, string> = {
  관리자: '관리자',
  리더: '리더',
  크루: '크루',
  미화: '미화',
  시스템: '시스템',
};
