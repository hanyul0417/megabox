import { useCallback, useEffect } from 'react';

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

function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function subscribeAndRegister(): Promise<boolean> {
  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const { public_key } = await getVapidPublicKey();
    if (!public_key) return false;
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(public_key),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  await subscribePush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
  return true;
}

/**
 * 이미 알림 권한이 허용된 상태에서 로그인 시 구독을 자동으로 동기화(재구독 포함)한다.
 * 권한을 새로 요청하지는 않는다 — iOS Safari/PWA는 사용자 제스처 없이 호출된
 * Notification.requestPermission()을 무시(또는 영구 거부 취급)하기 때문에,
 * 최초 권한 요청은 반드시 useRequestPushPermission()으로 클릭 핸들러 안에서 해야 한다.
 */
export function usePushSubscriptionSync(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isPushSupported() || Notification.permission !== 'granted') return;

    let cancelled = false;
    void (async () => {
      try {
        if (!cancelled) await subscribeAndRegister();
      } catch (err) {
        console.error('푸시 구독 동기화 실패:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
}

/**
 * 알림 권한 요청 + 구독을 수행하는 함수를 반환한다.
 * 반드시 클릭 등 사용자 제스처 핸들러 안에서 직접 호출해야 iOS에서도 동작한다.
 */
export function useRequestPushPermission() {
  return useCallback(async (): Promise<'granted' | 'denied' | 'unsupported'> => {
    if (!isPushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';

    let permission: NotificationPermission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') return 'denied';

    try {
      await subscribeAndRegister();
    } catch (err) {
      console.error('푸시 구독 실패:', err);
    }
    return 'granted';
  }, []);
}
