import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import ContactSelection from "../Contact/ContactSelection";
import BusinessSelection from "../Business/BusinessSelection"; // Import the new component
import NewBusinessForm from "../Business/NewBusinessForm";
import Select from "react-select"; // Import react-select

export default function NewBusinessLicense() {
  const { user, token } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  // Removed New Unit form toggle
  const [showNewBusinessForm, setShowNewBusinessForm] = useState(false);
  const [formData, setFormData] = useState({
  address_id: null,  // Populated from selected business
  unit_id: null,     // Populated from selected business if it has a unit
    source: "Business License",
    attachments: [],
    business_id: null,
    contact_id: null,
    // new_contact_name: "",
    // new_contact_email: "",
    // new_contact_phone: "",
    // inspector_id: user.id,
    paid: false,
  });
  // Admin assignment state
  const [onsUsers, setOnsUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState("");
  // Validation state for required address derived from business
  const [addressError, setAddressError] = useState("");
  const isAddressValid = !!formData.address_id;

  useEffect(() => {
    // Fetch initial data for contacts, addresses, and businesses
    const fetchData = async () => {
      try {
        const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
        const [contactsRes, addressesRes, businessesRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/contacts/`, { headers: authHeader }),
          fetch(`${process.env.REACT_APP_API_URL}/addresses/`, { headers: authHeader }),
          fetch(`${process.env.REACT_APP_API_URL}/businesses/`, { headers: authHeader }),
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

  // Clear address error when an address becomes available
  useEffect(() => {
    if (formData.address_id) setAddressError("");
  }, [formData.address_id]);

  // No unit fetching: unit_id will come directly from the selected business (if any)

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

    // Resolve address_id if missing by looking up the selected business
    let resolvedAddressId = formData.address_id;
    if (!resolvedAddressId && formData.business_id) {
      const biz = businesses.find((b) => b.id === formData.business_id);
      if (biz) {
        resolvedAddressId = biz.address?.id ?? biz.address_id ?? null;
      }
      // Fallback: fetch the business details to resolve address_id
      if (!resolvedAddressId) {
        try {
          const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/${formData.business_id}` , {
            headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
          });
          if (res.ok) {
            const detailed = await res.json();
            resolvedAddressId = detailed?.address?.id ?? detailed?.address_id ?? null;
            if (resolvedAddressId) {
              // update state so dependent UI (units) can refresh
              setFormData((prev) => ({ ...prev, address_id: Number(resolvedAddressId) }));
            }
          }
        } catch (_) {
          // ignore and let guard handle
        }
      }
    }
    if (!resolvedAddressId) {
      setAddressError('Address is required. Select a business with a valid address.');
      return;
    }

    // If no existing contact selected and new contact fields are present, create contact first
    let effectiveContactId = formData.contact_id;
    const hasNewContact = !effectiveContactId && (formData.new_contact_name || '').trim().length > 0;
    if (hasNewContact) {
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
        // best-effort; continue without contact
      }
    }

    // Log each field of formData individually to easily view everything in the console
    console.log("Form Data before submission:");
    Object.keys(formData).forEach((key) => {
        console.log(`${key}:`, formData[key]);
    });

  const inspectionData = new FormData();

  Object.entries(formData).forEach(([key, value]) => {
      if (key === "attachments") {
        Array.from(value || []).forEach((file) => {
          inspectionData.append("attachments", file);
        });
        return;
      }
      // Skip null/undefined/empty strings so FastAPI doesn't receive 'null' as a string
      if (value === null || value === undefined || value === "") return;
      inspectionData.append(key, value);
    });
  if (effectiveContactId) {
    inspectionData.set('contact_id', String(effectiveContactId));
  }
  // Ensure address_id is present using the resolved value
    inspectionData.set('address_id', Number(resolvedAddressId));
  // inspector assignment
  const effectiveInspectorId = user?.role === 3 && assigneeId ? assigneeId : user?.id;
  if (effectiveInspectorId) inspectionData.set('inspector_id', String(effectiveInspectorId));

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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business <span className="text-red-600" aria-hidden> *</span>
          </label>
          <div className={`${addressError ? 'border border-red-500 rounded p-2' : ''}`}
               aria-invalid={!!addressError}
               aria-describedby={addressError ? 'biz-address-error' : undefined}
          >
          <BusinessSelection
            businesses={businesses}
            formData={formData}
            handleInputChange={handleInputChange}
            setFormData={setFormData}
          />
          </div>
          <div className="text-xs text-gray-500 mt-1">Address is required. Select a business that has an address.</div>
          {formData.address_id && (
            <div className="text-xs text-gray-700 mt-1">Selected address ID: {String(formData.address_id)}</div>
          )}
          {addressError && (
            <div id="biz-address-error" className="text-xs text-red-600 mt-1">{addressError}</div>
          )}
          {/* Assignee (Admin only) */}
          {user?.role === 3 && (
            <div className="mt-4">
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
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowNewBusinessForm((s) => !s)}
              className="bg-transparent hover:bg-indigo-500 text-indigo-700 font-semibold hover:text-white py-1 px-2 border border-indigo-500 hover:border-transparent rounded"
            >
              {showNewBusinessForm ? 'Hide New Business Form' : 'Add a New Business'}
            </button>
          </div>
          {showNewBusinessForm && (
            <NewBusinessForm
              embedded
              onCancel={() => setShowNewBusinessForm(false)}
              onCreated={(created) => {
                // Ensure new business appears in dropdown and is selected
                setBusinesses((prev) => [created, ...prev]);
                setFormData((prev) => ({
                  ...prev,
                  business_id: created.id,
                  address_id: created.address_id ?? created.address?.id ?? null,
                  unit_id: created.unit_id ?? null,
                }));
                setShowNewBusinessForm(false);
              }}
            />
          )}
        </div>

  {/* No Unit Selection: this form uses the business's address and unit (if any) automatically */}

  {/* New Unit Form removed for Business License */}

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
            className="w-full inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
            disabled={!isAddressValid}
            aria-disabled={!isAddressValid}
          >
            Create New Business License Inspection
          </button>
        </div>
      </form>
    </div>
  );
}