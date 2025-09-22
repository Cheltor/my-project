import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function LicenseDetail() {
  const { id } = useParams();
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    license_type: '',
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

  useEffect(() => {
    if (!license) return;
    // Initialize form from loaded license
    setForm({
      license_type: license.license_type ?? '',
      paid: Boolean(license.paid),
      sent: Boolean(license.sent),
      date_issued: toDateInput(license.date_issued),
      expiration_date: toDateInput(license.expiration_date),
      fiscal_year: license.fiscal_year ?? '',
    });
  }, [license]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
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
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">License #{license.id}</h1>
          <p className="mt-2 text-sm text-gray-700">Details about this license.</p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:bg-green-300"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        <div className="px-4 py-5 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-sm font-medium text-gray-500">Type</div>
          <div className="sm:col-span-2">
            {isEditing ? (
              <select
                name="license_type"
                value={form.license_type}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm"
              >
                <option value="">Select type</option>
                <option value={1}>Business License</option>
                <option value={2}>Single Family License</option>
                <option value={3}>Multifamily License</option>
              </select>
            ) : (
              LICENSE_TYPE_LABELS[license.license_type] || String(license.license_type)
            )}
          </div>

          {/* Business link row (read-only) */}
          <div className="text-sm font-medium text-gray-500">Business</div>
          <div className="sm:col-span-2">
            {license?.business_id ? (
              <Link to={`/businesses/${license.business_id}`} className="text-indigo-600 hover:text-indigo-800">
                Business #{license.business_id}
              </Link>
            ) : (
              '—'
            )}
          </div>

          <div className="text-sm font-medium text-gray-500">Paid</div>
          <div className="sm:col-span-2">
            {isEditing ? (
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="paid"
                  checked={form.paid}
                  onChange={handleChange}
                  className="rounded border-gray-300"
                />
                <span>Paid</span>
              </label>
            ) : (
              license.paid ? 'Paid' : 'Not Paid'
            )}
          </div>

          <div className="text-sm font-medium text-gray-500">Sent</div>
          <div className="sm:col-span-2">
            {isEditing ? (
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="sent"
                  checked={form.sent}
                  onChange={handleChange}
                  className="rounded border-gray-300"
                />
                <span>Sent</span>
              </label>
            ) : (
              license.sent ? 'Sent' : 'Not Sent'
            )}
          </div>

          <div className="text-sm font-medium text-gray-500">Date Issued</div>
          <div className="sm:col-span-2">
            {isEditing ? (
              <input
                type="date"
                name="date_issued"
                value={form.date_issued}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              license.date_issued ? new Date(license.date_issued).toLocaleDateString() : '—'
            )}
          </div>

          <div className="text-sm font-medium text-gray-500">Expiration Date</div>
          <div className="sm:col-span-2">
            {isEditing ? (
              <input
                type="date"
                name="expiration_date"
                value={form.expiration_date}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              license.expiration_date ? new Date(license.expiration_date).toLocaleDateString() : '—'
            )}
          </div>

          <div className="text-sm font-medium text-gray-500">Fiscal Year</div>
          <div className="sm:col-span-2">
            {isEditing ? (
              <input
                type="text"
                name="fiscal_year"
                value={form.fiscal_year}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm"
              />
            ) : (
              license.fiscal_year || '—'
            )}
          </div>

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
