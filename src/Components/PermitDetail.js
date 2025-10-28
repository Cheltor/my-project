import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toEasternLocaleString } from '../utils';

const detailRowClasses =
  'px-4 py-5 text-sm sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-6';

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

  if (loading) return <div className="px-4 py-6 text-sm text-gray-600">Loading…</div>;
  if (error) return <div className="px-4 py-6 text-sm text-red-600">Error: {error}</div>;
  if (!permit) return <div className="px-4 py-6 text-sm text-gray-600">Not found</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Permit #{permit.id}</h1>
        <p className="text-sm text-gray-600">Comprehensive overview of the permit details.</p>
      </div>

      <div className="mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <dl className="divide-y divide-gray-100">
          <div className={detailRowClasses}>
            <dt className="font-medium text-gray-500">Type</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              {permit.permit_type || '—'}
            </dd>
          </div>

          <div className={detailRowClasses}>
            <dt className="font-medium text-gray-500">Paid</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                  permit.paid
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : 'bg-rose-50 text-rose-700 ring-rose-200'
                }`}
              >
                {permit.paid ? 'Paid' : 'Not Paid'}
              </span>
            </dd>
          </div>

          <div className={detailRowClasses}>
            <dt className="font-medium text-gray-500">Permit Number</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              {permit.permit_number || '—'}
            </dd>
          </div>

          <div className={detailRowClasses}>
            <dt className="font-medium text-gray-500">Date Issued</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              {permit.date_issued ? new Date(permit.date_issued).toLocaleDateString() : '—'}
            </dd>
          </div>

          <div className={detailRowClasses}>
            <dt className="font-medium text-gray-500">Expiration Date</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              {permit.expiration_date ? new Date(permit.expiration_date).toLocaleDateString() : '—'}
            </dd>
          </div>

          <div className={detailRowClasses}>
            <dt className="font-medium text-gray-500">Conditions</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              {permit.conditions || '—'}
            </dd>
          </div>

          <div className={detailRowClasses}>
            <dt className="font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              {permit.created_at ? toEasternLocaleString(permit.created_at) : '—'}
            </dd>
          </div>

          <div className={detailRowClasses}>
            <dt className="font-medium text-gray-500">Updated</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              {permit.updated_at ? toEasternLocaleString(permit.updated_at) : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-medium">
        <Link to="/permits" className="text-indigo-600 transition hover:text-indigo-500">
          Back to permits
        </Link>
        {permit.inspection_id && (
          <Link
            to={`/inspection/${permit.inspection_id}`}
            className="inline-flex items-center text-indigo-600 transition hover:text-indigo-500"
          >
            Related inspection #{permit.inspection_id}
          </Link>
        )}
      </div>
    </div>
  );
}
