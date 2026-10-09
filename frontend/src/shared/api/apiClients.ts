import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

import { AUTH_ORIGIN, BASE_URL } from './env';
import { createRejectInterceptor, requestInterceptor, responseInterceptor } from './interceptors';

export { AUTH_ORIGIN, BASE_URL };

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // httpOnly Cookie (Refresh Token) 자동 전송
});

axiosInstance.interceptors.request.use(requestInterceptor);
axiosInstance.interceptors.response.use(
  responseInterceptor,
  createRejectInterceptor(axiosInstance),
);

export const apiClient = {
  get: <T>(config: AxiosRequestConfig) =>
    axiosInstance.get<T>(config.url!, config).then((res) => res.data),

  post: <T>(config: AxiosRequestConfig) =>
    axiosInstance.post<T>(config.url!, config.data, config).then((res) => res.data),

  put: <T>(config: AxiosRequestConfig) =>
    axiosInstance.put<T>(config.url!, config.data, config).then((res) => res.data),

  patch: <T>(config: AxiosRequestConfig) =>
    axiosInstance.patch<T>(config.url!, config.data, config).then((res) => res.data),

  delete: <T>(config: AxiosRequestConfig) =>
    axiosInstance.delete<T>(config.url!, config).then((res) => res.data),
} as const;
