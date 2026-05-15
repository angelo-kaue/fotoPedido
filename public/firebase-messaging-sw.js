/* FotoPedido — Firebase Cloud Messaging service worker
 * Handles background push notifications and click navigation.
 */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCvjXxsi2TYqAHs4pVI1k6_-ZGO5g5gKm0',
  authDomain: 'fotopedido.firebaseapp.com',
  projectId: 'fotopedido',
  messagingSenderId: '734389979891',
  appId: '1:734389979891:web:dd12e50571b03418d04586',
});

const messaging = firebase.messaging();

// Background message → show notification
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || 'FotoPedido';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'fotopedido',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || '/admin/pedidos' },
  };
  self.registration.showNotification(title, options);
});

// Notification click → focus or open admin route
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin/pedidos';
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            await client.focus();
            client.postMessage({ type: 'NAVIGATE', url: targetUrl });
            return;
          }
        } catch (_) {}
      }
      await clients.openWindow(targetUrl);
    })()
  );
});

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));