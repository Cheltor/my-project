import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { toEasternLocaleString } from '../utils';

function formatWhen(ts) {
  if (!ts) return '';
  try {
    return toEasternLocaleString(ts, undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return '';
  }
}

export default function NotificationsPage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const userIdParam = user?.id ? `?user_id=${encodeURIComponent(user.id)}` : '';
  const resp = await apiFetch(`/notifications${userIdParam}`, {}, { onUnauthorized: logout });
      if (!resp || !resp.ok) throw new Error('Failed to load notifications');
      const data = await resp.json();
      const arr = Array.isArray(data) ? data : [];
      arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setItems(arr);
    } catch (e) {
      setError(e.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' }, { onUnauthorized: logout });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      try { window.dispatchEvent(new CustomEvent('notifications:refresh')); } catch {}
    } catch {}
  };

  const onClickItem = async (n) => {
    try {
      if (!n.read) {
        await apiFetch(`/notifications/${n.id}/read`, { method: 'PATCH' }, { onUnauthorized: logout });
        setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
        try { window.dispatchEvent(new CustomEvent('notifications:refresh')); } catch {}
      }
    } catch {}
    if (n.origin_url_path) {
      navigate(n.origin_url_path);
    } else if (n.inspection_id) {
      navigate(`/inspection/${n.inspection_id}`);
    }
  };

  if (!token) return <div className="p-4">Please sign in to view notifications.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Notifications</h1>
        <button
          onClick={markAllRead}
          className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          disabled={items.length === 0 || items.every((n) => n.read)}
        >
          Mark all as read
        </button>
      </div>

      {loading && <div className="text-gray-500">Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <ul className="divide-y divide-gray-200 bg-white rounded shadow">
          {items.length === 0 ? (
            <li className="p-4 text-gray-500">No notifications.</li>
          ) : (
            items.map((n) => (
              <li
                key={n.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer flex items-start gap-3 ${n.read ? '' : 'bg-indigo-50/40'}`}
                onClick={() => onClickItem(n)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{n.title || 'Notification'}</p>
                    {!n.read && (
                      <span className="inline-flex shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">New</span>
                    )}
                  </div>
                  {n.origin_label && (
                    <p className="text-xs text-gray-500 mt-0.5">{n.origin_label}</p>
                  )}
                  {n.body && (
                    <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{n.body}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">{formatWhen(n.created_at)}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
