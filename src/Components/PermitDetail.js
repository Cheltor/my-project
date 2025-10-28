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
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Permit Detail</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">Permit #{permit.id}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Inspect payment status, issuance dates, and any conditions associated with this permit.
            </p>
          </div>
          {permit.inspection_id && (
            <Link
              to={`/inspection/${permit.inspection_id}`}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              View inspection #{permit.inspection_id}
            </Link>
          )}
        </header>

        <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <dl className="divide-y divide-gray-100">
            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Type</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">{permit.permit_type || '—'}</dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Paid</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {permit.paid ? (
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    Paid
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                    Not paid
                  </span>
                )}
              </dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Permit Number</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">{permit.permit_number || '—'}</dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Date Issued</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {permit.date_issued ? new Date(permit.date_issued).toLocaleDateString() : '—'}
              </dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Expiration Date</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {permit.expiration_date ? new Date(permit.expiration_date).toLocaleDateString() : '—'}
              </dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Conditions</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {permit.conditions ? (
                  <p className="whitespace-pre-line leading-relaxed text-gray-700">{permit.conditions}</p>
                ) : (
                  '—'
                )}
              </dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Created</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {permit.created_at ? toEasternLocaleString(permit.created_at) : '—'}
              </dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Updated</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {permit.updated_at ? toEasternLocaleString(permit.updated_at) : '—'}
              </dd>
            </div>
          </dl>
        </section>

        <footer className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/permits"
            className="text-sm font-semibold text-indigo-600 underline-offset-4 transition hover:text-indigo-500 hover:underline"
          >
            Back to all permits
          </Link>
          {permit.business_id && (
            <Link
              to={`/businesses/${permit.business_id}`}
              className="text-sm font-semibold text-slate-600 underline-offset-4 transition hover:text-slate-500 hover:underline"
            >
              View related business
            </Link>
          )}
        </footer>
      </div>
    </div>
  );
}
