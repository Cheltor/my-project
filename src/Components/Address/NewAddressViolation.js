
import React, { useState } from 'react';
import { useAuth } from '../../AuthContext';
import CodeSelect from '../CodeSelect';

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

    try {
      const violationData = {
        address_id: addressId ? parseInt(addressId, 10) : undefined,
        user_id: user?.id,
        deadline: safeDeadline,
        violation_type: violationType,
        codes: selectedCodes.map(c => c.code.id),
        // Do NOT send status! Backend sets status=0 (current) by default
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
      setSuccess(true);
      setSelectedCodes([]);
      setViolationType(VIOLATION_TYPE_OPTIONS[0].value);
      setDeadline(DEADLINE_OPTIONS[0]);
      if (onViolationAdded) onViolationAdded(newViolation);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Violation Codes</label>
        <CodeSelect
          onChange={opts => setSelectedCodes(opts || [])}
          value={selectedCodes}
          isMulti={true}
          isDisabled={submitting}
        />
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
      <button
        type="submit"
        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 focus:outline-none focus:ring focus:ring-indigo-400"
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Add Violation'}
      </button>
      {error && <div className="text-red-500">{error}</div>}
      {success && <div className="text-green-600">Violation created!</div>}
    </form>
  );
};

export default NewAddressViolation;
