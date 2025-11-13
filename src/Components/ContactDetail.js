import React, { useCallback, useEffect, useState } from 'react';
import AsyncSelect from 'react-select/async';
import { Link, useParams } from 'react-router-dom';
import ContactComments from './Contact/ContactComments';
import { formatPhoneNumber, toEasternLocaleDateString } from '../utils';
import PageLoading from './Common/PageLoading';
import PageError from './Common/PageError';

const SECTION_KEYS = ['addresses', 'businesses', 'inspections', 'permits', 'complaints'];
const createInitialSectionState = () => SECTION_KEYS.reduce((acc, key) => {
  acc[key] = false;
  return acc;
}, {});

const selectStyles = {
  control: (provided) => ({
    ...provided,
    minHeight: '38px',
    borderColor: '#d1d5db',
    boxShadow: 'none',
    '&:hover': { borderColor: '#2563eb' },
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 30,
  }),
};

export default function ContactDetail() {
  const { id } = useParams();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContact, setEditContact] = useState({ name: '', email: '', phone: '' });
  const [editError, setEditError] = useState(null);
  const [openSections, setOpenSections] = useState(() => createInitialSectionState());
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressSubmitError, setAddressSubmitError] = useState(null);
  const [addressRemovingId, setAddressRemovingId] = useState(null);
  const [addressRemoveError, setAddressRemoveError] = useState(null);
  const [isAddingBusiness, setIsAddingBusiness] = useState(false);
  const [businessSubmitting, setBusinessSubmitting] = useState(false);
  const [businessSubmitError, setBusinessSubmitError] = useState(null);
  const [businessRemovingId, setBusinessRemovingId] = useState(null);
  const [businessRemoveError, setBusinessRemoveError] = useState(null);

  const applyContactData = useCallback((data) => {
    setContact(data);
    if (!isEditing) {
      setEditContact({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
      });
    }
  }, [isEditing]);

  const fetchContactDetails = useCallback(async () => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/contacts/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch contact details');
    }
    return response.json();
  }, [id]);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError(null);

    fetchContactDetails()
      .then((data) => {
        if (!isActive) return;
        applyContactData(data);
      })
      .catch((fetchError) => {
        if (!isActive) return;
        setError(fetchError.message);
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [fetchContactDetails, applyContactData]);

  useEffect(() => {
    setOpenSections(createInitialSectionState());
    setIsAddingAddress(false);
    setAddressSubmitError(null);
    setAddressRemovingId(null);
    setAddressRemoveError(null);
    setIsAddingBusiness(false);
    setBusinessSubmitError(null);
    setBusinessRemovingId(null);
    setBusinessRemoveError(null);
  }, [id]);

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditContact((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setEditError(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editContact),
      });

      if (!response.ok) {
        throw new Error('Failed to update contact');
      }

      const updated = await response.json();
      setContact((prev) => (prev ? { ...prev, ...updated } : updated));
      setEditContact({
        name: updated.name || '',
        email: updated.email || '',
        phone: updated.phone || '',
      });
      setIsEditing(false);
    } catch (updateError) {
      console.error(updateError);
      setEditError('Could not update contact.');
    }
  };

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const ensureSectionOpen = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: true }));
  };

  const startLinkingAddress = () => {
    ensureSectionOpen('addresses');
    setAddressSubmitError(null);
    setAddressRemoveError(null);
    setIsAddingAddress(true);
  };

  const startLinkingBusiness = () => {
    ensureSectionOpen('businesses');
    setBusinessSubmitError(null);
    setBusinessRemoveError(null);
    setIsAddingBusiness(true);
  };

  const cancelLinkingAddress = () => {
    setIsAddingAddress(false);
    setAddressSubmitError(null);
  };

  const cancelLinkingBusiness = () => {
    setIsAddingBusiness(false);
    setBusinessSubmitError(null);
  };

  const loadAddressOptions = async (inputValue) => {
    const query = encodeURIComponent(inputValue || '');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/addresses/search?query=${query}&limit=5`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.map((address) => ({
        label: `${address.property_name ? `${address.property_name} - ` : ''}${address.combadd}${address.aka ? ` (AKA: ${address.aka})` : ''}`,
        value: address.id,
      }));
    } catch (loadError) {
      console.error(loadError);
      return [];
    }
  };

  const loadBusinessOptions = async (inputValue) => {
    const query = encodeURIComponent(inputValue || '');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/businesses/search?query=${query}&limit=5`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.map((business) => ({
        label: `${business.name || business.trading_as || 'Business'}${business.address?.combadd ? ` – ${business.address.combadd}` : ''}`,
        value: business.id,
      }));
    } catch (loadError) {
      console.error(loadError);
      return [];
    }
  };

  const handleAddressSelected = async (selectedOption) => {
    if (!selectedOption || !contact?.id) {
      return;
    }

    ensureSectionOpen('addresses');
    setAddressSubmitError(null);
    setAddressRemoveError(null);
    setAddressSubmitting(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${selectedOption.value}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contact.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to link address');
      }

      const refreshed = await fetchContactDetails();
      applyContactData(refreshed);
      setIsAddingAddress(false);
    } catch (linkError) {
      console.error(linkError);
      setAddressSubmitError('Could not link address to contact.');
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleBusinessSelected = async (selectedOption) => {
    if (!selectedOption || !contact?.id) {
      return;
    }

    ensureSectionOpen('businesses');
    setBusinessSubmitError(null);
    setBusinessRemoveError(null);
    setBusinessSubmitting(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/businesses/${selectedOption.value}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contact.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to link business');
      }

      const refreshed = await fetchContactDetails();
      applyContactData(refreshed);
      setIsAddingBusiness(false);
    } catch (linkError) {
      console.error(linkError);
      setBusinessSubmitError('Could not link business to contact.');
    } finally {
      setBusinessSubmitting(false);
    }
  };

  const handleRemoveAddress = async (addressId) => {
    if (!contact?.id) {
      return;
    }

    ensureSectionOpen('addresses');
    setAddressSubmitError(null);
    setAddressRemoveError(null);
    setAddressRemovingId(addressId);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${addressId}/contacts/${contact.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove address link');
      }

      const refreshed = await fetchContactDetails();
      applyContactData(refreshed);
    } catch (removeError) {
      console.error(removeError);
      setAddressRemoveError('Could not remove address from contact.');
    } finally {
      setAddressRemovingId(null);
    }
  };

  const handleRemoveBusiness = async (businessId) => {
    if (!contact?.id) {
      return;
    }

    ensureSectionOpen('businesses');
    setBusinessSubmitError(null);
    setBusinessRemoveError(null);
    setBusinessRemovingId(businessId);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/businesses/${businessId}/contacts/${contact.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove business link');
      }

      const refreshed = await fetchContactDetails();
      applyContactData(refreshed);
    } catch (removeError) {
      console.error(removeError);
      setBusinessRemoveError('Could not remove business from contact.');
    } finally {
      setBusinessRemovingId(null);
    }
  };

  if (loading) {
    return <PageLoading message="Loading contact…" />;
  }

  if (error) {
    return <PageError title="Unable to load contact" error={error} />;
  }

  if (!contact) {
    return null;
  }

  const associationSections = [
    {
      key: 'addresses',
      title: 'Addresses',
      items: contact.addresses || [],
      emptyMessage: 'No associated addresses.',
      renderItem: (address) => {
        const label = address.combadd || address.property_name || address.streetname || `Address #${address.id}`;
        return (
          <li
            key={`address-${address.id}`}
            className="flex items-start justify-between gap-4 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm"
          >
            <div>
              <Link to={`/address/${address.id}`} className="font-medium text-indigo-600 hover:text-indigo-900">
                {label}
              </Link>
              {address.aka && <div className="text-xs text-gray-500">AKA: {address.aka}</div>}
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
              <span className="text-xs text-gray-400">#{address.id}</span>
              <button
                type="button"
                onClick={() => handleRemoveAddress(address.id)}
                disabled={addressRemovingId === address.id}
                className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium transition-colors ${
                  addressRemovingId === address.id
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                {addressRemovingId === address.id ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </li>
        );
      },
    },
    {
      key: 'businesses',
      title: 'Businesses',
      items: contact.businesses || [],
      emptyMessage: 'No associated businesses.',
      renderItem: (business) => {
        const label = business.name || business.trading_as || `Business #${business.id}`;
        const location = (business.address && (business.address.combadd || business.address.property_name)) || null;
        return (
          <li
            key={`business-${business.id}`}
            className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <Link to={`/business/${business.id}`} className="font-medium text-indigo-600 hover:text-indigo-900">
                {label}
              </Link>
              {location && <div className="text-xs text-gray-500">{location}</div>}
            </div>
            <div className="flex items-center gap-4 sm:flex-row sm:text-right">
              <div className="text-xs text-gray-500 sm:text-right">
                {business.phone ? formatPhoneNumber(business.phone) : business.email || '—'}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveBusiness(business.id)}
                disabled={businessRemovingId === business.id}
                className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium transition-colors ${
                  businessRemovingId === business.id
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                {businessRemovingId === business.id ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </li>
        );
      },
    },
    {
      key: 'inspections',
      title: 'Inspections',
      items: contact.inspections || [],
      emptyMessage: 'No related inspections.',
      renderItem: (inspection) => {
        const status = inspection.status || '—';
        const created = inspection.created_at ? toEasternLocaleDateString(inspection.created_at) || null : null;
        const location = (inspection.address && (inspection.address.combadd || inspection.address.property_name)) || null;
        return (
          <li
            key={`inspection-${inspection.id}`}
            className="flex flex-col gap-1 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <Link to={`/inspection/${inspection.id}`} className="font-medium text-indigo-600 hover:text-indigo-900">
                {inspection.source || 'Inspection'}
              </Link>
              {location && <div className="text-xs text-gray-500">{location}</div>}
            </div>
            <div className="flex flex-col text-xs text-gray-500 sm:items-end">
              <span>Status: {status}</span>
              {created && <span>Recorded: {created}</span>}
            </div>
          </li>
        );
      },
    },
    {
      key: 'permits',
      title: 'Permits',
      items: contact.permits || [],
      emptyMessage: 'No permits linked to this contact.',
      renderItem: (permit) => {
        const created = permit.created_at ? toEasternLocaleDateString(permit.created_at) || null : null;
        return (
          <li
            key={`permit-${permit.id}`}
            className="flex flex-col gap-1 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <Link to={`/permit/${permit.id}`} className="font-medium text-indigo-600 hover:text-indigo-900">
                {permit.permit_type || 'Permit'}
              </Link>
              <div className="text-xs text-gray-500">Permit #: {permit.permit_number || '—'}</div>
            </div>
            <div className="flex flex-col text-xs text-gray-500 sm:items-end">
              <span>Inspection #{permit.inspection_id}</span>
              {created && <span>Created: {created}</span>}
            </div>
          </li>
        );
      },
    },
    {
      key: 'complaints',
      title: 'Complaints',
      items: contact.complaints || [],
      emptyMessage: 'No complaints associated with this contact.',
      renderItem: (complaint) => {
        const status = complaint.status || '—';
        const created = complaint.created_at ? toEasternLocaleDateString(complaint.created_at) || null : null;
        const location = (complaint.address && (complaint.address.combadd || complaint.address.property_name)) || null;
        return (
          <li
            key={`complaint-${complaint.id}`}
            className="flex flex-col gap-1 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <Link to={`/complaint/${complaint.id}`} className="font-medium text-indigo-600 hover:text-indigo-900">
                Complaint
              </Link>
              {location && <div className="text-xs text-gray-500">{location}</div>}
            </div>
            <div className="flex flex-col text-xs text-gray-500 sm:items-end">
              <span>Status: {status}</span>
              {created && <span>Recorded: {created}</span>}
            </div>
          </li>
        );
      },
    },
  ];

  return (
    <div className="mx-auto mt-10 max-w-4xl p-6">
      <div className="space-y-8 rounded-lg bg-white p-6 shadow-md">
        <div className="border-b pb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-gray-700">Basic Information</h2>
            {!isEditing && (
              <button
                className="ml-4 rounded bg-blue-500 px-3 py-1 text-sm text-white"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            )}
          </div>

          {!isEditing ? (
            <div className="mt-4 space-y-2">
              <p className="text-lg font-semibold text-blue-700">{contact.name}</p>
              <div className="flex flex-wrap gap-2">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-center rounded bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200"
                    title={`Email ${contact.email}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-1 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 0a4 4 0 11-8 0 4 4 0 018 0zm0 0v4m0-4V8" />
                    </svg>
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-center rounded bg-green-100 px-2 py-1 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
                    title={`Call ${contact.phone}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-1 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm10-10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                    {formatPhoneNumber(contact.phone)}
                  </a>
                )}
              </div>
              {contact.notes && <p className="text-sm text-gray-600">Notes: {contact.notes}</p>}
            </div>
          ) : (
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3">
              <input
                required
                type="text"
                name="name"
                className="w-full rounded border px-3 py-2"
                placeholder="Name"
                value={editContact.name}
                onChange={handleEditChange}
              />
              <input
                type="email"
                name="email"
                className="w-full rounded border px-3 py-2"
                placeholder="Email"
                value={editContact.email}
                onChange={handleEditChange}
              />
              <input
                type="text"
                name="phone"
                className="w-full rounded border px-3 py-2"
                placeholder="Phone"
                value={editContact.phone}
                onChange={handleEditChange}
              />
              <div className="flex gap-2">
                <button type="submit" className="rounded bg-green-600 px-3 py-1 text-white">Save</button>
                <button
                  type="button"
                  className="rounded bg-gray-400 px-3 py-1 text-white"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContact({
                      name: contact.name || '',
                      email: contact.email || '',
                      phone: contact.phone || '',
                    });
                  }}
                >
                  Cancel
                </button>
              </div>
              {editError && <div className="text-red-500">{editError}</div>}
            </form>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-medium text-gray-700">Associations</h2>
          {associationSections.map(({ key, title, items, emptyMessage, renderItem }) => {
            const isOpen = openSections[key];
            const itemCount = items.length;
            const isAddressSection = key === 'addresses';
            const isBusinessSection = key === 'businesses';
            const isLinkableSection = isAddressSection || isBusinessSection;
            const linkingActive = isAddressSection ? isAddingAddress : isBusinessSection ? isAddingBusiness : false;
            const startLinking = isAddressSection ? startLinkingAddress : startLinkingBusiness;
            const cancelLinking = isAddressSection ? cancelLinkingAddress : cancelLinkingBusiness;
            const loadOptions = isAddressSection ? loadAddressOptions : loadBusinessOptions;
            const handleSelected = isAddressSection ? handleAddressSelected : handleBusinessSelected;
            const isSubmitting = isAddressSection ? addressSubmitting : businessSubmitting;
            const submitError = isAddressSection ? addressSubmitError : businessSubmitError;
            const removeError = isAddressSection ? addressRemoveError : businessRemoveError;
            const linkButtonLabel = isAddressSection ? 'Link Address' : 'Link Business';
            const placeholder = isAddressSection ? 'Search addresses...' : 'Search businesses...';

            return (
              <div key={key} className="rounded-lg border border-gray-200 bg-gray-50">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() => toggleSection(key)}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                        itemCount > 0 ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-400'
                      }`}
                    >
                      {itemCount}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{title}</span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  >
                    <path fillRule="evenodd" d="M6.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L10.586 10 6.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-200 bg-white px-4 py-3">
                    {isLinkableSection && (
                      <div className="mb-3 rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
                        {!linkingActive ? (
                          <button
                            type="button"
                            className="rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                            onClick={startLinking}
                          >
                            {linkButtonLabel}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <AsyncSelect
                              cacheOptions
                              defaultOptions
                              loadOptions={loadOptions}
                              onChange={handleSelected}
                              isDisabled={isSubmitting}
                              isClearable
                              placeholder={placeholder}
                              styles={selectStyles}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="rounded bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                                onClick={cancelLinking}
                                disabled={isSubmitting}
                              >
                                Cancel
                              </button>
                              {isSubmitting && <span className="text-sm text-gray-500">Linking…</span>}
                            </div>
                            {submitError && <p className="text-sm text-red-500">{submitError}</p>}
                          </div>
                        )}
                      </div>
                    )}

                    {itemCount > 0 ? (
                      <ul className="space-y-2">{items.map(renderItem)}</ul>
                    ) : (
                      <p className="text-sm text-gray-500">{emptyMessage}</p>
                    )}

                    {isLinkableSection && removeError && (
                      <p className="mt-2 text-sm text-red-500">{removeError}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t pt-6">
          <ContactComments contactId={id} contact={contact} />
        </div>
      </div>
    </div>
  );
}
