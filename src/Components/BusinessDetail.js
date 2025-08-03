import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';


const BusinessDetails = () => {
  const { id } = useParams();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  // Contacts state (copied/adapted from AddressDetail.js)
  const [contacts, setContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '' });
  const [addContactError, setAddContactError] = useState(null);

  // Fetch business details
  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/businesses/${id}`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch business details');
        return response.json();
      })
      .then((data) => {
        setBusiness(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [id]);

  // Fetch contacts for this business
  useEffect(() => {
    if (!id) return;
    fetch(`${process.env.REACT_APP_API_URL}/businesses/${id}/contacts`)
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

  // Add existing contact to business
  const handleAddExistingContact = async (contactId) => {
    setAddContactError(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/${id}/contacts`, {
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

  // Create new contact and add to business
  const handleCreateAndAddContact = async (e) => {
    e.preventDefault();
    setAddContactError(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/${id}/contacts`, {
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

  // Remove contact from business
  const handleRemoveContact = async (contactId) => {
    if (!window.confirm('Remove this contact from the business?')) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/${id}/contacts/${contactId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to remove contact');
      setContacts(contacts.filter(c => c.id !== contactId));
    } catch (err) {
      alert('Could not remove contact.');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Business Details</h1>

      {/* Pill-style Tab Navigation */}
      <div className="flex flex-col sm:flex-row gap-2 py-2 mb-4">
        <button
          className={`px-4 py-2 rounded-full ${activeTab === 'details' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={`px-4 py-2 rounded-full ${activeTab === 'contacts' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}
          onClick={() => setActiveTab('contacts')}
        >
          Contacts
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        business ? (
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h2 className="text-xl font-medium text-gray-700">Basic Information</h2>
              <p className="text-sm text-gray-600"><strong>Business Name:</strong> {business.name}</p>
              <p className="text-sm text-gray-600"><strong>Email:</strong> <a href={`mailto:${business.email}`} className="text-indigo-600 hover:text-indigo-800">{business.email}</a></p>
              <p className="text-sm text-gray-600"><strong>Phone:</strong> {business.phone || 'N/A'}</p>
              <p className="text-sm text-gray-600"><strong>Website:</strong> {business.website ? <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">{business.website}</a> : 'N/A'}</p>
            </div>
            <div className="border-b pb-4">
              <h2 className="text-xl font-medium text-gray-700">Address Information</h2>
              {business.address ? (
                <>
                  <p className="text-sm text-gray-600">
                    <strong>Combined Address:</strong> 
                    {business.address ? (
                      <Link to={`/address/${business.address.id}`} className="text-indigo-600 hover:text-indigo-800">
                        {business.address.combadd}
                      </Link>
                    ) : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600"><strong>Owner Name:</strong> {business.address.ownername}</p>
                  <p className="text-sm text-gray-600"><strong>Land Use Code:</strong> {business.address.landusecode}</p>
                  <p className="text-sm text-gray-600"><strong>Zoning:</strong> {business.address.zoning}</p>
                  <p className="text-sm text-gray-600"><strong>Property Type:</strong> {business.address.property_type}</p>
                  <p className="text-sm text-gray-600"><strong>Owner Occupied:</strong> {business.address.owneroccupiedin === 'Y' ? 'Yes' : 'No'}</p>
                  <p className="text-sm text-gray-600"><strong>Latitude:</strong> {business.address.latitude}</p>
                  <p className="text-sm text-gray-600"><strong>Longitude:</strong> {business.address.longitude}</p>
                </>
              ) : (
                <p className="text-sm text-gray-600">No address information available.</p>
              )}
            </div>
            <div className="border-b pb-4">
              <h2 className="text-xl font-medium text-gray-700">Additional Information</h2>
              <p className="text-sm text-gray-600"><strong>Created At:</strong> {new Date(business.created_at).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600"><strong>Updated At:</strong> {new Date(business.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-600">No details available for this business.</p>
        )
      )}

      {activeTab === 'contacts' && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-700 mb-2 flex items-center">Contacts
            <button
              className="ml-4 px-3 py-1 bg-green-500 text-white rounded text-sm"
              onClick={() => setShowAddContact(!showAddContact)}
            >{showAddContact ? 'Cancel' : 'Add Contact'}</button>
          </h2>
          {contacts.length === 0 && <p className="text-gray-500">No contacts associated with this business.</p>}
          <ul className="space-y-2">
            {contacts.map(contact => (
              <li key={contact.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div>
                  <Link
                    to={`/contacts/${contact.id}`}
                    className="font-semibold text-blue-700 hover:underline hover:text-blue-900"
                    title={`View contact ${contact.name}`}
                  >
                    {contact.name}
                  </Link>
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
    </div>
  );
};

export default BusinessDetails;
