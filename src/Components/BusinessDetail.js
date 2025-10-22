import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatPhoneNumber } from '../utils';


const BusinessDetails = () => {
  const { id } = useParams();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    trading_as: '',
    unit_id: null,
    is_closed: false,
    opened_on: '',
    employee_count: ''
  });
  const [units, setUnits] = useState([]);

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
        setEditFields({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          website: data.website || '',
          trading_as: data.trading_as || '',
          unit_id: data.unit_id || null,
          is_closed: !!data.is_closed,
          opened_on: data.opened_on || '',
          employee_count: typeof data.employee_count === 'number' ? String(data.employee_count) : '',
        });
        // Load units for the current address
        if (data.address?.id) {
          fetch(`${process.env.REACT_APP_API_URL}/addresses/${data.address.id}/units`)
            .then((res) => (res.ok ? res.json() : []))
            .then((list) => setUnits(Array.isArray(list) ? list : []))
            .catch(() => setUnits([]));
        } else {
          setUnits([]);
        }
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Business Details</h1>
            <div className="flex items-center gap-3">
              {isEditing ? (
                <button
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                  onClick={() => {
                    // Reset edits to current business values
                    if (business) {
                      setEditFields({
                        name: business.name || '',
                        email: business.email || '',
                        phone: business.phone || '',
                        website: business.website || '',
                        trading_as: business.trading_as || '',
                        unit_id: business.unit_id || null,
                        is_closed: !!business.is_closed,
                        opened_on: business.opened_on || '',
                        employee_count: typeof business.employee_count === 'number' ? String(business.employee_count) : '',
                      });
                    }
                    setIsEditing(false);
                    setSaveMsg('');
                  }}
                >Cancel</button>
              ) : null}
              <button
                className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isEditing ? 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500' : 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500'}`}
                onClick={() => setIsEditing((v) => !v)}
              >{isEditing ? 'Editing…' : 'Edit'}</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="inline-flex rounded-full bg-gray-100 p-1">
              <button
                className={`px-4 py-2 text-sm rounded-full transition ${activeTab === 'details' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setActiveTab('details')}
              >
                Details
              </button>
              <button
                className={`px-4 py-2 text-sm rounded-full transition ${activeTab === 'contacts' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setActiveTab('contacts')}
              >
                Contacts
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'details' && (
            business ? (
              <div className="space-y-8">
                <div className="border-b border-gray-200 pb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
              {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                        <label className="block text-sm font-medium text-gray-700">Business Name</label>
                        <input
                          type="text"
                          value={editFields.name}
                          onChange={(e) => setEditFields((p) => ({ ...p, name: e.target.value }))}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                  </div>
                  <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          value={editFields.email}
                          onChange={(e) => setEditFields((p) => ({ ...p, email: e.target.value }))}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                  </div>
                  <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                          type="tel"
                          value={editFields.phone}
                          onChange={(e) => setEditFields((p) => ({ ...p, phone: e.target.value }))}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                  </div>
                  <div>
                        <label className="block text-sm font-medium text-gray-700">Website</label>
                        <input
                          type="url"
                          value={editFields.website}
                          onChange={(e) => setEditFields((p) => ({ ...p, website: e.target.value }))}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                  </div>
                  <div>
                        <label className="block text-sm font-medium text-gray-700">Trading As</label>
                        <input
                          type="text"
                          value={editFields.trading_as}
                          onChange={(e) => setEditFields((p) => ({ ...p, trading_as: e.target.value }))}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                  </div>
                  {units.length > 0 && (
                    <div>
                          <label className="block text-sm font-medium text-gray-700">Unit</label>
                          <select
                            value={editFields.unit_id || ''}
                            onChange={(e) => setEditFields((p) => ({ ...p, unit_id: e.target.value ? Number(e.target.value) : null }))}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="">Whole Building</option>
                            {units.map((u) => (
                              <option key={u.id} value={u.id}>{u.number}</option>
                            ))}
                          </select>
                    </div>
                  )}
                    </div>
              ) : (
                    <div className="space-y-1 mt-4">
                      <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Business Name:</span> {business.name || 'N/A'}</p>
                      <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Email:</span> {business.email ? (<a href={`mailto:${business.email}`} className="text-indigo-600 hover:text-indigo-700">{business.email}</a>) : 'N/A'}</p>
                      <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Phone:</span> {business.phone ? formatPhoneNumber(business.phone) : 'N/A'}</p>
                      <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Website:</span> {business.website ? (<a href={business.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700">{business.website}</a>) : 'N/A'}</p>
                      <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Trading As:</span> {business.trading_as || 'N/A'}</p>
                      {business.unit_id && units.length > 0 ? (
                        <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Unit:</span> {(() => {
                          const u = units.find((x) => x.id === business.unit_id);
                          return u ? u.number : business.unit_id;
                        })()}</p>
                      ) : (
                        <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Unit:</span> Whole Building</p>
                      )}
                    </div>
              )}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                {isEditing ? (
                  <>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!editFields.is_closed}
                            onChange={(e) => setEditFields((p) => ({ ...p, is_closed: e.target.checked }))}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">Closed</span>
                        </label>
                    <div>
                          <label className="block text-sm font-medium text-gray-700">Opened On</label>
                          <input
                            type="date"
                            value={editFields.opened_on || ''}
                            onChange={(e) => setEditFields((p) => ({ ...p, opened_on: e.target.value }))}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                    </div>
                    <div>
                          <label className="block text-sm font-medium text-gray-700">Employee Count</label>
                          <input
                            type="number"
                            min="0"
                            value={editFields.employee_count}
                            onChange={(e) => setEditFields((p) => ({ ...p, employee_count: e.target.value }))}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                    </div>
                  </>
                ) : (
                  <>
                        <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Closed:</span> {business.is_closed ? (
                          <span className="ml-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Yes</span>
                        ) : (
                          <span className="ml-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">No</span>
                        )}</p>
                        <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Opened On:</span> {business.opened_on ? new Date(business.opened_on).toLocaleDateString() : 'N/A'}</p>
                        <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Employee Count:</span> {business.employee_count ?? 'N/A'}</p>
                  </>
                )}
                </div>
                {isEditing && (
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        setSaveMsg('');
                        try {
                          const payload = {
                            name: editFields.name,
                            email: editFields.email,
                            phone: editFields.phone,
                            website: editFields.website,
                            trading_as: editFields.trading_as,
                            unit_id: editFields.unit_id === '' ? null : editFields.unit_id,
                            is_closed: !!editFields.is_closed,
                            opened_on: editFields.opened_on || null,
                            employee_count: editFields.employee_count === '' ? null : Number(editFields.employee_count),
                          };
                          const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/${id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                          });
                          if (!res.ok) throw new Error('Save failed');
                          const updated = await res.json();
                          setBusiness(updated);
                          setIsEditing(false);
                          setSaveMsg('Saved');
                          setTimeout(() => setSaveMsg(''), 1500);
                        } catch (_) {
                          setSaveMsg('Error saving');
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >{saving ? 'Saving…' : 'Save Changes'}</button>
                    {saveMsg && <span className="text-sm text-gray-500">{saveMsg}</span>}
                  </div>
                )}
              </div>
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-lg font-semibold text-gray-900">Address Information</h2>
                {business.address ? (
                  <>
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium text-gray-900">Combined Address:</span>
                      {business.address ? (
                        <Link to={`/address/${business.address.id}`} className="ml-1 text-indigo-600 hover:text-indigo-700">
                          {business.address.combadd}
                        </Link>
                      ) : ' N/A'}
                    </p>
                    <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Owner Name:</span> {business.address.ownername}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">No address information available.</p>
                )}
              </div>
              <div className="pb-2">
                <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
                <p className="text-sm text-gray-600 mt-2"><span className="font-medium text-gray-900">Created At:</span> {new Date(business.created_at).toLocaleDateString()}</p>
                <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">Updated At:</span> {new Date(business.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
            ) : (
              <p className="text-center text-gray-600">No details available for this business.</p>
            )
          )}

          {activeTab === 'contacts' && (
            <div className="mb-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
                <button
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  onClick={() => setShowAddContact(!showAddContact)}
                >{showAddContact ? 'Cancel' : 'Add Contact'}</button>
              </div>
              {contacts.length === 0 && <p className="text-gray-500">No contacts associated with this business.</p>}
              <ul className="space-y-2">
                {contacts.map(contact => (
                  <li key={contact.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 hover:shadow-sm transition">
                    <div>
                      <Link
                        to={`/contacts/${contact.id}`}
                        className="font-semibold text-indigo-700 hover:underline hover:text-indigo-900"
                        title={`View contact ${contact.name}`}
                      >
                        {contact.name}
                      </Link>
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="ml-2 inline-flex items-center rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                          title={`Email ${contact.email}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 0a4 4 0 11-8 0 4 4 0 018 0zm0 0v4m0-4V8" /></svg>
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="ml-2 inline-flex items-center rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title={`Call ${formatPhoneNumber(contact.phone)}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm10-10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                          {formatPhoneNumber(contact.phone)}
                        </a>
                      )}
                    </div>
                    <button
                      className="ml-2 inline-flex items-center rounded bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                      onClick={() => handleRemoveContact(contact.id)}
                    >Remove</button>
                  </li>
                ))}
              </ul>

              {/* Add Contact Modal/Form */}
              {showAddContact && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-2">Add Existing Contact</h3>
                  <input
                    type="text"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm mb-2"
                    placeholder="Search by name, email, or phone..."
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                  />
                  {contactResults.length > 0 && (
                    <ul className="mb-2 max-h-40 overflow-auto divide-y divide-gray-100">
                      {contactResults.map(c => (
                        <li key={c.id} className="flex justify-between items-center p-2 hover:bg-gray-50">
                          <span>{c.name} {c.email && <span className='text-gray-400'>({c.email})</span>}</span>
                          <button className="ml-2 inline-flex items-center rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" onClick={() => handleAddExistingContact(c.id)}>Add</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <h3 className="font-semibold text-gray-900 mb-2">Or Create New Contact</h3>
                    <form onSubmit={handleCreateAndAddContact} className="space-y-2">
                      <input required type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Name" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} />
                      <input type="email" className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Email" value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} />
                      <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Phone" value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} />
                      <button type="submit" className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">Create & Add</button>
                    </form>
                    {addContactError && <div className="text-red-600 mt-2 text-sm">{addContactError}</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessDetails;
