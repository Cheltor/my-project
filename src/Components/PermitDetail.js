import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toEasternLocaleString } from '../utils';

export default function PermitDetail() {
  const { id } = useParams();
  const [permit, setPermit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState(null);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [businessError, setBusinessError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [form, setForm] = useState({
    permit_type: '',
    permit_number: '',
    paid: false,
    date_issued: '',
    expiration_date: '',
    conditions: '',
  });

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

  const toDateInput = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    if (!permit) return;
    setForm({
      permit_type: permit.permit_type ?? '',
      permit_number: permit.permit_number ?? '',
      paid: Boolean(permit.paid),
      date_issued: toDateInput(permit.date_issued),
      expiration_date: toDateInput(permit.expiration_date),
      conditions: permit.conditions ?? '',
    });
  }, [permit]);

  useEffect(() => {
    if (!permit?.business_id) {
      setBusiness(null);
      setBusinessError(null);
      setBusinessLoading(false);
      return;
    }
    let cancelled = false;
    setBusinessLoading(true);
    setBusinessError(null);
    setBusiness(null);
    (async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/${permit.business_id}`);
        if (!res.ok) {
          const message = await res.text();
          throw new Error(message || 'Failed to load business');
        }
        const data = await res.json();
        if (!cancelled) {
          setBusiness(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = (err?.message && err.message.trim()) || 'Unable to load business details';
          setBusinessError(message);
          setBusiness(null);
        }
      } finally {
        if (!cancelled) {
          setBusinessLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [permit?.business_id]);

  const businessLabel = useMemo(() => {
    if (!permit?.business_id || !business) return null;
    const preferred = [business.name, business.trading_as].find((value) => value && String(value).trim());
    return preferred || null;
  }, [business, permit?.business_id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    if (!permit) return;
    setForm({
      permit_type: permit.permit_type ?? '',
      permit_number: permit.permit_number ?? '',
      paid: Boolean(permit.paid),
      date_issued: toDateInput(permit.date_issued),
      expiration_date: toDateInput(permit.expiration_date),
      conditions: permit.conditions ?? '',
    });
  };

  const handleCancel = () => {
    resetForm();
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!permit) return;
    setSaving(true);
    setSaveError(null);
      try {
      // Permit type is read-only in the UI; don't send it in updates.
      const numberValue = form.permit_number.trim();
      const hasConditions = form.conditions.trim() !== '';
      const payload = {
        permit_number: numberValue === '' ? null : numberValue,
        paid: Boolean(form.paid),
        date_issued: form.date_issued || null,
        expiration_date: form.expiration_date || null,
        conditions: hasConditions ? form.conditions : null,
      };
      const res = await fetch(`${process.env.REACT_APP_API_URL}/permits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Failed to save permit');
      }
      const updated = await res.json();
      setPermit((prev) => ({ ...(prev || {}), ...updated }));
      setIsEditing(false);
      setSaveError(null);
    } catch (e) {
      setSaveError(e.message || 'Failed to save permit');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-50 px-4">
        <span className="text-sm font-medium text-slate-600">Loading…</span>
      </div>
    );

  if (error)
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-50 px-4">
        <div className="rounded-lg border border-rose-200 bg-white/80 px-6 py-5 text-sm text-rose-600 shadow-sm">
          Error: {error}
        </div>
      </div>
    );

  if (!permit)
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-50 px-4">
        <span className="text-sm font-medium text-slate-600">Not found</span>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Link
              to="/permits"
              className="inline-flex items-center text-sm font-medium text-indigo-600 transition hover:text-indigo-500"
            >
              <span aria-hidden="true" className="mr-1">
                ←
              </span>
              Back to permits
            </Link>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Permit #{permit.id}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Detailed view of the permit record, including payment status and expiration tracking.
            </p>
          </div>
          {isEditing && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-indigo-300"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-200/40">
            <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Permit overview</h2>
              <p className="mt-1 text-sm text-slate-600">Review and update the core details for this permit.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {saveError && (
                <div className="px-6 py-4">
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {saveError}
                  </div>
                </div>
              )}
              <dl className="divide-y divide-slate-100">
                <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                  <dt className="text-sm font-medium text-slate-600">Permit type</dt>
                  <dd className="sm:col-span-2">
                    {/* Permit type is not editable via this UI; always show as read-only badge */}
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-indigo-100">
                      {permit.permit_type || 'Unspecified'}
                    </span>
                  </dd>
                </div>

                <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                  <dt className="text-sm font-medium text-slate-600">Permit number</dt>
                  <dd className="sm:col-span-2">
                    {isEditing ? (
                      <input
                        type="text"
                        name="permit_number"
                        value={form.permit_number}
                        onChange={handleChange}
                        placeholder="e.g. BP-12345"
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <span className="text-sm text-slate-900">{permit.permit_number || 'N/A'}</span>
                    )}
                  </dd>
                </div>

                <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                  <dt className="text-sm font-medium text-slate-600">Inspection</dt>
                  <dd className="sm:col-span-2">
                    {permit.inspection_id ? (
                      <Link
                        to={`/inspection/${permit.inspection_id}`}
                        className="inline-flex items-center text-sm font-medium text-indigo-600 transition hover:text-indigo-500"
                      >
                        Inspection #{permit.inspection_id}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-500">Not linked</span>
                    )}
                  </dd>
                </div>

                <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                  <dt className="text-sm font-medium text-slate-600">Address</dt>
                  <dd className="sm:col-span-2">
                    {permit.address_id ? (
                      <Link
                        to={`/address/${permit.address_id}`}
                        className="inline-flex items-center text-sm font-medium text-indigo-600 transition hover:text-indigo-500"
                      >
                        {permit.combadd || `Address #${permit.address_id}`}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-500">Not linked</span>
                    )}
                  </dd>
                </div>

                {permit.business_id && (
                  <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                    <dt className="text-sm font-medium text-slate-600">Business</dt>
                    <dd className="sm:col-span-2">
                      {businessLoading ? (
                        <span className="text-sm text-slate-500">Loading business…</span>
                      ) : business ? (
                        <Link
                          to={`/businesses/${permit.business_id}`}
                          className="inline-flex items-center text-sm font-medium text-indigo-600 transition hover:text-indigo-500"
                        >
                          {businessLabel || `Business #${permit.business_id}`}
                        </Link>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-slate-500">Business #{permit.business_id}</span>
                          {businessError && (
                            <span className="text-xs font-medium text-rose-600">{businessError}</span>
                          )}
                        </div>
                      )}
                    </dd>
                  </div>
                )}

                <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                  <dt className="text-sm font-medium text-slate-600">Payment status</dt>
                  <dd className="sm:col-span-2">
                    {isEditing ? (
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          name="paid"
                          checked={form.paid}
                          onChange={handleChange}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Marked as paid</span>
                      </label>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          permit.paid
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                            : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
                        }`}
                      >
                        {permit.paid ? 'Paid' : 'Pending payment'}
                      </span>
                    )}
                  </dd>
                </div>

                <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                  <dt className="text-sm font-medium text-slate-600">Date issued</dt>
                  <dd className="sm:col-span-2">
                    {isEditing ? (
                      <input
                        type="date"
                        name="date_issued"
                        value={form.date_issued}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <span className="text-sm text-slate-900">
                        {permit.date_issued ? new Date(permit.date_issued).toLocaleDateString() : '—'}
                      </span>
                    )}
                  </dd>
                </div>

                <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                  <dt className="text-sm font-medium text-slate-600">Expiration date</dt>
                  <dd className="sm:col-span-2">
                    {isEditing ? (
                      <input
                        type="date"
                        name="expiration_date"
                        value={form.expiration_date}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <span className="text-sm text-slate-900">
                        {permit.expiration_date ? new Date(permit.expiration_date).toLocaleDateString() : '—'}
                      </span>
                    )}
                  </dd>
                </div>

                <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                  <dt className="text-sm font-medium text-slate-600">Conditions</dt>
                  <dd className="sm:col-span-2">
                    {isEditing ? (
                      <textarea
                        name="conditions"
                        value={form.conditions}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Add any conditions or notes related to this permit"
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <span className="text-sm text-slate-900 whitespace-pre-wrap">
                        {permit.conditions || '—'}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-200/40">
              <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Key dates</h3>
              </div>
              <dl className="divide-y divide-slate-100 px-5 py-4 text-sm text-slate-700">
                <div className="flex items-start justify-between gap-3 py-2">
                  <dt className="font-medium text-slate-600">Created</dt>
                  <dd className="text-right text-slate-900">{toEasternLocaleString(permit.created_at)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3 py-2">
                  <dt className="font-medium text-slate-600">Last updated</dt>
                  <dd className="text-right text-slate-900">{toEasternLocaleString(permit.updated_at)}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 via-white to-white px-6 py-5 text-sm text-slate-700 shadow-lg shadow-indigo-100">
              <p className="font-semibold text-indigo-700">Need to make changes?</p>
              <p className="mt-1 text-sm text-slate-600">
                Edit the permit to update payment status, expiration dates, and any special conditions that apply.
              </p>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsEditing(true);
                    setSaveError(null);
                  }}
                  className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                >
                  Start editing
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
