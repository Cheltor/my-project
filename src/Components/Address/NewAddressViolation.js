
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import CodeSelect from '../CodeSelect';
import FileUploadInput from '../Common/FileUploadInput';
import LoadingSpinner from '../Common/LoadingSpinner';

const DEADLINE_OPTIONS = [
  'Immediate',
  '1 day',
  '3 days',
  '7 days',
  '14 days',
  '30 days',
];

const VIOLATION_TYPE_OPTIONS = [
  { value: 'doorhanger', label: 'Doorhanger' },
  { value: 'Formal Notice', label: 'Formal Notice' },
];

const NewAddressViolation = ({ addressId, onViolationAdded }) => {
  const { user } = useAuth();
  const [violationType, setViolationType] = useState(VIOLATION_TYPE_OPTIONS[0].value);
  const [deadline, setDeadline] = useState(DEADLINE_OPTIONS[0]);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [files, setFiles] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');

  // Helper to reset attachment state to avoid no-undef and keep logic centralized
  const resetAttachmentState = () => {
    setFiles([]);
  };

  const handleToggleForm = () => {
    setShowForm((prev) => {
      const next = !prev;
      if (!next) {
        setFiles([]);
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    // Validate deadline
    let safeDeadline = deadline;
    if (!DEADLINE_OPTIONS.includes(deadline)) {
      safeDeadline = 'Immediate';
      setDeadline('Immediate');
      setError("Invalid deadline selected. Defaulted to 'Immediate'.");
      setSubmitting(false);
      return;
    }

    // Basic client validation: require addressId and at least one code
    if (!addressId) {
      setError('Address is required.');
      setSubmitting(false);
      return;
    }
    if (!Array.isArray(selectedCodes) || selectedCodes.length === 0) {
      setError('Please select at least one violation code.');
      setSubmitting(false);
      return;
    }

    try {
      const violationData = {
        address_id: addressId ? parseInt(addressId, 10) : undefined,
        user_id: user?.id,
        deadline: safeDeadline,
        violation_type: violationType,
        codes: selectedCodes.map(c => c.code.id),
        // Do NOT send status! Backend sets status=0 (current) by default
        unit_id: selectedUnitId ? parseInt(selectedUnitId, 10) : undefined,
      };
      const response = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${addressId}/violations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(violationData),
      });
      if (!response.ok) {
        let msg = 'Failed to create violation';
        try {
          const errJson = await response.json();
          if (errJson.detail) msg = errJson.detail;
        } catch {}
        throw new Error(msg);
      }
      const newViolation = await response.json();

      if (files.length > 0 && newViolation?.id) {
        const fd = new FormData();
        files.forEach((file) => fd.append('files', file));
        try {
          const uploadResp = await fetch(`${process.env.REACT_APP_API_URL}/violation/${newViolation.id}/photos`, {
            method: 'POST',
            body: fd,
          });
          if (!uploadResp.ok) {
            try {
              const data = await uploadResp.json();
              console.error('Attachment upload failed:', data);
            } catch (uploadErr) {
              console.error('Attachment upload failed');
            }
          }
        } catch (uploadError) {
          console.error('Attachment upload failed', uploadError);
        }
      }
      setSuccess(true);
      setSelectedCodes([]);
  setSelectedUnitId('');
      setViolationType(VIOLATION_TYPE_OPTIONS[0].value);
      setDeadline(DEADLINE_OPTIONS[0]);
      resetAttachmentState();
      if (onViolationAdded) onViolationAdded(newViolation);
      // Close the form after successful submission
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadUnits = async () => {
      if (!addressId) return setUnits([]);
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${addressId}/units`);
        if (!res.ok) return setUnits([]);
        const data = await res.json();
        if (!cancelled) setUnits(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setUnits([]);
      }
    };
    loadUnits();
    return () => { cancelled = true; };
  }, [addressId]);

  return (
    <div className="mt-4 mb-6">
      <button
        type="button"
        onClick={handleToggleForm}
        aria-expanded={showForm}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 focus:outline-none focus:ring focus:ring-indigo-400"
      >
        {showForm ? 'Hide New Violation' : 'New Violation'}
      </button>

      {!showForm ? null : (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 bg-white border border-indigo-200 shadow-lg rounded-xl p-6"
          style={{ zIndex: 10 }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Violation Type</label>
            <select
              className="w-full border border-gray-300 rounded px-2 py-1"
              value={violationType}
              onChange={e => setViolationType(e.target.value)}
              disabled={submitting}
            >
              {VIOLATION_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Violation Codes <span className="text-red-600" aria-hidden> *</span>
            </label>
            <CodeSelect
              onChange={opts => setSelectedCodes(opts || [])}
              value={selectedCodes}
              isMulti={true}
              isDisabled={submitting}
            />
            <div className="text-xs text-gray-500 mt-1">Select one or more codes. This field is required.</div>
          </div>
          {selectedCodes.length > 0 && (
            <div className="mb-2">
              <label className="block text-xs font-medium text-gray-500">Descriptions:</label>
              <ul className="list-disc ml-5 text-xs text-gray-700">
                {selectedCodes.map((opt) => (
                  <li key={opt.value} title={opt.code.description}>
                    {opt.code.description.length > 80 ? opt.code.description.slice(0, 80) + '...' : opt.code.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <select
              className="w-full border border-gray-300 rounded px-2 py-1"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              disabled={submitting}
            >
              {DEADLINE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {units && units.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attach to unit (optional)</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1"
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                disabled={submitting}
              >
                <option value="">No unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.number ? `Unit ${u.number}` : u.name || `Unit ${u.id}`}</option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">Optional: attach this violation to a specific unit at the address.</div>
            </div>
          )}
          <div className="mb-4">
            <FileUploadInput
              label="Attachments"
              name="attachments"
              files={files}
              onChange={setFiles}
              accept="image/*,application/pdf"
              disabled={submitting}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 focus:outline-none focus:ring focus:ring-indigo-400"
              disabled={submitting || !addressId || !Array.isArray(selectedCodes) || selectedCodes.length === 0}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner />
                  Submitting...
                </span>
              ) : (
                (!addressId || selectedCodes.length === 0 ? 'Add Violation' : 'Add Violation')
              )}
            </button>
            <button
              type="button"
              className="mt-2 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              onClick={() => {
                setShowForm(false);
                resetAttachmentState();
              }}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
          {error && <div className="text-red-500">{error}</div>}
          {success && <div className="text-green-600">Violation created!</div>}
        </form>
      )}
    </div>
  );
};

export default NewAddressViolation;
