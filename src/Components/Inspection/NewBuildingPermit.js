import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import AsyncSelect from "react-select/async";
import ContactSelection from "../Contact/ContactSelection";
import FileUploadInput from "../Common/FileUploadInput";

const addressSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: "42px",
    borderColor: state.isFocused ? "#2563eb" : provided.borderColor,
    boxShadow: state.isFocused ? "0 0 0 1px #2563eb" : provided.boxShadow,
    "&:hover": {
      borderColor: "#2563eb",
    },
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "#2563eb"
      : state.isFocused
      ? "#ebf4ff"
      : "white",
    color: state.isSelected ? "white" : "#111827",
    "&:active": { backgroundColor: "#2563eb", color: "white" },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#111827",
  }),
};

export default function NewBuildingPermit({
  defaultAddressId,
  defaultAddressLabel,
  onCreated,
  isOpen = true,
  onClose,
  renderAsModal = false,
  title = "New Building / Dumpster / POD Permit",
  description,
}) {
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({
    address_id: defaultAddressId ? String(defaultAddressId) : "",
    source: "Building/Dumpster/POD permit",
    attachments: [],
    scheduled_datetime: "",
    contact_id: "",
    new_contact_name: "",
    new_contact_email: "",
    new_contact_phone: "",
    paid: false,
  });
  const [addressLabel, setAddressLabel] = useState(defaultAddressLabel || "");
  const [previews, setPreviews] = useState([]);
  const [onsUsers, setOnsUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [contactError, setContactError] = useState("");
  const hasNewContactInput = (formData.new_contact_name || "").trim().length > 0;

  const STEPS = [
    { key: "attachments", label: "Attachments" },
    { key: "address", label: "Address" },
    { key: "contact", label: "Contact" },
    { key: "review", label: "Review" },
  ];
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const currentStep = STEPS[currentStepIndex]?.key;
  const canSubmit = Boolean(formData.address_id) && !submitting;

  const [localOpen, setLocalOpen] = useState(isOpen);
  useEffect(() => {
    setLocalOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      address_id: defaultAddressId ? String(defaultAddressId) : "",
    }));
    setAddressLabel(defaultAddressLabel || "");
  }, [defaultAddressId, defaultAddressLabel]);

  useEffect(() => {
    setPreviews((prev) => {
      prev.forEach((p) => {
        try {
          if (p.url) URL.revokeObjectURL(p.url);
        } catch (_) {}
      });
      return [];
    });
    const attachments = Array.isArray(formData.attachments)
      ? formData.attachments
      : Array.from(formData.attachments || []);
    if (attachments.length === 0) {
      setPreviews([]);
      return;
    }
    const next = attachments.map((file) => ({
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
    }));
    setPreviews(next);
    return () => {
      next.forEach((p) => {
        try {
          if (p.url) URL.revokeObjectURL(p.url);
        } catch (_) {}
      });
    };
  }, [formData.attachments]);

  useEffect(() => {
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

  const closeHandler = () => {
    if (onClose) onClose();
    else setLocalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAttachmentsChange = (files) => {
    const next = Array.isArray(files) ? files : Array.from(files || []);
    setFormData((prev) => ({ ...prev, attachments: next }));
  };

  const handleAddressChange = (selectedOption) => {
    const addressId = selectedOption ? selectedOption.value : "";
    setFormData((prev) => ({ ...prev, address_id: addressId }));
    setAddressLabel(selectedOption ? selectedOption.label : "");
    if (selectedOption) setAddressError("");
  };

  const removeAttachmentAt = (index) => {
    setFormData((prev) => {
      const attachments = Array.isArray(prev.attachments)
        ? [...prev.attachments]
        : Array.from(prev.attachments || []);
      attachments.splice(index, 1);
      return { ...prev, attachments };
    });
  };

  const handleNext = () => {
    if (currentStep === "address" && !formData.address_id) {
      setAddressError("Address is required.");
      return;
    }
    setCurrentStepIndex((idx) => Math.min(idx + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStepIndex((idx) => Math.max(idx - 1, 0));
  };

  const handleFinalSubmit = async () => {
    if (submitting) return;
    if (!formData.address_id) {
      setAddressError("Address is required.");
      setCurrentStepIndex(1);
      return;
    }
    setSubmitting(true);
    let effectiveContactId = formData.contact_id;
    setContactError("");
    if (!effectiveContactId && hasNewContactInput) {
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/contacts/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: formData.new_contact_name,
            email: formData.new_contact_email || undefined,
            phone: formData.new_contact_phone || undefined,
          }),
        });
        if (resp.ok) {
          const created = await resp.json();
          effectiveContactId = created?.id ?? null;
          if (effectiveContactId) {
            setFormData((prev) => ({ ...prev, contact_id: effectiveContactId }));
          }
        } else {
          setContactError("Failed to create contact. Continuing without contact.");
        }
      } catch (err) {
        console.error("Create contact error", err);
        setContactError("Failed to create contact. Continuing without contact.");
      }
    }

    const inspectionData = new FormData();
    const attachments = Array.isArray(formData.attachments)
      ? formData.attachments
      : Array.from(formData.attachments || []);
    attachments.forEach((file) => inspectionData.append("attachments", file));

    const payload = {
      ...formData,
      contact_id: effectiveContactId || formData.contact_id,
    };
    Object.keys(payload).forEach((key) => {
      if (key === "attachments") return;
      const value = payload[key];
      if (value !== null && value !== undefined && value !== "") {
        inspectionData.append(key, value);
      }
    });

    const effectiveInspectorId =
      user?.role === 3 && assigneeId ? assigneeId : user?.id;
    if (effectiveInspectorId) {
      inspectionData.set("inspector_id", String(effectiveInspectorId));
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/inspections/`,
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: inspectionData,
        }
      );

      if (!response.ok) throw new Error("Failed to create inspection");
      let created = null;
      try {
        created = await response.json();
      } catch (_) {}
      if (onCreated) onCreated(created);
      setCurrentStepIndex(0);
      setFormData({
        address_id: defaultAddressId ? String(defaultAddressId) : "",
        source: "Building/Dumpster/POD permit",
        attachments: [],
        scheduled_datetime: "",
        contact_id: "",
        new_contact_name: "",
        new_contact_email: "",
        new_contact_phone: "",
        paid: false,
      });
      setAddressLabel(defaultAddressLabel || "");
      if (renderAsModal) {
        if (onClose) onClose();
        else setLocalOpen(false);
      }
    } catch (error) {
      console.error("Error creating inspection:", error);
      alert("Error creating inspection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isLastStep) handleFinalSubmit();
    else handleNext();
  };

  const loadAddressOptions = async (inputValue) => {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/addresses/search?query=${inputValue}&limit=5`
    );
    const data = await response.json();
    return data.map((address) => ({
      label: `${address.property_name ? `${address.property_name} - ` : ""}${address.combadd}${
        address.aka ? ` (AKA: ${address.aka})` : ""
      }`,
      value: String(address.id),
    }));
  };

  const loadContactOptions = async (inputValue) => {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/contacts/search?query=${inputValue}&limit=5`
    );
    const data = await response.json();
    return data.map((contact) => ({
      label: `${contact.name} (${contact.email})`,
      value: contact.id,
    }));
  };

  const headingId = "new-building-permit-heading";
  const descriptionId = description ? "new-building-permit-description" : undefined;
  const open = renderAsModal ? (onClose ? isOpen : localOpen) : true;
  if (renderAsModal && !open) return null;
  const showCloseButton = renderAsModal || typeof onClose === "function";

  const card = (
    <div
      className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl"
      role={renderAsModal ? "dialog" : undefined}
      aria-modal={renderAsModal ? "true" : undefined}
      aria-labelledby={headingId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div>
          <h2 id={headingId} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-1 text-sm text-slate-600">
              {description}
            </p>
          )}
        </div>
        {showCloseButton && (
          <button
            type="button"
            onClick={closeHandler}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
          >
            <span className="sr-only">Close</span>&times;
          </button>
        )}
      </div>
      <div className="px-6 py-5">
        <div className="mb-4 flex items-center justify-between text-xs font-medium text-gray-500">
          {STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isComplete = index < currentStepIndex;
            return (
              <div
                key={step.key}
                className={`flex-1 px-1 text-center ${
                  isActive ? "text-blue-600" : ""
                }`}
              >
                <div
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border ${
                    isActive
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : isComplete
                      ? "border-green-500 bg-green-50 text-green-600"
                      : "border-gray-300 bg-white text-gray-500"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="mt-1 uppercase tracking-wide">{step.label}</div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {currentStep === "attachments" && (
            <div>
              <FileUploadInput
                label="Plans, Application, or Photos"
                name="attachments"
                files={formData.attachments}
                onChange={handleAttachmentsChange}
                accept="image/*,application/pdf"
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                Upload supporting documents or continue to the next step.
              </p>
            </div>
          )}

          {currentStep === "address" && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="permit-address"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Select Address <span className="text-red-600">*</span>
                </label>
                <div
                  className={`mt-1 ${
                    addressError ? "rounded border border-red-500 p-1" : ""
                  }`}
                  aria-invalid={!!addressError}
                  aria-describedby={
                    addressError ? "permit-address-error" : undefined
                  }
                >
                  <AsyncSelect
                    inputId="permit-address"
                    loadOptions={loadAddressOptions}
                    onChange={handleAddressChange}
                    placeholder="Type to search addresses..."
                    isClearable
                    styles={addressSelectStyles}
                    className="mb-0"
                    cacheOptions
                    defaultOptions
                    value={
                      formData.address_id
                        ? {
                            value: formData.address_id,
                            label:
                              addressLabel || String(formData.address_id),
                          }
                        : null
                    }
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  This field is required.
                </div>
                {addressError && (
                  <div
                    id="permit-address-error"
                    className="text-xs text-red-600 mt-1"
                  >
                    {addressError}
                  </div>
                )}
              </div>
              {user?.role === 3 && (
                <div>
                  <label
                    htmlFor="permit-assignee"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Assign to ONS member
                  </label>
                  <select
                    id="permit-assignee"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm"
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

          {currentStep === "contact" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Contact (optional)
              </label>
              <ContactSelection
                formData={formData}
                setFormData={setFormData}
                loadContactOptions={loadContactOptions}
                onInputChange={handleInputChange}
              />
              {contactError && (
                <div className="text-xs text-red-600 mt-1">{contactError}</div>
              )}
            </div>
          )}

          {currentStep === "review" && (
            <div className="space-y-3 rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <div className="font-semibold text-gray-900">
                Review and submit
              </div>
              <div>
                <span className="font-medium">Address:</span>{" "}
                {addressLabel || formData.address_id || "Not selected"}
              </div>
              <div>
                <span className="font-medium">Assignee:</span>{" "}
                {assigneeId
                  ? onsUsers.find((u) => String(u.id) === String(assigneeId))
                      ?.name ||
                    onsUsers.find((u) => String(u.id) === String(assigneeId))
                      ?.email ||
                    "Selected user"
                  : "Defaults to me"}
              </div>
              <div>
                <span className="font-medium">Contact:</span>{" "}
                {formData.contact_id
                  ? `Existing contact #${formData.contact_id}`
                  : formData.new_contact_name || "None"}
              </div>
              <div>
                <div className="font-medium">Attachments:</div>
                <div className="mt-2">
                  {previews.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {previews.map((preview, idx) => (
                        <div
                          key={preview.url || idx}
                          className="relative rounded border bg-white p-2 text-xs"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                if (preview.url)
                                  URL.revokeObjectURL(preview.url);
                              } catch (_) {}
                              removeAttachmentAt(idx);
                            }}
                            className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-red-600 shadow"
                          >
                            &times;
                          </button>
                          {preview.type?.startsWith("image/") ? (
                            <img
                              src={preview.url}
                              alt={preview.name}
                              className="h-20 w-full rounded object-cover"
                            />
                          ) : (
                            <div className="truncate">{preview.name}</div>
                          )}
                          <div className="mt-1 truncate text-center">
                            {preview.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-600 text-sm">
                      No attachments
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handleBack}
                className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                disabled={submitting}
              >
                Back
              </button>
            )}
            <div className="ml-auto flex gap-2">
              {!isLastStep && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                  disabled={submitting}
                >
                  Next
                </button>
              )}
              {isLastStep && (
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                  disabled={!canSubmit}
                >
                  {submitting ? "Creating…" : "Submit Permit"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  if (!renderAsModal) {
    return card;
  }

  const handleBackdropClick = () => {
    closeHandler();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/70 px-4 py-8 sm:py-12">
      <div className="absolute inset-0" onClick={handleBackdropClick} />
      <div className="relative z-10 flex w-full justify-center">{card}</div>
    </div>
  );
}
