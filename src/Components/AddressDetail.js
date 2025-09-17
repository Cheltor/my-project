import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AddressPhotos from './Address/AddressPhotos'; // Update the import statement
import Citations from './Address/AddressCitations';
import Violations from './Address/AddressViolations';
import Comments from './Address/AddressComments';
import Complaints from './Address/AddressComplaints';
import Inspections from './Address/AddressInspections';
import useUnitSearch from './Address/useUnitSearch';
import NewUnit from './Inspection/NewUnit';  // Import NewUnit component

// Utility function to titlize a string
function titlize(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

const AddressDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();  // Initialize useNavigate
  const [address, setAddress] = useState(null);
  const [units, setUnits] = useState([]);  // State to store units
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('comments');
  // Contacts state
  const [contacts, setContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '' });
  const [addContactError, setAddContactError] = useState(null);
  // Fetch contacts for this address
  useEffect(() => {
    if (!id) return;
    fetch(`${process.env.REACT_APP_API_URL}/addresses/${id}/contacts`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch contacts');
        return res.json();
      })
      .then(setContacts)
      .catch(() => setContacts([]));
  }, [id]);
  // Search for existing contacts
  useEffect(() => {
    if (contactSearch.trim().length < 2) {
      setContactResults([]);
      return;
    }
    fetch(`${process.env.REACT_APP_API_URL}/contacts?search=${encodeURIComponent(contactSearch)}`)
      .then((res) => res.ok ? res.json() : [])
      .then(setContactResults)
      .catch(() => setContactResults([]));
  }, [contactSearch]);
  // Add existing contact to address
  const handleAddExistingContact = async (contactId) => {
    setAddContactError(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId })
      });
      if (!res.ok) throw new Error('Failed to add contact');
      const updated = await res.json();
      setContacts(updated);
      setShowAddContact(false);
      setContactSearch('');
    } catch (err) {
      setAddContactError('Could not add contact.');
    }
  };

  // Create new contact and add to address
  const handleCreateAndAddContact = async (e) => {
    e.preventDefault();
    setAddContactError(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact)
      });
      if (!res.ok) throw new Error('Failed to create contact');
      const updated = await res.json();
      setContacts(updated);
      setShowAddContact(false);
      setNewContact({ name: '', email: '', phone: '' });
    } catch (err) {
      setAddContactError('Could not create contact.');
    }
  };

  // Remove contact from address
  const handleRemoveContact = async (contactId) => {
    if (!window.confirm('Remove this contact from the address?')) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${id}/contacts/${contactId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to remove contact');
      setContacts(contacts.filter(c => c.id !== contactId));
    } catch (err) {
      alert('Could not remove contact.');
    }
  };
  const { searchTerm, showDropdown, filteredUnits, handleSearchChange, handleDropdownSelect } = useUnitSearch(id);
  const [showNewUnitForm, setShowNewUnitForm] = useState(false);  // State to toggle NewUnit form
  const [isEditing, setIsEditing] = useState(false); // State to toggle edit mode

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.REACT_APP_API_URL}/addresses/${id}`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch address');
        return response.json();
      })
      .then((data) => {
        console.log('Fetched address:', data);  // Debug log
        setAddress(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/addresses/${id}/units`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch units');
        return response.json();
      })
      .then((data) => {
        console.log('Fetched units:', data);  // Debug log
        setUnits(data);
      })
      .catch((error) => {
        setError(error.message);
      });
  }, [id]);

  const handleUnitSelect = (unitId) => {
    navigate(`/address/${id}/unit/${unitId}`);
  };

  const saveAddress = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${address.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(address), // Send the updated address object
      });

      if (!response.ok) {
        throw new Error('Failed to save address');
      }

      const updatedAddress = await response.json();
      setAddress(updatedAddress); // Update the state with the saved address
      setIsEditing(false); // Exit edit mode
    } catch (error) {
      console.error('Error saving address:', error);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  if (!address) return <div className="text-center mt-10">No address details available.</div>;

  console.log('Address units:', units);  // Debug log

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10 space-y-8">
      {/* Address Information */}

      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 flex flex-wrap items-center gap-x-2">
          {address.property_name && (
            <>
              <span className="break-words">{address.property_name}</span>
              <span className="hidden sm:inline">-</span>
            </>
          )}
          <span className="break-words">{address.combadd}</span>
        </h1>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          {/* Actions */}
          <div className="flex items-center justify-end mb-2">
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAddress}
                  className="px-3 py-1 rounded-md bg-green-600 text-white text-sm"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm"
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label htmlFor="property-name" className="block text-xs font-medium text-gray-600">Property Name</label>
                <input
                  id="property-name"
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                  value={address.property_name || ''}
                  onChange={(e) => setAddress({ ...address, property_name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="owner-name" className="block text-xs font-medium text-gray-600">Owner Name</label>
                <input
                  id="owner-name"
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                  value={address.ownername || ''}
                  onChange={(e) => setAddress({ ...address, ownername: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="owner-address" className="block text-xs font-medium text-gray-600">Owner Address</label>
                <input
                  id="owner-address"
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                  value={address.owneraddress || ''}
                  onChange={(e) => setAddress({ ...address, owneraddress: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="owner-zip" className="block text-xs font-medium text-gray-600">Owner ZIP Code</label>
                <input
                  id="owner-zip"
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                  value={address.ownerzip || ''}
                  onChange={(e) => setAddress({ ...address, ownerzip: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="vacancy-status" className="block text-xs font-medium text-gray-600">Vacancy Status</label>
                <select
                  id="vacancy-status"
                  className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                  value={address.vacancy_status || ''}
                  onChange={(e) => setAddress({ ...address, vacancy_status: e.target.value })}
                >
                  <option value="">Select status</option>
                  <option value="occupied">Occupied</option>
                  <option value="potentially vacant">Potentially Vacant</option>
                  <option value="vacant">Vacant</option>
                  <option value="registered">Registered</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <div className="text-xs text-gray-500">Owner</div>
                <div className="text-gray-800">{address.ownername || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Owner ZIP</div>
                <div className="text-gray-800">{address.ownerzip || 'N/A'}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-gray-500">Owner Address</div>
                <div className="text-gray-800">{address.owneraddress || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Vacancy Status</div>
                <div className="text-gray-800">{address.vacancy_status ? titlize(address.vacancy_status) : 'N/A'}</div>
              </div>
            </div>
          )}

          {address.aka && (
            <p className="mt-2 text-xs text-gray-500 italic">AKA: {address.aka}</p>
          )}
        </div>
      </div>

      {/* Google Maps Button */}
      <button
        type="button"
        aria-label="Open address in Google Maps"
        onClick={() => {
          const parts = [address.streetnumb, address.streetname, address.ownerstate, address.ownerzip].filter(Boolean).join(' ');
            const query = encodeURIComponent(parts || address.combadd || '');
            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`,'_blank','noopener');
          }}
        className="group mt-2 inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition-all hover:from-indigo-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-[.97]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-white drop-shadow-sm"
        >
          <path d="M12 21s6-5.686 6-11a6 6 0 1 0-12 0c0 5.314 6 11 6 11z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
        <span className="whitespace-nowrap">Open in Google Maps</span>
      </button>

      {/* Units Tab Content */}
      {activeTab === 'units' && (
        <div className="mb-6">
          {/* Unit Search Input with Dropdown */}
          {units.length > 5 && (
            <div className="relative mb-4">
              <label htmlFor="unit-search" className="block text-lg font-semibold text-gray-700">
                Search Units by Number:
              </label>
              <input
                type="text"
                id="unit-search"
                placeholder="Enter unit number..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {showDropdown && (
                <div className="absolute w-full bg-white shadow-md rounded-md z-50 mt-1 max-h-60 overflow-auto">
                  <ul>
                    {filteredUnits.map((unit) => (
                      <li
                        key={unit.id}
                        onMouseDown={() => handleUnitSelect(unit.id)}
                        className="cursor-pointer p-2 hover:bg-gray-200"
                      >
                        Unit {unit.number}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Button to toggle NewUnit form */}
          <div className="mb-4">
            <button
              onClick={() => setShowNewUnitForm(!showNewUnitForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500"
            >
              {showNewUnitForm ? 'Cancel' : 'Add New Unit'}
            </button>
          </div>

          {/* Conditionally render NewUnit form */}
          {showNewUnitForm && <NewUnit addressId={id} inspectionId={null} />}

          {/* Display existing units as buttons */}
          <div className="mb-4 text-center">
            {units.length > 0 ? (
              <div>
                {units.length <= 5 ? (
                  <div className="flex flex-wrap space-x-2">
                    {units.map((unit) => (
                      <button
                        key={unit.id}
                        onClick={() => handleUnitSelect(unit.id)}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-100"
                      >
                        Unit {unit.number}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600"></p>
                )}
              </div>
            ) : (
              <p className="text-gray-600">No units for this address in CodeSoft.</p>
            )}
          </div>
        </div>
      )}

      {/* Pill-style Tab Navigation with Icons */}
      <div className="flex flex-col sm:flex-row gap-2 py-2">
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'contacts' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('contacts')}
        >
          <i className="fas fa-user mr-1"></i> Contacts
        </button>
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'units' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('units')}
        >
          <i className="fas fa-building mr-1"></i> Units
        </button>
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'comments' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('comments')}
        >
          <i className="fas fa-comments mr-1"></i> Comments
        </button>
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'violations' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('violations')}
        >
          <i className="fas fa-exclamation-circle mr-1"></i> Violations
        </button>
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'photos' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('photos')}
        >
          <i className="fas fa-camera mr-1"></i> Photos
        </button>
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'citations' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('citations')}
        >
          <i className="fas fa-file-alt mr-1"></i> Citations
        </button>
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'inspections' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('inspections')}
        >
          <i className="fas fa-search mr-1"></i> Inspections
        </button>
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'complaints' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('complaints')}
        >
          <i className="fas fa-bullhorn mr-1"></i> Complaints
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'contacts' && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-700 mb-2 flex items-center">Contacts
              <button
                className="ml-4 px-3 py-1 bg-green-500 text-white rounded text-sm"
                onClick={() => setShowAddContact(!showAddContact)}
              >{showAddContact ? 'Cancel' : 'Add Contact'}</button>
            </h2>
            {contacts.length === 0 && <p className="text-gray-500">No contacts associated with this address.</p>}
            <ul className="space-y-2">
              {contacts.map(contact => (
                <li key={contact.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <div>
                    <a
                      href={`/contacts/${contact.id}`}
                      className="font-semibold text-blue-700 hover:underline hover:text-blue-900"
                      title={`View contact ${contact.name}`}
                    >
                      {contact.name}
                    </a>
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="ml-2 inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs font-medium"
                        title={`Email ${contact.email}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 0a4 4 0 11-8 0 4 4 0 018 0zm0 0v4m0-4V8" /></svg>
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="ml-2 inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-xs font-medium"
                        title={`Call ${contact.phone}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm10-10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        {contact.phone}
                      </a>
                    )}
                  </div>
                  <button
                    className="ml-2 px-2 py-1 bg-red-400 text-white rounded text-xs"
                    onClick={() => handleRemoveContact(contact.id)}
                  >Remove</button>
                </li>
              ))}
            </ul>

            {/* Add Contact Modal/Form */}
            {showAddContact && (
              <div className="mt-4 p-4 bg-white border rounded shadow">
                <h3 className="font-semibold mb-2">Add Existing Contact</h3>
                <input
                  type="text"
                  className="border px-2 py-1 rounded w-full mb-2"
                  placeholder="Search by name, email, or phone..."
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                />
                {contactResults.length > 0 && (
                  <ul className="mb-2 max-h-40 overflow-auto">
                    {contactResults.map(c => (
                      <li key={c.id} className="flex justify-between items-center p-1 hover:bg-gray-100 cursor-pointer">
                        <span>{c.name} {c.email && <span className='text-gray-400'>({c.email})</span>}</span>
                        <button className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs" onClick={() => handleAddExistingContact(c.id)}>Add</button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="border-t pt-2 mt-2">
                  <h3 className="font-semibold mb-2">Or Create New Contact</h3>
                  <form onSubmit={handleCreateAndAddContact} className="space-y-2">
                    <input required type="text" className="border px-2 py-1 rounded w-full" placeholder="Name" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} />
                    <input type="email" className="border px-2 py-1 rounded w-full" placeholder="Email" value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} />
                    <input type="text" className="border px-2 py-1 rounded w-full" placeholder="Phone" value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} />
                    <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded">Create & Add</button>
                  </form>
                  {addContactError && <div className="text-red-500 mt-2">{addContactError}</div>}
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'photos' && <AddressPhotos addressId={id} />}
        {activeTab === 'citations' && <Citations addressId={id} />}
        {activeTab === 'comments' && <Comments addressId={id} />}
        {activeTab === 'violations' && <Violations addressId={id} />}
        {activeTab === 'inspections' && <Inspections addressId={id} />}
        {activeTab === 'complaints' && <Complaints addressId={id} />}
      </div>


    </div>
  );
};

export default AddressDetails;
