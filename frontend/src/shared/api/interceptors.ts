import axios, { type AxiosInstance } from 'axios';

import { useAuthStore } from '../model/authStore';

import { queryClient } from './queryClient';

import type { ErrorResponse } from '../types/apiResponse';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// ── 공통 인터페이스 ──────────────────────────────────────────────────────
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
}

function appendFormData(formData: FormData, key: string, value: unknown) {
  if (value == null) return;
  if (value instanceof File || value instanceof Blob) {
    formData.append(key, value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v) => appendFormData(formData, `${key}[]`, v));
    return;
  }
  if (typeof value === 'object') {
    formData.append(key, JSON.stringify(value));
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  formData.append(key, String(value));
}

const BASE_URL = (import.meta.env.VITE_BASE_URL as string) || 'http://localhost:8000';

/**
 * 선제적 토큰 갱신: 만료 임박 시 401을 받기 전에 미리 refresh.
 * 이미 갱신 중이면 진행 중인 Promise를 공유하여 중복 호출 방지.
 */
let proactiveRefreshPromise: Promise<string> | null = null;

async function proactiveRefresh(): Promise<string> {
  if (proactiveRefreshPromise) return proactiveRefreshPromise;

  proactiveRefreshPromise = (async () => {
    try {
      const response = await axios.post<RefreshTokenResponse>(
        `${BASE_URL}/api/auth/refresh`,
        null,
        { withCredentials: true, timeout: 5000 },
      );

      const { access_token: newAccessToken, expires_in } = response.data;
      const { user } = useAuthStore.getState();

      if (user && expires_in) {
        useAuthStore.getState().setAuth(newAccessToken, user, expires_in);
      } else {
        useAuthStore.getState().setAccessToken(newAccessToken);
      }

      return newAccessToken;
    } finally {
      proactiveRefreshPromise = null;
    }
  })();

  return proactiveRefreshPromise;
}

export const requestInterceptor = async (
  config: InternalAxiosRequestConfig,
): Promise<InternalAxiosRequestConfig> => {
  const { accessToken, isTokenExpired } = useAuthStore.getState();
  config.headers = config.headers ?? {};

  // 선제적 토큰 갱신: 만료 임박 시 refresh 엔드포인트·로그인 요청 제외
  const requestUrl = config.url ?? '';
  const skipProactiveRefresh =
    requestUrl.includes('/auth/refresh') || requestUrl.includes('/auth/login');

  if (accessToken && isTokenExpired() && !skipProactiveRefresh) {
    try {
      const newToken = await proactiveRefresh();
      (config.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
    } catch {
      // 선제적 갱신 실패 → 기존 토큰으로 시도, 401 시 reject interceptor에서 처리
      if (accessToken) {
        (config.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
      }
    }
  } else if (accessToken) {
    (config.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
  }

  // multipart/form-data 처리
  const contentType =
    (config.headers as Record<string, string>)['Content-Type'] ||
    (config.headers as Record<string, string>)['content-type'];

  if (contentType && contentType.includes('multipart/form-data')) {
    const formData = new FormData();
    const dataObj = (config.data as Record<string, unknown>) || {};
    Object.entries(dataObj).forEach(([key, value]) => {
      appendFormData(formData, key, value);
    });
    config.data = formData;
  }

  return config;
};

export const responseInterceptor = (response: AxiosResponse) => response;

// 커스텀 에러 클래스
export class ApiError extends Error {
  code: string;
  status?: number;
  details?: unknown;

  constructor(message: string, code: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// 토큰 갱신 중 실패한 요청 큐
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

const clearSession = () => {
  useAuthStore.getState().clearAuth();
  queryClient.clear();
};

export const createRejectInterceptor =
  (axiosInstance: AxiosInstance, baseUrl: string) =>
    async (error: AxiosError<ErrorResponse>): Promise<AxiosResponse> => {
      if (!error.response) {
        return Promise.reject(new ApiError('네트워크 연결을 확인해주세요.', 'NETWORK_ERROR'));
      }

      const { status, data: errorData } = error.response;
      const originalRequest = error.config as RetryConfig | undefined;

      switch (status) {
        case 401: {
          // 로그인 엔드포인트 또는 기존 레거시 workstatus 엔드포인트(username/password 인증)는
          // refresh 없이 즉시 에러 반환. kiosk/* 엔드포인트는 system JWT를 사용하므로 refresh 허용.
          const requestUrl = error.config?.url ?? '';
          const skipRefresh =
            requestUrl.includes('/auth/login') ||
            (requestUrl.includes('/workstatus/') &&
              !requestUrl.includes('/workstatus/kiosk/') &&
              !requestUrl.includes('/workstatus/my/'));

          if (skipRefresh) {
            const msg =
              typeof errorData?.detail === 'string'
                ? errorData.detail
                : '아이디 또는 비밀번호가 올바르지 않습니다.';
            return Promise.reject(new ApiError(msg, 'UNAUTHORIZED', 401));
          }

          // 요청 config가 없는 경우에만 즉시 실패
          // accessToken이 null이어도 httpOnly 쿠키에 refreshToken이 있을 수 있으므로
          // refresh 시도를 차단하지 않음
          if (!originalRequest) {
            clearSession();
            return Promise.reject(
              new ApiError('인증이 만료되었습니다. 다시 로그인해주세요.', 'UNAUTHORIZED', 401),
            );
          }

          // 이미 재시도한 요청 (Refresh Token도 만료)
          if (originalRequest._retry) {
            clearSession();
            return Promise.reject(
              new ApiError('인증이 만료되었습니다. 다시 로그인해주세요.', 'UNAUTHORIZED', 401),
            );
          }

          // 토큰 갱신 중인 경우 — 큐에 추가
          if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest._retry = true;
                (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${token}`;
                return axiosInstance(originalRequest);
              })
              .catch((err: unknown) =>
                Promise.reject(err instanceof Error ? err : new Error(String(err))),
              );
          }

          // 토큰 갱신 시작 (Cookie의 Refresh Token 사용 — withCredentials로 자동 전송)
          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const response = await axios.post<RefreshTokenResponse>(
              `${baseUrl}/api/auth/refresh`,
              null,
              { withCredentials: true, timeout: 5000 }, // httpOnly Cookie 자동 전송
            );

            const { access_token: newAccessToken, expires_in } = response.data;

            // setAuth로 accessToken + expiresAt을 한 번에 갱신 (setAccessToken 중복 호출 제거)
            const { user } = useAuthStore.getState();
            if (user && expires_in) {
              useAuthStore.getState().setAuth(newAccessToken, user, expires_in);
            } else {
              // user가 없는 엣지케이스: accessToken만 갱신
              useAuthStore.getState().setAccessToken(newAccessToken);
            }

            // isRefreshing을 false로 먼저 설정한 후 큐 처리
            // (큐에서 꺼낸 요청이 401 받아도 다시 갱신 시도 가능하도록)
            isRefreshing = false;
            processQueue(null, newAccessToken);

            (originalRequest.headers as Record<string, string>).Authorization =
              `Bearer ${newAccessToken}`;
            return axiosInstance(originalRequest);
          } catch (refreshError) {
            isRefreshing = false;
            processQueue(refreshError, null);
            clearSession();
            return Promise.reject(
              new ApiError('인증이 만료되었습니다. 다시 로그인해주세요.', 'UNAUTHORIZED', 401),
            );
          }
        }

        case 403: {
          const msg =
            typeof errorData?.detail === 'string' ? errorData.detail : '접근 권한이 없습니다.';
          return Promise.reject(new ApiError(msg, 'FORBIDDEN', 403));
        }

        case 404:
          return Promise.reject(new ApiError('요청한 리소스를 찾을 수 없습니다.', 'NOT_FOUND', 404));

        case 422: {
          let validationMessage = '입력값을 확인해주세요.';
          if (Array.isArray(errorData?.detail)) {
            const firstError = errorData.detail[0];
            if (firstError?.msg) validationMessage = firstError.msg;
          } else if (typeof errorData?.detail === 'string') {
            validationMessage = errorData.detail;
          }
          return Promise.reject(new ApiError(validationMessage, 'VALIDATION_ERROR', 422, errorData));
        }

        case 429:
          return Promise.reject(
            new ApiError(
              typeof errorData?.detail === 'string'
                ? errorData.detail
                : '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
              'TOO_MANY_REQUESTS',
              429,
            ),
          );

        case 500:
          return Promise.reject(
            new ApiError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'SERVER_ERROR', 500),
          );

        default: {
          let defaultMessage = '알 수 없는 오류가 발생했습니다.';
          let defaultCode = 'UNKNOWN_ERROR';
          if (typeof errorData?.detail === 'string') {
            defaultMessage = errorData.detail;
          } else if (
            typeof errorData?.detail === 'object' &&
            errorData.detail !== null &&
            'message' in errorData.detail
          ) {
            defaultMessage = (errorData.detail as { code?: string; message: string }).message;
            defaultCode = (errorData.detail as { code?: string; message: string }).code ?? defaultCode;
          }
          return Promise.reject(new ApiError(defaultMessage, defaultCode, status));
        }
      }
    };
