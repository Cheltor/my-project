import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import AsyncSelect from "react-select/async";
import ContactSelection from "../Contact/ContactSelection";
import BusinessSelection from "../Business/BusinessSelection"; // Import the new component
import NewUnit from "../Inspection/NewUnit"; // Import NewUnit instead of NewUnitForm

export default function NewComplaint() {
  const { user } = useAuth();
  const [units, setUnits] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [addresses, setAddresses] = useState([]);
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
  const [photos, setPhotos] = useState([]); // State to hold the photos
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch initial data for contacts, addresses, and businesses
    const fetchData = async () => {
      try {
        const [contactsRes, addressesRes, businessesRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/contacts/`),
          fetch(`${process.env.REACT_APP_API_URL}/addresses/`),  // Replace with actual endpoint for addresses
          fetch(`${process.env.REACT_APP_API_URL}/businesses/`),  // Replace with actual endpoint for businesses
        ]);

        setContacts(await contactsRes.json());
        setAddresses(await addressesRes.json());
        setBusinesses(await businessesRes.json());
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else if (type === "file") {
      setPhotos(Array.from(files)); // Set selected files to the state
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddressChange = async (selectedOption) => {
    const addressId = selectedOption ? selectedOption.value : "";
    setFormData((prevFormData) => ({
      ...prevFormData,
      address_id: addressId,
      unit_id: "",
    }));

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
      return; // Don't submit if description is empty
    }

    try {
      // Step 1: Create Complaint (send as multipart/form-data to match API Form fields)
      const createForm = new FormData();
      if (formData.address_id) createForm.append('address_id', String(formData.address_id));
      if (formData.unit_id) createForm.append('unit_id', String(formData.unit_id));
      createForm.append('source', formData.source || 'Complaint');
      createForm.append('description', formData.description || '');
      if (formData.contact_id) createForm.append('contact_id', String(formData.contact_id));
      createForm.append('paid', formData.paid ? 'true' : 'false');

      const complaintResponse = await fetch(`${process.env.REACT_APP_API_URL}/inspections/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        body: createForm,
      });

      if (!complaintResponse.ok) {
        throw new Error("Failed to create complaint");
      }

      const createdComplaint = await complaintResponse.json();
      alert("Complaint created successfully!");

      // Step 2: Upload Photos for the Created Complaint
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((photo) => {
          formData.append('files', photo);
        });

        const photoUploadResponse = await fetch(
          `${process.env.REACT_APP_API_URL}/inspections/${createdComplaint.id}/photos`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
            body: formData,
          }
        );

        if (!photoUploadResponse.ok) {
          throw new Error('Failed to upload photos');
        }

        alert("Photos uploaded successfully!");
        setPhotos([]); // Clear the selected photos
      }
    } catch (error) {
      console.error("Error creating complaint:", error);
      alert("Error creating complaint.");
    }
  };

  const addressOptions = addresses.map((address) => ({
    value: address.id,
    label: address.combadd,
  }));

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
            Select Address*
          </label>
            <AsyncSelect
              id="address_id"
              loadOptions={loadAddressOptions} // Set the async loader function
              onChange={handleAddressChange}
              placeholder="Type to search addresses..."
              isClearable
              styles={customStyles} // Reuse custom styles if desired
              className="mt-1"
              cacheOptions // Cache loaded options for performance
              defaultOptions // Show default options initially
            />
        </div>

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
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="mt-1 block w-full shadow-sm border-gray-300 rounded-md"
          ></textarea>
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
            className="w-full inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Create New Complaint
          </button>
        </div>
      </form>
    </div>
  );
}