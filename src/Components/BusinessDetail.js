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
    employee_count: '',
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
      .catch((fetchError) => {
        setError(fetchError.message);
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
      .then((res) => (res.ok ? res.json() : []))
      .then(setContactResults)
      .catch(() => setContactResults([]));
  }, [contactSearch]);

  const handleAddExistingContact = async (contactId) => {
    setAddContactError(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/${id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId }),
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

  const handleCreateAndAddContact = async (e) => {
    e.preventDefault();
    setAddContactError(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/${id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
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

  const handleRemoveContact = async (contactId) => {
    if (!window.confirm('Remove this contact from the business?')) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/${id}/contacts/${contactId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove contact');
      setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
    } catch (err) {
      alert('Could not remove contact.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950/90 text-slate-200">
        Loading business profile…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950/95">
        <div className="rounded-2xl bg-white/10 px-6 py-4 text-sm font-medium text-rose-200 ring-1 ring-rose-400/40 backdrop-blur">
          Error loading business: {error}
        </div>
      </div>
    );
  }

  const renderInfoRow = (label, value) => {
    const content = value === null || value === undefined || value === '' ? 'N/A' : value;
    return (
      <div className="rounded-xl border border-slate-200/70 bg-white/60 p-4 shadow-sm shadow-slate-900/5">
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="mt-1 text-sm font-medium text-slate-900">{content}</dd>
      </div>
    );
  };

  const handleResetEditing = () => {
    if (!business) return;
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
    setIsEditing(false);
    setSaveMsg('');
  };

  const handleSave = async () => {
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
    } catch (err) {
      setSaveMsg('Error saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950/95 pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
          <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-rose-600 px-6 py-8 sm:px-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Business Profile</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {business?.name || 'Business Details'}
                </h1>
                {business?.trading_as && (
                  <p className="mt-2 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white backdrop-blur">
                    Trading as {business.trading_as}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-stretch gap-3 text-sm sm:flex-row sm:items-center">
                {isEditing && (
                  <button
                    className="inline-flex items-center justify-center rounded-full border border-white/50 bg-white/10 px-4 py-2 font-medium text-white shadow-lg shadow-indigo-900/20 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-500"
                    onClick={handleResetEditing}
                    type="button"
                  >
                    Cancel
                  </button>
                )}
                <button
                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 font-semibold shadow-lg shadow-indigo-900/20 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-500 ${isEditing ? 'cursor-default bg-white/30 text-white' : 'bg-white text-indigo-700 hover:bg-indigo-50'}`}
                  disabled={isEditing}
                  onClick={() => {
                    if (!isEditing) {
                      setIsEditing(true);
                    }
                  }}
                  type="button"
                >
                  {isEditing ? 'Editing…' : 'Edit Profile'}
                </button>
                {saveMsg && (
                  <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/80">
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-white/80">
              <span className={`inline-flex items-center rounded-full px-3 py-1 backdrop-blur ring-1 ring-inset ${business?.is_closed ? 'bg-rose-400/30 ring-rose-200/50' : 'bg-emerald-400/30 ring-emerald-200/50'}`}>
                {business?.is_closed ? 'Closed' : 'Active'}
              </span>
              {business?.opened_on && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 ring-1 ring-inset ring-white/40">
                  Opened {new Date(business.opened_on).toLocaleDateString()}
                </span>
              )}
              {business?.employee_count != null && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 ring-1 ring-inset ring-white/40">
                  {business.employee_count} Employees
                </span>
              )}
            </div>
          </div>

          <div className="px-6 pb-10 pt-6 sm:px-10">
            <nav aria-label="Business sections" className="flex justify-center">
              <div className="inline-flex rounded-full bg-slate-100/70 p-1 text-sm font-medium text-slate-600 shadow-inner">
                <button
                  className={`rounded-full px-4 py-2 transition ${activeTab === 'details' ? 'bg-white text-slate-900 shadow-sm shadow-slate-900/10' : 'hover:text-slate-900'}`}
                  onClick={() => setActiveTab('details')}
                  type="button"
                >
                  Profile
                </button>
                <button
                  className={`rounded-full px-4 py-2 transition ${activeTab === 'contacts' ? 'bg-white text-slate-900 shadow-sm shadow-slate-900/10' : 'hover:text-slate-900'}`}
                  onClick={() => setActiveTab('contacts')}
                  type="button"
                >
                  Contacts
                </button>
              </div>
            </nav>

            <div className="mt-10">
              {activeTab === 'details' && (
                business ? (
                  <div className="space-y-10">
                    <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm shadow-slate-900/5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold text-slate-900">Basic Information</h2>
                          <p className="mt-1 text-sm text-slate-600">Core business identity details.</p>
                        </div>
                        {isEditing && (
                          <button
                            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                            disabled={saving}
                            onClick={handleSave}
                            type="button"
                          >
                            {saving ? 'Saving…' : 'Save Changes'}
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Business Name
                            <input
                              type="text"
                              value={editFields.name}
                              onChange={(e) => setEditFields((prev) => ({ ...prev, name: e.target.value }))}
                              className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2 text-sm font-normal text-slate-900 shadow-inner shadow-white/50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Email
                            <input
                              type="email"
                              value={editFields.email}
                              onChange={(e) => setEditFields((prev) => ({ ...prev, email: e.target.value }))}
                              className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2 text-sm font-normal text-slate-900 shadow-inner shadow-white/50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Phone
                            <input
                              type="tel"
                              value={editFields.phone}
                              onChange={(e) => setEditFields((prev) => ({ ...prev, phone: e.target.value }))}
                              className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2 text-sm font-normal text-slate-900 shadow-inner shadow-white/50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Website
                            <input
                              type="url"
                              value={editFields.website}
                              onChange={(e) => setEditFields((prev) => ({ ...prev, website: e.target.value }))}
                              className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2 text-sm font-normal text-slate-900 shadow-inner shadow-white/50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Trading As
                            <input
                              type="text"
                              value={editFields.trading_as}
                              onChange={(e) => setEditFields((prev) => ({ ...prev, trading_as: e.target.value }))}
                              className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2 text-sm font-normal text-slate-900 shadow-inner shadow-white/50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                          </label>
                          {units.length > 0 && (
                            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                              Unit
                              <select
                                value={editFields.unit_id || ''}
                                onChange={(e) => setEditFields((prev) => ({ ...prev, unit_id: e.target.value ? Number(e.target.value) : null }))}
                                className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2 text-sm font-normal text-slate-900 shadow-inner shadow-white/50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                              >
                                <option value="">Whole Building</option>
                                {units.map((unit) => (
                                  <option key={unit.id} value={unit.id}>
                                    {unit.number}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          <label className="col-span-full flex items-center gap-3 rounded-xl border border-slate-300/80 bg-white/70 px-4 py-3 text-sm font-medium text-slate-700 shadow-inner shadow-white/50">
                            <input
                              type="checkbox"
                              checked={!!editFields.is_closed}
                              onChange={(e) => setEditFields((prev) => ({ ...prev, is_closed: e.target.checked }))}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            Closed Business
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Opened On
                            <input
                              type="date"
                              value={editFields.opened_on || ''}
                              onChange={(e) => setEditFields((prev) => ({ ...prev, opened_on: e.target.value }))}
                              className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2 text-sm font-normal text-slate-900 shadow-inner shadow-white/50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Employee Count
                            <input
                              type="number"
                              min="0"
                              value={editFields.employee_count}
                              onChange={(e) => setEditFields((prev) => ({ ...prev, employee_count: e.target.value }))}
                              className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2 text-sm font-normal text-slate-900 shadow-inner shadow-white/50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                          </label>
                        </div>
                      ) : (
                        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {renderInfoRow('Business Name', business.name)}
                          {renderInfoRow(
                            'Email',
                            business.email ? (
                              <a href={`mailto:${business.email}`} className="text-indigo-600 transition hover:text-indigo-800">
                                {business.email}
                              </a>
                            ) : null
                          )}
                          {renderInfoRow('Phone', business.phone ? formatPhoneNumber(business.phone) : null)}
                          {renderInfoRow(
                            'Website',
                            business.website ? (
                              <a
                                href={business.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 transition hover:text-indigo-800"
                              >
                                {business.website}
                              </a>
                            ) : null
                          )}
                          {renderInfoRow('Trading As', business.trading_as)}
                          {renderInfoRow(
                            'Unit',
                            business.unit_id && units.length > 0
                              ? (() => {
                                  const match = units.find((unit) => unit.id === business.unit_id);
                                  return match ? match.number : business.unit_id;
                                })()
                              : 'Whole Building'
                          )}
                          {renderInfoRow('Closed', business.is_closed ? 'Yes' : 'No')}
                          {renderInfoRow('Opened On', business.opened_on ? new Date(business.opened_on).toLocaleDateString() : null)}
                          {renderInfoRow('Employee Count', business.employee_count != null ? business.employee_count : null)}
                        </dl>
                      )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
                      <h2 className="text-base font-semibold text-slate-900">Address Information</h2>
                      <p className="mt-1 text-sm text-slate-600">Location and ownership details.</p>
                      {business.address ? (
                        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {renderInfoRow(
                            'Combined Address',
                            <Link to={`/address/${business.address.id}`} className="text-indigo-600 transition hover:text-indigo-800">
                              {business.address.combadd}
                            </Link>
                          )}
                          {renderInfoRow('Owner Name', business.address.ownername)}
                        </dl>
                      ) : (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-300/70 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
                          No address information available.
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm shadow-slate-900/5">
                      <h2 className="text-base font-semibold text-slate-900">Additional Information</h2>
                      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {renderInfoRow('Created At', new Date(business.created_at).toLocaleDateString())}
                        {renderInfoRow('Updated At', new Date(business.updated_at).toLocaleDateString())}
                      </dl>
                    </section>
                  </div>
                ) : (
                  <div className="flex justify-center rounded-2xl border border-dashed border-slate-300/70 bg-slate-50/60 px-6 py-16 text-sm text-slate-500">
                    No details available for this business.
                  </div>
                )
              )}

              {activeTab === 'contacts' && (
                <section className="space-y-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">Contacts</h2>
                      <p className="mt-1 text-sm text-slate-600">People connected to this business.</p>
                    </div>
                    <button
                      className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/30 transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                      onClick={() => setShowAddContact(!showAddContact)}
                      type="button"
                    >
                      {showAddContact ? 'Close' : 'Add Contact'}
                    </button>
                  </div>

                  {contacts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300/70 bg-slate-50/60 px-6 py-12 text-center text-sm text-slate-500">
                      No contacts associated with this business yet.
                    </div>
                  ) : (
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {contacts.map((contact) => (
                        <li
                          key={contact.id}
                          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-lg"
                        >
                          <div className="flex flex-col gap-3">
                            <div>
                              <Link
                                to={`/contacts/${contact.id}`}
                                className="text-lg font-semibold text-indigo-700 transition hover:text-indigo-900"
                                title={`View contact ${contact.name}`}
                              >
                                {contact.name}
                              </Link>
                              {contact.email && (
                                <a
                                  href={`mailto:${contact.email}`}
                                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                                  title={`Email ${contact.email}`}
                                >
                                  <span className="font-semibold">Email</span>
                                  {contact.email}
                                </a>
                              )}
                              {contact.phone && (
                                <a
                                  href={`tel:${contact.phone}`}
                                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                                  title={`Call ${formatPhoneNumber(contact.phone)}`}
                                >
                                  <span className="font-semibold">Call</span>
                                  {formatPhoneNumber(contact.phone)}
                                </a>
                              )}
                            </div>
                            <button
                              className="inline-flex items-center justify-center rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow-sm shadow-rose-500/40 transition hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                              onClick={() => handleRemoveContact(contact.id)}
                              type="button"
                            >
                              Remove Contact
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {showAddContact && (
                    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm shadow-slate-900/5">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">Add Existing Contact</h3>
                        <p className="mt-1 text-sm text-slate-600">Search for a contact and attach them to this business.</p>
                      </div>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        placeholder="Search by name, email, or phone…"
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                      />
                      {contactResults.length > 0 && (
                        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200/80">
                          {contactResults.map((result) => (
                            <li
                              key={result.id}
                              className="flex items-center justify-between gap-4 bg-white/80 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                            >
                              <span>
                                {result.name}
                                {result.email && <span className="ml-1 text-xs text-slate-400">({result.email})</span>}
                              </span>
                              <button
                                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                onClick={() => handleAddExistingContact(result.id)}
                                type="button"
                              >
                                Attach
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="space-y-4 rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/70 p-5">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">Or Create New Contact</h3>
                          <p className="mt-1 text-sm text-slate-600">Provide details to create a contact and link them immediately.</p>
                        </div>
                        <form onSubmit={handleCreateAndAddContact} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <input
                            required
                            type="text"
                            className="rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:col-span-2"
                            placeholder="Full name"
                            value={newContact.name}
                            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                          />
                          <input
                            type="email"
                            className="rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            placeholder="Email address"
                            value={newContact.email}
                            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                          />
                          <input
                            type="text"
                            className="rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            placeholder="Phone number"
                            value={newContact.phone}
                            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/30 transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:col-span-2"
                          >
                            Create &amp; Attach Contact
                          </button>
                        </form>
                        {addContactError && <div className="text-sm font-medium text-rose-600">{addContactError}</div>}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessDetails;
