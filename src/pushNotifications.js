import { apiFetch } from './api';
import {
  isPushSupported as swPushSupported,
  isNotificationSupported,
  getNotificationPermissionState,
  ensurePushSubscription,
  getPushSubscription,
  disablePushSubscription,
} from './serviceWorkerRegistration';

const VAPID_PUBLIC_KEY = process.env.REACT_APP_WEB_PUSH_PUBLIC_KEY || '';

const requirePermission = async () => {
  if (!isNotificationSupported()) {
    throw new Error('This browser does not support desktop notifications.');
  }

  const current = Notification.permission;
  if (current === 'granted') {
    return 'granted';
  }
  if (current === 'denied') {
    throw new Error('Notifications are blocked in the browser. Enable them in site settings.');
  }

  const result = await Notification.requestPermission();
  if (result !== 'granted') {
    throw new Error('Notifications permission was not granted.');
  }
  return result;
};

const syncSubscription = async (subscription, logout) => {
  if (!subscription) {
    throw new Error('Missing push subscription.');
  }

  const payload = subscription.toJSON();
  await apiFetch(
    '/push-subscriptions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: payload.endpoint,
        keys: payload.keys,
        expiration_time: payload.expirationTime,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
    },
    { onUnauthorized: logout }
  );
};

export const isPushSupported = () => swPushSupported() && isNotificationSupported();

export const enablePushNotifications = async ({ logout } = {}) => {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported on this device.');
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Missing REACT_APP_WEB_PUSH_PUBLIC_KEY.');
  }

  await requirePermission();
  const subscription = await ensurePushSubscription(VAPID_PUBLIC_KEY);
  await syncSubscription(subscription, logout);
  return subscription;
};

export const disablePushNotifications = async ({ logout } = {}) => {
  const subscription = await getPushSubscription();
  if (!subscription) {
    return false;
  }

  const payload = subscription.toJSON();
  await apiFetch(
    '/push-subscriptions',
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: payload.endpoint }),
    },
    { onUnauthorized: logout }
  );

  await disablePushSubscription();
  return true;
};

export const fetchPushStatus = async () => {
  if (!isPushSupported()) {
    return { permission: 'unsupported', hasSubscription: false };
  }
  const permission = getNotificationPermissionState();
  const subscription = await getPushSubscription();
  return { permission, hasSubscription: Boolean(subscription) };
};
