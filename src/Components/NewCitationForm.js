

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import CodeSelect from "./CodeSelect";
import LoadingSpinner from "./Common/LoadingSpinner";

export default function NewCitationForm({ violationId, onCitationAdded, codes, userId }) {
  const navigate = useNavigate();
  const [fine, setFine] = useState(200);
  // Set default deadline to 3 weeks from today
  const getDefaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return d.toISOString().slice(0, 10);
  };
  const [deadline, setDeadline] = useState(getDefaultDeadline());
  const [selectedCode, setSelectedCode] = useState(null);
  const [citationid, setCitationid] = useState("");
  const [status] = useState(0); // 0 = Unpaid by default
  // const [trialDate, setTrialDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/citations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          violation_id: violationId,
          fine,
          deadline,
          code_id: selectedCode ? selectedCode.value : null,
          citationid,
          user_id: userId,
          status, // Always send status as 0 (Unpaid)
          // trial_date: trialDate,
        }),
      });
      if (!response.ok) throw new Error("Failed to create citation");
      setFine(0);
      setDeadline("");
      setSelectedCode(null);
      setCitationid("");
      // setTrialDate("");
      // setStatus(0);
      if (onCitationAdded) onCitationAdded();
      // Navigate to the violation detail page after adding
      if (violationId) {
        navigate(`/violation/${violationId}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Prepare code options for CodeSelect
  const codeOptions = (codes || []).map(code => ({
    value: code.id,
    label: `Ch. ${code.chapter} Sec. ${code.section} - ${code.name} - ${code.description ? (code.description.length > 50 ? code.description.slice(0, 50) + '...' : code.description) : ''}`
  }));

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mt-6 border">
      <h4 className="font-semibold mb-2">Add New Citation</h4>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="mb-2">
        <label className="block text-sm">Citation ID:</label>
        <input type="text" value={citationid} onChange={e => setCitationid(e.target.value)} className="border rounded p-1 w-full" placeholder="Enter citation number or leave blank" />
      </div>
      <div className="mb-2">
        <label className="block text-sm">Fine ($):</label>
        <input type="number" value={fine} onChange={e => setFine(Number(e.target.value))} className="border rounded p-1 w-full" required min="0" placeholder="$200" />
      </div>
      <div className="mb-2">
        <label className="block text-sm">Deadline:</label>
        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="border rounded p-1 w-full" required />
      </div>
      <div className="mb-2">
        <label className="block text-sm">Code:</label>
        <CodeSelect
          onChange={setSelectedCode}
          value={selectedCode}
          isMulti={false}
          loadOptions={(_input, callback) => callback(codeOptions)}
          options={codeOptions}
          isSearchable={false}
        />
      </div>
      {/*
      <div className="mb-2">
        <label className="block text-sm">Trial Date (optional):</label>
        <input type="date" value={trialDate} onChange={e => setTrialDate(e.target.value)} className="border rounded p-1 w-full" />
      </div>
      <div className="mb-2">
        <label className="block text-sm">Status:</label>
        <select value={status} onChange={e => setStatus(Number(e.target.value))} className="border rounded p-1 w-full">
          <option value={0}>Unpaid</option>
          <option value={1}>Paid</option>
          <option value={2}>Pending Trial</option>
          <option value={3}>Dismissed</option>
        </select>
      </div>
      */}
      <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700" disabled={submitting || !selectedCode}>
        {submitting ? (
          <span className="inline-flex items-center gap-2 text-sm">
            <LoadingSpinner className="h-4 w-4" />
            Adding...
          </span>
        ) : (
          "Add Citation"
        )}
      </button>
    </form>
  );
}
