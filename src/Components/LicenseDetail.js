import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toEasternLocaleString } from '../utils';

export default function LicenseDetail() {
  const { id } = useParams();
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [business, setBusiness] = useState(null);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [businessError, setBusinessError] = useState(null);
  const [form, setForm] = useState({
    license_type: '',
    license_number: '',
    paid: false,
    sent: false,
    date_issued: '',
    expiration_date: '',
    fiscal_year: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/licenses/${id}`);
        if (!res.ok) throw new Error('Failed to fetch license');
        const data = await res.json();
        setLicense(data);
      } catch (e) {
        setLoadError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const LICENSE_TYPE_LABELS = {
    0: 'Business License',
    1: 'Business License',
    2: 'Single Family License',
    3: 'Multifamily License',
  };

  const toDateInput = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Build a sensible list of fiscal year options (current +/- a few years),
  // and include the existing license's fiscal year if it's outside the range.
  const fiscalYearOptions = useMemo(() => {
    const today = new Date();
    const currentEndYear = today.getMonth() < 6 ? today.getFullYear() : today.getFullYear() + 1; // FY ends June
    const range = [];
    for (let end = currentEndYear + 3; end >= currentEndYear - 6; end--) {
      range.push(`${end - 1}-${end}`);
    }
    if (license?.fiscal_year && !range.includes(license.fiscal_year)) {
      range.unshift(license.fiscal_year);
    }
    return range.map((fy) => {
      const parts = String(fy).split('-');
      const end = parts[1] ? parts[1] : '';
      const endYY = end ? String(end).slice(-2) : '';
      return { value: fy, label: `FY${endYY} (${fy})` };
    });
  }, [license?.fiscal_year]);

  const buildFormState = (data) => ({
    license_type: data.license_type ?? '',
    license_number: data.license_number ?? '',
    paid: Boolean(data.paid),
    sent: Boolean(data.sent),
    date_issued: toDateInput(data.date_issued),
    expiration_date: toDateInput(data.expiration_date),
    fiscal_year: data.fiscal_year ?? '',
  });

  useEffect(() => {
    if (!license) return;
    // Initialize form from loaded license
    setForm(buildFormState(license));
  }, [license]);

  useEffect(() => {
    if (!license?.business_id) {
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
        const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/${license.business_id}`);
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
          const message = (err && err.message && err.message.trim()) || 'Unable to load business details';
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
  }, [license?.business_id]);

  const businessLabel = useMemo(() => {
    if (!license?.business_id || !business) return null;
    const preferred = [business.name, business.trading_as].find((value) => value && String(value).trim());
    return preferred || null;
  }, [business, license?.business_id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Special handling: selecting a fiscal year sets the expiration date to June 29 of the end year
    if (name === 'fiscal_year') {
      let newExp = '';
      if (value) {
        const parts = String(value).split('-');
        const endYear = parseInt(parts[1], 10);
        if (!Number.isNaN(endYear)) {
          newExp = `${endYear}-06-29`;
        }
      }
      setForm((prev) => ({
        ...prev,
        fiscal_year: value,
        expiration_date: newExp || prev.expiration_date,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (!license) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        license_type: form.license_type === '' ? null : Number(form.license_type),
        license_number: form.license_number === '' ? null : form.license_number,
        paid: Boolean(form.paid),
        sent: Boolean(form.sent),
        date_issued: form.date_issued || null,
        expiration_date: form.expiration_date || null,
        fiscal_year: form.fiscal_year === '' ? null : form.fiscal_year,
      };
      const res = await fetch(`${process.env.REACT_APP_API_URL}/licenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save license');
      const updated = await res.json();
      setLicense(updated);
      setIsEditing(false);
      setFormError(null);
    } catch (e) {
      setFormError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormError(null);
    if (license) {
      setForm(buildFormState(license));
    }
  };

  const formatDisplayDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const inputBaseClasses =
    'mt-2 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0';

  const selectClasses = `${inputBaseClasses} pr-10`;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-12">
        <p className="text-sm font-medium text-gray-500">Loading license details…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-12">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 shadow-sm">
          Error: {loadError}
        </div>
      </div>
    );
  }

  if (!license) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-12">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-medium text-gray-600 shadow-sm">
          License not found.
        </div>
      </div>
    );
  }

  const paidStatus = isEditing ? Boolean(form.paid) : Boolean(license.paid);
  const sentStatus = isEditing ? Boolean(form.sent) : Boolean(license.sent);
  const licenseNumber = license.license_number || 'Not provided';
  const licenseTypeLabel = LICENSE_TYPE_LABELS[license.license_type] || LICENSE_TYPE_LABELS[form.license_type] || 'License';
  const statusBadges = [
    {
      key: 'paid',
      label: paidStatus ? 'Paid' : 'Unpaid',
      tone: paidStatus
        ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
        : 'bg-amber-100 text-amber-700 ring-amber-200',
    },
    {
      key: 'sent',
      label: sentStatus ? 'Sent' : 'Not Sent',
      tone: sentStatus
        ? 'bg-sky-100 text-sky-700 ring-sky-200'
        : 'bg-gray-100 text-gray-600 ring-gray-200',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/licenses"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-500"
          >
            <span aria-hidden="true">←</span>
            Back to licenses
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
              >
                Edit details
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-gray-200">
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-500 px-6 py-8 sm:px-8">
            <div className="absolute inset-0 opacity-20 mix-blend-overlay" aria-hidden="true">
              <div className="h-full w-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/80 via-transparent to-transparent" />
            </div>
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-100/80">License #{license.id}</p>
                <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">{licenseTypeLabel}</h1>
                <p className="text-sm text-indigo-100/80">License number {licenseNumber}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {statusBadges.map((badge) => (
                  <span
                    key={badge.key}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${badge.tone}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8">
            {formError && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
                {formError}
              </div>
            )}

            <div className="space-y-8">
              <section className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">License information</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Review and update the core attributes of this license.
                  </p>
                </div>
                <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Type</dt>
                    <dd className="mt-2 text-sm text-gray-900">
                      {isEditing ? (
                        <select
                          name="license_type"
                          value={form.license_type}
                          onChange={handleChange}
                          className={selectClasses}
                        >
                          <option value="">Select type</option>
                          <option value={1}>Business License</option>
                          <option value={2}>Single Family License</option>
                          <option value={3}>Multifamily License</option>
                        </select>
                      ) : (
                        <span className="font-medium text-gray-900">
                          {LICENSE_TYPE_LABELS[license.license_type] || String(license.license_type || '—')}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">License number</dt>
                    <dd className="mt-2 text-sm text-gray-900">
                      {isEditing ? (
                        <input
                          type="text"
                          name="license_number"
                          value={form.license_number}
                          onChange={handleChange}
                          className={inputBaseClasses}
                          placeholder="e.g. BL-12345"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{licenseNumber}</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Paid status</dt>
                    <dd className="mt-2 text-sm text-gray-900">
                      {isEditing ? (
                        <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700">
                          <input
                            type="checkbox"
                            name="paid"
                            checked={form.paid}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{form.paid ? 'Marked as paid' : 'Mark as paid'}</span>
                        </label>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${paidStatus
                            ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                            : 'bg-amber-100 text-amber-700 ring-amber-200'
                          }`}
                        >
                          {paidStatus ? 'Paid' : 'Not Paid'}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Sent status</dt>
                    <dd className="mt-2 text-sm text-gray-900">
                      {isEditing ? (
                        <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700">
                          <input
                            type="checkbox"
                            name="sent"
                            checked={form.sent}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{form.sent ? 'Marked as sent' : 'Mark as sent'}</span>
                        </label>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${sentStatus
                            ? 'bg-sky-100 text-sky-700 ring-sky-200'
                            : 'bg-gray-100 text-gray-600 ring-gray-200'
                          }`}
                        >
                          {sentStatus ? 'Sent' : 'Not Sent'}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Business</dt>
                    <dd className="mt-2 text-sm text-gray-900">
                      {license?.business_id ? (
                        businessLoading ? (
                          <span className="text-sm text-gray-500">Loading business…</span>
                        ) : (
                          <div className="flex flex-col gap-1 text-sm">
                            <Link
                              to={`/businesses/${license.business_id}`}
                              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-500"
                            >
                              {businessLabel || `Business #${license.business_id}`}
                            </Link>
                            {businessError && (
                              <span className="text-xs font-medium text-rose-600">{businessError}</span>
                            )}
                          </div>
                        )
                      ) : (
                        <span className="text-sm text-gray-500">Not linked</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Key dates</h2>
                  <p className="mt-1 text-sm text-gray-500">Track issuance and expiration timelines.</p>
                </div>
                <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Date issued</dt>
                    <dd className="mt-2 text-sm text-gray-900">
                      {isEditing ? (
                        <input
                          type="date"
                          name="date_issued"
                          value={form.date_issued}
                          onChange={handleChange}
                          className={inputBaseClasses}
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{formatDisplayDate(license.date_issued)}</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Expiration date</dt>
                    <dd className="mt-2 text-sm text-gray-900">
                      {isEditing ? (
                        <input
                          type="date"
                          name="expiration_date"
                          value={form.expiration_date}
                          onChange={handleChange}
                          className={inputBaseClasses}
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{formatDisplayDate(license.expiration_date)}</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Fiscal year</dt>
                    <dd className="mt-2 text-sm text-gray-900">
                      {isEditing ? (
                        <select
                          name="fiscal_year"
                          value={form.fiscal_year}
                          onChange={handleChange}
                          className={selectClasses}
                        >
                          <option value="">Select fiscal year</option>
                          {fiscalYearOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-medium text-gray-900">{license.fiscal_year || '—'}</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Record history</h2>
                  <p className="mt-1 text-sm text-gray-500">Administrative timestamps for auditing.</p>
                </div>
                <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Created</dt>
                    <dd className="mt-2 text-sm font-medium text-gray-900">
                      {license.created_at ? toEasternLocaleString(license.created_at) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Updated</dt>
                    <dd className="mt-2 text-sm font-medium text-gray-900">
                      {license.updated_at ? toEasternLocaleString(license.updated_at) : '—'}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
