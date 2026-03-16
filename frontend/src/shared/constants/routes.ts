/** 해당 파일에서 라우팅 경로를 관리합니다 */

export const ROUTES = {
  ROOT: '/',
  AUTH: '/auth',
  PAY: '/pay',
  LOGIN: '/login',
  COMMUNITY: '/community',
  WORK_STATUS: '/work-status',
  ADMIN: '/admin',
  SCHEDULE: '/schedule',
  MYPAGE: '/mypage',
  NOT_FOUND: '*',
} as const;
