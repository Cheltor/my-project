/* eslint-disable no-restricted-globals */
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

clientsClaim();
self.skipWaiting();

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
