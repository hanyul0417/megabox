// 메가박스 PWA 서비스워커
// - 설치(홈 화면 추가) 가능하게 해주는 역할
// - 웹 푸시 수신 및 알림 클릭 처리

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 오프라인 캐싱은 하지 않음 (항상 최신 API 응답 필요) — 설치 요건 충족용 통과 핸들러
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', (event) => {
  let payload = { title: '메가박스', body: '새 알림이 있습니다.', link: '/', unreadCount: null };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  const tasks = [
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { link: payload.link || '/' },
    }),
  ];

  // 앱 아이콘 우측상단 뱃지(읽지 않은 알림 수) 동기화 — iOS 16.4+ / Android Chrome 지원
  if (typeof payload.unreadCount === 'number' && 'setAppBadge' in self.navigator) {
    tasks.push(
      payload.unreadCount > 0
        ? self.navigator.setAppBadge(payload.unreadCount)
        : self.navigator.clearAppBadge(),
    );
  }

  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ('focus' in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
