import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../AuthContext';
import CodeSelect from '../CodeSelect';
import CodeDrawerLink from '../Codes/CodeDrawerLink';
import FileUploadInput from '../Common/FileUploadInput';
import LoadingSpinner from '../Common/LoadingSpinner';
import { appendGeoMetadata } from '../../utils';

const DEADLINE_OPTIONS = [
  'Immediate',
  '1 day',
  '3 days',
  '7 days',
  '14 days',
  '30 days',
];

const STEPS = [
  { key: 'attachments', label: 'Attachments' },
  { key: 'codes', label: 'Violation codes' },
  { key: 'details', label: 'Details' },
];

const NewAddressViolation = ({ addressId, onViolationAdded }) => {
  const VIOLATION_TYPE_OPTIONS = [
    { value: 'doorhanger', label: 'Doorhanger' },
    { value: 'Formal Notice', label: 'Formal Notice' },
  ];

  const { user } = useAuth();
  const [violationType, setViolationType] = useState(VIOLATION_TYPE_OPTIONS[0].value);
  const [deadline, setDeadline] = useState(DEADLINE_OPTIONS[0]);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [files, setFiles] = useState([]);
  const [photoCodeMap, setPhotoCodeMap] = useState({}); // key -> [CodeSelect option objects]
  const [photoError, setPhotoError] = useState('');
  const [codesError, setCodesError] = useState('');
  const [units, setUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [photoTagIndex, setPhotoTagIndex] = useState(0);
  const [previews, setPreviews] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = STEPS[currentStepIndex] || STEPS[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const selectedPhotos = useMemo(() => previews.map((p) => p.key), [previews]);
  const currentPhotoMeta = useMemo(() => previews[photoTagIndex] || null, [previews, photoTagIndex]);

  const photoCodeOptionsUnion = useMemo(() => {
    const map = new Map();
    Object.values(photoCodeMap || {}).forEach((opts) => {
      (opts || []).forEach((opt) => {
        const id =
          opt?.code?.id ??
          (typeof opt?.value === 'number'
            ? opt.value
            : typeof opt?.value === 'string'
              ? Number(opt.value)
              : null);
        if (typeof id === 'number' && !Number.isNaN(id) && !map.has(id)) {
          map.set(id, opt);
        }
      });
    });
    return Array.from(map.values());
  }, [photoCodeMap]);

  const allSelectedCodeIds = useMemo(() => {
    return photoCodeOptionsUnion
      .map((opt) =>
        opt?.code?.id ??
        (typeof opt?.value === 'number'
          ? opt.value
          : typeof opt?.value === 'string'
            ? Number(opt.value)
            : null)
      )
      .filter((id) => typeof id === 'number' && !Number.isNaN(id));
  }, [photoCodeOptionsUnion]);

  useEffect(() => {
    setSelectedCodes(photoCodeOptionsUnion);
  }, [photoCodeOptionsUnion]);

  const fileKey = (f) => `${f.name}::${f.size}::${f.lastModified}`;
  const handleFilesChange = (nextFiles) => {
    const list = Array.isArray(nextFiles) ? nextFiles : Array.from(nextFiles || []);
    setFiles(list);
    setPhotoError(list.length === 0 ? 'Please upload at least one photo for this violation.' : '');
    setPhotoCodeMap((prev) => {
      const next = {};
      list.forEach((f) => {
        const key = fileKey(f);
        next[key] = prev[key] || [];
      });
      return next;
    });
    setPhotoTagIndex(0);
  };

  useEffect(() => {
    const toId = (opt) => {
      if (!opt) return null;
      if (opt.code && typeof opt.code.id === 'number') return opt.code.id;
      if (typeof opt.value === 'number') return opt.value;
      if (typeof opt.value === 'string') {
        const parsed = Number(opt.value);
        return Number.isNaN(parsed) ? null : parsed;
      }
      return null;
    };
    const allowedIds = new Set(
      (selectedCodes || [])
        .map(toId)
        .filter((id) => typeof id === 'number' && !Number.isNaN(id))
    );
    setPhotoCodeMap((prev) => {
      const next = {};
      Object.entries(prev || {}).forEach(([k, opts]) => {
        next[k] = (opts || []).filter((opt) => allowedIds.has(toId(opt)));
      });
      return next;
    });
  }, [selectedCodes]);

  useEffect(() => {
    setPreviews((prev) => {
      prev.forEach((p) => p.url && URL.revokeObjectURL(p.url));
      return [];
    });
    if (!files || files.length === 0) {
      setPreviews([]);
      setPhotoTagIndex(0);
      setSelectedCodes([]);
      return;
    }
    const next = files.map((f) => ({
      key: fileKey(f),
      name: f.name,
      type: f.type,
      url: URL.createObjectURL(f),
      isImage: f.type && f.type.startsWith('image/'),
    }));
    setPreviews(next);
    setPhotoTagIndex((idx) => Math.min(idx, Math.max(next.length - 1, 0)));
    return () => next.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Helper to reset attachment state to avoid no-undef and keep logic centralized
  const resetAttachmentState = () => {
    handleFilesChange([]);
    setPhotoError('');
  };

  const handleToggleForm = () => {
    setShowForm((prev) => {
      const next = !prev;
      if (!next) {
        handleFilesChange([]);
        setPhotoError('');
        setCodesError('');
        setError(null);
        setSuccess(false);
        setCurrentStepIndex(0);
        setPhotoTagIndex(0);
      }
      return next;
    });
  };

  const goPrevPhoto = () => {
    setPhotoTagIndex((idx) => Math.max(0, idx - 1));
  };

  const goNextPhoto = () => {
    setPhotoTagIndex((idx) => Math.min(selectedPhotos.length - 1, idx + 1));
  };

  const handleBack = () => {
    if (submitting) return;
    setError(null);
    setCodesError('');
    setPhotoError('');
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    if (submitting) return;
    if (currentStep.key === 'attachments') {
      if (!files || files.length === 0) {
        setPhotoError('Please upload at least one photo for this violation.');
        return;
      }
      setPhotoError('');
    }
    if (currentStep.key === 'codes') {
      if (!Array.isArray(allSelectedCodeIds) || allSelectedCodeIds.length === 0) {
        setCodesError('Please select at least one violation code.');
        return;
      }
      setCodesError('');
    }
    setError(null);
    setCurrentStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isLastStep) {
      handleNext();
      return;
    }
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
      setCurrentStepIndex(2);
      return;
    }

    // Basic client validation: require addressId, at least one code, and at least one photo
    if (!addressId) {
      setError('Address is required.');
      setSubmitting(false);
      return;
    }
    if (!Array.isArray(allSelectedCodeIds) || allSelectedCodeIds.length === 0) {
      setCodesError('Please select at least one violation code.');
      setCurrentStepIndex(1);
      setSubmitting(false);
      return;
    }
    setCodesError('');
    if (!files || files.length === 0) {
      setPhotoError('Please upload at least one photo for this violation.');
      setCurrentStepIndex(0);
      setSubmitting(false);
      return;
    }
    setPhotoError('');

    try {
      const violationData = {
        address_id: addressId ? parseInt(addressId, 10) : undefined,
        user_id: user?.id,
        deadline: safeDeadline,
        violation_type: violationType,
        codes: allSelectedCodeIds,
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
        for (const file of files) {
          const fd = new FormData();
          fd.append('files', file);
          const key = fileKey(file);
          const codesForPhoto = (photoCodeMap[key] || [])
            .map((opt) => {
              if (opt?.code && typeof opt.code.id === 'number') return opt.code.id;
              if (typeof opt?.value === 'number') return opt.value;
              if (typeof opt?.value === 'string') {
                const parsed = Number(opt.value);
                return Number.isNaN(parsed) ? null : parsed;
              }
              return null;
            })
            .filter((cid) => typeof cid === 'number' && !Number.isNaN(cid));
          if (codesForPhoto.length > 0) {
            fd.append('code_ids', JSON.stringify(codesForPhoto));
          }
          await appendGeoMetadata(fd);
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
      }
      setSuccess(true);
      setSelectedCodes([]);
      setSelectedUnitId('');
      setViolationType(VIOLATION_TYPE_OPTIONS[0].value);
      setDeadline(DEADLINE_OPTIONS[0]);
      resetAttachmentState();
      setCurrentStepIndex(0);
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
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            {STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isComplete = index < currentStepIndex;
              const baseClasses = 'flex items-center gap-2 rounded-full px-3 py-1.5 transition';
              const stateClasses = isActive
                ? 'bg-indigo-600 text-white'
                : isComplete
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-200 text-gray-600';
              return (
                <React.Fragment key={step.key}>
                  <div className={`${baseClasses} ${stateClasses}`}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[0.7rem]">
                      {index + 1}
                    </span>
                    <span>{step.label}</span>
                  </div>
                  {index < STEPS.length - 1 && <span className="text-gray-400">{'>'}</span>}
                </React.Fragment>
              );
            })}
          </div>

          {currentStep.key === 'attachments' && (
            <div className="space-y-3">
              <div>
                <FileUploadInput
                  label="Attachments"
                  name="attachments"
                  files={files}
                  onChange={handleFilesChange}
                  accept="image/*,application/pdf"
                  disabled={submitting}
                />
                <div className="text-xs text-gray-500 mt-1">Upload at least one photo before continuing.</div>
                {photoError && <div className="text-red-500 text-sm mt-1">{photoError}</div>}
              </div>
              {files.length > 0 && (
                <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  <div className="font-semibold text-gray-800">Attachments selected</div>
                  <div>{files.length} file{files.length === 1 ? '' : 's'} ready. You can tag them to codes on the next step.</div>
                </div>
              )}
            </div>
          )}

          {currentStep.key === 'codes' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Tag photos with violation codes</p>
                    <p className="text-xs text-gray-500">Assign codes per photo. Leave blank to omit the photo from the notice.</p>
                  </div>
                </div>
                {selectedPhotos.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                      {currentPhotoMeta ? (
                        <div className="space-y-3">
                          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            {currentPhotoMeta.isImage && currentPhotoMeta.url ? (
                              <img
                                src={currentPhotoMeta.url}
                                alt={currentPhotoMeta.name}
                                className="max-h-64 w-full object-contain bg-gray-900/5"
                              />
                            ) : (
                              <div className="flex h-40 items-center justify-center bg-gray-100 text-gray-500">
                                <span className="text-sm font-semibold">{currentPhotoMeta.name || 'FILE'}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500">Select which codes this photo should support. Leave empty to exclude it from the notice.</p>
                          <CodeSelect
                            onChange={(value) => {
                              setCodesError('');
                              setPhotoCodeMap((prev) => ({ ...(prev || {}), [currentPhotoMeta.key]: value || [] }));
                            }}
                            value={photoCodeMap[currentPhotoMeta.key] || []}
                            isMulti={true}
                            isDisabled={submitting}
                            showDescription
                          />
                          {Array.isArray(allSelectedCodeIds) && allSelectedCodeIds.length > 0 && (
                            <div className="mt-2 space-y-1 text-xs">
                              <p className="font-semibold text-gray-700">All selected codes (across photos):</p>
                              <div className="flex flex-wrap gap-2">
                                {selectedCodes.map((opt) => {
                                  const id = opt?.code?.id ?? opt?.value;
                                  if (!id) return null;
                                  return (
                                    <CodeDrawerLink
                                      key={id}
                                      codeId={id}
                                      className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200"
                                    >
                                      {opt.code?.name || opt.label || `Code ${id}`}
                                    </CodeDrawerLink>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span className="font-semibold uppercase tracking-wide text-gray-500">
                              Tag photo {photoTagIndex + 1} of {selectedPhotos.length}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={goPrevPhoto}
                                disabled={photoTagIndex === 0}
                                className="rounded-full border border-gray-300 px-3 py-1 text-[11px] font-semibold text-gray-700 disabled:opacity-50"
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                onClick={goNextPhoto}
                                disabled={photoTagIndex >= selectedPhotos.length - 1}
                                className="rounded-full border border-gray-300 px-3 py-1 text-[11px] font-semibold text-gray-700 disabled:opacity-50"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Upload a photo in step 1 to tag codes.</p>
                      )}
                    </div>
                  </div>
                )}
                {codesError && <div className="mt-1 text-sm text-red-600">{codesError}</div>}
              </div>
            </div>
          )}

          {currentStep.key === 'details' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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

              <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <div className="font-semibold text-gray-800">Review</div>
                <ul className="mt-2 space-y-1">
                  <li><span className="font-medium">Attachments:</span> {files.length}</li>
                  <li><span className="font-medium">Codes:</span> {selectedCodes.length}</li>
                  <li>
                    <span className="font-medium">Violation type:</span>{' '}
                    {VIOLATION_TYPE_OPTIONS.find(opt => opt.value === violationType)?.label || violationType}
                  </li>
                  <li><span className="font-medium">Deadline:</span> {deadline}</li>
                  {units && units.length > 0 && (
                    <li>
                      <span className="font-medium">Unit:</span>{' '}
                      {selectedUnitId
                        ? (units.find((u) => String(u.id) === String(selectedUnitId))?.name ||
                          units.find((u) => String(u.id) === String(selectedUnitId))?.number ||
                          `Unit ${selectedUnitId}`)
                        : 'No unit selected'}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {error && <div className="text-red-500">{error}</div>}
          {success && <div className="text-green-600">Violation created!</div>}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleBack}
              className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              disabled={isFirstStep || submitting}
            >
              Back
            </button>
            <div className="ml-auto flex gap-2">
              {!isLastStep && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-50"
                  disabled={
                    submitting ||
                    (currentStep.key === 'attachments' && files.length === 0) ||
                    (currentStep.key === 'codes' && (!Array.isArray(allSelectedCodeIds) || allSelectedCodeIds.length === 0))
                  }
                >
                  Next
                </button>
              )}
              {isLastStep && (
                <button
                  type="submit"
                  className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <LoadingSpinner />
                      Saving...
                    </span>
                  ) : (
                    'Create violation'
                  )}
                </button>
              )}
              <button
                type="button"
                className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
                onClick={() => {
                  setShowForm(false);
                  resetAttachmentState();
                  setCurrentStepIndex(0);
                  setCodesError('');
                  setPhotoError('');
                  setError(null);
                }}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default NewAddressViolation;
