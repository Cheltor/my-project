import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import ContactSelection from "../Contact/ContactSelection";
import BusinessSelection from "../Business/BusinessSelection"; // Import the new component
import NewUnitForm from "../Unit/NewUnitForm";
import Select from "react-select"; // Import react-select

export default function NewBusinessLicense() {
  const { user } = useAuth();
  const [units, setUnits] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showNewUnitForm, setShowNewUnitForm] = useState(false); // State to toggle new unit form
  const [formData, setFormData] = useState({
    address_id: null,  // Use `null` instead of ""
    unit_id: null,
    source: "Business License",
    description: "",
    attachments: [],
    business_id: null,
    contact_id: null,
    // new_contact_name: "",
    // new_contact_email: "",
    // new_contact_phone: "",
    // inspector_id: user.id,
    paid: false,
  });

  useEffect(() => {
    // Fetch initial data for contacts, addresses, and businesses
    const fetchData = async () => {
      try {
        const [contactsRes, addressesRes, businessesRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/contacts/`),
          fetch(`${process.env.REACT_APP_API_URL}/addresses/`),
          fetch(`${process.env.REACT_APP_API_URL}/businesses/`),  // Replace with actual endpoint for businesses
        ]);

        setContacts(await contactsRes.json());
        setAddresses(await addressesRes.json());
        setBusinesses(await businessesRes.json());
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Log each field of formData individually to easily view everything in the console
    console.log("Form Data before submission:");
    Object.keys(formData).forEach((key) => {
        console.log(`${key}:`, formData[key]);
    });

    const inspectionData = new FormData();

    Object.keys(formData).forEach((key) => {
      if (key === "attachments") {
        Array.from(formData.attachments).forEach((file) => {
          inspectionData.append("attachments[]", file);
        });
      } else {
        inspectionData.append(key, formData[key]);
      }
    });

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/inspections/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
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

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">New Business License</h1>
      <form onSubmit={handleSubmit} className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        
        {/* Business Selection */}
        <div className="mb-4">
          <BusinessSelection
            businesses={businesses}
            formData={formData}
            handleInputChange={handleInputChange}
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
              <NewUnitForm
                addressId={formData.address_id}
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
            Create New Business License Inspection
          </button>
        </div>
      </form>
    </div>
  );
}