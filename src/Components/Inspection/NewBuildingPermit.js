import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import AsyncSelect from "react-select/async";
import ContactSelection from "../Contact/ContactSelection";
import FileUploadInput from "../Common/FileUploadInput";
// import NewUnitForm from "../Unit/NewUnitForm"; // Commented out for now; may use in future

export default function NewBuildingPermit({ defaultAddressId, defaultAddressLabel, onCreated }) {
  const { user, token } = useAuth();
  const [units, setUnits] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showNewUnitForm, setShowNewUnitForm] = useState(false);
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
  // Admin assignment state
  const [onsUsers, setOnsUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Validation state
  const [addressError, setAddressError] = useState("");
  const isAddressValid = !!formData.address_id;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
        const [contactsRes, addressesRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/contacts/`, { headers: authHeader }),
          fetch(`${process.env.REACT_APP_API_URL}/addresses/`, { headers: authHeader }),
        ]);

        setContacts(await contactsRes.json());
        setAddresses(await addressesRes.json());
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Load ONS users for admins (role 3)
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAttachmentsChange = (files) => {
    const next = Array.isArray(files) ? files : Array.from(files || []);
    setFormData((prev) => ({ ...prev, attachments: next }));
  };

  const handleAddressChange = async (selectedOption) => {
    const addressId = selectedOption ? selectedOption.value : "";
  setFormData({ ...formData, address_id: addressId });
  if (selectedOption) setAddressError("");
  // Unit selection is currently disabled for permits; leave fetch commented for future use
  // if (addressId) {
  //   try {
  //     const unitsRes = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${addressId}/units`);
  //     const unitsData = await unitsRes.json();
  //     setUnits(unitsData);
  //   } catch (error) {
  //     console.error("Error fetching units:", error);
  //     setUnits([]);
  //   }
  // } else {
  //   setUnits([]);
  // }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    // Basic required field validation
    if (!formData.address_id) {
      setAddressError('Address is required.');
      setSubmitting(false);
      return;
    }

    // If new contact fields provided and no existing contact selected, create contact first
    let effectiveContactId = formData.contact_id;
    if (!effectiveContactId && (formData.new_contact_name || '').trim().length > 0) {
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/contacts/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
          if (effectiveContactId) setFormData((prev) => ({ ...prev, contact_id: effectiveContactId }));
        }
      } catch (_) {
        // continue without contact
      }
    }

    const permitData = new FormData();

    Object.keys(formData).forEach((key) => {
      if (key === "attachments") {
        Array.from(formData.attachments).forEach((file) => {
          permitData.append("attachments", file);
        });
        return;
      }
      const value = formData[key];
      // Skip sending empty optional fields (prevents 422 on server expecting int)
      if (key !== "inspector_id") {
        if (value === "" || value === null || value === undefined) return;
        permitData.append(key, value);
      }
    });
    if (effectiveContactId) {
      permitData.set('contact_id', String(effectiveContactId));
    }
    // inspector assignment
    const effectiveInspectorId = user?.role === 3 && assigneeId ? assigneeId : user?.id;
    if (effectiveInspectorId) permitData.set("inspector_id", String(effectiveInspectorId));

    try {
      // Use inspections endpoint; source distinguishes this as a Building/Dumpster/POD permit
      const response = await fetch(`${process.env.REACT_APP_API_URL}/inspections/`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: permitData,
      });

          if (!response.ok) throw new Error("Failed to create permit");
          let created = null;
          try {
            created = await response.json();
          } catch (_) {
            // ignore JSON parse errors
          }

          if (typeof onCreated === 'function') {
            onCreated(created);
          } else {
            alert('Building permit inspection created successfully.');
          }
      // Optionally reset form
      setFormData((prev) => ({
        ...prev,
        address_id: "",
        contact_id: "",
        attachments: [],
        scheduled_datetime: "",
        paid: false,
      }));
    } catch (error) {
      console.error("Error creating permit:", error);
      alert("Error creating permit.");
    } finally {
      setSubmitting(false);
    }
  };

  const addressOptions = addresses.map((address) => ({
    value: address.id,
    label: address.combadd,
  }));

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
      backgroundColor: 'white',
      borderColor: '#d1d5db',
      boxShadow: 'none',
      '&:hover': { borderColor: '#2563eb' },
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#ebf4ff' : 'white',
      color: state.isSelected ? 'white' : '#111827',
      '&:active': { backgroundColor: '#2563eb', color: 'white' },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#111827',
    }),
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

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">Create New Building/Dumpster/POD Permit</h1>
      <form onSubmit={handleSubmit} className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        
        {/* Address Selection */}
        <div className="mb-4">
          <label htmlFor="bp-address" className="block text-sm font-medium text-gray-700">
            Select Address <span className="text-red-600" aria-hidden> *</span>
          </label>
          <div className={`mt-1 ${addressError ? 'border border-red-500 rounded p-1' : ''}`}
               aria-invalid={!!addressError}
               aria-describedby={addressError ? 'bp-address-error' : undefined}
          >
            <AsyncSelect
              inputId="bp-address"
              loadOptions={loadAddressOptions}
              onChange={handleAddressChange}
              placeholder="Type to search addresses..."
              isClearable
              styles={customStyles}
              className="mb-0"
              cacheOptions
              defaultOptions
              defaultValue={defaultAddressId ? { value: defaultAddressId, label: defaultAddressLabel || String(defaultAddressId) } : undefined}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">This field is required.</div>
          {addressError && <div id="bp-address-error" className="text-xs text-red-600 mt-1">{addressError}</div>}
        </div>

        {/* Assignee (Admin only) */}
        {user?.role === 3 && (
          <div className="mb-4">
            <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700">Assign to ONS member</label>
            <select
              id="assignee_id"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm"
            >
              <option value="">Unassigned (defaults to me)</option>
              {onsUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>
        )}

  {/**
   * Unit Selection (commented out)
   *
   * {units.length > 0 && (
   *   <div className="mb-4">
   *     <label htmlFor="unit_id" className="block text-sm font-medium text-gray-700">
              if (!response.ok) throw new Error("Failed to create permit");
              let created = null;
              try {
                created = await response.json();
              } catch (_) {
                // ignore parse error
              }
   *     </label>
   *     <select
              if (onCreated) onCreated(created);
   *       id="unit_id"
   *       name="unit_id"
   *       value={formData.unit_id}
   *       onChange={handleInputChange}
   *       className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm"
   *     >
   *       <option value="">Leave blank if it's for the whole Building</option>
   *       {units.map((unit) => (
   *         <option key={unit.id} value={unit.id}>
   *           {unit.number}
   *         </option>
   *       ))}
   *     </select>
   *   </div>
   * )}
   *
   * New Unit Form (commented out)
   * {formData.address_id && (
   *   <div className="mb-4">
   *     <button
   *       type="button"
   *       onClick={() => setShowNewUnitForm(!showNewUnitForm)}
   *       className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-1 px-2 border border-blue-500 hover:border-transparent rounded"
   *     >
   *       {showNewUnitForm ? "Hide New Unit Form" : "Add a New Unit"}
   *     </button>
   *     {showNewUnitForm && (
   *       <NewUnitForm
   *         addressId={formData.address_id}
   *         onUnitCreated={(newUnit) => {
   *           setUnits([...units, newUnit]);
   *           setFormData({ ...formData, unit_id: newUnit.id });
   *           setShowNewUnitForm(false);
   *         }}
   *       />
   *     )}
   *   </div>
   * )}
   */}

  {/* ...existing code... */}

        {/* Attachments Field */}
        <div className="mb-4">
          <FileUploadInput
            label="Application or Photos"
            name="attachments"
            files={formData.attachments}
            onChange={handleAttachmentsChange}
            accept="image/*,application/pdf"
            disabled={submitting}
          />
        </div>

        {/* Scheduled Date 
        <div className="mb-4">
          <label htmlFor="scheduled_datetime" className="block text-sm font-medium text-gray-700">
            Scheduled Date
          </label>
          <input
            type="datetime-local"
            id="scheduled_datetime"
            name="scheduled_datetime"
            value={formData.scheduled_datetime}
            onChange={handleInputChange}
            className="mt-1 block w-full shadow-sm border-gray-300 rounded-md"
          />
        </div>*/}

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
            disabled={!isAddressValid || submitting}
            aria-disabled={!isAddressValid || submitting}
            aria-busy={submitting}
          >
            {submitting ? 'Creating…' : 'Create New Building/Dumpster/POD Permit'}
          </button>
        </div>
      </form>
    </div>
  );
}
