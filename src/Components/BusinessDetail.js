import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatPhoneNumber, toEasternLocaleDateString } from '../utils';
import useContactLinking from '../Hooks/useContactLinking';
import ContactLinkModal from './Contact/ContactLinkModal';
import AlertModal from './Common/AlertModal';

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

  // Alert Modal State
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
  });

  // Contacts state
  const [showAddContact, setShowAddContact] = useState(false);
  const {
    contacts,
    searchTerm: contactSearchTerm,
    setSearchTerm: setContactSearchTerm,
    searchResults: contactSearchResults,
    isSearching: isSearchingContacts,
    newContact,
    setNewContact,
    handleAddExistingContact,
    handleCreateAndAddContact,
    handleRemoveContact,
    submissionError: addContactError,
    duplicateWarning: contactDuplicateWarning,
    setDuplicateWarning: setContactDuplicateWarning,
    linkingExisting: isLinkingExistingContact,
    creatingNew: isCreatingNewContact,
    clearTransientState: resetContactLinkState,
  } = useContactLinking('businesses', id);

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

  const closeContactModal = useCallback(() => {
    setShowAddContact(false);
    resetContactLinkState();
  }, [resetContactLinkState]);

  const onRemoveContactClick = (contactId) => {
    setAlertModal({
      isOpen: true,
      title: 'Remove Contact',
      message: 'Are you sure you want to remove this contact from the business?',
      type: 'warning',
      onConfirm: async () => {
        const success = await handleRemoveContact(contactId);
        setAlertModal((prev) => ({ ...prev, isOpen: false }));
        if (!success) {
           // Show error modal if needed, or just let it fail silently as hook might log it
           setTimeout(() => {
               setAlertModal({
                   isOpen: true,
                   title: 'Error',
                   message: 'Failed to remove contact.',
                   type: 'error',
                   onConfirm: null,
               });
           }, 300);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200">
        <div className="inline-flex items-center gap-3 rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-slate-500 shadow-lg ring-1 ring-slate-200">
          <span className="h-3 w-3 animate-ping rounded-full bg-indigo-500/80" />
          Loading business…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-white to-rose-100">
        <div className="rounded-3xl border border-rose-200 bg-white/90 px-6 py-5 text-center shadow-xl">
          <p className="text-base font-semibold text-rose-700">Something went wrong</p>
          <p className="mt-2 text-sm text-rose-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500/80">Business #{business?.id ?? id}</p>
              <h1 className="text-3xl font-semibold text-slate-900">Business Details</h1>
              <p className="text-sm text-slate-500">Review and manage business information, contacts, and activity.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {business?.is_closed !== undefined && (
                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold ring-1 ring-inset ${business.is_closed ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
                  <span className={`h-2 w-2 rounded-full ${business.is_closed ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  {business.is_closed ? 'Closed' : 'Active'}
                </span>
              )}
              {isEditing && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200 transition hover:bg-white hover:text-slate-700"
                  onClick={() => {
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
              )}
              <button
                type="button"
                className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isEditing ? 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-500' : 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500'}`}
                onClick={() => setIsEditing((v) => !v)}
              >
                {isEditing ? 'Editing…' : 'Edit Details'}
              </button>
            </div>
          </header>

          <div className="flex flex-col gap-6">
            <nav className="flex justify-start">
              <div className="inline-flex rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
                <button
                  type="button"
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${activeTab === 'details' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </button>
                <button
                  type="button"
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${activeTab === 'contacts' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setActiveTab('contacts')}
                >
                  Contacts
                </button>
              </div>
            </nav>

            {activeTab === 'details' && (
              business ? (
                <div className="space-y-8">
                  <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>
                      {saveMsg && !isEditing && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">{saveMsg}</span>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-600">Business Name</label>
                          <input
                            type="text"
                            value={editFields.name}
                            onChange={(e) => setEditFields((p) => ({ ...p, name: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-600">Email</label>
                          <input
                            type="email"
                            value={editFields.email}
                            onChange={(e) => setEditFields((p) => ({ ...p, email: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-600">Phone</label>
                          <input
                            type="tel"
                            value={editFields.phone}
                            onChange={(e) => setEditFields((p) => ({ ...p, phone: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-600">Website</label>
                          <input
                            type="url"
                            value={editFields.website}
                            onChange={(e) => setEditFields((p) => ({ ...p, website: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-600">Trading As</label>
                          <input
                            type="text"
                            value={editFields.trading_as}
                            onChange={(e) => setEditFields((p) => ({ ...p, trading_as: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        </div>
                        {units.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600">Unit</label>
                            <select
                              value={editFields.unit_id || ''}
                              onChange={(e) => setEditFields((p) => ({ ...p, unit_id: e.target.value ? Number(e.target.value) : null }))}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            >
                              <option value="">Whole Building</option>
                              {units.map((u) => (
                                <option key={u.id} value={u.id}>{u.number}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                          <input
                            id="business-closed"
                            type="checkbox"
                            checked={!!editFields.is_closed}
                            onChange={(e) => setEditFields((p) => ({ ...p, is_closed: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <label htmlFor="business-closed" className="text-sm font-medium text-slate-600">Business is closed</label>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-600">Opened On</label>
                          <input
                            type="date"
                            value={editFields.opened_on || ''}
                            onChange={(e) => setEditFields((p) => ({ ...p, opened_on: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-600">Employee Count</label>
                          <input
                            type="number"
                            min="0"
                            value={editFields.employee_count}
                            onChange={(e) => setEditFields((p) => ({ ...p, employee_count: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        </div>
                      </div>
                    ) : (
                      <dl className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Business Name</dt>
                          <dd className="mt-2 text-sm font-medium text-slate-800">{business.name || 'N/A'}</dd>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
                          <dd className="mt-2 text-sm font-medium text-slate-800">
                            {business.email ? (
                              <a href={`mailto:${business.email}`} className="text-indigo-600 transition hover:text-indigo-500">{business.email}</a>
                            ) : 'N/A'}
                          </dd>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt>
                          <dd className="mt-2 text-sm font-medium text-slate-800">{business.phone ? formatPhoneNumber(business.phone) : 'N/A'}</dd>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website</dt>
                          <dd className="mt-2 text-sm font-medium text-slate-800">
                            {business.website ? (
                              <a
                                href={business.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 transition hover:text-indigo-500"
                              >
                                {business.website}
                              </a>
                            ) : 'N/A'}
                          </dd>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trading As</dt>
                          <dd className="mt-2 text-sm font-medium text-slate-800">{business.trading_as || 'N/A'}</dd>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unit</dt>
                          <dd className="mt-2 text-sm font-medium text-slate-800">
                            {business.unit_id && units.length > 0
                              ? (() => {
                                  const u = units.find((x) => x.id === business.unit_id);
                                  return u ? u.number : business.unit_id;
                                })()
                              : 'Whole Building'}
                          </dd>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opened On</dt>
                          <dd className="mt-2 text-sm font-medium text-slate-800">{business.opened_on ? toEasternLocaleDateString(business.opened_on) : 'N/A'}</dd>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee Count</dt>
                          <dd className="mt-2 text-sm font-medium text-slate-800">{business.employee_count ?? 'N/A'}</dd>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Closed</dt>
                          <dd className="mt-2">
                            {business.is_closed ? (
                              <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">Closed</span>
                            ) : (
                              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">Open</span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    )}
                    {isEditing && (
                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
                              setTimeout(() => setSaveMsg(''), 1800);
                            } catch (_) {
                              setSaveMsg('Error saving');
                            } finally {
                              setSaving(false);
                            }
                          }}
                        >
                          {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        {saveMsg && <span className="text-sm font-medium text-slate-500">{saveMsg}</span>}
                      </div>
                    )}
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur">
                    <h2 className="text-lg font-semibold text-slate-900">Address Information</h2>
                    {business.address ? (
                      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Combined Address</dt>
                          <dd className="mt-2 text-sm font-medium text-slate-800">
                            <Link to={`/address/${business.address.id}`} className="text-indigo-600 transition hover:text-indigo-500">
                              {business.address.combadd}
                            </Link>
                          </dd>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner Name</dt>
                          <dd className="mt-2 text-sm font-medium text-slate-800">{business.address.ownername || 'N/A'}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">No address information available.</p>
                    )}
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur">
                    <h2 className="text-lg font-semibold text-slate-900">Additional Information</h2>
                    <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</dt>
                        <dd className="mt-2 text-sm font-medium text-slate-800">{toEasternLocaleDateString(business.created_at)}</dd>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Updated</dt>
                        <dd className="mt-2 text-sm font-medium text-slate-800">{toEasternLocaleDateString(business.updated_at)}</dd>
                      </div>
                    </dl>
                  </section>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-10 text-center shadow-xl">
                  <p className="text-sm font-medium text-slate-500">No details available for this business.</p>
                </div>
              )
            )}

            {activeTab === 'contacts' && (
              <section className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Contacts</h2>
                    <p className="text-sm text-slate-500">Link people to this business for quick follow-up.</p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    onClick={() => {
                      if (showAddContact) {
                        closeContactModal();
                      } else {
                        resetContactLinkState();
                        setShowAddContact(true);
                      }
                    }}
                  >
                    {showAddContact ? 'Cancel' : 'Add Contact'}
                  </button>
                </div>
                {contacts.length === 0 && (
                  <p className="text-sm text-slate-500">No contacts associated with this business.</p>
                )}
                <ul className="grid grid-cols-1 gap-4">
                  {contacts.map((contact) => (
                    <li
                      key={contact.id}
                      className="group flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-xl transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-2xl"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <Link
                            to={`/contacts/${contact.id}`}
                            className="text-base font-semibold text-indigo-700 transition group-hover:text-indigo-600"
                            title={`View contact ${contact.name}`}
                          >
                            {contact.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                            {contact.email && (
                              <a
                                href={`mailto:${contact.email}`}
                                className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200 transition hover:bg-blue-100"
                                title={`Email ${contact.email}`}
                              >
                                <span className="text-sm">✉️</span>
                                {contact.email}
                              </a>
                            )}
                            {contact.phone && (
                              <a
                                href={`tel:${contact.phone}`}
                                className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100"
                                title={`Call ${formatPhoneNumber(contact.phone)}`}
                              >
                                <span className="text-sm">📞</span>
                                {formatPhoneNumber(contact.phone)}
                              </a>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                          onClick={() => onRemoveContactClick(contact.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {showAddContact && (
                  <ContactLinkModal
                    isOpen={showAddContact}
                    onClose={closeContactModal}
                    title="Add Business Contact"
                    description="Search for an existing person or create a new contact to link with this business."
                    searchTerm={contactSearchTerm}
                    onSearchTermChange={setContactSearchTerm}
                    searchResults={contactSearchResults}
                    isSearching={isSearchingContacts}
                    onSelectContact={async (contactId) => {
                      const success = await handleAddExistingContact(contactId);
                      if (success) {
                        closeContactModal();
                      }
                    }}
                    newContact={newContact}
                    onNewContactChange={setNewContact}
                    onSubmitNewContact={async (event) => {
                      const success = await handleCreateAndAddContact(event);
                      if (success) {
                        closeContactModal();
                      }
                    }}
                    duplicateWarning={contactDuplicateWarning}
                    clearDuplicateWarning={() => setContactDuplicateWarning('')}
                    errorMessage={addContactError}
                    isAddingExisting={isLinkingExistingContact}
                    isCreatingNew={isCreatingNewContact}
                  />
                )}
              </section>
            )}
          </div>
        </div>
      </div>
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onConfirm={alertModal.onConfirm}
        onCancel={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default BusinessDetails;
