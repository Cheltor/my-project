import React, { useState } from "react";
import AsyncSelect from "react-select/async";
import FileUploadInput from "./Common/FileUploadInput";
import NewContactForm from "./Contact/NewContactForm";

const defaultFormState = {
  address_id: null,
  unit_id: "",
  source: "Complaint",
  description: "",
  contact_id: null,
  new_contact_name: "",
  new_contact_email: "",
  new_contact_phone: "",
};

const selectStyles = {
  control: (provided) => ({
    ...provided,
    backgroundColor: "white",
    borderColor: "#d1d5db",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#ebf4ff" : "white",
    color: state.isSelected ? "white" : "#111827",
    "&:active": { backgroundColor: "#2563eb", color: "white" },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#111827",
  }),
};

export default function ResidentConcern() {
  const [formData, setFormData] = useState(defaultFormState);
  const [units, setUnits] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [useExistingContact, setUseExistingContact] = useState(true);
  const [addressError, setAddressError] = useState("");
  const [descError, setDescError] = useState("");
  const [contactError, setContactError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState(null);
  const [addressSelectKey, setAddressSelectKey] = useState(0);
  const [contactSelectKey, setContactSelectKey] = useState(0);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "description") {
      if ((value || "").trim().length > 0) setDescError("");
    }
    if (name === "new_contact_name" || name === "new_contact_email" || name === "new_contact_phone") {
      if ((value || "").trim().length > 0) {
        setContactError("");
      }
    }
  };

  const handleAttachmentsChange = (files) => {
    const next = Array.isArray(files) ? files : Array.from(files || []);
    setPhotos(next);
  };

  const handleAddressChange = async (option) => {
    const addressId = option ? option.value : null;
    setFormData((prev) => ({ ...prev, address_id: addressId, unit_id: "" }));
    setUnits([]);
    if (addressId) {
      setAddressError("");
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${addressId}/units`);
        if (response.ok) {
          const data = await response.json();
          setUnits(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error loading units:", error);
      }
    } else {
      setAddressError("Address is required.");
    }
  };

  const loadAddressOptions = async (inputValue) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/addresses/search?query=${encodeURIComponent(inputValue)}&limit=5`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((address) => ({
        label: `${address.property_name ? `${address.property_name} - ` : ""}${address.combadd}${
          address.aka ? ` (AKA: ${address.aka})` : ""
        }`,
        value: address.id,
      }));
    } catch (error) {
      console.error("Error loading addresses:", error);
      return [];
    }
  };

  const loadContactOptions = async (inputValue) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/contacts/search?query=${encodeURIComponent(inputValue)}&limit=5`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((contact) => ({
        label: contact.name || `Contact #${contact.id}`,
        value: contact.id,
      }));
    } catch (error) {
      console.error("Error loading contacts:", error);
      return [];
    }
  };

  const toggleContactMode = () => {
    setUseExistingContact((prev) => {
      const next = !prev;
      setFormData((current) => ({
        ...current,
        contact_id: next ? current.contact_id : null,
        new_contact_name: next ? "" : current.new_contact_name,
        new_contact_email: next ? "" : current.new_contact_email,
        new_contact_phone: next ? "" : current.new_contact_phone,
      }));
      setContactError("");
      if (!next) {
        setContactSelectKey((key) => key + 1);
      }
      return next;
    });
  };

  const validateContactChoice = () => {
    const hasExisting = Boolean(formData.contact_id);
    const name = (formData.new_contact_name || "").trim();
    const email = (formData.new_contact_email || "").trim();
    const phone = (formData.new_contact_phone || "").trim();
    const hasNewContact = name.length > 0;
    if (hasExisting) {
      setContactError("");
      return true;
    }
    if (hasNewContact && (email || phone)) {
      setContactError("");
      return true;
    }
    setContactError("Please select an existing contact or provide a name plus an email or phone.");
    return false;
  };

  const resetForm = () => {
    setFormData(defaultFormState);
    setUnits([]);
    setPhotos([]);
    setUseExistingContact(true);
    setAddressError("");
    setDescError("");
    setContactError("");
    setAddressSelectKey((key) => key + 1);
    setContactSelectKey((key) => key + 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmissionMessage(null);

    let hasErrors = false;
    if (!formData.address_id) {
      setAddressError("Address is required.");
      hasErrors = true;
    }
    if (!(formData.description || "").trim()) {
      setDescError("Description is required.");
      hasErrors = true;
    }
    if (!validateContactChoice()) {
      hasErrors = true;
    }
    if (hasErrors) return;

    setIsSubmitting(true);
    try {
      let effectiveContactId = formData.contact_id;
      const newName = (formData.new_contact_name || "").trim();
      const newEmail = (formData.new_contact_email || "").trim();
      const newPhone = (formData.new_contact_phone || "").trim();
      const needsContactCreation = !effectiveContactId && newName && (newEmail || newPhone);

      if (needsContactCreation) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/contacts/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newName,
              email: newEmail || undefined,
              phone: newPhone || undefined,
            }),
          });
          if (response.status === 409) {
            setContactError("That contact already exists. Please use the search option instead.");
            setIsSubmitting(false);
            return;
          }
          if (!response.ok) {
            throw new Error("Failed to create contact");
          }
          const created = await response.json();
          effectiveContactId = created?.id ?? null;
          if (!effectiveContactId) {
            throw new Error("Contact creation response missing id");
          }
        } catch (error) {
          console.error("Error creating contact:", error);
          setSubmissionMessage({
            type: "error",
            message: "We could not save the contact information. Please try again or select an existing contact.",
          });
          setIsSubmitting(false);
          return;
        }
      }

      const payload = new FormData();
      payload.append("source", formData.source || "Complaint");
      payload.append("description", formData.description || "");
      payload.append("comment", formData.description || "");
      payload.append("paid", "false");
      if (formData.address_id) payload.append("address_id", String(formData.address_id));
      if (formData.unit_id) payload.append("unit_id", String(formData.unit_id));
      if (effectiveContactId) payload.append("contact_id", String(effectiveContactId));
      photos.forEach((file) => payload.append("attachments", file));

      const response = await fetch(`${process.env.REACT_APP_API_URL}/inspections/`, {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to submit concern");
      }

      const createdInspection = await response.json();
      resetForm();
      setSubmissionMessage({
        type: "success",
        message: createdInspection?.id
          ? `Thank you for submitting your concern. Your reference number is ${createdInspection.id}.`
          : "Thank you for submitting your concern.",
      });
    } catch (error) {
      console.error("Error submitting concern:", error);
      setSubmissionMessage({
        type: "error",
        message: "There was a problem submitting your concern. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-gray-900">Report a Concern</h1>
          <p className="mt-2 text-sm text-gray-600">
            Provide the property address, describe the issue, and include your contact information so we can follow up.
          </p>
        </div>

        {submissionMessage && (
          <div
            className={`mb-6 rounded-md border px-4 py-3 text-sm ${
              submissionMessage.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
            role="status"
          >
            {submissionMessage.message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-lg bg-white p-6 shadow"
          noValidate
        >
          <div>
            <label htmlFor="resident-concern-address" className="block text-sm font-medium text-gray-700">
              Address <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <div
              className={`mt-1 ${addressError ? "rounded border border-red-500 p-1" : ""}`}
              aria-invalid={addressError ? "true" : "false"}
            >
              <AsyncSelect
                key={addressSelectKey}
                inputId="resident-concern-address"
                cacheOptions
                defaultOptions
                loadOptions={loadAddressOptions}
                onChange={handleAddressChange}
                placeholder="Type to search for an address..."
                isClearable
                styles={selectStyles}
                classNamePrefix="address-select"
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">Required before submitting.</div>
            {addressError && <p className="mt-1 text-xs text-red-600">{addressError}</p>}
          </div>

          {units.length > 0 && (
            <div>
              <label htmlFor="resident-concern-unit" className="block text-sm font-medium text-gray-700">
                Unit (optional)
              </label>
              <select
                id="resident-concern-unit"
                name="unit_id"
                value={formData.unit_id}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm"
              >
                <option value="">Whole property</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.number}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="resident-concern-description" className="block text-sm font-medium text-gray-700">
              Describe the concern <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <textarea
              id="resident-concern-description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              onBlur={() => {
                if (!(formData.description || "").trim()) setDescError("Description is required.");
              }}
              rows={6}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                descError ? "border border-red-500" : "border border-gray-300"
              }`}
              aria-invalid={descError ? "true" : "false"}
            />
            <div className="mt-1 text-xs text-gray-500">Include as many details as possible.</div>
            {descError && <p className="mt-1 text-xs text-red-600">{descError}</p>}
          </div>

          <div>
            <FileUploadInput
              label="Attachments (optional)"
              description="Upload photos or documents that help describe the concern."
              name="attachments"
              files={photos}
              onChange={handleAttachmentsChange}
              accept="image/*,application/pdf"
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">
              Your contact information <span className="text-red-600" aria-hidden="true">*</span>
            </div>
            {useExistingContact ? (
              <AsyncSelect
                key={contactSelectKey}
                cacheOptions
                defaultOptions={false}
                loadOptions={loadContactOptions}
                placeholder="Search for your name..."
                isClearable
                onChange={(option) => {
                  setFormData((prev) => ({ ...prev, contact_id: option ? option.value : null }));
                  if (option) {
                    setContactError("");
                  }
                }}
                styles={selectStyles}
                classNamePrefix="contact-select"
                inputId="resident-concern-contact"
              />
            ) : (
              <NewContactForm formData={formData} onInputChange={handleInputChange} />
            )}
            <button
              type="button"
              onClick={toggleContactMode}
              className="mt-2 inline-flex rounded border border-blue-500 px-2 py-1 text-sm font-semibold text-blue-700 hover:bg-blue-500 hover:text-white"
            >
              {useExistingContact ? "Or enter new contact details" : "Or select an existing contact"}
            </button>
            {contactError && <p className="mt-2 text-xs text-red-600">{contactError}</p>}
          </div>

          <div>
            <button
              type="submit"
              className="w-full rounded-md bg-indigo-600 py-3 px-6 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Concern"}
            </button>
          </div>

          <p className="text-xs text-gray-500">
            By submitting, you agree to be contacted regarding this concern if additional information is needed.
          </p>
        </form>
      </div>
    </div>
  );
}
