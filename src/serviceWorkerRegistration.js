const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

const supportsServiceWorkers = () => typeof window !== 'undefined' && 'serviceWorker' in navigator;
const supportsNotifications = () => typeof window !== 'undefined' && 'Notification' in window;
const supportsPush = () => supportsServiceWorkers() && typeof window !== 'undefined' && 'PushManager' in window;
const SERVICE_WORKER_READY_TIMEOUT_MS = 10_000;

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const getReadyRegistration = async () => {
  if (!supportsServiceWorkers()) {
    throw new Error('Service workers are not supported by this browser.');
  }
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            'Service worker not ready. Use the production HTTPS build and allow the page to finish loading before enabling push.'
          )
        ),
      SERVICE_WORKER_READY_TIMEOUT_MS
    );
  });

  try {
    const registration = await Promise.race([navigator.serviceWorker.ready, timeout]);
    clearTimeout(timer);
    return registration;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
};

const getExistingPushSubscription = async () => {
  if (!supportsPush()) {
    return null;
  }
  try {
    const registration = await getReadyRegistration();
    return registration.pushManager.getSubscription();
  } catch (error) {
    console.warn('Unable to inspect existing push subscriptions.', error);
    return null;
  }
};

const subscribeToPush = async (vapidPublicKey) => {
  if (!supportsPush()) {
    throw new Error('Push notifications are not supported by this browser.');
  }
  if (!vapidPublicKey) {
    throw new Error('Missing VAPID public key for push subscription.');
  }

  const registration = await getReadyRegistration();
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return existing;
  }

  const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey,
  });
};

const unsubscribeFromPush = async () => {
  const subscription = await getExistingPushSubscription();
  if (!subscription) {
    return false;
  }
  try {
    await subscription.unsubscribe();
    return true;
  } catch (error) {
    console.warn('Failed to unsubscribe from push notifications.', error);
    return false;
  }
};

const registerValidSW = (swUrl, config) => {
  navigator.serviceWorker
    .register(swUrl, { updateViaCache: 'none' })
    .then((registration) => {
      const hadExistingController = Boolean(navigator.serviceWorker.controller);
      let hasController = hadExistingController;

      const handleControllerChange = () => {
        if (hasController) {
          if (config?.onBeforeReload) {
            try {
              config.onBeforeReload();
            } catch (err) {
              console.error('onBeforeReload handler threw an error.', err);
            }
          }
          const reloadDelay = Number(config?.reloadDelay);
          const delay = Number.isFinite(reloadDelay) ? reloadDelay : 1500;
          setTimeout(() => {
            window.location.reload();
          }, delay);
        } else {
          hasController = true;
        }
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (!event.data || !event.data.type) {
          return;
        }

        if (event.data.type === 'SERVICE_WORKER_ACTIVATED' && config?.onActivate && hadExistingController) {
          config.onActivate(event);
          return;
        }

        if (event.data.type === 'PUSH_NOTIFICATION') {
          try {
            window.dispatchEvent(new CustomEvent('notifications:refresh'));
            window.dispatchEvent(new CustomEvent('notifications:push', { detail: event.data.payload || null }));
          } catch (err) {
            console.warn('Failed to broadcast push notification event.', err);
          }
          if (config?.onPushMessage) {
            try {
              config.onPushMessage(event.data);
            } catch (err) {
              console.error('onPushMessage handler threw an error.', err);
            }
          }
        }
      });

      const monitorWorker = (worker) => {
        if (!worker) {
          return;
        }

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              if (config?.onUpdate) {
                config.onUpdate(registration);
              }
              registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
            } else if (config?.onSuccess) {
              config.onSuccess(registration);
            }
          }
        });
      };

      monitorWorker(registration.installing);
      registration.addEventListener('updatefound', () => monitorWorker(registration.installing));

      if (registration.waiting && navigator.serviceWorker.controller) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      const forceUpdate = () => registration.update();
      const updateWhenVisible = () => {
        if (document.visibilityState === 'visible') {
          forceUpdate();
        }
      };

      registration.update();
      setInterval(forceUpdate, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', updateWhenVisible);
      window.addEventListener('online', forceUpdate);
    })
    .catch((error) => {
      console.error('Service worker registration failed:', error);
    });
};

const checkValidServiceWorker = (swUrl, config) => {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => window.location.reload());
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
};

export const register = (config) => {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('Service worker ready for offline caching.');
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
};

export const unregister = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error);
      });
  }
};

export const isPushSupported = () => supportsPush();
export const isNotificationSupported = () => supportsNotifications();
export const getNotificationPermissionState = () => {
  if (!supportsNotifications()) {
    return 'unsupported';
  }
  return Notification.permission;
};

export const waitForServiceWorkerReady = () => getReadyRegistration();
export const getPushSubscription = () => getExistingPushSubscription();
export const ensurePushSubscription = (vapidPublicKey) => subscribeToPush(vapidPublicKey);
export const disablePushSubscription = () => unsubscribeFromPush();
