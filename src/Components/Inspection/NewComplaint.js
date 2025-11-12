import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import AsyncSelect from "react-select/async";
import ContactSelection from "../Contact/ContactSelection";
import BusinessSelection from "../Business/BusinessSelection"; // Import the new component
import NewUnit from "../Inspection/NewUnit"; // Import NewUnit instead of NewUnitForm
import FileUploadInput from "../Common/FileUploadInput";

<<<<<<< HEAD
export default function NewComplaint({ onCreated }) {
=======
export default function NewComplaint({
  isOpen = true,
  onClose,
  renderAsModal = true,
  title = 'New Complaint',
  description,
}) {
>>>>>>> change
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [showBusinessSelection, setShowBusinessSelection] = useState(false);
  const [showNewUnitForm, setShowNewUnitForm] = useState(false);
  const [businessRefAnswer, setBusinessRefAnswer] = useState('');
  const [unitRefAnswer, setUnitRefAnswer] = useState('');

  // Form-ish state
  const [formData, setFormData] = useState({
    address_id: null,
    address_label: '',
    unit_id: null,
    source: "Complaint",
    description: "",
    business_id: null,
    contact_id: null,
    new_contact_name: "",
    new_contact_email: "",
    new_contact_phone: "",
    paid: false,
  });
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);

  // Admin assignment state
  const [onsUsers, setOnsUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [descError, setDescError] = useState("");
  const [addressError, setAddressError] = useState("");
  // Modal open state (keep hooks at top-level to satisfy rules-of-hooks)
  const [localOpen, setLocalOpen] = useState(isOpen);
  useEffect(() => {
    setLocalOpen(isOpen);
  }, [isOpen]);

  const closeHandler = () => {
    if (onClose) onClose(); else setLocalOpen(false);
  };

  const open = onClose ? isOpen : localOpen;
  

  // Wizard steps
  const STEPS = [
    { key: "photos", label: "Photos" },
    { key: "address", label: "Address" },
    { key: "units", label: "Unit / Business" },
    { key: "contact", label: "Contact" },
    { key: "details", label: "Details" },
    { key: "review", label: "Review" },
  ];
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/businesses/`);
        setBusinesses(await response.json());
      } catch (err) {
        console.error("Error fetching businesses:", err);
        setError(err.message || "Failed to load businesses");
      } finally {
        setLoading(false);
      }
    };
    fetchBusinesses();
  }, []);

  useEffect(() => {
    // Load ONS users for admin (role 3)
    const loadOns = async () => {
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/users/ons/`);
        if (!resp.ok) return;
        const data = await resp.json();
        setOnsUsers(Array.isArray(data) ? data : []);
      } catch {
        setOnsUsers([]);
      }
    };
    if (user?.role === 3) loadOns();
  }, [user?.role]);

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const currentStep = STEPS[currentStepIndex]?.key;

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

  const handleAddressChange = async (selectedOption) => {
    const addressId = selectedOption ? selectedOption.value : "";
    setFormData((prev) => ({ ...prev, address_id: addressId, address_label: selectedOption ? selectedOption.label : '', unit_id: "" }));
    if (selectedOption) setAddressError("");

    if (addressId) {
      try {
        const unitsRes = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${addressId}/units`);
        const unitsData = await unitsRes.json();
        setUnits(unitsData);
      } catch (err) {
        console.error("Error fetching units:", err);
        setUnits([]);
      }
    } else {
      setUnits([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (name === 'description' && (value || '').trim().length > 0) setDescError("");
    }
  };


  // Build preview URLs for attached photos so we can show them in Review
  useEffect(() => {
    // revoke previous urls
    setPreviews((prev) => {
      prev.forEach(p => p.url && URL.revokeObjectURL(p.url));
      return [];
    });
    if (!photos || photos.length === 0) {
      setPreviews([]);
      return;
    }
    const next = photos.map((f) => ({ name: f.name, type: f.type, url: URL.createObjectURL(f) }));
    setPreviews(next);
    return () => {
      next.forEach(p => p.url && URL.revokeObjectURL(p.url));
    };
  }, [photos]);

  const handleNext = () => {
    // Per-step validation
    if (currentStep === 'address') {
      if (!formData.address_id) {
        setAddressError('Please select an address.');
        return;
      }
      setAddressError('');
    }
    if (currentStep === 'details') {
      if (!formData.description || !formData.description.trim()) {
        setDescError('Description is required.');
        return;
      }
      setDescError('');
    }
    setCurrentStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleFinalSubmit = async () => {
    setError(null);
    // Validate address and description again before submission
    if (!formData.address_id) {
      setAddressError('Address is required.');
      setCurrentStepIndex(STEPS.findIndex(s => s.key === 'address'));
      return;
    }
    if (!formData.description || !formData.description.trim()) {
      setDescError('Description is required.');
      setCurrentStepIndex(STEPS.findIndex(s => s.key === 'details'));
      return;
    }

    try {
      // Create contact if needed
      let effectiveContactId = formData.contact_id;
      const hasNewContact = !effectiveContactId && (formData.new_contact_name || '').trim().length > 0;
      if (hasNewContact) {
        try {
          const resp = await fetch(`${process.env.REACT_APP_API_URL}/contacts/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({
              name: formData.new_contact_name,
              email: formData.new_contact_email || undefined,
              phone: formData.new_contact_phone || undefined,
            }),
          });
          if (resp.ok) {
            const created = await resp.json();
            effectiveContactId = created?.id ?? null;
            if (effectiveContactId) setFormData((p) => ({ ...p, contact_id: effectiveContactId }));
          }
        } catch (err) {
          console.error('Create contact error:', err);
        }
      }

      const createForm = new FormData();
      if (formData.address_id) createForm.append('address_id', String(formData.address_id));
      if (formData.unit_id) createForm.append('unit_id', String(formData.unit_id));
      createForm.append('source', formData.source || 'Complaint');
      createForm.append('description', formData.description || '');
      createForm.append('comment', formData.description || '');
      if (effectiveContactId) createForm.append('contact_id', String(effectiveContactId));
      if (formData.business_id) createForm.append('business_id', String(formData.business_id));
      createForm.append('paid', formData.paid ? 'true' : 'false');
      if (photos.length > 0) photos.forEach((p) => createForm.append('attachments', p));

      // Determine inspector assignment
      let inspectorId = null;
      if (user?.role === 3) inspectorId = assigneeId ? String(assigneeId) : null;
      else if (user?.role === 1 && user?.id) inspectorId = String(user.id);
      if (inspectorId) createForm.append('inspector_id', inspectorId);

      const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: createForm,
      });
<<<<<<< HEAD

      if (!complaintResponse.ok) {
        throw new Error("Failed to create complaint");
      }

      const createdComplaint = await complaintResponse.json();
      if (typeof onCreated === 'function') {
        onCreated(createdComplaint);
      } else {
        alert('Complaint created successfully!');
      }
      if (createdComplaint?.id) {
        navigate(`/complaint/${createdComplaint.id}`);
      }
=======
      if (!resp.ok) throw new Error('Failed to create complaint');
      const created = await resp.json();
>>>>>>> change
      setPhotos([]);
      alert('Complaint created successfully!');
      if (created?.id) navigate(`/complaint/${created.id}`);
    } catch (err) {
      console.error('Error creating complaint:', err);
      setError(err.message || 'Error creating complaint');
      alert('Error creating complaint.');
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isLastStep) handleFinalSubmit();
    else handleNext();
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  const headingId = `new-complaint-title`;

  

  const card = (
    <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div>
          <h2 id={headingId} className="text-lg font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        </div>
        <button type="button" onClick={closeHandler} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700">
          <span className="sr-only">Close</span>×
        </button>
      </div>
      <div className="px-6 py-5">
        <div className="mb-4 flex items-center justify-between text-xs font-medium text-gray-500">
          {STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isComplete = index < currentStepIndex;
            return (
              <div key={step.key} className={`flex-1 text-center px-1 ${isActive ? 'text-blue-600' : ''}`}>
                <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border ${isActive ? 'border-blue-600 bg-blue-50 text-blue-600' : isComplete ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-300 bg-white text-gray-500'}`}>
                  {index + 1}
                </div>
                <div className="mt-1 uppercase tracking-wide">{step.label}</div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {currentStep === 'photos' && (
            <div>
              <FileUploadInput
                label="Attachments"
                name="attachments"
                files={photos}
                onChange={setPhotos}
                accept="image/*,application/pdf"
              />
              <div className="mt-1 text-xs text-gray-500">Add photos now or continue to the next step.</div>
            </div>
          )}

          {currentStep === 'address' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="nc-address">
                  Address <span className="text-red-600" aria-hidden> *</span>
                </label>
                <div className={`${addressError ? 'rounded border border-red-500' : ''} mb-2`} aria-invalid={!!addressError} aria-describedby={addressError ? 'nc-address-error' : undefined}>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions
                    loadOptions={loadAddressOptions}
                    onChange={handleAddressChange}
                    inputId="nc-address"
                    value={formData.address_id ? { value: formData.address_id, label: formData.address_label || '' } : null}
                    placeholder="Type to search addresses..."
                    isClearable
                    className="mb-0"
                  />
                </div>
                <div className="text-xs text-gray-500">This field is required.</div>
                {addressError && <div id="nc-address-error" className="mt-1 text-xs text-red-600">{addressError}</div>}
              </div>
              {user?.role === 3 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Assign to ONS member</label>
                  <select
                    className="w-full rounded border border-gray-300 px-2 py-1"
                    value={assigneeId}
                    onChange={e => setAssigneeId(e.target.value)}
                  >
                    <option value="">Unassigned (defaults to me)</option>
                    {onsUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {currentStep === 'units' && (
            <div className="space-y-4">
              {formData.address_id && (
                <div>
                  <div role="radiogroup" aria-label="Is this for a specific unit?" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Is this for a specific unit?</div>
                      <div className="text-xs text-gray-500">You can attach this complaint to a specific unit — optional.</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center text-sm">
                        <input
                          type="radio"
                          name="unit_ref"
                          value="no"
                          checked={unitRefAnswer === 'no'}
                          onChange={() => {
                            setUnitRefAnswer('no');
                            setShowNewUnitForm(false);
                            setFormData((p) => ({ ...p, unit_id: null }));
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">No</span>
                      </label>
                      <label className="inline-flex items-center text-sm">
                        <input
                          type="radio"
                          name="unit_ref"
                          value="yes"
                          checked={unitRefAnswer === 'yes'}
                          onChange={() => {
                            setUnitRefAnswer('yes');
                            // show unit selection UI
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-blue-700">Yes — select unit</span>
                      </label>
                    </div>
                  </div>

                  {unitRefAnswer === 'yes' && (
                    <div className="mt-3">
                      {units.length > 0 ? (
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Select a Unit</label>
                          <select
                            id="unit_id"
                            name="unit_id"
                            value={formData.unit_id || ''}
                            onChange={handleInputChange}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm"
                          >
                            <option value="">Leave blank if it's for the whole building</option>
                            {units.map((unit) => (
                              <option key={unit.id} value={unit.id}>{unit.number}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No units found for this address. You can add one below.</p>
                      )}

                      <div className="mt-3">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setShowNewUnitForm(!showNewUnitForm)} className="inline-flex items-center gap-2 rounded border border-blue-500 bg-white px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-500 hover:text-white">
                            {showNewUnitForm ? 'Hide New Unit Form' : 'Add a New Unit'}
                          </button>
                        </div>
                        {showNewUnitForm && (
                          <div className="mt-2">
                            <NewUnit
                              addressId={formData.address_id}
                              inspectionId={null}
                              onUnitCreated={(newUnit) => {
                                setUnits((prev) => [...prev, newUnit]);
                                setFormData((prev) => ({ ...prev, unit_id: newUnit.id }));
                                setShowNewUnitForm(false);
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        <button type="button" onClick={handleNext} className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white">Continue</button>
                        <button type="button" onClick={() => { setUnitRefAnswer(''); setShowNewUnitForm(false); setFormData((p) => ({ ...p, unit_id: null })); }} className="ml-2 inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div role="radiogroup" aria-label="Is this in reference to a business?" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Is this in reference to a business?</div>
                    <div className="text-xs text-gray-500">You can attach this complaint to a business — optional.</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center text-sm">
                      <input
                        type="radio"
                        name="business_ref"
                        value="no"
                        checked={businessRefAnswer === 'no'}
                        onChange={() => {
                          setBusinessRefAnswer('no');
                          setShowBusinessSelection(false);
                          setFormData((p) => ({ ...p, business_id: null }));
                        }}
                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">No</span>
                    </label>
                    <label className="inline-flex items-center text-sm">
                      <input
                        type="radio"
                        name="business_ref"
                        value="yes"
                        checked={businessRefAnswer === 'yes'}
                        onChange={() => {
                          setBusinessRefAnswer('yes');
                          setShowBusinessSelection(true);
                        }}
                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-blue-700">Yes — select business</span>
                    </label>
                  </div>
                </div>

                {showBusinessSelection && (
                  <div className="mt-3">
                    <BusinessSelection
                      businesses={businesses}
                      formData={formData}
                      handleInputChange={(e) => setFormData((p) => ({ ...p, business_id: e.target.value }))}
                    />
                    <div className="mt-2">
                      <button type="button" onClick={handleNext} className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white">Continue</button>
                      <button type="button" onClick={() => { setShowBusinessSelection(false); setBusinessRefAnswer(''); setFormData((p) => ({ ...p, business_id: null })); }} className="ml-2 inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'contact' && (
            <div>
              <ContactSelection
                formData={formData}
                setFormData={setFormData}
                loadContactOptions={async (q) => {
                  const response = await fetch(`${process.env.REACT_APP_API_URL}/contacts/search?query=${q}&limit=5`);
                  const data = await response.json();
                  return data.map((c) => ({ label: `${c.name} (${c.email})`, value: c.id }));
                }}
                onInputChange={handleInputChange}
              />
            </div>
          )}

          {currentStep === 'details' && (
            <div>
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description <span className="text-red-600" aria-hidden> *</span></label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  onBlur={() => { if (!formData.description || !formData.description.trim()) setDescError('Description is required.'); }}
                  aria-invalid={!!descError}
                  aria-describedby={descError ? 'description-error' : undefined}
                  className={`mt-1 block w-full shadow-sm rounded-md ${descError ? 'border-red-500 border' : 'border-gray-300'}`}
                />
                <div className="text-xs text-gray-500 mt-1">This field is required.</div>
                {descError && <div id="description-error" className="text-xs text-red-600 mt-1">{descError}</div>}
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-4">
              <div className="space-y-1 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <div className="font-semibold text-gray-800">Review</div>
                <div><span className="font-medium">Address:</span> {formData.address_label || formData.address_id || 'Not selected'}</div>
                <div><span className="font-medium">Unit:</span> {formData.unit_id || 'None'}</div>
                <div><span className="font-medium">Business:</span> {formData.business_id || 'None'}</div>
                <div><span className="font-medium">Contact:</span> {formData.contact_id || formData.new_contact_name || 'None'}</div>
                <div><span className="font-medium">Description:</span> {(formData.description || '').slice(0, 200)}</div>
                <div>
                  <div className="font-medium">Attachments:</div>
                  <div className="mt-2">
                    {previews && previews.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {previews.map((p, idx) => (
                          <div key={idx} className="relative flex flex-col items-center text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                try { if (p.url) URL.revokeObjectURL(p.url); } catch (e) {}
                                setPhotos((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              aria-label={`Remove ${p.name}`}
                              className="absolute right-0 top-0 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-red-600 border border-gray-200 hover:bg-red-50"
                            >
                              ×
                            </button>
                            {p.type && p.type.startsWith('image/') ? (
                              <img src={p.url} alt={p.name} className="h-20 w-full rounded object-cover border" />
                            ) : (
                              <a href={p.url} download className="inline-block w-full truncate rounded border px-2 py-1 text-sm text-gray-700 bg-white">{p.name}</a>
                            )}
                            <div className="mt-1 text-xs text-gray-600 truncate w-full text-center">{p.name}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">No attachments</div>
                    )}
                  </div>
                </div>
                {user?.role === 3 && <div><span className="font-medium">Assignee:</span> {assigneeId ? (onsUsers.find(u => String(u.id) === String(assigneeId))?.name || onsUsers.find(u => String(u.id) === String(assigneeId))?.email || 'Selected user') : 'Defaults to me'}</div>}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {!isFirstStep && (
              <button type="button" onClick={handleBack} className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">Back</button>
            )}
            <div className="ml-auto flex gap-2">
              {!isLastStep && (
                <button type="button" onClick={handleNext} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">Next</button>
              )}
              {isLastStep && (
                <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">Create New Complaint</button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  if (!renderAsModal) return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <div className="mt-6">{card}</div>
    </div>
  );

  if (!open) return null;

  const handleBackdropClick = () => {
    closeHandler();
  };

  return (
<<<<<<< HEAD
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">New Complaint</h1>
      <form onSubmit={handleSubmit} className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">

        {/* Address Selection */}
        <div className="mb-4">
          <label htmlFor="address_id" className="block text-sm font-medium text-gray-700">
            Select Address <span className="text-red-600 required-indicator" aria-hidden> *</span>
          </label>
          <div
            className={`mt-1 ${addressError ? 'border border-red-500 rounded p-1' : ''}`}
            aria-invalid={!!addressError}
            aria-describedby={addressError ? 'address-error' : undefined}
          >
            <AsyncSelect
              inputId="address_id"
              loadOptions={loadAddressOptions} // Set the async loader function
              onChange={handleAddressChange}
              placeholder="Type to search addresses..."
              isClearable
              styles={customStyles} // Reuse custom styles if desired
              classNamePrefix="address-select"
              className="mb-0"
              cacheOptions // Cache loaded options for performance
              defaultOptions // Show default options initially
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">This field is required.</div>
          {addressError && (
            <div id="address-error" className="text-xs text-red-600 mt-1">{addressError}</div>
          )}
        </div>

        {/* Assignee (Admin only) */}
        {user?.role === 3 && (
          <div className="mb-4">
            <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700">
              Assign to ONS member
            </label>
            <select
              id="assignee_id"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm"
            >
              <option value="">Unassigned</option>
              {onsUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Unit Selection */}
        {units.length > 0 && (
          <div className="mb-4">
            <label htmlFor="unit_id" className="block text-sm font-medium text-gray-700">
              Select a Unit (optional)
            </label>
            <select
              id="unit_id"
              name="unit_id"
              value={formData.unit_id}
              onChange={handleInputChange}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm"
            >
              <option value="">Leave blank if it's for the whole Building</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.number}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* New Unit Form */}
        {formData.address_id && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowNewUnitForm(!showNewUnitForm)}
              className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-1 px-2 border border-blue-500 hover:border-transparent rounded"
            >
              {showNewUnitForm ? "Hide New Unit Form" : "Add a New Unit"}
            </button>
            {showNewUnitForm && (
              <NewUnit
                addressId={formData.address_id}
                inspectionId={null} // Pass null or appropriate value for inspectionId
                onUnitCreated={(newUnit) => {
                  setUnits([...units, newUnit]);
                  setFormData({ ...formData, unit_id: newUnit.id });
                  setShowNewUnitForm(false);
                }}
              />
            )}
          </div>
        )}

        {/* Description Field */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-red-600 required-indicator" aria-hidden> *</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            onBlur={() => {
              if (!isDescriptionValid) setDescError('Description is required.');
            }}
            aria-invalid={!!descError}
            aria-describedby={descError ? 'description-error' : undefined}
            className={`mt-1 block w-full shadow-sm rounded-md ${descError ? 'border-red-500 border' : 'border-gray-300'}`}
          ></textarea>
          <div className="text-xs text-gray-500 mt-1">This field is required.</div>
          {descError && (
            <div id="description-error" className="text-xs text-red-600 mt-1">{descError}</div>
          )}
        </div>

        {/* Attachments Field */}
        <div className="mb-4">
          <FileUploadInput
            label="Application or Photos"
            name="attachments"
            files={photos}
            onChange={handleAttachmentsChange}
            accept="image/*,application/pdf"
          />
        </div>

        {/* Business Selection Toggle */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowBusinessSelection(!showBusinessSelection)}
            className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-1 px-2 border border-blue-500 hover:border-transparent rounded"
            >
            {showBusinessSelection ? "Hide Business Selection" : "Add a Business"}
          </button>
          {showBusinessSelection && (
            <BusinessSelection
              businesses={businesses}
              formData={formData}
              handleInputChange={handleInputChange}
            />
          )}
        </div>

        {/* Contact Selection */}
        <ContactSelection
          formData={formData}
          setFormData={setFormData}
          loadContactOptions={loadContactOptions}
          onInputChange={handleInputChange}
        />

        {/* Submit Button */}
        <div className="mt-6">
          <button
            type="submit"
            className="w-full inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
            disabled={!isDescriptionValid || !isAddressValid}
            aria-disabled={!isDescriptionValid || !isAddressValid}
          >
            Create New Complaint
          </button>
        </div>
      </form>
=======
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/70 px-4 py-8 sm:py-12">
      <div className="absolute inset-0" onClick={handleBackdropClick} />
      <div className="relative z-10 flex w-full justify-center">{card}</div>
>>>>>>> change
    </div>
  );
}
