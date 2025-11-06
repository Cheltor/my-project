import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AsyncSelect from "react-select/async";
import CodeSelect from "../CodeSelect";
import { useAuth } from "../../AuthContext";
import FileUploadInput from "../Common/FileUploadInput";

export default function NewViolationForm({ onCreated, initialAddressId, initialAddressLabel, lockAddress = false, inspectionId, selectedCodesValue, onSelectedCodesChange, initialViolationType, lockViolationType = false, initialFileUrls = [], initialFiles = [] }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    codes: [], // array of code objects
    address_id: initialAddressId || ""
  });
  const [files, setFiles] = useState([]);
  const STEPS = [
    { key: "photos", label: "Photos" },
    { key: "address", label: "Address" },
    { key: "codes", label: "Codes" },
    { key: "deadline", label: "Deadline" },
  ];
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // If parent provides File objects directly, merge them into files state
  React.useEffect(() => {
    if (!initialFiles || initialFiles.length === 0) return;
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of initialFiles) {
        const duplicate = merged.find(
          (existing) =>
            existing.name === f.name &&
            existing.size === f.size &&
            existing.lastModified === f.lastModified &&
            existing.type === f.type
        );
        if (!duplicate) merged.push(f);
      }
      return merged;
    });
  }, [initialFiles]);

  // If parent provides file URLs (e.g., photos attached to observations), fetch them
  // and convert to File objects so the FileUploadInput can display them.
  React.useEffect(() => {
    if (!initialFileUrls || initialFileUrls.length === 0) return;
    let cancelled = false;
    const fetchAndAdd = async () => {
      for (const url of initialFileUrls) {
        try {
          // Skip if already present (by URL encoded in name)
          const exists = files.find(f => f.name === url || f.name === decodeURIComponent(url.split('/').pop() || url));
          if (exists) continue;
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const blob = await resp.blob();
          const filename = decodeURIComponent((new URL(url)).pathname.split('/').pop() || 'photo');
          const file = new File([blob], filename, { type: blob.type || 'application/octet-stream', lastModified: Date.now() });
          if (cancelled) return;
          setFiles((prev) => {
            // avoid duplicates
            const merged = [...prev];
            const duplicate = merged.find(
              (existing) =>
                existing.name === file.name &&
                existing.size === file.size &&
                existing.type === file.type
            );
            if (!duplicate) merged.push(file);
            return merged;
          });
        } catch (e) {
          // ignore fetch errors per-file
        }
      }
    };
    fetchAndAdd();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFileUrls]);
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
  // Validation UI state
  const [addressError, setAddressError] = useState('');
  const [codesError, setCodesError] = useState('');
  const currentStep = STEPS[currentStepIndex]?.key ?? "photos";
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const handleNext = () => {
    if (currentStep === "address") {
      if (!form.address_id) {
        setAddressError('Please select an address.');
        return;
      }
      setAddressError('');
    }
    if (currentStep === "codes") {
      const nextCodes = selectedCodesValue ?? selectedCodes;
      if (!nextCodes || nextCodes.length === 0) {
        setCodesError('Please select at least one violation code.');
        return;
      }
      setCodesError('');
    }
    setCurrentStepIndex((idx) => Math.min(idx + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStepIndex((idx) => Math.max(idx - 1, 0));
  };


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
  const [violationType, setViolationType] = useState(initialViolationType ?? VIOLATION_TYPE_OPTIONS[0].value);

  React.useEffect(() => {
    // Keep violation type in sync if parent forces an initial value
    if (initialViolationType) setViolationType(initialViolationType);
  }, [initialViolationType]);

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Client-side validation
    let invalid = false;
    if (!form.address_id) {
      setAddressError('Please select an address.');
      invalid = true;
    } else {
      setAddressError('');
    }
    const effectiveSelectedCodes = selectedCodesValue ?? selectedCodes;
    if (!effectiveSelectedCodes || effectiveSelectedCodes.length === 0) {
      setCodesError('Please select at least one violation code.');
      invalid = true;
    } else {
      setCodesError('');
    }
    if (invalid) {
      setLoading(false);
      return;
    }

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
      // Clear files state so the picker is reset for the next violation
      setFiles([]);
      if (onCreated) onCreated(created);
      // Navigate to the created violation's detail page
      if (created?.id) {
        navigate(`/violation/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isLastStep) {
      handleFinalSubmit();
    } else {
      handleNext();
    }
  };

  // Determine selected codes source consistently (controlled vs uncontrolled)
  const effectiveSelectedCodes = selectedCodesValue ?? selectedCodes;
  const canSubmit = !!form.address_id && Array.isArray(effectiveSelectedCodes) && effectiveSelectedCodes.length > 0 && !loading;
  const canAdvanceFromStep = (() => {
    if (currentStep === "address") return !!form.address_id;
    if (currentStep === "codes") return Array.isArray(effectiveSelectedCodes) && effectiveSelectedCodes.length > 0;
    return true;
  })();

  return (
    <div className="p-4 bg-white rounded shadow mt-4">
      <h2 className="text-lg font-bold mb-2">Add New Violation</h2>
      <div className="flex items-center justify-between mb-4 text-xs font-medium text-gray-500">
        {STEPS.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isComplete = index < currentStepIndex;
          return (
            <div key={step.key} className={`flex-1 text-center px-1 ${isActive ? 'text-blue-600' : ''}`}>
              <div className={`mx-auto h-8 w-8 flex items-center justify-center rounded-full border ${isActive ? 'border-blue-600 bg-blue-50 text-blue-600' : isComplete ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-300 bg-white text-gray-500'}`}>
                {index + 1}
              </div>
              <div className="mt-1 uppercase tracking-wide">{step.label}</div>
            </div>
          );
        })}
      </div>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {currentStep === "photos" && (
          <div>
            <FileUploadInput
              label="Attachments"
              name="attachments"
              files={files}
              onChange={setFiles}
              accept="image/*,application/pdf"
              disabled={loading}
            />
            <div className="text-xs text-gray-500 mt-1">
              Add inspection photos now or continue to the next step.
            </div>
          </div>
        )}

        {currentStep === "address" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="nvf-address">
                Address <span className="text-red-600" aria-hidden> *</span>
              </label>
              <div className={`${addressError ? 'border border-red-500 rounded' : ''} mb-2`} aria-invalid={!!addressError} aria-describedby={addressError ? 'nvf-address-error' : undefined}>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadAddressOptions}
                  onChange={handleAddressChange}
                  inputId="nvf-address"
                  value={form.address_id ? { value: form.address_id, label: addressLabel } : null}
                  placeholder="Type to search addresses..."
                  isClearable
                  isDisabled={!!lockAddress}
                  className="mb-0"
                />
              </div>
              <div className="text-xs text-gray-500">This field is required.</div>
              {addressError && <div id="nvf-address-error" className="text-xs text-red-600 mt-1">{addressError}</div>}
            </div>
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
          </div>
        )}

        {currentStep === "codes" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Violation Type</label>
              {lockViolationType ? (
                <div className="w-full border border-gray-200 rounded px-2 py-1 bg-gray-50 text-gray-700">
                  {(VIOLATION_TYPE_OPTIONS.find(o => o.value === violationType) || { label: violationType }).label}
                </div>
              ) : (
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1"
                  value={violationType}
                  onChange={e => setViolationType(e.target.value)}
                >
                  {VIOLATION_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="nvf-codes">
                Violation Codes <span className="text-red-600" aria-hidden> *</span>
              </label>
              <div className={`${codesError ? 'border border-red-500 rounded p-1' : ''}`} aria-invalid={!!codesError} aria-describedby={codesError ? 'nvf-codes-error' : undefined}>
                <CodeSelect
                  onChange={handleCodeChange}
                  inputId="nvf-codes"
                  value={effectiveSelectedCodes}
                  isMulti={true}
                />
              </div>
              <div className="text-xs text-gray-500">Select one or more codes.</div>
              {codesError && <div id="nvf-codes-error" className="text-xs text-red-600 mt-1">{codesError}</div>}
            </div>
            {Array.isArray(effectiveSelectedCodes) && effectiveSelectedCodes.length > 0 && (
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-500">Descriptions:</label>
                <ul className="list-disc ml-5 text-xs text-gray-700">
                  {effectiveSelectedCodes.map((opt) => (
                    <li key={opt.value} title={opt.code.description}>
                      {opt.code.description.length > 80 ? opt.code.description.slice(0, 80) + '...' : opt.code.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {currentStep === "deadline" && (
          <div className="space-y-4">
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
            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700 space-y-1">
              <div className="font-semibold text-gray-800">Review</div>
              <div><span className="font-medium">Address:</span> {addressLabel || 'Not selected'}</div>
              <div><span className="font-medium">Violation type:</span> {(VIOLATION_TYPE_OPTIONS.find(o => o.value === violationType) || { label: violationType }).label}</div>
              <div><span className="font-medium">Codes selected:</span> {effectiveSelectedCodes.length}</div>
              <div><span className="font-medium">Photos attached:</span> {files.length}</div>
              {user?.role === 3 && (
                <div><span className="font-medium">Assignee:</span> {assigneeId ? (onsUsers.find(u => String(u.id) === String(assigneeId))?.name || onsUsers.find(u => String(u.id) === String(assigneeId))?.email || 'Selected user') : 'Defaults to me'}</div>
              )}
            </div>
          </div>
        )}

        {error && <div className="text-red-500">{error}</div>}
        {success && <div className="text-green-600">Violation created!</div>}

        <div className="flex items-center justify-between pt-2">
          {!isFirstStep && (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Back
            </button>
          )}
          <div className="ml-auto flex gap-2">
            {!isLastStep && (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                disabled={!canAdvanceFromStep || loading}
              >
                Next
              </button>
            )}
            {isLastStep && (
              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                disabled={!canSubmit}
              >
                {loading ? "Adding..." : "Submit Violation"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
