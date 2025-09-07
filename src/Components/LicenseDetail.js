import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function LicenseDetail() {
  const { id } = useParams();
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/licenses/${id}`);
        if (!res.ok) throw new Error('Failed to fetch license');
        const data = await res.json();
        setLicense(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const LICENSE_TYPE_LABELS = {
    1: 'Business License',
    2: 'Single Family License',
    3: 'Multifamily License',
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!license) return <div className="p-6">Not found</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">License #{license.id}</h1>
          <p className="mt-2 text-sm text-gray-700">Details about this license.</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        <div className="px-4 py-5 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-sm font-medium text-gray-500">Type</div>
          <div className="sm:col-span-2">{LICENSE_TYPE_LABELS[license.license_type] || String(license.license_type)}</div>

          <div className="text-sm font-medium text-gray-500">Paid</div>
          <div className="sm:col-span-2">{license.paid ? 'Paid' : 'Not Paid'}</div>

          <div className="text-sm font-medium text-gray-500">Sent</div>
          <div className="sm:col-span-2">{license.sent ? 'Sent' : 'Not Sent'}</div>

          <div className="text-sm font-medium text-gray-500">Created</div>
          <div className="sm:col-span-2">{new Date(license.created_at).toLocaleString()}</div>

          <div className="text-sm font-medium text-gray-500">Updated</div>
          <div className="sm:col-span-2">{new Date(license.updated_at).toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-6">
        <Link to="/licenses" className="text-indigo-600 hover:text-indigo-800">Back to licenses</Link>
      </div>
    </div>
  );
}
