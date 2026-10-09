import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './providers/App';
import './global/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA 설치 + 웹 푸시 수신을 위한 서비스워커 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('서비스워커 등록 실패:', err);
    });
  });
}
