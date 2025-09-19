import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

// Address-scoped Licenses list, styled like the main list but filtered to one address
export default function AddressLicenses({ addressId }) {
  const LICENSE_TYPE_LABELS = {
    1: 'Business License',
    2: 'Single Family License',
    3: 'Multifamily License',
  };

  const [licenses, setLicenses] = useState([]);
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
        let res = await fetch(`${base}/licenses/address/${addressId}`);
        if (!res.ok) {
          // Try query param fallback
          res = await fetch(`${base}/licenses/?address_id=${encodeURIComponent(addressId)}`);
        }
        if (!res.ok) {
          // Fallback to all + client-side filter
          res = await fetch(`${base}/licenses/`);
        }
        if (!res.ok) throw new Error('Failed to fetch licenses');
        const data = await res.json();
        const list = Array.isArray(data)
          ? data.filter((l) => String(l.address_id) === String(addressId))
          : [];
        setLicenses(list);
      } catch (e) {
        setError(e.message || 'Failed to fetch licenses');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [addressId]);

  const sorted = useMemo(() => {
    const arr = [...licenses];
    // Newest-first: by created_at desc, fallback id desc
    arr.sort((a, b) => {
      const aT = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bT = b?.created_at ? new Date(b.created_at).getTime() : 0;
      if (bT !== aT) return bT - aT;
      return (b?.id ?? 0) - (a?.id ?? 0);
    });
    return arr;
  }, [licenses]);

  if (loading) return <div className="py-6 text-center text-gray-500">Loading licenses…</div>;
  if (error) return <div className="py-6 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="mt-2 overflow-x-auto rounded-lg shadow-md">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License #</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspection</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiration</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-6 text-center text-sm text-gray-500">No licenses for this address.</td>
            </tr>
          ) : (
            sorted.map((license) => (
              <tr key={license.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link to={`/license/${license.id}`} className="text-indigo-600 hover:text-indigo-800">
                    {license.license_number || '—'}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <Link to={`/license/${license.id}`} className="text-indigo-600 hover:text-indigo-800">
                    {LICENSE_TYPE_LABELS[license.license_type] || String(license.license_type ?? '—')}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {license.inspection_id ? (
                    <Link to={`/inspection/${license.inspection_id}`} className="text-indigo-600 hover:text-indigo-800">
                      #{license.inspection_id}
                    </Link>
                  ) : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {license.paid ? 'Paid' : 'Not Paid'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {license.sent ? 'Sent' : 'Not Sent'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {license.expiration_date ? new Date(license.expiration_date).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
