import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { RouterProvider } from 'react-router';

import '../global/App.css';
import { router } from '../routes/router';

import QueryProvider from './QueryProvider';
import ToastProvider from './ToastProvider';

import type { User } from '@/entities/user/model/user';

import { AUTH_ORIGIN, BASE_URL } from '@/shared/api/env';
import { useAuthStore } from '@/shared/model/authStore';

interface RefreshResponse {
  access_token: string;
  expires_in: number;
}

type MeResponse = User;

/** 앱 초기화 시 httpOnly Cookie의 Refresh Token으로 Access Token 복구 */
async function silentRefresh(setAuth: (token: string, user: User, exp: number) => void) {
  try {
    const { data: refreshData } = await axios.post<RefreshResponse>(
      `${AUTH_ORIGIN}/api/auth/refresh`,
      null,
      { withCredentials: true },
    );

    const { data: meData } = await axios.get<MeResponse>(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${refreshData.access_token}` },
    });

    setAuth(refreshData.access_token, meData, refreshData.expires_in);
  } catch {
    // Cookie 없음 또는 만료 → 로그아웃 상태 유지 (정상 흐름)
  }
}

function AppInner() {
  const [isReady, setIsReady] = useState(false);
  const { setAuth, isAuthenticated } = useAuthStore();
  // StrictMode 중복 실행 방지: Token Rotation 시 2회 호출되면
  // 백엔드가 "Refresh Token Reuse Attack"으로 감지하여 모든 세션을 폐기함
  const silentRefreshCalledRef = useRef(false);

  useEffect(() => {
    // 이미 인증된 경우 (같은 탭에서의 네비게이션) → 즉시 준비 완료
    if (isAuthenticated) {
      setIsReady(true);
      return;
    }

    // StrictMode에서 useEffect 2회 실행 방지
    if (silentRefreshCalledRef.current) return;
    silentRefreshCalledRef.current = true;

    // 페이지 새로고침 시 → Cookie로 토큰 복구 시도
    void silentRefresh(setAuth).finally(() => setIsReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-mega border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <QueryProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </QueryProvider>
  );
}

export default App;
