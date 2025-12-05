import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  disablePushNotifications,
  enablePushNotifications,
  fetchPushStatus,
  isPushSupported,
} from '../pushNotifications';

const DEFAULT_PERMISSION = typeof window !== 'undefined' && 'Notification' in window
  ? Notification.permission
  : 'unsupported';

export default function usePushNotifications({ logout } = {}) {
  const supported = useMemo(() => isPushSupported(), []);
  const [permission, setPermission] = useState(DEFAULT_PERMISSION);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!supported) {
      setPermission('unsupported');
      setHasSubscription(false);
      return;
    }
    try {
      const status = await fetchPushStatus();
      setPermission(status.permission);
      setHasSubscription(Boolean(status.hasSubscription));
      setError(null);
    } catch (err) {
      setError(err.message || 'Unable to determine notification status.');
    }
  }, [supported]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!supported) {
      throw new Error('Push notifications are not supported in this browser.');
    }
    setLoading(true);
    setError(null);
    try {
      await enablePushNotifications({ logout });
      await refresh();
    } catch (err) {
      setError(err.message || 'Unable to enable push notifications.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supported, logout, refresh]);

  const disable = useCallback(async () => {
    if (!supported) {
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await disablePushNotifications({ logout });
      await refresh();
      return result;
    } catch (err) {
      setError(err.message || 'Unable to disable push notifications.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supported, logout, refresh]);

  return {
    supported,
    permission,
    hasSubscription,
    loading,
    error,
    enable,
    disable,
    refresh,
  };
}
