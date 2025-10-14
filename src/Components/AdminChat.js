import React, { useState } from 'react';
import { useAuth } from '../AuthContext';

const AdminChat = ({ user: userProp, chatEnabled: initialChatEnabled, setChatEnabled }) => {
  // Prefer token from AuthContext; fall back to user prop for role checks
  const { user: ctxUser } = useAuth();
  const user = ctxUser || userProp;

  // React hooks must be called unconditionally at the top of the component
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(
    typeof initialChatEnabled === 'boolean' ? initialChatEnabled : true
  );
  const [toast, setToast] = useState(null);

  // Only show for admin users (role === 3)
  if (!user || user.role !== 3) return null;

  return (
    <div className="p-4 bg-white rounded shadow border mt-4">
      <h2 className="text-lg font-semibold mb-2">Admin Chat Controls</h2>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          disabled={loading}
          onChange={async (e) => {
            const next = e.target.checked;
            setLoading(true);
            try {
              // Send to backend
              const token = localStorage.getItem('token') || (ctxUser && ctxUser.token);
              const headers = {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              };
              const resp = await fetch(`${process.env.REACT_APP_API_URL}/settings/chat`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ enabled: next }),
              });
              if (!resp.ok) {
                throw new Error('Failed to update setting');
              }
              setEnabled(next);
              if (typeof setChatEnabled === 'function') setChatEnabled(next);
              setToast({ type: 'success', message: `Chat ${next ? 'enabled' : 'disabled'}` });
            } catch (err) {
              console.error('Failed to update chat setting', err);
              setToast({ type: 'error', message: 'Failed to update chat setting' });
            } finally {
              setLoading(false);
            }
          }}
        />
        Enable Chat Widget
      </label>
      {toast && (
        <div
          className={`mt-3 p-2 rounded text-sm ${toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
        >
          {toast.message}
          <button className="ml-3 text-xs underline" onClick={() => setToast(null)}>Dismiss</button>
        </div>
      )}
    </div>
  );
};

export default AdminChat;
