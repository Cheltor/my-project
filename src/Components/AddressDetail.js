import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AddressPhotos from './Address/AddressPhotos'; // Update the import statement
import Citations from './Address/AddressCitations';
import Violations from './Address/AddressViolations';
import Comments from './Address/AddressComments';
import Complaints from './Address/AddressComplaints';
import Inspections from './Address/AddressInspections';
import useUnitSearch from './Address/useUnitSearch';
import AddressLicenses from './Address/AddressLicenses';
import AddressPermits from './Address/AddressPermits';
import NewUnit from './Inspection/NewUnit';  // Import NewUnit component

// Utility function to titlize a string
function titlize(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

const AddressDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();  // Initialize useNavigate
  const { user } = useAuth();
  const [address, setAddress] = useState(null);
  const [units, setUnits] = useState([]);  // State to store units
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('comments');
  const [businesses, setBusinesses] = useState([]);
  const [addrLicenses, setAddrLicenses] = useState([]);
  const [counts, setCounts] = useState({
    comments: 0,
    violations: 0,
    citations: 0,
    inspections: 0,
    complaints: 0,
    permits: 0,
    photos: 0,
    contacts: 0,
    licenses: 0,
  });
  // Quick comment (mobile) state
  const [quickContent, setQuickContent] = useState('');
  const [quickFiles, setQuickFiles] = useState([]);
  const [submittingQuick, setSubmittingQuick] = useState(false);
  const fileInputRef = useRef(null);
  const [commentsRefreshKey, setCommentsRefreshKey] = useState(0);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  // Contacts state
  const [contacts, setContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '' });
  const [addContactError, setAddContactError] = useState(null);
  // Add Business state
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [newBusiness, setNewBusiness] = useState({
    name: '',
    trading_as: '',
    phone: '',
    email: '',
    website: '',
    is_closed: false,
  });
  const [submittingBusiness, setSubmittingBusiness] = useState(false);
  const [addBusinessError, setAddBusinessError] = useState(null);
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
  
  // Units sorted numerically for the sticky comment select
  const sortedUnitsForSelect = useMemo(() => {
    if (!Array.isArray(units)) return [];
    const arr = [...units];
    arr.sort((a, b) => {
      const aNum = parseFloat(a?.number);
      const bNum = parseFloat(b?.number);
      const aIsNum = !Number.isNaN(aNum);
      const bIsNum = !Number.isNaN(bNum);
      if (aIsNum && bIsNum) return aNum - bNum;
      if (aIsNum) return -1;
      if (bIsNum) return 1;
      return String(a?.number ?? '').localeCompare(String(b?.number ?? ''));
    });
    return arr;
  }, [units]);

  // Filter units for the Units tab display using the search term (matches name or number)
  const filteredUnitsForList = useMemo(() => {
    const base = Array.isArray(units) ? units : [];
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) return base;
    return base.filter((u) => {
      const name = String(u?.name || '').toLowerCase();
      const num = String(u?.number || '').toLowerCase();
      return name.includes(q) || num.includes(q);
    });
  }, [units, searchTerm]);

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

  // Fetch businesses for this address (client-side filter)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/`);
        if (!res.ok) throw new Error('Failed to fetch businesses');
        const data = await res.json();
        const addrId = Number(id);
        const list = Array.isArray(data) ? data.filter((b) => Number(b.address_id) === addrId) : [];
        setBusinesses(list);
      } catch (e) {
        setBusinesses([]);
      }
    };
    load();
  }, [id]);

  // Fetch licenses for this address (for quick status under Owner ZIP)
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const base = process.env.REACT_APP_API_URL;
        let res = await fetch(`${base}/licenses/address/${id}`);
        if (!res.ok) {
          res = await fetch(`${base}/licenses/?address_id=${encodeURIComponent(id)}`);
        }
        if (!res.ok) {
          res = await fetch(`${base}/licenses/`);
        }
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data.filter((l) => String(l.address_id) === String(id)) : [];
          setAddrLicenses(list);
        } else {
          setAddrLicenses([]);
        }
      } catch {
        setAddrLicenses([]);
      }
    };
    load();
  }, [id]);

  // Keep simple derived counts in sync
  useEffect(() => {
    setCounts((prev) => ({ ...prev, contacts: Array.isArray(contacts) ? contacts.length : 0 }));
  }, [contacts]);
  useEffect(() => {
    setCounts((prev) => ({ ...prev, licenses: Array.isArray(addrLicenses) ? addrLicenses.length : 0 }));
  }, [addrLicenses]);
  useEffect(() => {
    setCounts((prev) => ({ ...prev, permits: prev.permits }));
  }, []);
  useEffect(() => {
    setCounts((prev) => ({ ...prev, photos: prev.photos }));
  }, []);
  useEffect(() => {
    setCounts((prev) => ({ ...prev, citations: prev.citations }));
  }, []);
  useEffect(() => {
    setCounts((prev) => ({ ...prev, violations: prev.violations }));
  }, []);
  useEffect(() => {
    setCounts((prev) => ({ ...prev, inspections: prev.inspections }));
  }, []);
  useEffect(() => {
    setCounts((prev) => ({ ...prev, complaints: prev.complaints }));
  }, []);

  // Fetch counts for other resources once per address
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const loadCounts = async () => {
      try {
        const base = process.env.REACT_APP_API_URL;
        const endpoints = {
          comments: `/addresses/${id}/comments`,
          violations: `/addresses/${id}/violations`,
          inspections: `/addresses/${id}/inspections`,
          complaints: `/complaints/address/${id}`,
          citations: `/citations/address/${id}`,
          photos: `/addresses/${id}/photos`,
        };
        const entries = Object.entries(endpoints);
        const results = await Promise.allSettled(
          entries.map(([key, path]) =>
            fetch(`${base}${path}`)
              .then((r) => (r.ok ? r.json() : []))
              .then((data) => ({ key, len: Array.isArray(data) ? data.length : 0 }))
              .catch(() => ({ key, len: 0 }))
          )
        );
        const next = {};
        results.forEach((res) => {
          if (res.status === 'fulfilled') {
            next[res.value.key] = res.value.len;
          }
        });

        // Permits count with graceful fallback similar to licenses
        let permitsLen = 0;
        try {
          let r = await fetch(`${base}/permits/address/${id}`);
          if (!r.ok) {
            r = await fetch(`${base}/permits/?address_id=${encodeURIComponent(id)}`);
          }
          if (!r.ok) {
            r = await fetch(`${base}/permits/`);
            if (r.ok) {
              const all = await r.json();
              permitsLen = Array.isArray(all)
                ? all.filter((p) => String(p.address_id) === String(id)).length
                : 0;
            }
          } else {
            const list = await r.json();
            permitsLen = Array.isArray(list)
              ? list.filter((p) => String(p.address_id) === String(id)).length
              : 0;
          }
        } catch {
          permitsLen = 0;
        }
        next.permits = permitsLen;

        if (!cancelled) {
          setCounts((prev) => ({ ...prev, ...next }));
        }
      } catch {
        // ignore
      }
    };
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const mostRecentLicense = useMemo(() => {
    if (!Array.isArray(addrLicenses) || addrLicenses.length === 0) return null;
    const getTime = (l) => {
      if (l?.created_at) {
        const t = new Date(l.created_at).getTime();
        if (!Number.isNaN(t)) return t;
      }
      if (l?.date_issued) {
        const t = new Date(l.date_issued).getTime();
        if (!Number.isNaN(t)) return t;
      }
      if (l?.expiration_date) {
        const t = new Date(l.expiration_date).getTime();
        if (!Number.isNaN(t)) return t;
      }
      return 0;
    };
    const arr = [...addrLicenses];
    arr.sort((a, b) => getTime(b) - getTime(a));
    return arr[0];
  }, [addrLicenses]);

  const mostRecentLicenseStatus = useMemo(() => {
    if (!mostRecentLicense) return null;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const exp = mostRecentLicense?.expiration_date ? new Date(mostRecentLicense.expiration_date) : null;
    if (exp && exp.getTime() < startOfToday.getTime()) return { state: 'expired', date: exp };
    if (exp) return { state: 'active', date: exp };
    return { state: 'active', date: null }; // treat missing expiration as active/no-exp
  }, [mostRecentLicense]);

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

  // Tab button styles (active vs inactive)
  const tabBtnBase = "group inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2";
  const tabBtnInactive = "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300";
  const tabBtnActive = "bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500";

  // License type labels for quick badges
  const LICENSE_TYPE_LABELS = {
    0: 'Business License',
    1: 'Business License',
    2: 'Single Family License',
    3: 'Multifamily License',
  };

  return (
    <div className="max-w-4xl mx-auto px-5 pt-4 pb-36 sm:pb-6 bg-white shadow-md rounded-lg mt-6 space-y-8">
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
                <label htmlFor="aka" className="block text-xs font-medium text-gray-600">AKA</label>
                <input
                  id="aka"
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                  value={address.aka || ''}
                  onChange={(e) => setAddress({ ...address, aka: e.target.value })}
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
              <div>
                <div className="text-xs text-gray-500">Owner Address</div>
                <div className="text-gray-800">{address.owneraddress || 'N/A'}</div>
              </div>
              {mostRecentLicense && (
                <div>
                  <div className="text-xs text-gray-500">License</div>
                  <div className="text-sm">
                    <Link
                      to={`/license/${mostRecentLicense.id}`}
                      className={`inline-flex items-center gap-2 px-2 py-1 rounded ${
                        mostRecentLicenseStatus?.state === 'expired'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                      title="View license details"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        {mostRecentLicenseStatus?.state === 'expired' ? (
                          <>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </>
                        ) : (
                          <>
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 12l2 2 4-4" />
                          </>
                        )}
                      </svg>
                      <span>
                        {mostRecentLicenseStatus?.state === 'expired'
                          ? `Expired ${mostRecentLicenseStatus?.date ? mostRecentLicenseStatus.date.toLocaleDateString() : ''}`
                          : `Active${mostRecentLicenseStatus?.date ? ` until ${mostRecentLicenseStatus.date.toLocaleDateString()}` : ''}`}
                        {(() => {
                          const t = mostRecentLicense?.license_type;
                          const label = LICENSE_TYPE_LABELS?.[t] || (t != null ? String(t) : '');
                          return label ? ` • ${label}` : '';
                        })()}
                        {mostRecentLicense.license_number ? ` • #${mostRecentLicense.license_number}` : ''}
                      </span>
                    </Link>
                  </div>
                </div>
              )}
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

  {/* External Links: Google Maps + SDAT (if available) + Quick tabs */}
  <div className="flex flex-wrap items-center gap-2 mt-2">
        <button
          type="button"
          aria-label="Open address in Google Maps"
          onClick={() => {
            const parts = [address.streetnumb, address.streetname, address.ownerstate, address.ownerzip].filter(Boolean).join(' ');
            const query = encodeURIComponent(parts || address.combadd || '');
            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`,'_blank','noopener');
          }}
          className="group inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-sm font-medium text-white shadow transition-all hover:from-emerald-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[.97]"
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

        {(() => {
          const district = (address.district || '').trim();
          const propertyId = (address.property_id || '').trim();
          if (!district || !propertyId) return null;
          const sdatUrl = `https://sdat.dat.maryland.gov/RealProperty/Pages/viewdetails.aspx?County=17&SearchType=ACCT&District=${encodeURIComponent(district)}&AccountNumber=${encodeURIComponent(propertyId)}`;
          return (
            <a
              href={sdatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-medium text-white shadow transition-all hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 active:scale-[.97]"
              title={`Open SDAT for District ${district}, Account ${propertyId}`}
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
                <path d="M3 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                <path d="M14 12h6" />
              </svg>
              <span className="whitespace-nowrap">Open SDAT</span>
            </a>
          );
        })()}

        {/* Quick access: Contacts */}
        <button
          type="button"
          onClick={() => setActiveTab('contacts')}
          aria-pressed={activeTab === 'contacts'}
          className={`${tabBtnBase} ${activeTab === 'contacts' ? tabBtnActive : tabBtnInactive}`}
          title="View Contacts"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="3" />
          </svg>
          <span>Contacts ({counts.contacts || 0})</span>
        </button>

        {/* Quick access: Businesses */}
        <button
          type="button"
          onClick={() => setActiveTab('businesses')}
          aria-pressed={activeTab === 'businesses'}
          className={`${tabBtnBase} ${activeTab === 'businesses' ? tabBtnActive : tabBtnInactive}`}
          title="View Businesses"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M3 21V7a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2v14" />
            <path d="M3 10h18" />
          </svg>
          <span>Businesses ({Array.isArray(businesses) ? businesses.length : 0})</span>
        </button>

        {/* Main tabs: Units → Permits (same row styling) */}
        <button
          type="button"
          onClick={() => setActiveTab('units')}
          aria-pressed={activeTab === 'units'}
          className={`${tabBtnBase} ${activeTab === 'units' ? tabBtnActive : tabBtnInactive}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M3 21V7a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2v14" />
            <path d="M3 10h18" />
            <path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2M15 18h2" />
          </svg>
          <span>Units ({Array.isArray(units) ? units.length : 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('comments')}
          aria-pressed={activeTab === 'comments'}
          className={`${tabBtnBase} ${activeTab === 'comments' ? tabBtnActive : tabBtnInactive}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M21 15a4 4 0 0 1-4 4H8l-4 3V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4z" />
            <path d="M8 9h8M8 12h5" />
          </svg>
          <span>Comments ({counts.comments || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('violations')}
          aria-pressed={activeTab === 'violations'}
          className={`${tabBtnBase} ${activeTab === 'violations' ? tabBtnActive : tabBtnInactive}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <span>Violations ({counts.violations || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          aria-pressed={activeTab === 'photos'}
          className={`${tabBtnBase} ${activeTab === 'photos' ? tabBtnActive : tabBtnInactive}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          <span>Photos ({counts.photos || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('citations')}
          aria-pressed={activeTab === 'citations'}
          className={`${tabBtnBase} ${activeTab === 'citations' ? tabBtnActive : tabBtnInactive}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8M16 17H8M10 9H8" />
          </svg>
          <span>Citations ({counts.citations || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('inspections')}
          aria-pressed={activeTab === 'inspections'}
          className={`${tabBtnBase} ${activeTab === 'inspections' ? tabBtnActive : tabBtnInactive}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-3.5-3.5" />
          </svg>
          <span>Inspections ({counts.inspections || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('complaints')}
          aria-pressed={activeTab === 'complaints'}
          className={`${tabBtnBase} ${activeTab === 'complaints' ? tabBtnActive : tabBtnInactive}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
          </svg>
          <span>Complaints ({counts.complaints || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('licenses')}
          aria-pressed={activeTab === 'licenses'}
          className={`${tabBtnBase} ${activeTab === 'licenses' ? tabBtnActive : tabBtnInactive}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8" cy="12" r="2" />
            <path d="M12 12h6M12 16h6" />
          </svg>
          <span>Licenses ({counts.licenses || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('permits')}
          aria-pressed={activeTab === 'permits'}
          className={`${tabBtnBase} ${activeTab === 'permits' ? tabBtnActive : tabBtnInactive}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M9 3h6a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1V5a2 2 0 0 1 2-2z" />
            <path d="M9 5h6" />
            <path d="M9 14l2 2 4-4" />
          </svg>
          <span>Permits ({counts.permits || 0})</span>
        </button>
      </div>

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

          {/* Display existing units as a list of buttons showing Unit {unit.name} */}
          <div className="mb-4">
            {Array.isArray(units) && units.length > 0 ? (
              filteredUnitsForList.length === 0 ? (
                <p className="text-gray-600">No units match your search.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredUnitsForList.map((unit) => (
                    <button
                      key={unit.id}
                      onClick={() => handleUnitSelect(unit.id)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-100"
                    >
                      {`Unit ${unit?.name ?? unit?.number ?? unit.id}`}
                    </button>
                  ))}
                </div>
              )
            ) : (
              <p className="text-gray-600">No units for this address in CodeSoft.</p>
            )}
          </div>
        </div>
      )}

  {/* Tabs moved above into the quick row */}

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
        {activeTab === 'businesses' && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-700 mb-3 flex items-center justify-between">
              <span>Businesses</span>
              <button
                type="button"
                className="ml-4 px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-500"
                onClick={() => setShowAddBusiness((v) => !v)}
                aria-expanded={showAddBusiness}
              >
                {showAddBusiness ? 'Cancel' : 'Add Business'}
              </button>
            </h2>
            {showAddBusiness && (
              <div className="mb-4 p-4 bg-white border rounded shadow">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!id) return;
                    setAddBusinessError(null);
                    setSubmittingBusiness(true);
                    try {
                      const payload = {
                        address_id: Number(id),
                        name: newBusiness.name?.trim() || '',
                        trading_as: newBusiness.trading_as?.trim() || '',
                        phone: newBusiness.phone?.trim() || '',
                        email: newBusiness.email?.trim() || '',
                        website: newBusiness.website?.trim() || '',
                        is_closed: !!newBusiness.is_closed,
                      };
                      const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      });
                      if (!res.ok) throw new Error('Failed to create business');
                      const created = await res.json();
                      setBusinesses((prev) => Array.isArray(prev) ? [created, ...prev] : [created]);
                      setShowAddBusiness(false);
                      setNewBusiness({ name: '', trading_as: '', phone: '', email: '', website: '', is_closed: false });
                    } catch (err) {
                      setAddBusinessError('Could not create business.');
                    } finally {
                      setSubmittingBusiness(false);
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600">Business Name</label>
                    <input
                      type="text"
                      required
                      value={newBusiness.name}
                      onChange={(e) => setNewBusiness((nb) => ({ ...nb, name: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                      placeholder="e.g., ACME LLC"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Trading As</label>
                    <input
                      type="text"
                      value={newBusiness.trading_as}
                      onChange={(e) => setNewBusiness((nb) => ({ ...nb, trading_as: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                      placeholder="DBA / storefront name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Phone</label>
                    <input
                      type="tel"
                      value={newBusiness.phone}
                      onChange={(e) => setNewBusiness((nb) => ({ ...nb, phone: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                      placeholder="(555) 555‑5555"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Email</label>
                    <input
                      type="email"
                      value={newBusiness.email}
                      onChange={(e) => setNewBusiness((nb) => ({ ...nb, email: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                      placeholder="name@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Website</label>
                    <input
                      type="url"
                      value={newBusiness.website}
                      onChange={(e) => setNewBusiness((nb) => ({ ...nb, website: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="biz-is-closed"
                      type="checkbox"
                      checked={newBusiness.is_closed}
                      onChange={(e) => setNewBusiness((nb) => ({ ...nb, is_closed: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="biz-is-closed" className="text-xs font-medium text-gray-600">Closed</label>
                  </div>
                  {addBusinessError && (
                    <div className="sm:col-span-2 text-red-600 text-sm">{addBusinessError}</div>
                  )}
                  <div className="sm:col-span-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddBusiness(false);
                        setAddBusinessError(null);
                      }}
                      className="px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingBusiness || !newBusiness.name.trim()}
                      className="px-3 py-1 rounded-md bg-green-600 text-white text-sm disabled:bg-gray-300"
                    >
                      {submittingBusiness ? 'Saving...' : 'Save Business'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            {businesses.length === 0 ? (
              <p className="text-gray-500">No businesses associated with this address.</p>
            ) : (
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                {businesses.map((b) => (
                  <li key={b.id} className="p-3 flex items-center justify-between">
                    <div>
                      <Link to={`/businesses/${b.id}`} className="font-semibold text-blue-700 hover:underline hover:text-blue-900">
                        {b.name || 'Untitled Business'}
                      </Link>
                      {b.trading_as && (
                        <div className="text-xs text-gray-500">Trading as: {b.trading_as}</div>
                      )}
                      <div className="text-xs text-gray-500">{b.phone || b.email || b.website || ''}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${b.is_closed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {b.is_closed ? 'Closed' : 'Open'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {activeTab === 'photos' && <AddressPhotos addressId={id} />}
        {activeTab === 'citations' && <Citations addressId={id} />}
        {activeTab === 'comments' && (
          <Comments
            key={`comments-${commentsRefreshKey}`}
            addressId={id}
            pageSize={10}
            initialPage={1}
          />
        )}
        {activeTab === 'violations' && <Violations addressId={id} />}
        {activeTab === 'inspections' && <Inspections addressId={id} />}
  {activeTab === 'complaints' && <Complaints addressId={id} />}
  {activeTab === 'licenses' && <AddressLicenses addressId={id} />}
  {activeTab === 'permits' && <AddressPermits addressId={id} />}
      </div>

      {/* Sticky Quick Comment Bar (mobile only) */}
      <div className="fixed inset-x-0 bottom-0 sm:hidden z-40">
        <div className="mx-auto max-w-4xl px-4 py-4 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user?.id) return;
              if (!quickContent.trim() && quickFiles.length === 0) return;
              setSubmittingQuick(true);
              try {
                const formData = new FormData();
                formData.append('content', quickContent.trim() || '');
                formData.append('user_id', String(user.id));
                if (selectedUnitId) formData.append('unit_id', String(selectedUnitId));
                for (const f of quickFiles) formData.append('files', f);
                const res = await fetch(`${process.env.REACT_APP_API_URL}/comments/${id}/address`, {
                  method: 'POST',
                  body: formData,
                });
                if (!res.ok) throw new Error('Failed to post comment');
                setQuickContent('');
                setQuickFiles([]);
                setSelectedUnitId('');
                setCommentsRefreshKey((k) => k + 1);
                setActiveTab('comments');
              } catch (err) {
                console.error(err);
              } finally {
                setSubmittingQuick(false);
              }
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                title="Add photo"
                aria-label="Add photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                  <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  setQuickFiles((prev) => {
                    const merged = [...prev];
                    for (const f of files) {
                      const dup = merged.find(
                        (m) => m.name === f.name && m.size === f.size && m.lastModified === f.lastModified
                      );
                      if (!dup) merged.push(f);
                    }
                    return merged;
                  });
                  e.target.value = null;
                }}
              />
              <input
                type="text"
                placeholder="Add a comment..."
                value={quickContent}
                onChange={(e) => setQuickContent(e.target.value)}
                className="flex-1 h-14 rounded-lg border border-gray-300 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {quickFiles.length > 0 && (
              <div className="flex items-center justify-start gap-3">
                <span className="text-base text-gray-700 whitespace-nowrap px-3 py-2 bg-gray-100 rounded-md">
                  {quickFiles.length} photo{quickFiles.length > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setQuickFiles([])}
                  className="text-sm text-gray-700 hover:text-gray-900 underline"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 flex-wrap">
        {sortedUnitsForSelect && sortedUnitsForSelect.length > 0 && (
                <select
                  aria-label="Attach to unit"
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="h-14 rounded-lg border border-gray-300 bg-white text-gray-800 text-base px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[9rem]"
                >
                  <option value="">No unit</option>
          {sortedUnitsForSelect.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.number ? `Unit ${u.number}` : `Unit ${u.id}`}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="submit"
                disabled={submittingQuick || (!quickContent.trim() && quickFiles.length === 0) || !user?.id}
                className="inline-flex items-center justify-center h-14 px-8 rounded-lg bg-indigo-600 text-white text-lg font-semibold hover:bg-indigo-500 disabled:bg-gray-300 min-w-[10rem]"
              >
                {submittingQuick ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddressDetails;
