import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toEasternLocaleString } from '../utils';

export default function LicenseDetail() {
  const { id } = useParams();
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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
        setError(e.message);
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

  useEffect(() => {
    if (!license) return;
    // Initialize form from loaded license
    setForm({
      license_type: license.license_type ?? '',
      license_number: license.license_number ?? '',
      paid: Boolean(license.paid),
      sent: Boolean(license.sent),
      date_issued: toDateInput(license.date_issued),
      expiration_date: toDateInput(license.expiration_date),
      fiscal_year: license.fiscal_year ?? '',
    });
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
    setError(null);
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
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!license) return <div className="p-6">Not found</div>;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">License Detail</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">License #{license.id}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review and manage the license record including payment, issuance, and fiscal year details.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Edit license
              </button>
            )}
          </div>
        </header>

        <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <dl className="divide-y divide-gray-100">
            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Type</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {isEditing ? (
                  <select
                    name="license_type"
                    value={form.license_type}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select type</option>
                    <option value={1}>Business License</option>
                    <option value={2}>Single Family License</option>
                    <option value={3}>Multifamily License</option>
                  </select>
                ) : (
                  LICENSE_TYPE_LABELS[license.license_type] || String(license.license_type || '—')
                )}
              </dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">License Number</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {isEditing ? (
                  <input
                    type="text"
                    name="license_number"
                    value={form.license_number}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g. BL-12345"
                  />
                ) : (
                  license.license_number || '—'
                )}
              </dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Business</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {license?.business_id ? (
                  businessLoading ? (
                    <span className="text-sm text-gray-500">Loading business…</span>
                  ) : (
                    <>
                      <Link
                        to={`/businesses/${license.business_id}`}
                        className="text-indigo-600 underline-offset-4 transition hover:text-indigo-500 hover:underline"
                      >
                        {businessLabel || `Business #${license.business_id}`}
                      </Link>
                      {businessError && (
                        <span className="ml-2 text-xs font-medium text-rose-600">{businessError}</span>
                      )}
                    </>
                  )
                ) : (
                  '—'
                )}
              </dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Paid</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {isEditing ? (
                  <label className="inline-flex items-center gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="paid"
                      checked={form.paid}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Mark as paid</span>
                  </label>
                ) : license.paid ? (
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
              <dt className="text-sm font-medium text-gray-600">Sent</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {isEditing ? (
                  <label className="inline-flex items-center gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="sent"
                      checked={form.sent}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Mark as sent</span>
                  </label>
                ) : license.sent ? (
                  <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
                    Sent
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-500/20">
                    Not sent
                  </span>
                )}
              </dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Date Issued</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {isEditing ? (
                  <input
                    type="date"
                    name="date_issued"
                    value={form.date_issued}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                ) : (
                  license.date_issued ? new Date(license.date_issued).toLocaleDateString() : '—'
                )}
              </dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Expiration Date</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {isEditing ? (
                  <input
                    type="date"
                    name="expiration_date"
                    value={form.expiration_date}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                ) : (
                  license.expiration_date ? new Date(license.expiration_date).toLocaleDateString() : '—'
                )}
              </dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Fiscal Year</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">
                {isEditing ? (
                  <select
                    name="fiscal_year"
                    value={form.fiscal_year}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select fiscal year</option>
                    {fiscalYearOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  license.fiscal_year || '—'
                )}
              </dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Created</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">{toEasternLocaleString(license.created_at)}</dd>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6">
              <dt className="text-sm font-medium text-gray-600">Updated</dt>
              <dd className="text-sm text-gray-900 sm:col-span-2">{toEasternLocaleString(license.updated_at)}</dd>
            </div>
          </dl>
        </section>

        <footer className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/licenses"
            className="text-sm font-semibold text-indigo-600 underline-offset-4 transition hover:text-indigo-500 hover:underline"
          >
            Back to all licenses
          </Link>
          {license?.business_id && (
            <Link
              to={`/businesses/${license.business_id}`}
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
