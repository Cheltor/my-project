import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import AsyncSelect from "react-select/async";
import ContactSelection from "../Contact/ContactSelection";
import BusinessSelection from "../Business/BusinessSelection"; // Import the new component
import NewUnit from "../Inspection/NewUnit"; // Import NewUnit instead of NewUnitForm

export default function NewComplaint() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [showBusinessSelection, setShowBusinessSelection] = useState(false); // State to toggle business selection
  const [showNewUnitForm, setShowNewUnitForm] = useState(false); // State to toggle new unit form
  const [formData, setFormData] = useState({
    address_id: null,  // Use `null` instead of ""
    unit_id: null,
    source: "Complaint",
    description: "",
    attachments: [],
    business_id: null,
    contact_id: null,
    paid: false,
  });
  // Admin assignment state
  const [onsUsers, setOnsUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [photos, setPhotos] = useState([]); // State to hold the photos
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Local validation state for description
  const [descError, setDescError] = useState("");
  const isDescriptionValid = (formData.description || "").trim().length > 0;
  // Local validation for address
  const [addressError, setAddressError] = useState("");
  const isAddressValid = !!formData.address_id;

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/businesses/`);
        setBusinesses(await response.json());
        setLoading(false);
      } catch (error) {
        console.error("Error fetching businesses:", error);
        setError(error.message);
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

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else if (type === "file") {
      setPhotos(Array.from(files)); // Set selected files to the state
    } else {
      setFormData({ ...formData, [name]: value });
      if (name === 'description') {
        // Clear error as user types something valid
        if ((value || '').trim().length > 0) setDescError("");
      }
    }
  };

  const handleAddressChange = async (selectedOption) => {
    const addressId = selectedOption ? selectedOption.value : "";
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
      } catch (error) {
        console.error("Error fetching units:", error);
        setUnits([]);
      }
    } else {
      setUnits([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted"); // Add this line to confirm the function is called

    if (!formData.description.trim()) {
      setDescError('Description is required.');
      return; // Don't submit if description is empty
    }
    if (!formData.address_id) {
      setAddressError('Address is required.');
      return; // Don't submit if address is empty
    }

    try {
      // Step 1: Create Complaint (send as multipart/form-data to match API Form fields)
      const createForm = new FormData();
      if (formData.address_id) createForm.append('address_id', String(formData.address_id));
      if (formData.unit_id) createForm.append('unit_id', String(formData.unit_id));
      createForm.append('source', formData.source || 'Complaint');
  createForm.append('description', formData.description || '');
  // Mirror to comment for compatibility with backends that use `comment` or `details`
  createForm.append('comment', formData.description || '');
      if (formData.contact_id) createForm.append('contact_id', String(formData.contact_id));
      createForm.append('paid', formData.paid ? 'true' : 'false');
      if (photos.length > 0) {
        photos.forEach((photo) => {
          createForm.append('attachments', photo);
        });
      }
      // Admin-selected assignee -> inspector_id; OAS defaults to inspector 1
      if (user?.role === 3 && assigneeId) {
        createForm.append('inspector_id', String(assigneeId));
      } else if (user?.role === 2) {
        createForm.append('inspector_id', '1');
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
      alert("Complaint created successfully!");
      if (createdComplaint?.id) {
        navigate(`/complaint/${createdComplaint.id}`);
      }
      setPhotos([]);
    } catch (error) {
      console.error("Error creating complaint:", error);
      alert("Error creating complaint.");
    }
  };

  // Function to load options asynchronously
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

  // Define custom styles
  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'white',
      borderColor: '#d1d5db', // Tailwind's gray-300
      boxShadow: 'none',
      '&:hover': { borderColor: '#2563eb' }, // Tailwind's indigo-600 on hover
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#ebf4ff' : 'white',
      color: state.isSelected ? 'white' : '#111827', // Tailwind's gray-900 for non-selected text
      '&:active': { backgroundColor: '#2563eb', color: 'white' },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#111827', // Tailwind's gray-900
    }),
  };

  // loadContactOptions function
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

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">New Complaint</h1>
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
            Description <span className="text-red-600" aria-hidden> *</span>
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
          <label className="block text-sm font-medium text-gray-700">Application or Photos</label>
          <div className="mt-1 flex items-center">
            <label className="bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm px-4 py-2 cursor-pointer hover:bg-gray-50">
              <span>Choose files</span>
              <input
                type="file"
                name="attachments"
                multiple
                accept="image/*,application/pdf"
                onChange={handleInputChange}
                className="sr-only"
              />
            </label>
            <div className="ml-3 text-sm text-gray-500">
              {photos.length > 0 ? (
                <ul>
                  {photos.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              ) : (
                <span>No files selected</span>
              )}
            </div>
          </div>
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
    </div>

  );
}
