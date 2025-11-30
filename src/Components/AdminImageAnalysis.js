import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { toEasternLocaleString } from '../utils';

const AdminImageAnalysis = ({ user: userProp, enabled: initialEnabled, setEnabled }) => {
  const { user: ctxUser } = useAuth();
  const user = ctxUser || userProp;

  const [loading, setLoading] = useState(false);
  const [localEnabled, setLocalEnabled] = useState(
    typeof initialEnabled === 'boolean' ? initialEnabled : true
  );
  const [toast, setToast] = useState(null);

  // Logs state
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState(null);

  // Pagination & filters
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [filterUserId, setFilterUserId] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  // Sync prop to local state
  useEffect(() => {
    if (typeof initialEnabled === 'boolean') {
      setLocalEnabled(initialEnabled);
    }
  }, [initialEnabled]);

  const buildLogsUrl = React.useCallback((opts = {}) => {
    const params = new URLSearchParams();
    params.set('limit', opts.limit ?? limit);
    params.set('offset', opts.offset ?? offset);

    const rawUser = (opts.user_id ?? filterUserId);
    if (rawUser !== undefined && rawUser !== null && String(rawUser).toString().trim() !== '') {
      params.set('user_id', String(rawUser).trim());
    }

    if (opts.start_date ?? filterStart) params.set('start_date', opts.start_date ?? filterStart);
    if (opts.end_date ?? filterEnd) params.set('end_date', opts.end_date ?? filterEnd);

    return `${process.env.REACT_APP_API_URL}/settings/image-analysis/logs?${params.toString()}`;
  }, [limit, offset, filterUserId, filterStart, filterEnd]);

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
          throw new Error(txt || 'Failed to fetch logs');
        }
        const data = await resp.json();
        if (mounted) {
          setLogs(data.items || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error('Failed to load logs', err);
        if (mounted) setLogsError('Failed to load logs');
      } finally {
        if (mounted) setLoadingLogs(false);
      }
    };
    fetchLogs();
    return () => {
      mounted = false;
    };
  }, [ctxUser, limit, offset, filterUserId, filterStart, filterEnd, buildLogsUrl]);

  if (!user || user.role !== 3) return null;

  const toggleSetting = async (e) => {
    const next = e.target.checked;
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || (ctxUser && ctxUser.token);
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/settings/image-analysis`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ enabled: next }),
      });
      if (!resp.ok) {
        throw new Error('Failed to update setting');
      }
      setLocalEnabled(next);
      if (typeof setEnabled === 'function') setEnabled(next);
      setToast({ type: 'success', message: `Image Analysis ${next ? 'enabled' : 'disabled'}` });
    } catch (err) {
      console.error('Failed to update setting', err);
      setToast({ type: 'error', message: 'Failed to update setting' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow border mt-4">
      <h2 className="text-lg font-semibold mb-2">Image Analysis Controls</h2>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={localEnabled}
          disabled={loading}
          onChange={toggleSetting}
        />
        Enable Image Analysis
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
        <h3 className="font-medium mb-2">Recent Analysis Logs</h3>
        <div className="mb-2 flex gap-2 items-center flex-wrap">
          <input className="border p-1 rounded" placeholder="user id" value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)} />
          <input type="date" className="border p-1 rounded" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
          <input type="date" className="border p-1 rounded" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
          <button className="px-2 py-1 bg-gray-100 rounded" onClick={() => { setOffset(0); /* triggers useEffect */ }}>Apply</button>
          <button className="px-2 py-1 bg-gray-100 rounded" onClick={() => { setFilterUserId(''); setFilterStart(''); setFilterEnd(''); setOffset(0); }}>Clear</button>
        </div>

        {loadingLogs && <div>Loading logs…</div>}
        {logsError && <div className="text-red-600">{logsError}</div>}

        {!loadingLogs && logs.length === 0 && <div className="text-sm text-gray-600">No logs yet.</div>}

        {!loadingLogs && logs.length > 0 && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Images</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="align-top border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 whitespace-nowrap">{toEasternLocaleString(l.created_at)}</td>
                      <td className="py-2 pr-4">{l.user_email || l.user_id}</td>
                      <td className="py-2 pr-4">{l.image_count}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${l.status === 'success' ? 'bg-green-100 text-green-800' : l.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2">
                        <button className="text-xs text-blue-600 underline" onClick={() => setSelectedLog(l)}>View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination controls */}
        <div className="mt-2 flex items-center gap-2">
          <div className="text-sm">Total: {total}</div>
          <button className="px-2 py-1 bg-gray-100 rounded" disabled={offset <= 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Prev</button>
          <button className="px-2 py-1 bg-gray-100 rounded" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>Next</button>
          <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); }} className="border p-1 rounded">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Detail modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-semibold">Analysis Log Detail</h4>
                <button className="text-gray-600 text-xl font-bold" onClick={() => setSelectedLog(null)}>&times;</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Metadata</div>
                  <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                    <div><strong>ID:</strong> {selectedLog.id}</div>
                    <div><strong>When:</strong> {toEasternLocaleString(selectedLog.created_at)}</div>
                    <div><strong>User:</strong> {selectedLog.user_email || selectedLog.user_id}</div>
                    <div><strong>Status:</strong> {selectedLog.status}</div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm text-gray-500 mb-1">Result JSON</div>
                    <pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded text-xs h-64 overflow-y-auto border">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLog.result), null, 2);
                        } catch (e) {
                          return selectedLog.result;
                        }
                      })()}
                    </pre>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-1">Analyzed Images</div>
                  <div className="bg-gray-50 p-3 rounded min-h-[200px]">
                    {selectedLog.images && selectedLog.images.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedLog.images.map((img, idx) => (
                          <div key={idx} className="border rounded overflow-hidden bg-white">
                            <a href={img.url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={img.url}
                                alt={`Analysis ${idx + 1}`}
                                className="w-full h-32 object-cover hover:opacity-90 transition-opacity"
                              />
                            </a>
                            <div className="p-1 text-xs text-gray-500 truncate" title={img.filename}>
                              {img.filename}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center py-8">No images available</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminImageAnalysis;
