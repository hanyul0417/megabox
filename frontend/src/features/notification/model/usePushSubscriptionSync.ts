import { useEffect } from 'react';

import { getVapidPublicKey, subscribePush } from '../api/service';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/**
 * 로그인 상태일 때 서비스워커의 푸시 구독을 생성/동기화한다.
 * - 알림 권한이 'default'면 1회 요청하고, 'denied'면 아무것도 하지 않는다.
 * - iOS는 홈 화면에 추가된 PWA(standalone)에서만 구독이 성립한다.
 */
export function usePushSubscriptionSync(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'denied') return;

    let cancelled = false;

    async function sync() {
      try {
        const registration = await navigator.serviceWorker.ready;

        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        if (permission !== 'granted' || cancelled) return;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const { public_key } = await getVapidPublicKey();
          if (!public_key || cancelled) return;
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(public_key),
          });
        }
        if (cancelled) return;

        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

        await subscribePush({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        });
      } catch (err) {
        console.error('푸시 구독 동기화 실패:', err);
      }
    }

    void sync();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
}
