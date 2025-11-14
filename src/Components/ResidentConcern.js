import React, { useEffect, useRef, useState } from "react";
import AsyncSelect from "react-select/async";
import FileUploadInput from "./Common/FileUploadInput";
import NewContactForm from "./Contact/NewContactForm";
import LoadingSpinner from "./Common/LoadingSpinner";

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

const sanitizePhoneDigits = (value) => String(value || "").replace(/\D/g, "");

const getContactDisplayName = (contact) => {
  if (!contact) return "";
  const name = (contact.name || "").trim();
  if (name) return name;
  return `Contact #${contact.id}`;
};

const matchReasonLabels = {
  email: "email",
  phone: "phone",
  name: "name",
};

const formatMatchReasons = (reasons = []) => {
  if (!Array.isArray(reasons) || reasons.length === 0) return "";
  const labels = reasons
    .map((reason) => matchReasonLabels[reason] || reason)
    .filter(Boolean);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  const head = labels.slice(0, -1).join(", ");
  return `${head}, and ${labels[labels.length - 1]}`;
};

const deriveMatchReasons = (contact, { nameTerm = "", emailTerm = "", phoneDigitsTerm = "", generalTerm = "" } = {}) => {
  const reasons = new Set(Array.isArray(contact?.matchReasons) ? contact.matchReasons : []);
  const normalized = (value) => (value || "").toLowerCase();
  const nameValue = normalized(contact?.name);
  const emailValue = normalized(contact?.email);
  const phoneDigitsValue = sanitizePhoneDigits(contact?.phone);

  if (nameTerm) {
    const term = nameTerm.toLowerCase();
    if (nameValue && nameValue.includes(term)) reasons.add("name");
  }

  if (emailTerm) {
    const term = emailTerm.toLowerCase();
    if (emailValue && emailValue.includes(term)) reasons.add("email");
  }

  if (phoneDigitsTerm) {
    if (phoneDigitsValue && phoneDigitsValue.includes(phoneDigitsTerm)) reasons.add("phone");
  }

  if (generalTerm) {
    const generalLower = generalTerm.toLowerCase();
    if (nameValue && nameValue.includes(generalLower)) reasons.add("name");
    if (emailValue && emailValue.includes(generalLower)) reasons.add("email");
    const generalDigits = sanitizePhoneDigits(generalTerm);
    if (generalDigits && generalDigits.length >= 4 && phoneDigitsValue && phoneDigitsValue.includes(generalDigits)) {
      reasons.add("phone");
    }
  }

  return {
    ...contact,
    matchReasons: Array.from(reasons),
  };
};

const fetchSimilarContacts = async ({ name, email, phoneDigits, signal }) => {
  const searchConfigs = [];
  if (email) searchConfigs.push({ value: email, type: "email" });
  if (phoneDigits) searchConfigs.push({ value: phoneDigits, type: "phone" });
  if (name) searchConfigs.push({ value: name, type: "name" });

  const seenValues = new Set();
  const queries = [];

  searchConfigs.forEach((config) => {
    const normalized = config.value.toLowerCase();
    if (seenValues.has(normalized)) return;
    seenValues.add(normalized);

    const url = `${process.env.REACT_APP_API_URL}/contacts/search?query=${encodeURIComponent(config.value)}&limit=5`;
    queries.push(
      (async () => {
        try {
          const res = await fetch(url, { signal });
          if (!res.ok) {
            return { items: [], type: config.type };
          }
          const payload = await res.json();
          const items = Array.isArray(payload) ? payload : [];
          return { items, type: config.type };
        } catch (err) {
          if (err.name !== "AbortError") {
            console.error("Error searching for similar contacts:", err);
          }
          return { items: [], type: config.type };
        }
      })()
    );
  });

  if (queries.length === 0) return [];

  const responses = await Promise.all(queries);
  const matchesMap = new Map();

  responses.forEach(({ items, type }) => {
    items.forEach((contact) => {
      if (!contact || !contact.id) return;
      const entry = matchesMap.get(contact.id) || {
        contact,
        score: 0,
        reasons: new Set(),
      };
      entry.reasons.add(type);
      if (type === "email") entry.score += 4;
      else if (type === "phone") entry.score += 3;
      else entry.score += 1;
      matchesMap.set(contact.id, entry);
    });
  });

  return Array.from(matchesMap.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({
      ...entry.contact,
      matchReasons: Array.from(entry.reasons),
    }))
    .slice(0, 6);
};

export default function ResidentConcern() {
  const [formData, setFormData] = useState(defaultFormState);
  const [units, setUnits] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [addressError, setAddressError] = useState("");
  const [descError, setDescError] = useState("");
  const [contactError, setContactError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState(null);
  const [addressSelectKey, setAddressSelectKey] = useState(0);
  const [selectedContact, setSelectedContact] = useState(null);
  const [potentialContactMatches, setPotentialContactMatches] = useState([]);
  const [isCheckingContactMatches, setIsCheckingContactMatches] = useState(false);
  const [duplicateSearchSummary, setDuplicateSearchSummary] = useState("");
  const duplicateRequestRef = useRef(0);
  const hasSelectedContact = Boolean(selectedContact);

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
      const addresses = Array.isArray(data) ? data : [];
      return addresses
        .filter((address) => {
          const streetNumber = address?.streetnumb;
          return streetNumber !== null && streetNumber !== undefined && String(streetNumber).trim() !== "";
        })
        .map((address) => ({
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

  useEffect(() => {
    if (selectedContact) {
      setPotentialContactMatches([]);
      setIsCheckingContactMatches(false);
      setDuplicateSearchSummary("");
      return;
    }

    const name = (formData.new_contact_name || "").trim();
    const email = (formData.new_contact_email || "").trim();
    const phoneRaw = (formData.new_contact_phone || "").trim();
    const phoneDigits = sanitizePhoneDigits(phoneRaw);

    const shouldSearchEmail = email.length >= 3;
    const shouldSearchPhone = phoneDigits.length >= 4;
    const shouldSearchName = name.length >= 3;

    if (!shouldSearchEmail && !shouldSearchPhone && !shouldSearchName) {
      setPotentialContactMatches([]);
      setIsCheckingContactMatches(false);
      setDuplicateSearchSummary("");
      return;
    }

    const requestId = ++duplicateRequestRef.current;
    const controller = new AbortController();

    const summaryPieces = [];
    if (shouldSearchEmail) summaryPieces.push(email);
    if (shouldSearchPhone) summaryPieces.push(phoneRaw);
    if (!summaryPieces.length && shouldSearchName) summaryPieces.push(name);
    setDuplicateSearchSummary(summaryPieces.join(", "));
    setIsCheckingContactMatches(true);

    const timeoutId = setTimeout(async () => {
      try {
        const matches = await fetchSimilarContacts({
          name: shouldSearchName ? name : "",
          email: shouldSearchEmail ? email : "",
          phoneDigits: shouldSearchPhone ? phoneDigits : "",
          signal: controller.signal,
        });
        if (duplicateRequestRef.current === requestId) {
          const augmented = matches.map((contact) =>
            deriveMatchReasons(contact, {
              nameTerm: shouldSearchName ? name : "",
              emailTerm: shouldSearchEmail ? email : "",
              phoneDigitsTerm: shouldSearchPhone ? phoneDigits : "",
            })
          );
          setPotentialContactMatches(augmented);
          setIsCheckingContactMatches(false);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error checking for similar contacts:", err);
        }
        if (duplicateRequestRef.current === requestId) {
          setIsCheckingContactMatches(false);
        }
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [
    formData.new_contact_email,
    formData.new_contact_name,
    formData.new_contact_phone,
    selectedContact,
  ]);

  const applyContactMatch = (contact) => {
    if (!contact || !contact.id) return;
    duplicateRequestRef.current += 1;
    setPotentialContactMatches([]);
    setIsCheckingContactMatches(false);
    setDuplicateSearchSummary("");
    setSelectedContact(contact);
    setFormData((prev) => ({
      ...prev,
      contact_id: contact.id,
      new_contact_name: "",
      new_contact_email: "",
      new_contact_phone: "",
    }));
    setContactError("");
  };

  const clearSelectedContact = () => {
    setSelectedContact(null);
    setFormData((prev) => ({
      ...prev,
      contact_id: null,
      new_contact_name: "",
      new_contact_email: "",
      new_contact_phone: "",
    }));
    setContactError("");
    duplicateRequestRef.current += 1;
    setPotentialContactMatches([]);
    setIsCheckingContactMatches(false);
    setDuplicateSearchSummary("");
  };

  const renderContactMatchesPanel = () => {
    if (hasSelectedContact) {
      return null;
    }
    if (!isCheckingContactMatches && potentialContactMatches.length === 0) {
      return null;
    }

    const hasMatches = potentialContactMatches.length > 0;
    const title = hasMatches ? "Possible existing contacts found" : "Searching contacts";

    let description = "";
    if (duplicateSearchSummary) {
      if (hasMatches) {
        description = `These records match the details "${duplicateSearchSummary}".`;
      } else {
        description = `Looking for matches similar to "${duplicateSearchSummary}"...`;
      }
    }

    return (
      <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-3">
        <div className="text-sm font-semibold text-yellow-900">{title}</div>
        {description && <p className="mt-1 text-xs text-yellow-800">{description}</p>}
        {hasMatches && (
          <ul className="mt-3 space-y-2">
            {potentialContactMatches.map((contact) => (
              <li
                key={contact.id}
                className="rounded border border-yellow-200 bg-white p-2 text-xs text-gray-700 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {getContactDisplayName(contact)}
                    </div>
                    {Array.isArray(contact.matchReasons) && contact.matchReasons.length > 0 && (
                      <div className="text-xs text-yellow-700">
                        Matches on {formatMatchReasons(contact.matchReasons)}.
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => applyContactMatch(contact)}
                    className="inline-flex items-center rounded border border-blue-500 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-500 hover:text-white"
                  >
                    Use this contact
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {isCheckingContactMatches && potentialContactMatches.length === 0 && (
          <p className="mt-2 text-xs text-yellow-700">Searching for matching contacts...</p>
        )}
      </div>
    );
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
    setContactError("Please select a suggested contact or provide a name plus an email or phone.");
    return false;
  };

  const resetForm = () => {
    setFormData(defaultFormState);
    setUnits([]);
    setPhotos([]);
    setAddressError("");
    setDescError("");
    setContactError("");
    setAddressSelectKey((key) => key + 1);
    setSelectedContact(null);
    setPotentialContactMatches([]);
    setIsCheckingContactMatches(false);
    setDuplicateSearchSummary("");
    duplicateRequestRef.current += 1;
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
              Address <span className="text-red-600 required-indicator" aria-hidden="true">*</span>
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
              Describe the concern <span className="text-red-600 required-indicator" aria-hidden="true">*</span>
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
              Your contact information <span className="text-red-600 required-indicator" aria-hidden="true">*</span>
            </div>
            {hasSelectedContact ? (
              <div className="rounded-md border border-green-200 bg-green-50 p-3">
                <div className="text-sm font-semibold text-green-900">
                  {getContactDisplayName(selectedContact)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-green-800">Using this contact</span>
                  <button
                    type="button"
                    onClick={clearSelectedContact}
                    className="inline-flex items-center rounded border border-green-500 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-500 hover:text-white"
                  >
                    Enter different contact details
                  </button>
                </div>
              </div>
            ) : (
              <>
                <NewContactForm formData={formData} onInputChange={handleInputChange} />
                {renderContactMatchesPanel()}
              </>
            )}
            {contactError && <p className="mt-2 text-xs text-red-600">{contactError}</p>}
          </div>

          <div>
            <button
              type="submit"
              className="w-full rounded-md bg-indigo-600 py-3 px-6 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner className="h-5 w-5" />
                  Submitting...
                </span>
              ) : (
                "Submit Concern"
              )}
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
