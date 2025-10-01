import React, { useState } from "react";
import AsyncSelect from "react-select/async";
import CodeSelect from "../CodeSelect";
import { useAuth } from "../../AuthContext";

export default function NewViolationForm({ onCreated, initialAddressId, initialAddressLabel, lockAddress = false, inspectionId, selectedCodesValue, onSelectedCodesChange }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    codes: [], // array of code objects
    address_id: initialAddressId || ""
  });
  const [files, setFiles] = useState([]);
  const [selectedCodes, setSelectedCodes] = useState([]); // internal when uncontrolled
  const [addressLabel, setAddressLabel] = useState(initialAddressLabel || "");
  // Admin assignment state
  const [onsUsers, setOnsUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState("");
  React.useEffect(() => {
    // Keep form in sync if initial props change
    setForm((prev) => ({ ...prev, address_id: initialAddressId || "" }));
    setAddressLabel(initialAddressLabel || "");
  }, [initialAddressId, initialAddressLabel]);
  React.useEffect(() => {
    // Load ONS users only for admins (role 3 assumed admin)
    const loadOns = async () => {
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/users/ons/`);
        if (!resp.ok) return;
        const data = await resp.json();
        setOnsUsers(Array.isArray(data) ? data : []);
      } catch {
        // best-effort; ignore errors
      }
    };
    if (user?.role === 3) {
      loadOns();
    }
  }, [user?.role]);
  // Function to load address options asynchronously
  const loadAddressOptions = async (inputValue) => {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/addresses/search?query=${inputValue}&limit=5`
    );
    const data = await response.json();
    return data.map((address) => ({
      label: `${address.property_name ? address.property_name + " - " : ""}${address.combadd}${address.aka ? ` (AKA: ${address.aka})` : ""}`,
      value: address.id,
    }));
  };

  const handleAddressChange = (selectedOption) => {
    setForm((prev) => ({ ...prev, address_id: selectedOption ? selectedOption.value : "" }));
    setAddressLabel(selectedOption ? selectedOption.label : "");
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);


  // Handle code select change (multi)
  const handleCodeChange = (selectedOptions) => {
    // Update internal state only if uncontrolled
    if (!selectedCodesValue) {
      setSelectedCodes(selectedOptions || []);
    }
    // Notify parent if controlled
    if (onSelectedCodesChange) onSelectedCodesChange(selectedOptions || []);
    setForm((prev) => ({
      ...prev,
      codes: (selectedOptions || []).map(opt => ({
        id: opt.code.id,
        name: opt.code.name,
        description: opt.code.description,
        chapter: opt.code.chapter,
        section: opt.code.section
      }))
    }));
  };

  const DEADLINE_OPTIONS = [
    "Immediate",
    "1 day",
    "3 days",
    "7 days",
    "14 days",
    "30 days"
  ];
  const [deadline, setDeadline] = useState(DEADLINE_OPTIONS[0]);

  const VIOLATION_TYPE_OPTIONS = [
    { value: "doorhanger", label: "Doorhanger" },
    { value: "Formal Notice", label: "Formal Notice" }
  ];
  const [violationType, setViolationType] = useState(VIOLATION_TYPE_OPTIONS[0].value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validate deadline
    let safeDeadline = deadline;
    if (!DEADLINE_OPTIONS.includes(deadline)) {
      safeDeadline = "Immediate";
      setDeadline("Immediate");
      setError("Invalid deadline selected. Defaulted to 'Immediate'.");
      setLoading(false);
      return;
    }

    try {
      // Submit one violation with all selected codes
      const effectiveSelectedCodes = selectedCodesValue ?? selectedCodes;
      // If admin selected an assignee, use that; else default to current user
  const assignedUserId = user?.role === 3 && assigneeId
        ? parseInt(assigneeId, 10)
        : user?.id;
      const violationData = {
        address_id: form.address_id ? parseInt(form.address_id, 10) : undefined,
        codes: (effectiveSelectedCodes || []).map(c => c.code.id),
        user_id: assignedUserId,
        deadline: safeDeadline, // always valid
        violation_type: violationType, // new field
        inspection_id: inspectionId, // optionally link violation to inspection
        // Do NOT send status! Backend sets status=0 (current) by default
      };
      const response = await fetch(`${process.env.REACT_APP_API_URL}/violations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(violationData),
      });
      if (!response.ok) {
        // Try to parse backend error for more detail
        let msg = "Failed to create violation";
        try {
          const errJson = await response.json();
          if (errJson.detail) msg = errJson.detail;
        } catch {}
        throw new Error(msg);
      }
      const created = await response.json();

      // If there are files selected, upload them to /violation/{id}/photos
      if (files.length > 0 && created?.id) {
        const fd = new FormData();
        for (const f of files) fd.append('files', f);
        const upResp = await fetch(`${process.env.REACT_APP_API_URL}/violation/${created.id}/photos`, {
          method: 'POST',
          body: fd,
        });
        if (!upResp.ok) {
          // Don't fail the whole UI; report but continue
          try {
            const data = await upResp.json();
            console.error('Attachment upload failed:', data);
          } catch (e) {
            console.error('Attachment upload failed');
          }
        }
      }

  setSuccess(true);
  setForm({ codes: [], address_id: "" });
  setSelectedCodes([]);
  if (onSelectedCodesChange) onSelectedCodesChange([]);
  setFiles([]);
  if (onCreated) onCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow mt-4">
      <h2 className="text-lg font-bold mb-2">Add New Violation</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Address Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <AsyncSelect
            cacheOptions
            defaultOptions
            loadOptions={loadAddressOptions}
            onChange={handleAddressChange}
            value={form.address_id ? { value: form.address_id, label: addressLabel } : null}
            placeholder="Type to search addresses..."
            isClearable
            isDisabled={!!lockAddress}
            className="mb-2"
          />
        </div>
        {/* Assignee (Admin only) */}
  {user?.role === 3 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to ONS member</label>
            <select
              className="w-full border border-gray-300 rounded px-2 py-1"
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value)}
            >
              <option value="">Unassigned (defaults to me)</option>
              {onsUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Violation Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Violation Type</label>
          <select
            className="w-full border border-gray-300 rounded px-2 py-1"
            value={violationType}
            onChange={e => setViolationType(e.target.value)}
          >
            {VIOLATION_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {/* Violation Code Selection (multi) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Violation Codes</label>
          <CodeSelect
            onChange={handleCodeChange}
            value={selectedCodesValue ?? selectedCodes}
            isMulti={true}
          />
        </div>
        {/* Show selected code descriptions (truncated) */}
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
        {/* Violation Deadline Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
          <select
            className="w-full border border-gray-300 rounded px-2 py-1"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          >
            {DEADLINE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        {/* Attachments */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Attachments</label>
          <div className="mt-1 flex items-center">
            <label className="bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm px-4 py-2 cursor-pointer hover:bg-gray-50">
              <span>Choose files</span>
              <input
                type="file"
                name="attachments"
                multiple
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </label>
            {/* Optionally, show selected file names here if you add state for them */}
          </div>
          {files.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-2">
                {files.map((f, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs border border-indigo-200">
                    <span className="truncate max-w-[12rem]" title={f.name}>{f.name}</span>
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="mt-2 text-xs text-gray-600 hover:text-gray-900 underline"
                onClick={() => setFiles([])}
                disabled={loading}
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Violation"}
        </button>
        {error && <div className="text-red-500">{error}</div>}
        {success && <div className="text-green-600">Violation created!</div>}
      </form>
    </div>
  );
}
