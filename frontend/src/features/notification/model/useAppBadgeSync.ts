import { useEffect } from 'react';

/**
 * 앱이 열려있는 동안 읽지 않은 알림 수를 홈 화면 아이콘 뱃지에 동기화한다.
 * (푸시 수신 시점의 뱃지 갱신은 서비스워커(sw.js)의 push 핸들러가 담당)
 */
export function useAppBadgeSync(unreadCount: number | undefined) {
  useEffect(() => {
    if (typeof unreadCount !== 'number' || !('setAppBadge' in navigator)) return;

    if (unreadCount > 0) {
      void navigator.setAppBadge(unreadCount).catch(() => {});
    } else {
      void navigator.clearAppBadge().catch(() => {});
    }
  }, [unreadCount]);
}
