import React, { useEffect, useState } from 'react';
import LoadingSpinner from './Common/LoadingSpinner';

export default function AddPermitModal({ open, onClose, onCreated }) {
  const [inspectionId, setInspectionId] = useState('');
  const [permitType, setPermitType] = useState('Building/Dumpster/POD permit');
  const [paid, setPaid] = useState(false);
  const [dateIssued, setDateIssued] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [conditions, setConditions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setInspectionId('');
      setPermitType('Building/Dumpster/POD permit');
      setPaid(false);
      setDateIssued('');
      setExpirationDate('');
      setConditions('');
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

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
        permit_type: permitType || undefined,
        paid,
        date_issued: dateIssued || undefined,
        expiration_date: expirationDate || undefined,
        conditions: conditions || undefined,
      };
      const res = await fetch(`${process.env.REACT_APP_API_URL}/permits/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to create permit');
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
          <h2 className="text-base font-semibold text-gray-800">Add Permit</h2>
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
              placeholder="e.g. 456"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Permit Type</label>
            <input
              type="text"
              value={permitType}
              onChange={(e) => setPermitType(e.target.value)}
              className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              placeholder="Type description"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Date Issued (optional)</label>
              <input
                type="date"
                value={dateIssued}
                onChange={(e) => setDateIssued(e.target.value)}
                className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Expiration Date (optional)</label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Conditions (optional)</label>
            <textarea
              rows={3}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              placeholder="Any conditions or notes"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Paid
            </label>
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
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner />
                  Saving…
                </span>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
