const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

const registerValidSW = (swUrl, config) => {
  navigator.serviceWorker
    .register(swUrl)
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
        if (
          event.data &&
          event.data.type === 'SERVICE_WORKER_ACTIVATED' &&
          config?.onActivate &&
          hadExistingController
        ) {
          config.onActivate(event);
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

      registration.update();
      setInterval(() => registration.update(), 60 * 60 * 1000);
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
