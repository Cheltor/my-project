import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import AsyncSelect from "react-select/async";
import ContactSelection from "../Contact/ContactSelection";

export default function NewMFLicense() {
  const { user, token } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [formData, setFormData] = useState({
    address_id: "",
    source: "Multifamily License",
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
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else if (type === "file") {
      setFormData({ ...formData, attachments: files });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddressChange = async (selectedOption) => {
    const addressId = selectedOption ? selectedOption.value : "";
    setFormData({ ...formData, address_id: addressId });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const inspectionData = new FormData();

    Object.keys(formData).forEach((key) => {
      if (key === "attachments") {
        // FastAPI expects the field name to match the parameter (attachments)
        Array.from(formData.attachments).forEach((file) => {
          inspectionData.append("attachments", file);
        });
      } else if (key !== "inspector_id") {
        const val = formData[key];
        if (val !== null && val !== undefined && val !== "") {
          inspectionData.append(key, val);
        }
      }
    });
    // inspector assignment
    const effectiveInspectorId = user?.role === 3 && assigneeId ? assigneeId : user?.id;
    if (effectiveInspectorId) inspectionData.set("inspector_id", String(effectiveInspectorId));

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/inspections/`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: inspectionData,
      });

      if (!response.ok) throw new Error("Failed to create inspection");

      alert("Inspection created successfully!");
    } catch (error) {
      console.error("Error creating inspection:", error);
      alert("Error creating inspection.");
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
      <h1 className="text-2xl font-semibold text-gray-900">Create New Multifamily License</h1>
      <form onSubmit={handleSubmit} className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        
        {/* Address Selection */}
        <div className="mb-4">
          <label htmlFor="address_id" className="block text-sm font-medium text-gray-700">
            Select Address*
          </label>
            <AsyncSelect
              id="address_id"
              loadOptions={loadAddressOptions}
              onChange={handleAddressChange}
              placeholder="Type to search addresses..."
              isClearable
              styles={customStyles}
              className="mt-1"
              cacheOptions
              defaultOptions
            />
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

  {/* Multifamily licenses apply to the whole building; no unit selection */}

  {/* ...existing code... */}

        {/* Attachments Field */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Application or Photos</label>
          <div className="mt-1 flex items-center">
            <label className="bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm px-4 py-2 cursor-pointer hover:bg-gray-50">
              <span>Choose files</span>
              <input
                type="file"
                name="attachments"
                multiple
                onChange={handleInputChange}
                className="sr-only"
              />
            </label>
            <div className="ml-3 text-sm text-gray-500">
              {formData.attachments.length > 0 ? (
                <ul>
                  {Array.from(formData.attachments).map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              ) : (
                <span>No files selected</span>
              )}
            </div>
          </div>
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
            className="w-full inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Create New Multifamily License
          </button>
        </div>
      </form>
    </div>
  );
}