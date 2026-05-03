import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    registerSW({
      immediate: true,
      onOfflineReady() {
        window.dispatchEvent(new CustomEvent('argos-offline-ready'));
      },
      onNeedRefresh() {
        window.dispatchEvent(new CustomEvent('argos-need-refresh'));
      },
    });
  }
}
