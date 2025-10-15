import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toEasternLocaleString } from '../utils';

export default function PermitDetail() {
  const { id } = useParams();
  const [permit, setPermit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/permits/${id}`);
        if (!res.ok) throw new Error('Failed to fetch permit');
        const data = await res.json();
        setPermit(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!permit) return <div className="p-6">Not found</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Permit #{permit.id}</h1>
          <p className="mt-2 text-sm text-gray-700">Details about this permit.</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        <div className="px-4 py-5 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-sm font-medium text-gray-500">Type</div>
          <div className="sm:col-span-2">{permit.permit_type || '—'}</div>

          <div className="text-sm font-medium text-gray-500">Paid</div>
          <div className="sm:col-span-2">{permit.paid ? 'Paid' : 'Not Paid'}</div>

          <div className="text-sm font-medium text-gray-500">Permit Number</div>
          <div className="sm:col-span-2">{permit.permit_number || '—'}</div>

          <div className="text-sm font-medium text-gray-500">Date Issued</div>
          <div className="sm:col-span-2">{permit.date_issued ? new Date(permit.date_issued).toLocaleDateString() : '—'}</div>

          <div className="text-sm font-medium text-gray-500">Expiration Date</div>
          <div className="sm:col-span-2">{permit.expiration_date ? new Date(permit.expiration_date).toLocaleDateString() : '—'}</div>

          <div className="text-sm font-medium text-gray-500">Conditions</div>
          <div className="sm:col-span-2">{permit.conditions || '—'}</div>

          <div className="text-sm font-medium text-gray-500">Created</div>
          <div className="sm:col-span-2">{permit.created_at ? toEasternLocaleString(permit.created_at) : '—'}</div>

          <div className="text-sm font-medium text-gray-500">Updated</div>
          <div className="sm:col-span-2">{permit.updated_at ? toEasternLocaleString(permit.updated_at) : '—'}</div>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <Link to="/permits" className="text-indigo-600 hover:text-indigo-800">Back to permits</Link>
        {permit.inspection_id && (
          <Link to={`/inspection/${permit.inspection_id}`} className="text-indigo-600 hover:text-indigo-800">Related inspection #{permit.inspection_id}</Link>
        )}
      </div>
    </div>
  );
}
