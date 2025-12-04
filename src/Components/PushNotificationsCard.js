import React, { useMemo, useState } from 'react';
import { useAuth } from '../AuthContext';
import usePushNotifications from '../Hooks/usePushNotifications';
import { apiFetch } from '../api';

const STATUS_COPY = {
  unsupported: 'Your browser does not support desktop notifications.',
  denied: 'Notifications are blocked in your browser. Re-enable them in site settings to continue.',
  default: 'Enable desktop alerts to receive real-time updates without keeping this tab focused.',
  idle: 'Enable desktop alerts to receive real-time updates without keeping this tab focused.',
  enabled: 'Desktop alerts are active. You will receive push notifications on this device.',
};

export default function PushNotificationsCard({ compact = false }) {
  const { logout } = useAuth();
  const { supported, permission, hasSubscription, loading, error, enable, disable } = usePushNotifications({ logout });
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState(null);

  const copy = useMemo(() => {
    if (!supported) return STATUS_COPY.unsupported;
    if (permission === 'denied') return STATUS_COPY.denied;
    if (permission === 'granted' && hasSubscription) return STATUS_COPY.enabled;
    return STATUS_COPY.default;
  }, [supported, permission, hasSubscription]);

  const statusLabel = useMemo(() => {
    if (!supported) return 'not supported';
    if (permission === 'denied') return 'blocked';
    if (permission === 'granted' && hasSubscription) return 'enabled';
    if (permission === 'granted') return 'ready to enable';
    return 'permission required';
  }, [supported, permission, hasSubscription]);

  const handleEnable = async () => {
    setTestMessage(null);
    try {
      await enable();
    } catch (err) {
      // errors are surfaced via hook state
    }
  };

  const handleDisable = async () => {
    setTestMessage(null);
    try {
      await disable();
    } catch (err) {
      // errors are surfaced via hook state
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestMessage(null);
    try {
      const response = await apiFetch('/notifications/test-push', { method: 'POST' }, { onUnauthorized: logout });
      if (response && response.ok) {
        setTestMessage({ type: 'success', text: 'Test notification sent. Check your desktop tray.' });
      } else {
        throw new Error('Unable to send test notification.');
      }
    } catch (err) {
      setTestMessage({ type: 'error', text: err.message || 'Unable to send test notification.' });
    } finally {
      setTesting(false);
    }
  };

  const actionDisabled = loading || testing;
  const showActions = supported && permission !== 'denied';

  return (
    <section
      className={`${compact ? 'p-3' : 'p-4'} rounded-lg border border-gray-200 bg-white shadow-sm flex flex-col gap-3`}
      aria-live="polite"
    >
      <div>
        <p className="text-base font-semibold text-gray-900">Desktop notifications</p>
        <p className="mt-1 text-sm text-gray-600">{copy}</p>
        <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">Status: {statusLabel}</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {testMessage && (
          <p
            className={`mt-2 text-sm ${testMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
          >
            {testMessage.text}
          </p>
        )}
      </div>
      {showActions && (
        <div className="flex flex-wrap items-center gap-2">
          {permission === 'granted' && hasSubscription ? (
            <>
              <button
                type="button"
                onClick={handleDisable}
                disabled={actionDisabled}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
              >
                {loading ? 'Disabling…' : 'Disable'}
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={actionDisabled}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {testing ? 'Sending…' : 'Send test alert'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleEnable}
              disabled={actionDisabled}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? 'Enabling…' : 'Enable desktop alerts'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
