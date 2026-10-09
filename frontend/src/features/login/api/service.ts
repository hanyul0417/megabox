import type {
  LoginRequestDTO,
  LoginResponseDTO,
  LogOutResponseDTO,
  RegisterRequestDTO,
  RegisterResponseDTO,
  UsernameCheckResponseDTO,
} from './dto';

import { apiClient } from '@/shared/api/apiClients';
import { AUTH_ORIGIN } from '@/shared/api/env';

export const authService = {
  /**
   * login/logout은 Refresh Token 쿠키를 주고받아야 하므로, 공용 axios 인스턴스의
   * baseURL(백엔드 직결, cross-site)을 AUTH_ORIGIN(같은 origin)으로 덮어써서 호출한다.
   * (cross-site 쿠키가 모바일 Safari/PWA에서 차단되는 문제 회피. 인터셉터는 그대로 적용됨)
   */
  login: (data: LoginRequestDTO) =>
    apiClient.post<LoginResponseDTO>({ url: '/api/auth/login', data, baseURL: AUTH_ORIGIN }),

  /** 로그아웃 — Refresh Token은 httpOnly Cookie로 자동 전송 */
  logout: () =>
    apiClient.post<LogOutResponseDTO>({ url: '/api/auth/logout', baseURL: AUTH_ORIGIN }),

  /** 아이디 중복 확인 */
  checkUsername: (username: string) =>
    apiClient.get<UsernameCheckResponseDTO>({
      url: '/api/auth/check-username',
      params: { username },
    }),

  /** 회원가입 신청 */
  register: (data: RegisterRequestDTO) =>
    apiClient.post<RegisterResponseDTO>({ url: '/api/auth/register', data }),
};
