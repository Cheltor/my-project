/* eslint-disable no-restricted-globals */
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';

clientsClaim();
self.skipWaiting();

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');

registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' && !url.pathname.match(fileExtensionRegexp),
  createHandlerBoundToURL(`${process.env.PUBLIC_URL}/index.html`)
);

registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/static/'),
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);

// Cache API requests
registerRoute(
  ({ url }) => {
    const apiUrl = process.env.REACT_APP_API_URL;
    if (!apiUrl) return false;
    return url.href.startsWith(apiUrl);
  },
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
  })
);

const broadcastMessage = async (message) => {
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage(message);
  }
};

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await broadcastMessage({ type: 'SERVICE_WORKER_ACTIVATED' });
    })()
  );
});

const DEFAULT_NOTIFICATION_TITLE = 'CodeSoft update';
const DEFAULT_NOTIFICATION_BODY = 'Open CodeSoft to see what changed.';
const notificationIcon = `${self.location.origin}/logo192.png`;
const notificationBadge = `${self.location.origin}/logo192.png`;

const normalizePushPayload = (eventData) => {
  if (!eventData) {
    return { title: DEFAULT_NOTIFICATION_TITLE, body: DEFAULT_NOTIFICATION_BODY };
  }
  try {
    const parsed = eventData.json();
    return typeof parsed === 'object' && parsed !== null ? parsed : { title: String(parsed) };
  } catch (error) {
    try {
      return { title: DEFAULT_NOTIFICATION_TITLE, body: eventData.text() };
    } catch (err) {
      return { title: DEFAULT_NOTIFICATION_TITLE, body: DEFAULT_NOTIFICATION_BODY };
    }
  }
};

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const payload = normalizePushPayload(event.data);
      const title = payload?.title || DEFAULT_NOTIFICATION_TITLE;
      const data = payload?.data || {};

      const options = {
        body: payload?.body || DEFAULT_NOTIFICATION_BODY,
        icon: payload?.icon || notificationIcon,
        badge: payload?.badge || notificationBadge,
        data,
        tag: payload?.tag || (data?.notificationId ? `notif-${data.notificationId}` : undefined),
        requireInteraction: Boolean(payload?.requireInteraction),
        timestamp: Date.now(),
      };

      try {
        await self.registration.showNotification(title, options);
      } catch (error) {
        console.warn('Unable to show push notification.', error);
      }

      await broadcastMessage({ type: 'PUSH_NOTIFICATION', payload });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = event.notification?.data?.url;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const normalizedUrl = destination ? new URL(destination, self.location.origin).href : self.location.origin;
      const visibleClient = allClients.find((client) => 'focus' in client);
      if (visibleClient) {
        await visibleClient.focus();
        if (destination && typeof visibleClient.navigate === 'function') {
          try {
            await visibleClient.navigate(normalizedUrl);
          } catch (error) {
            console.warn('Unable to navigate client after notification click.', error);
          }
        }
        return;
      }

      if (normalizedUrl) {
        await self.clients.openWindow(normalizedUrl);
      }
    })()
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const newSubscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: event.oldSubscription?.options?.applicationServerKey || event.newSubscription?.options?.applicationServerKey,
        });
        await broadcastMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED', payload: newSubscription?.toJSON?.() });
      } catch (error) {
        await broadcastMessage({ type: 'PUSH_SUBSCRIPTION_ERROR', error: error?.message || 'Unable to resubscribe' });
      }
    })()
  );
});
