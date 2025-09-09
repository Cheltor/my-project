import React, { useEffect, useState } from 'react';

export default function AddLicenseModal({ open, onClose, onCreated }) {
  const [inspectionId, setInspectionId] = useState('');
  const [licenseType, setLicenseType] = useState('1');
  const [dateIssued, setDateIssued] = useState('');
  const [paid, setPaid] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setInspectionId('');
      setLicenseType('1');
      setDateIssued('');
      setPaid(false);
      setSent(false);
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const today = new Date();
  const baseDate = dateIssued ? new Date(dateIssued) : today;
  const month = baseDate.getMonth() + 1; // 1-12
  const year = baseDate.getFullYear();
  const fyEndYear = month < 7 ? year : year + 1; // July pivot
  const fiscalYear = `${fyEndYear - 1}-${fyEndYear}`;
  const expirationDate = new Date(fyEndYear, 5, 30) // June is 5
    .toISOString()
    .split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!inspectionId) {
      setError('Inspection ID is required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        inspection_id: Number(inspectionId),
        license_type: Number(licenseType),
        paid,
        sent,
        // Optional fields; backend can compute if omitted, but we send for preview consistency
        date_issued: dateIssued || undefined,
        fiscal_year: fiscalYear,
        expiration_date: expirationDate,
      };
      const res = await fetch(`${process.env.REACT_APP_API_URL}/licenses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to create license');
      }
      const created = await res.json();
      onCreated && onCreated(created);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-base font-semibold text-gray-800">Add License</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Inspection ID</label>
            <input
              type="number"
              min="1"
              value={inspectionId}
              onChange={(e) => setInspectionId(e.target.value)}
              className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              placeholder="e.g. 123"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">License Type</label>
            <select
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value)}
              className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            >
              <option value="1">Business License</option>
              <option value="2">Single Family License</option>
              <option value="3">Multifamily License</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date Issued (optional)</label>
            <input
              type="date"
              value={dateIssued}
              onChange={(e) => setDateIssued(e.target.value)}
              className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Paid
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={sent}
                onChange={(e) => setSent(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Sent
            </label>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <p>Fiscal Year (preview): <span className="font-medium">{fiscalYear}</span></p>
            <p>Expiration (preview): <span className="font-medium">{expirationDate}</span></p>
            <p className="mt-1">(Derived July 1 - June 30. Backend finalizes values.)</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
