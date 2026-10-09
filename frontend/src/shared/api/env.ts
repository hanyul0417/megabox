export const BASE_URL = (import.meta.env.VITE_BASE_URL as string) || 'http://localhost:8000';

/**
 * 쿠키(Refresh Token)를 주고받는 요청(login/refresh/logout) 전용 origin.
 * 운영 배포에서는 프론트와 백엔드 도메인이 달라 cross-site 쿠키가 모바일
 * (특히 iOS Safari/PWA)에서 차단되는 문제가 있어, 같은 origin의 Vercel
 * 프록시(/api/auth/{action})를 거치도록 상대경로를 사용한다.
 * 로컬 개발 환경은 프록시가 없으므로 그대로 BASE_URL(백엔드 직결)을 사용한다.
 */
export const AUTH_ORIGIN = import.meta.env.PROD ? '' : BASE_URL;
