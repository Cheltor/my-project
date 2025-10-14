import React, { useEffect, useState } from 'react';
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
  // New: chat logs state
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState(null);
  // Pagination & filters
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [filterUserId, setFilterUserId] = useState('');
  const [filterThreadId, setFilterThreadId] = useState('');
  const [filterQ, setFilterQ] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  // Note: do not return early here (hooks must be declared unconditionally).
  // We'll check admin permission after all hooks are declared.

  // Fetch recent logs on mount
  const buildLogsUrl = (opts = {}) => {
    const params = new URLSearchParams();
    params.set('limit', opts.limit ?? limit);
    params.set('offset', opts.offset ?? offset);
    const rawUser = (opts.user_id ?? filterUserId);
    if (rawUser !== undefined && rawUser !== null && String(rawUser).toString().trim() !== '') {
      const s = String(rawUser).trim();
      const parsed = Number(s);
      if (!Number.isNaN(parsed)) {
        params.set('user_id', String(Math.floor(parsed)));
      } else {
        // treat as email or partial email
        params.set('user_email', s);
      }
    }
    if (opts.thread_id ?? filterThreadId) params.set('thread_id', opts.thread_id ?? filterThreadId);
    if (opts.q ?? filterQ) params.set('q', opts.q ?? filterQ);
    if (opts.start_date ?? filterStart) params.set('start_date', opts.start_date ?? filterStart);
    if (opts.end_date ?? filterEnd) params.set('end_date', opts.end_date ?? filterEnd);
    return `${process.env.REACT_APP_API_URL}/settings/chat/logs?${params.toString()}`;
  };

  useEffect(() => {
    let mounted = true;
    const fetchLogs = async () => {
      setLoadingLogs(true);
      setLogsError(null);
      try {
        const token = localStorage.getItem('token') || (ctxUser && ctxUser.token);
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const resp = await fetch(buildLogsUrl({ limit, offset }), { headers });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(txt || 'Failed to fetch chat logs');
        }
        const data = await resp.json();
        if (mounted) {
          setLogs(data.items || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error('Failed to load chat logs', err);
        if (mounted) setLogsError('Failed to load logs');
      } finally {
        if (mounted) setLoadingLogs(false);
      }
    };
    fetchLogs();
    return () => {
      mounted = false;
    };
  }, [ctxUser, limit, offset, filterUserId, filterThreadId, filterQ, filterStart, filterEnd]);

  // Don't render UI if not admin
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

      <div className="mt-4">
        <h3 className="font-medium mb-2">Recent Chat Logs</h3>
        <div className="mb-2 flex gap-2 items-center">
          <input className="border p-1 rounded" placeholder="user id" value={filterUserId} onChange={(e)=>setFilterUserId(e.target.value)} />
          <input className="border p-1 rounded" placeholder="thread id" value={filterThreadId} onChange={(e)=>setFilterThreadId(e.target.value)} />
          <input className="border p-1 rounded" placeholder="search text" value={filterQ} onChange={(e)=>setFilterQ(e.target.value)} />
          <input type="date" className="border p-1 rounded" value={filterStart} onChange={(e)=>setFilterStart(e.target.value)} />
          <input type="date" className="border p-1 rounded" value={filterEnd} onChange={(e)=>setFilterEnd(e.target.value)} />
          <button className="px-2 py-1 bg-gray-100 rounded" onClick={()=>{ setOffset(0); /* triggers useEffect */ }}>Apply</button>
          <button className="px-2 py-1 bg-gray-100 rounded" onClick={()=>{ setFilterUserId(''); setFilterThreadId(''); setFilterQ(''); setFilterStart(''); setFilterEnd(''); setOffset(0); }}>Clear</button>
        </div>

        {loadingLogs && <div>Loading logs…</div>}
        {logsError && <div className="text-red-600">{logsError}</div>}

        {!loadingLogs && logs.length === 0 && <div className="text-sm text-gray-600">No logs yet.</div>}

        {!loadingLogs && logs.length > 0 && (
          <div>
            {/* Desktop/tablet layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="pr-4">When</th>
                    <th className="pr-4">User</th>
                    <th className="pr-4">Question</th>
                    <th>Assistant Reply</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="align-top border-t">
                      <td className="py-2 pr-4">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{l.user_email || l.user_id}</td>
                      <td className="py-2 pr-4">
                        <div className="max-w-xs truncate">{l.user_message}</div>
                        <button className="text-xs text-blue-600 underline" onClick={()=>setSelectedLog(l)}>View</button>
                      </td>
                      <td className="py-2">
                        <div className="max-w-xl truncate">{l.assistant_reply}</div>
                        <button className="text-xs text-blue-600 underline" onClick={()=>setSelectedLog(l)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile layout - stacked cards */}
            <div className="md:hidden space-y-3">
              {logs.map((l) => (
                <div key={l.id} className="p-3 border rounded bg-white shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="text-xs text-gray-500">{new Date(l.created_at).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{l.user_email || l.user_id}</div>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-medium">Question</div>
                    <div className="text-sm text-gray-700 truncate">{l.user_message}</div>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-medium">Reply</div>
                    <div className="text-sm text-gray-700 truncate">{l.assistant_reply}</div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button className="text-xs text-blue-600 underline" onClick={()=>setSelectedLog(l)}>View</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination controls */}
        <div className="mt-2 flex items-center gap-2">
          <div className="text-sm">Total: {total}</div>
          <button className="px-2 py-1 bg-gray-100 rounded" disabled={offset<=0} onClick={()=>setOffset(Math.max(0, offset - limit))}>Prev</button>
          <button className="px-2 py-1 bg-gray-100 rounded" disabled={offset+limit>=total} onClick={()=>setOffset(offset + limit)}>Next</button>
          <select value={limit} onChange={(e)=>{ setLimit(Number(e.target.value)); setOffset(0); }} className="border p-1 rounded">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Detail modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded max-w-2xl w-full">
              <div className="flex justify-between items-start">
                <h4 className="text-lg font-semibold">Chat Log Detail</h4>
                <button className="text-gray-600" onClick={()=>setSelectedLog(null)}>Close</button>
              </div>
              <div className="mt-2">
                <div className="text-xs text-gray-500">When: {new Date(selectedLog.created_at).toLocaleString()}</div>
                <div className="text-xs text-gray-500">User: {selectedLog.user_email || selectedLog.user_id}</div>
                <div className="mt-3">
                  <h5 className="font-medium">Question</h5>
                  <pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded">{selectedLog.user_message}</pre>
                </div>
                <div className="mt-3">
                  <h5 className="font-medium">Assistant Reply</h5>
                  <pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded">{selectedLog.assistant_reply}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChat;
