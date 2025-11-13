import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { toEasternLocaleDateString, toEasternLocaleString } from '../utils';
import PageLoading from './Common/PageLoading';
import PageError from './Common/PageError';

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

  // Format a fiscal year string like "2021-2022" into a short label like "FY22".
  const formatFiscalYear = (fy) => {
    if (!fy) return '';
    try {
      const parts = String(fy).split('-');
      if (parts[1]) {
        const end = parts[1];
        const endYY = String(end).slice(-2);
        return `FY${endYY}`;
      }
      // If it's not the expected format, just return the original value.
      return String(fy);
    } catch (e) {
      return String(fy);
    }
  };

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

  const { token } = useAuth();
  const [isDownloadingLicense, setIsDownloadingLicense] = useState(false);

  const handleDownloadLicense = async () => {
    try {
      setIsDownloadingLicense(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/license/${id}/download`, { headers });
      if (!resp.ok) throw new Error('Failed to download license');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const label = businessLabel || license?.combadd || `license_${id}`;
      const sanitize = (s) => s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
      const safe = sanitize(label) || `license_${id}`;
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      a.download = `${safe}_license_${mm}_${dd}_${yy}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Failed to download');
    } finally {
      setIsDownloadingLicense(false);
    }
  };

  // Show the business row only for business-type licenses. When editing,
  // prefer the form value so the UI updates as the user changes the type.
  // Guard against `license` being null and avoid treating empty string as 0.
  const licenseTypeValue = isEditing ? form.license_type : (license?.license_type ?? '');
  const showBusinessRow = licenseTypeValue !== '' && [0, 1].includes(Number(licenseTypeValue));

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

  if (loading) {
    return <PageLoading message="Loading license…" />;
  }

  if (error) {
    return <PageError title="Unable to load license" error={error} />;
  }

  if (!license) {
    return <PageError title="License not found" message="The requested license could not be located." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Link
              to="/licenses"
              className="inline-flex items-center text-sm font-medium text-indigo-600 transition hover:text-indigo-500"
            >
              <span aria-hidden="true" className="mr-1">
                ←
              </span>
              Back to licenses
            </Link>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
              License #{license.id}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Detailed view of the license record, including billing and renewal information.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
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
              </>
            ) : (
              <button
                type="button"
                onClick={handleDownloadLicense}
                disabled={isDownloadingLicense}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloadingLicense ? 'Preparing…' : 'Download License'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-200/40">
            <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">License overview</h2>
              <p className="mt-1 text-sm text-slate-600">
                Update the key details for this license or review its current status.
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              <dl className="divide-y divide-slate-100">
                <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                  <dt className="text-sm font-medium text-slate-600">License type</dt>
                  <dd className="sm:col-span-2">
                    {isEditing ? (
                      <select
                        name="license_type"
                        value={form.license_type}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select type</option>
                        <option value={1}>Business License</option>
                        <option value={2}>Single Family License</option>
                        <option value={3}>Multifamily License</option>
                      </select>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-indigo-100">
                        {LICENSE_TYPE_LABELS[license.license_type] || String(license.license_type)}
                      </span>
                    )}
                  </dd>
                </div>

                <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                  <dt className="text-sm font-medium text-slate-600">License number</dt>
                  <dd className="sm:col-span-2">
                    {isEditing ? (
                      <input
                        type="text"
                        name="license_number"
                        value={form.license_number}
                        onChange={handleChange}
                        placeholder="e.g. BL-12345"
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <span className="text-sm text-slate-900">{license.license_number || 'N/A'}</span>
                    )}
                  </dd>
                </div>

                {showBusinessRow && (
                  <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                    <dt className="text-sm font-medium text-slate-600">Business</dt>
                    <dd className="sm:col-span-2">
                      {license?.business_id ? (
                        businessLoading ? (
                          <span className="text-sm text-slate-500">Loading business…</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Link
                              to={`/businesses/${license.business_id}`}
                              className="inline-flex items-center text-sm font-medium text-indigo-600 transition hover:text-indigo-500"
                            >
                              {businessLabel || `Business #${license.business_id}`}
                            </Link>
                            {businessError && (
                              <span className="text-xs font-medium text-rose-600">{businessError}</span>
                            )}
                          </div>
                        )
                      ) : (
                        <span className="text-sm text-slate-500">Not linked</span>
                      )}
                    </dd>
                  </div>
                )}

                <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                  <dt className="text-sm font-medium text-slate-600">Address</dt>
                  <dd className="sm:col-span-2">
                    {license?.address_id ? (
                      <Link
                        to={`/address/${license.address_id}`}
                        className="inline-flex items-center text-sm font-medium text-indigo-600 transition hover:text-indigo-500"
                      >
                        {license.combadd || `Address #${license.address_id}`}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-500">Not linked</span>
                    )}
                  </dd>
                </div>

                <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                  <dt className="text-sm font-medium text-slate-600">Billing status</dt>
                  <dd className="sm:col-span-2">
                    <div className="flex flex-wrap gap-3">
                      <div className="inline-flex items-center gap-2">
                        {isEditing ? (
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              name="paid"
                              checked={form.paid}
                              onChange={handleChange}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Paid</span>
                          </label>
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              license.paid
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                                : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
                            }`}
                          >
                            {license.paid ? 'Paid' : 'Pending payment'}
                          </span>
                        )}
                      </div>
                      <div className="inline-flex items-center gap-2">
                        {isEditing ? (
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              name="sent"
                              checked={form.sent}
                              onChange={handleChange}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Notice sent</span>
                          </label>
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              license.sent
                                ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200'
                                : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200'
                            }`}
                          >
                            {license.sent ? 'Notice sent' : 'Notice not sent'}
                          </span>
                        )}
                      </div>
                    </div>
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
                        {license.date_issued ? toEasternLocaleDateString(license.date_issued) || '—' : '—'}
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
                        {license.expiration_date
                          ? toEasternLocaleDateString(license.expiration_date) || '—'
                          : '—'}
                      </span>
                    )}
                  </dd>
                </div>

                <div className="grid gap-4 px-6 py-5 sm:grid-cols-3 sm:items-start">
                  <dt className="text-sm font-medium text-slate-600">Fiscal year</dt>
                  <dd className="sm:col-span-2">
                    {isEditing ? (
                      <select
                        name="fiscal_year"
                        value={form.fiscal_year}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select fiscal year</option>
                        {fiscalYearOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-slate-900">
                        {license.fiscal_year ? formatFiscalYear(license.fiscal_year) : '—'}
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
                  <dd className="text-right text-slate-900">{toEasternLocaleString(license.created_at)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3 py-2">
                  <dt className="font-medium text-slate-600">Last updated</dt>
                  <dd className="text-right text-slate-900">{toEasternLocaleString(license.updated_at)}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 via-white to-white px-6 py-5 text-sm text-slate-700 shadow-lg shadow-indigo-100">
              <p className="font-semibold text-indigo-700">Need to make more changes?</p>
              <p className="mt-1 text-sm text-slate-600">
                You can edit the license details to update billing status, renewal dates, and fiscal year information.
              </p>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
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
