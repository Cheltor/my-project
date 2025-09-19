import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

// Address-scoped Permits list, styled like the main list but filtered to one address
export default function AddressPermits({ addressId }) {
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!addressId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      const base = process.env.REACT_APP_API_URL;
      try {
        // Try address-specific endpoint first
        let res = await fetch(`${base}/permits/address/${addressId}`);
        if (!res.ok) {
          // Try query param fallback
          res = await fetch(`${base}/permits/?address_id=${encodeURIComponent(addressId)}`);
        }
        if (!res.ok) {
          // Fallback to all + client-side filter
          res = await fetch(`${base}/permits/`);
        }
        if (!res.ok) throw new Error('Failed to fetch permits');
        const data = await res.json();
        const list = Array.isArray(data)
          ? data.filter((p) => String(p.address_id) === String(addressId))
          : [];
        setPermits(list);
      } catch (e) {
        setError(e.message || 'Failed to fetch permits');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [addressId]);

  const sorted = useMemo(() => {
    const arr = [...permits];
    // Newest-first: by created_at desc, fallback id desc
    arr.sort((a, b) => {
      const aT = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bT = b?.created_at ? new Date(b.created_at).getTime() : 0;
      if (bT !== aT) return bT - aT;
      return (b?.id ?? 0) - (a?.id ?? 0);
    });
    return arr;
  }, [permits]);

  if (loading) return <div className="py-6 text-center text-gray-500">Loading permits…</div>;
  if (error) return <div className="py-6 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="mt-2 overflow-x-auto rounded-lg shadow-md">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permit Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspection</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-6 text-center text-sm text-gray-500">No permits for this address.</td>
            </tr>
          ) : (
            sorted.map((permit) => (
              <tr key={permit.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <Link to={`/permit/${permit.id}`} className="text-indigo-600 hover:text-indigo-800">
                    {permit.permit_type || '—'}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {permit.inspection_id ? (
                    <Link to={`/inspection/${permit.inspection_id}`} className="text-indigo-600 hover:text-indigo-800">
                      #{permit.inspection_id}
                    </Link>
                  ) : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {permit.paid ? 'Paid' : 'Not Paid'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {permit.created_at ? new Date(permit.created_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
