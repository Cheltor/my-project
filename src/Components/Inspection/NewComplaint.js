import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import AsyncSelect from "react-select/async";
import ContactSelection from "../Contact/ContactSelection";
import BusinessSelection from "../Business/BusinessSelection";
import NewUnit from "../Inspection/NewUnit";
import FileUploadInput from "../Common/FileUploadInput";

const createInitialFormState = () => ({
  address_id: null,
  unit_id: null,
  source: "Complaint",
  description: "",
  attachments: [],
  business_id: null,
  contact_id: null,
  new_contact_name: "",
  new_contact_email: "",
  new_contact_phone: "",
  paid: false,
});

export default function NewComplaint({ isPublic = false, title = "New Complaint", submitButtonLabel = "Create New Complaint" }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [showBusinessSelection, setShowBusinessSelection] = useState(false);
  const [showNewUnitForm, setShowNewUnitForm] = useState(false);
  const [formData, setFormData] = useState(createInitialFormState);
  const [onsUsers, setOnsUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [descError, setDescError] = useState("");
  const isDescriptionValid = (formData.description || "").trim().length > 0;
  const [addressError, setAddressError] = useState("");
  const isAddressValid = !!formData.address_id;
  const [contactError, setContactError] = useState("");
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/businesses/`);
        setBusinesses(await response.json());
        setLoading(false);
      } catch (fetchError) {
        console.error("Error fetching businesses:", fetchError);
        setError(fetchError.message);
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

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

    if (!isPublic && user?.role === 3) {
      loadOns();
    }
  }, [isPublic, user?.role]);

  useEffect(() => {
    if (!isPublic) return;
    const hasExistingContact = Boolean(formData.contact_id);
    const trimmedName = (formData.new_contact_name || "").trim();
    const trimmedEmail = (formData.new_contact_email || "").trim();
    const trimmedPhone = (formData.new_contact_phone || "").trim();
    if (hasExistingContact || (trimmedName && (trimmedEmail || trimmedPhone))) {
      setContactError("");
    }
  }, [formData.contact_id, formData.new_contact_email, formData.new_contact_name, formData.new_contact_phone, isPublic]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSubmissionSuccess(false);
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
      if (name === "description" && (value || "").trim().length > 0) {
        setDescError("");
      }
    }
  };

  const handleAttachmentsChange = (files) => {
    const next = Array.isArray(files) ? files : Array.from(files || []);
    setPhotos(next);
    setSubmissionSuccess(false);
  };

  const handleAddressChange = async (selectedOption) => {
    const addressId = selectedOption ? selectedOption.value : "";
    setSubmissionSuccess(false);
    setFormData((prevFormData) => ({
      ...prevFormData,
      address_id: addressId,
      unit_id: "",
    }));
    if (selectedOption) {
      setAddressError("");
    }

    if (addressId) {
      try {
        const unitsRes = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${addressId}/units`);
        const unitsData = await unitsRes.json();
        setUnits(unitsData);
      } catch (unitsError) {
        console.error("Error fetching units:", unitsError);
        setUnits([]);
      }
    } else {
      setUnits([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmissionSuccess(false);
    setContactError("");

    if (!formData.description.trim()) {
      setDescError("Description is required.");
      return;
    }
    if (!formData.address_id) {
      setAddressError("Address is required.");
      return;
    }

    const trimmedName = (formData.new_contact_name || "").trim();
    const trimmedEmail = (formData.new_contact_email || "").trim();
    const trimmedPhone = (formData.new_contact_phone || "").trim();
    const hasExistingContact = Boolean(formData.contact_id);
    const hasNewContactDetails = trimmedName && (trimmedEmail || trimmedPhone);

    if (isPublic && !hasExistingContact && !hasNewContactDetails) {
      setContactError("Please select an existing contact or provide your name and at least one way to reach you.");
      return;
    }

    try {
      let effectiveContactId = formData.contact_id;
      const hasNewContact = !effectiveContactId && trimmedName.length > 0;
      if (hasNewContact) {
        try {
          const resp = await fetch(`${process.env.REACT_APP_API_URL}/contacts/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              name: trimmedName,
              email: trimmedEmail || undefined,
              phone: trimmedPhone || undefined,
            }),
          });
          if (resp.ok) {
            const created = await resp.json();
            effectiveContactId = created?.id ?? null;
            if (effectiveContactId) {
              setFormData((prev) => ({ ...prev, contact_id: effectiveContactId }));
            }
          } else {
            try {
              const errJson = await resp.json();
              console.error("Create contact failed:", errJson);
            } catch {
              // ignore json parse error
            }
          }
        } catch (createErr) {
          console.error("Create contact error:", createErr);
        }
      }

      const createForm = new FormData();
      if (formData.address_id) createForm.append("address_id", String(formData.address_id));
      if (formData.unit_id) createForm.append("unit_id", String(formData.unit_id));
      createForm.append("source", formData.source || "Complaint");
      createForm.append("description", formData.description || "");
      createForm.append("comment", formData.description || "");
      if (effectiveContactId) createForm.append("contact_id", String(effectiveContactId));
      createForm.append("paid", formData.paid ? "true" : "false");
      if (photos.length > 0) {
        photos.forEach((photo) => {
          createForm.append("attachments", photo);
        });
      }
      if (!isPublic && user?.role === 3 && assigneeId) {
        createForm.append("inspector_id", String(assigneeId));
      } else if (!isPublic && user?.role === 2) {
        createForm.append("inspector_id", "1");
      }

      const complaintResponse = await fetch(`${process.env.REACT_APP_API_URL}/inspections/`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: createForm,
      });

      if (!complaintResponse.ok) {
        throw new Error("Failed to create complaint");
      }

      const createdComplaint = await complaintResponse.json();
      if (!isPublic) {
        alert("Complaint created successfully!");
      }
      if (!isPublic && createdComplaint?.id) {
        navigate(`/complaint/${createdComplaint.id}`);
      }
      setPhotos([]);
      if (isPublic) {
        setSubmissionSuccess(true);
        setFormData(createInitialFormState());
        setUnits([]);
        setShowNewUnitForm(false);
        setShowBusinessSelection(false);
      }
    } catch (submitError) {
      console.error("Error creating complaint:", submitError);
      alert("Error creating complaint.");
    }
  };

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

  const customStyles = {
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

  const loadContactOptions = async (inputValue) => {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/contacts/search?query=${inputValue}&limit=5`
    );

    const data = await response.json();

    return data.map((contact) => {
      const name = contact.name || "Unnamed Contact";
      if (isPublic) {
        return {
          label: name,
          value: contact.id,
        };
      }
      const details = contact.email ? `(${contact.email})` : "";
      return {
        label: details ? `${name} ${details}` : name,
        value: contact.id,
      };
    });
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      {submissionSuccess && (
        <div className="mt-4 rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-100">
          Thank you! Your concern has been submitted.
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">

        {/* Address Selection */}
        <div className="mb-4">
          <label htmlFor="address_id" className="block text-sm font-medium text-gray-700">
            Select Address <span className="text-red-600" aria-hidden> *</span>
          </label>
          <div
            className={`mt-1 ${addressError ? 'border border-red-500 rounded p-1' : ''}`}
            aria-invalid={!!addressError}
            aria-describedby={addressError ? 'address-error' : undefined}
          >
            <AsyncSelect
              inputId="address_id"
              loadOptions={loadAddressOptions}
              onChange={handleAddressChange}
              placeholder="Type to search addresses..."
              isClearable
              styles={customStyles}
              classNamePrefix="address-select"
              className="mb-0"
              cacheOptions
              defaultOptions
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">This field is required.</div>
          {addressError && (
            <div id="address-error" className="text-xs text-red-600 mt-1">{addressError}</div>
          )}
        </div>

        {/* Assignee (Admin only) */}
        {!isPublic && user?.role === 3 && (
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
        {formData.address_id && !isPublic && (
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
                inspectionId={null}
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
            Description <span className="text-red-600" aria-hidden> *</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            onBlur={() => {
              if (!isDescriptionValid) setDescError("Description is required.");
            }}
            aria-invalid={!!descError}
            aria-describedby={descError ? "description-error" : undefined}
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
          existingContactPlaceholder={isPublic ? "Type to search contacts by name..." : undefined}
        />
        {contactError && (
          <div className="text-xs text-red-600 mt-1">{contactError}</div>
        )}

        {/* Submit Button */}
        <div className="mt-6">
          <button
            type="submit"
            className="w-full inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
            disabled={!isDescriptionValid || !isAddressValid}
            aria-disabled={!isDescriptionValid || !isAddressValid}
          >
            {submitButtonLabel}
          </button>
        </div>
      </form>
    </div>

  );
}
