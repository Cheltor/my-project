import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogPanel,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/react';
import {
  Bars3Icon,
  CalendarDaysIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  UserCircleIcon,
} from '@heroicons/react/20/solid';
import {
  BellIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  XMarkIcon as XMarkIconOutline,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { formatPhoneNumber } from '../utils';
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
// New Inspection creation forms
import NewBuildingPermit from './Inspection/NewBuildingPermit';
import NewBusinessLicense from './Inspection/NewBusinessLicense';
import NewMFLicense from './Inspection/NewMFLicense';
import NewSFLicense from './Inspection/NewSFLicense';

// Utility function to titlize a string
function titlize(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Addresses', href: '#' },
  { name: 'Businesses', href: '#' },
  { name: 'Permits', href: '#' },
];

const classNames = (...classes) => classes.filter(Boolean).join(' ');

const AddressDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();  // Initialize useNavigate
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityError, setActivityError] = useState(null);
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
  // New Inspection form state (within Inspections tab)
  const [showAddInspectionForm, setShowAddInspectionForm] = useState(false);
  const [inspectionFormType, setInspectionFormType] = useState('building_permit');
  const [inspectionsRefreshKey, setInspectionsRefreshKey] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '' });

  const handleInspectionCreated = (created) => {
    // Close form, ensure Inspections tab is active, refresh list and update count optimistically
    setShowAddInspectionForm(false);
    setActiveTab('inspections');
    setInspectionsRefreshKey((k) => k + 1);
    setCounts((prev) => ({ ...prev, inspections: (prev.inspections || 0) + 1 }));
    setToast({ show: true, message: 'Inspection created successfully.' });
    window.setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };
  
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

  const unitOptions = useMemo(() => {
    const baseOptions = Array.isArray(sortedUnitsForSelect)
      ? sortedUnitsForSelect.map((u) => ({
          id: String(u.id),
          label: u.number ? `Unit ${u.number}` : u.name ? `Unit ${u.name}` : `Unit ${u.id}`,
        }))
      : [];
    return [{ id: '', label: 'No unit attached' }, ...baseOptions];
  }, [sortedUnitsForSelect]);

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

        // Include violation photo count in total photos (graceful fallbacks)
        try {
          let vRes = await fetch(`${base}/addresses/${id}/violations`);
          let vList = [];
          if (vRes.ok) {
            vList = await vRes.json();
          }
          const vPhotoSettled = await Promise.allSettled(
            (Array.isArray(vList) ? vList : []).map((v) =>
              fetch(`${base}/violation/${v.id}/photos`)
                .then((r) => (r.ok ? r.json() : []))
                .catch(() => [])
            )
          );
          const vPhotoCount = vPhotoSettled.reduce((sum, pr) => {
            if (pr.status === 'fulfilled') {
              const arr = pr.value;
              return sum + (Array.isArray(arr) ? arr.length : 0);
            }
            return sum;
          }, 0);
          next.photos = (next.photos || 0) + vPhotoCount;
        } catch {
          // ignore
        }

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

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const loadRecentActivity = async () => {
      try {
        setActivityError(null);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/comments/address/${id}`);
        if (!response.ok) throw new Error('Failed to fetch recent activity');
        const data = await response.json();
        if (cancelled) return;
        const list = Array.isArray(data) ? data.slice(0, 6) : [];
        setRecentActivity(list);
      } catch (err) {
        if (!cancelled) {
          setRecentActivity([]);
          setActivityError(err.message || 'Unable to load recent activity');
        }
      }
    };
    loadRecentActivity();
    return () => {
      cancelled = true;
    };
  }, [id, commentsRefreshKey]);

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

  const formatActivityTimestamp = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears}y ago`;
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  if (!address) return <div className="text-center mt-10">No address details available.</div>;

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

  const totalRecords = Object.values(counts || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const vacancyStatusLabel = address.vacancy_status ? titlize(address.vacancy_status) : 'Unknown';
  const licenseExpirationLabel = (() => {
    if (!mostRecentLicenseStatus) return 'No license on file';
    if (mostRecentLicenseStatus.state === 'expired') {
      return mostRecentLicenseStatus.date
        ? `Expired ${mostRecentLicenseStatus.date.toLocaleDateString()}`
        : 'Expired';
    }
    if (mostRecentLicenseStatus.date) {
      return `Active until ${mostRecentLicenseStatus.date.toLocaleDateString()}`;
    }
    return 'Active';
  })();
  const licenseBadgeClass = mostRecentLicenseStatus?.state === 'expired'
    ? 'bg-red-50 text-red-600 ring-red-500/30'
    : 'bg-emerald-50 text-emerald-600 ring-emerald-500/30';
  const propertyInitial = (address.property_name || address.combadd || '?').trim().charAt(0).toUpperCase() || '?';
  const ownerAddress = address.owneraddress || 'N/A';
  const ownerZip = address.ownerzip || 'N/A';
  const ownerName = address.ownername || 'N/A';
  const vacancyBadgeClass = vacancyStatusLabel === 'Unknown'
    ? 'bg-gray-50 text-gray-600 ring-gray-500/30'
    : 'bg-indigo-50 text-indigo-600 ring-indigo-500/30';
  const selectedUnitLabel = unitOptions.find((option) => option.id === selectedUnitId)?.label || unitOptions[0]?.label || 'No unit attached';
  const userInitial = ((user?.name || user?.email || 'U').trim().charAt(0).toUpperCase()) || 'U';
  const sdatUrl = useMemo(() => {
    const district = (address?.district || '').trim();
    const propertyId = (address?.property_id || '').trim();
    if (!district || !propertyId) return '';
    return `https://sdat.dat.maryland.gov/RealProperty/Pages/viewdetails.aspx?County=17&SearchType=ACCT&District=${encodeURIComponent(district)}&AccountNumber=${encodeURIComponent(propertyId)}`;
  }, [address]);
  const handleOpenMaps = () => {
    const parts = [address.streetnumb, address.streetname, address.ownerstate, address.ownerzip].filter(Boolean).join(' ');
    const query = encodeURIComponent(parts || address.combadd || '');
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener');
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {toast.show && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-white shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast({ show: false, message: '' })}
              className="ml-2 text-white/80 hover:text-white"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <header className="absolute inset-x-0 top-0 z-50 flex h-16 items-center border-b border-gray-900/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex flex-1 items-center gap-x-6">
            <button type="button" onClick={() => setMobileMenuOpen(true)} className="-m-3 p-3 md:hidden">
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="h-5 w-5 text-gray-900" />
            </button>
            <Link to="/" className="flex items-center gap-x-2">
              <img
                alt="Dashboard"
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
                className="h-8 w-auto"
              />
              <span className="sr-only">Dashboard</span>
            </Link>
          </div>
          <nav className="hidden md:flex md:gap-x-10 md:text-sm/6 md:font-semibold md:text-gray-700">
            {navigation.map((item) => (
              <a key={item.name} href={item.href} className="hover:text-gray-900">
                {item.name}
              </a>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-x-6">
            <button type="button" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
              <span className="sr-only">View notifications</span>
              <BellIcon aria-hidden="true" className="h-6 w-6" />
            </button>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white shadow-sm">
              {propertyInitial}
            </span>
          </div>
        </div>
      </header>

      <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="md:hidden">
        <div className="fixed inset-0 z-50" />
        <DialogPanel className="fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-white px-4 pb-6 sm:max-w-sm sm:px-6 sm:ring-1 sm:ring-gray-900/10">
          <div className="-ml-0.5 flex h-16 items-center gap-x-6">
            <button type="button" onClick={() => setMobileMenuOpen(false)} className="-m-2.5 p-2.5 text-gray-700">
              <span className="sr-only">Close menu</span>
              <XMarkIconOutline aria-hidden="true" className="h-6 w-6" />
            </button>
            <Link to="/" className="-m-1.5 block p-1.5">
              <span className="sr-only">Dashboard</span>
              <img
                alt=""
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
                className="h-8 w-auto"
              />
            </Link>
          </div>
          <div className="mt-2 space-y-2">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
              >
                {item.name}
              </a>
            ))}
          </div>
        </DialogPanel>
      </Dialog>

      <main>
        <header className="relative isolate pt-16">
          <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute left-16 top-full -mt-16 transform-gpu opacity-50 blur-3xl xl:left-1/2 xl:-ml-80">
              <div
                style={{
                  clipPath:
                    'polygon(100% 38.5%, 82.6% 100%, 60.2% 37.7%, 52.4% 32.1%, 47.5% 41.8%, 45.2% 65.6%, 27.5% 23.4%, 0.1% 35.3%, 17.9% 0%, 27.7% 23.4%, 76.2% 2.5%, 74.2% 56%, 100% 38.5%)',
                }}
                className="aspect-[1154/678] w-[72.125rem] bg-gradient-to-br from-[#FF80B5] to-[#9089FC]"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gray-900/5" />
          </div>

          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-x-8 lg:mx-0 lg:max-w-none">
              <div className="flex items-center gap-x-6">
                <div className="flex size-16 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white shadow-sm">
                  {propertyInitial}
                </div>
                <h1>
                  {address.property_name && (
                    <div className="text-sm/6 text-gray-500">{address.property_name}</div>
                  )}
                  <div className="mt-1 text-base font-semibold text-gray-900">{address.combadd}</div>
                </h1>
              </div>
              <div className="flex items-center gap-x-4 sm:gap-x-6">
                <button type="button" onClick={handleOpenMaps} className="hidden text-sm/6 font-semibold text-gray-900 sm:block">
                  Open in Maps
                </button>
                {sdatUrl && (
                  <a
                    href={sdatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden text-sm/6 font-semibold text-gray-900 sm:block"
                  >
                    View SDAT
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditing((prev) => !prev)}
                  className="hidden rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:block"
                >
                  {isEditing ? 'Close edit' : 'Edit details'}
                </button>
                <Menu as="div" className="relative sm:hidden">
                  <MenuButton className="relative block">
                    <span className="absolute -inset-3" />
                    <span className="sr-only">More</span>
                    <EllipsisVerticalIcon aria-hidden="true" className="h-5 w-5 text-gray-500" />
                  </MenuButton>
                  <MenuItems
                    transition
                    className="absolute right-0 z-10 mt-0.5 w-40 origin-top-right rounded-md bg-white py-2 shadow-lg outline outline-1 outline-gray-900/5 transition data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                  >
                    <MenuItem>
                      <button
                        type="button"
                        onClick={handleOpenMaps}
                        className="block w-full px-3 py-1 text-left text-sm/6 text-gray-900 data-[focus]:bg-gray-50 data-[focus]:outline-none"
                      >
                        Open in Maps
                      </button>
                    </MenuItem>
                    {sdatUrl && (
                      <MenuItem>
                        <a
                          href={sdatUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-3 py-1 text-sm/6 text-gray-900 data-[focus]:bg-gray-50 data-[focus]:outline-none"
                        >
                          View SDAT
                        </a>
                      </MenuItem>
                    )}
                    <MenuItem>
                      <button
                        type="button"
                        onClick={() => setIsEditing((prev) => !prev)}
                        className="block w-full px-3 py-1 text-left text-sm/6 text-gray-900 data-[focus]:bg-gray-50 data-[focus]:outline-none"
                      >
                        {isEditing ? 'Close edit' : 'Edit details'}
                      </button>
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </div>
            </div>

            <div className="mt-10 grid gap-6 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="font-semibold text-gray-900">Owner</div>
                <div className="mt-1 text-gray-700">{ownerName}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Owner address</div>
                <div className="mt-1 text-gray-700">{ownerAddress}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Owner ZIP</div>
                <div className="mt-1 text-gray-700">{ownerZip}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Records tracked</div>
                <div className="mt-1 text-gray-700">{totalRecords.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <div className="lg:col-start-3 lg:row-end-1">
              <h2 className="sr-only">Summary</h2>
              <div className="rounded-lg bg-white shadow-sm outline outline-1 outline-gray-900/5">
                <dl className="flex flex-wrap">
                  <div className="flex-auto pl-6 pt-6">
                    <dt className="text-sm/6 font-semibold text-gray-900">Records tracked</dt>
                    <dd className="mt-1 text-base font-semibold text-gray-900">{totalRecords.toLocaleString()}</dd>
                  </div>
                  <div className="flex-none self-end px-6 pt-4">
                    <dt className="sr-only">Vacancy status</dt>
                    <dd className={`rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${vacancyBadgeClass}`}>
                      {vacancyStatusLabel}
                    </dd>
                  </div>
                  <div className="mt-6 flex w-full flex-none gap-x-4 border-t border-gray-900/5 px-6 pt-6">
                    <dt className="flex-none">
                      <span className="sr-only">Owner</span>
                      <UserCircleIcon aria-hidden="true" className="h-6 w-5 text-gray-400" />
                    </dt>
                    <dd className="text-sm/6 font-medium text-gray-900">{ownerName}</dd>
                  </div>
                  <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
                    <dt className="flex-none">
                      <span className="sr-only">License status</span>
                      <CheckCircleIcon aria-hidden="true" className="h-6 w-5 text-indigo-500" />
                    </dt>
                    <dd className="text-sm/6 text-gray-500">{licenseExpirationLabel}</dd>
                  </div>
                  <div className="mt-4 flex w-full flex-none gap-x-4 px-6">
                    <dt className="flex-none">
                      <span className="sr-only">Units</span>
                      <BuildingOfficeIcon aria-hidden="true" className="h-6 w-5 text-gray-400" />
                    </dt>
                    <dd className="text-sm/6 text-gray-500">
                      {Array.isArray(units) && units.length > 0 ? `${units.length} unit${units.length === 1 ? '' : 's'}` : 'No units on record'}
                    </dd>
                  </div>
                  <div className="mt-4 flex w-full flex-none gap-x-4 px-6 pb-6">
                    <dt className="flex-none">
                      <span className="sr-only">Location</span>
                      <MapPinIcon aria-hidden="true" className="h-6 w-5 text-gray-400" />
                    </dt>
                    <dd className="text-sm/6 text-gray-500">{address.combadd}</dd>
                  </div>
                </dl>
                <div className="border-t border-gray-900/5 px-6 py-6">
                  {sdatUrl ? (
                    <a
                      href={sdatUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm/6 font-semibold text-gray-900"
                    >
                      Open SDAT record <span aria-hidden="true">→</span>
                    </a>
                  ) : (
                    <button type="button" onClick={handleOpenMaps} className="text-sm/6 font-semibold text-gray-900">
                      Open in Google Maps <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="-mx-4 space-y-10 bg-white px-4 py-8 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2 xl:px-16 xl:pb-20 xl:pt-16">
              <section className="rounded-2xl bg-white/70 p-6 shadow-sm ring-1 ring-gray-900/5 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">Ownership & mailing</h2>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveAddress}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:hidden"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="property-name" className="block text-xs font-medium text-gray-600">
                        Property Name
                      </label>
                      <input
                        id="property-name"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={address.property_name || ''}
                        onChange={(e) => setAddress({ ...address, property_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="aka" className="block text-xs font-medium text-gray-600">
                        AKA
                      </label>
                      <input
                        id="aka"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={address.aka || ''}
                        onChange={(e) => setAddress({ ...address, aka: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="owner-name" className="block text-xs font-medium text-gray-600">
                        Owner Name
                      </label>
                      <input
                        id="owner-name"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={address.ownername || ''}
                        onChange={(e) => setAddress({ ...address, ownername: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="owner-address" className="block text-xs font-medium text-gray-600">
                        Owner Address
                      </label>
                      <input
                        id="owner-address"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={address.owneraddress || ''}
                        onChange={(e) => setAddress({ ...address, owneraddress: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="owner-zip" className="block text-xs font-medium text-gray-600">
                        Owner ZIP Code
                      </label>
                      <input
                        id="owner-zip"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={address.ownerzip || ''}
                        onChange={(e) => setAddress({ ...address, ownerzip: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="vacancy-status" className="block text-xs font-medium text-gray-600">
                        Vacancy Status
                      </label>
                      <select
                        id="vacancy-status"
                        className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                  <dl className="mt-6 grid grid-cols-1 gap-6 text-sm text-gray-700 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Owner</dt>
                      <dd className="mt-1 text-gray-900">{ownerName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Owner ZIP</dt>
                      <dd className="mt-1 text-gray-900">{ownerZip}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Owner Address</dt>
                      <dd className="mt-1 text-gray-900">{ownerAddress}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vacancy Status</dt>
                      <dd className="mt-1 text-gray-900">{vacancyStatusLabel}</dd>
                    </div>
                    {mostRecentLicense && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">License</dt>
                        <dd className="mt-2 text-sm">
                          <Link
                            to={`/license/${mostRecentLicense.id}`}
                            className={`inline-flex items-center gap-2 rounded px-2 py-1 text-xs font-medium ${licenseBadgeClass}`}
                          >
                            <span>{licenseExpirationLabel}</span>
                            {(() => {
                              const t = mostRecentLicense?.license_type;
                              const label = LICENSE_TYPE_LABELS?.[t] || (t != null ? String(t) : '');
                              return label ? <span>• {label}</span> : null;
                            })()}
                            {mostRecentLicense.license_number ? <span>• #{mostRecentLicense.license_number}</span> : null}
                          </Link>
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
                {address.aka && <p className="mt-4 text-xs text-gray-500 italic">AKA: {address.aka}</p>}
              </section>

              <section className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('contacts')}
                  aria-pressed={activeTab === 'contacts'}
                  className={`${tabBtnBase} ${activeTab === 'contacts' ? tabBtnActive : tabBtnInactive}`}
                >
                  Contacts ({counts.contacts || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('businesses')}
                  aria-pressed={activeTab === 'businesses'}
                  className={`${tabBtnBase} ${activeTab === 'businesses' ? tabBtnActive : tabBtnInactive}`}
                >
                  Businesses ({Array.isArray(businesses) ? businesses.length : 0})
                </button>
              </section>

              <nav className="flex flex-wrap gap-2" aria-label="Address sections">
                <button
                  type="button"
                  onClick={() => setActiveTab('units')}
                  aria-pressed={activeTab === 'units'}
                  className={`${tabBtnBase} ${activeTab === 'units' ? tabBtnActive : tabBtnInactive}`}
                >
                  Units ({Array.isArray(units) ? units.length : 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('comments')}
                  aria-pressed={activeTab === 'comments'}
                  className={`${tabBtnBase} ${activeTab === 'comments' ? tabBtnActive : tabBtnInactive}`}
                >
                  Comments ({counts.comments || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('violations')}
                  aria-pressed={activeTab === 'violations'}
                  className={`${tabBtnBase} ${activeTab === 'violations' ? tabBtnActive : tabBtnInactive}`}
                >
                  Violations ({counts.violations || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('photos')}
                  aria-pressed={activeTab === 'photos'}
                  className={`${tabBtnBase} ${activeTab === 'photos' ? tabBtnActive : tabBtnInactive}`}
                >
                  Photos ({counts.photos || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('citations')}
                  aria-pressed={activeTab === 'citations'}
                  className={`${tabBtnBase} ${activeTab === 'citations' ? tabBtnActive : tabBtnInactive}`}
                >
                  Citations ({counts.citations || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('inspections')}
                  aria-pressed={activeTab === 'inspections'}
                  className={`${tabBtnBase} ${activeTab === 'inspections' ? tabBtnActive : tabBtnInactive}`}
                >
                  Inspections ({counts.inspections || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('complaints')}
                  aria-pressed={activeTab === 'complaints'}
                  className={`${tabBtnBase} ${activeTab === 'complaints' ? tabBtnActive : tabBtnInactive}`}
                >
                  Complaints ({counts.complaints || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('licenses')}
                  aria-pressed={activeTab === 'licenses'}
                  className={`${tabBtnBase} ${activeTab === 'licenses' ? tabBtnActive : tabBtnInactive}`}
                >
                  Licenses ({counts.licenses || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('permits')}
                  aria-pressed={activeTab === 'permits'}
                  className={`${tabBtnBase} ${activeTab === 'permits' ? tabBtnActive : tabBtnInactive}`}
                >
                  Permits ({counts.permits || 0})
                </button>
              </nav>

              <div className="space-y-10">
                {activeTab === 'units' && (
                  <div className="space-y-4">
                    {units.length > 5 && (
                      <div className="relative">
                        <label htmlFor="unit-search" className="block text-sm font-medium text-gray-700">
                          Search Units by Number
                        </label>
                        <input
                          type="text"
                          id="unit-search"
                          placeholder="Enter unit number..."
                          value={searchTerm}
                          onChange={handleSearchChange}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        />
                        {showDropdown && (
                          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white shadow-md">
                            <ul>
                              {filteredUnits.map((unit) => (
                                <li
                                  key={unit.id}
                                  onMouseDown={() => handleUnitSelect(unit.id)}
                                  className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100"
                                >
                                  Unit {unit.number}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    <div>
                      <button
                        onClick={() => setShowNewUnitForm(!showNewUnitForm)}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                      >
                        {showNewUnitForm ? 'Cancel' : 'Add New Unit'}
                      </button>
                    </div>
                    {showNewUnitForm && <NewUnit addressId={id} inspectionId={null} />}
                    <div>
                      {Array.isArray(units) && units.length > 0 ? (
                        filteredUnitsForList.length === 0 ? (
                          <p className="text-sm text-gray-600">No units match your search.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {filteredUnitsForList.map((unit) => (
                              <button
                                key={unit.id}
                                onClick={() => handleUnitSelect(unit.id)}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                              >
                                {`Unit ${unit?.name ?? unit?.number ?? unit.id}`}
                              </button>
                            ))}
                          </div>
                        )
                      ) : (
                        <p className="text-sm text-gray-600">No units for this address in CodeSoft.</p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'contacts' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-700">Contacts</h2>
                      <button
                        className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                        onClick={() => setShowAddContact(!showAddContact)}
                      >
                        {showAddContact ? 'Cancel' : 'Add Contact'}
                      </button>
                    </div>
                    {showAddContact && (
                      <div className="space-y-3 rounded-md border border-gray-200 bg-white p-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Find an existing contact</label>
                          <input
                            type="text"
                            value={contactSearch}
                            onChange={(e) => setContactSearch(e.target.value)}
                            placeholder="Search by name, email, or phone"
                            className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                          {contactResults.length > 0 && (
                            <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-2">
                              <ul className="space-y-1">
                                {contactResults.map((c) => (
                                  <li key={c.id} className="flex items-center justify-between text-sm text-gray-700">
                                    <span>
                                      {c.name || 'Unnamed'}
                                      {c.email ? ` • ${c.email}` : ''}
                                    </span>
                                    <button
                                      className="text-indigo-600 hover:text-indigo-500"
                                      onClick={() => handleAddExistingContact(c.id)}
                                    >
                                      Add
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="border-t border-dashed border-gray-300 pt-3">
                          <h3 className="text-sm font-semibold text-gray-700">Or create a new contact</h3>
                          <form className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleCreateAndAddContact}>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-gray-600">Name</label>
                              <input
                                type="text"
                                required
                                value={newContact.name}
                                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600">Email</label>
                              <input
                                type="email"
                                value={newContact.email}
                                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600">Phone</label>
                              <input
                                type="tel"
                                value={newContact.phone}
                                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                              />
                            </div>
                            {addContactError && (
                              <div className="sm:col-span-2 text-sm text-red-600">{addContactError}</div>
                            )}
                            <div className="sm:col-span-2 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddContact(false);
                                  setAddContactError(null);
                                }}
                                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                              >
                                Save Contact
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {contacts.length === 0 ? (
                        <p className="text-sm text-gray-600">No contacts associated with this address.</p>
                      ) : (
                        <ul className="space-y-2">
                          {contacts.map((contact) => (
                            <li key={contact.id} className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3 text-sm">
                              <div>
                                <div className="font-semibold text-gray-800">{contact.name || 'Unnamed contact'}</div>
                                <div className="text-gray-500">
                                  {[contact.email, formatPhoneNumber(contact.phone)].filter((val) => val && val !== 'N/A').join(' • ') || 'No contact info'}
                                </div>
                              </div>
                              <button
                                className="text-sm text-red-600 hover:text-red-500"
                                onClick={() => handleRemoveContact(contact.id)}
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'businesses' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-700">Businesses</h2>
                      <button
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                        onClick={() => setShowAddBusiness((v) => !v)}
                      >
                        {showAddBusiness ? 'Cancel' : 'Add Business'}
                      </button>
                    </div>
                    {showAddBusiness && (
                      <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setAddBusinessError(null);
                            setSubmittingBusiness(true);
                            try {
                              const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ...newBusiness, address_id: id }),
                              });
                              if (!res.ok) throw new Error('Failed');
                              const created = await res.json();
                              setBusinesses((prev) => [...prev, created]);
                              setShowAddBusiness(false);
                              setNewBusiness({ name: '', trading_as: '', phone: '', email: '', website: '', is_closed: false });
                            } catch (err) {
                              setAddBusinessError('Could not create business.');
                            } finally {
                              setSubmittingBusiness(false);
                            }
                          }}
                          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                        >
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-600">Business Name</label>
                            <input
                              type="text"
                              required
                              value={newBusiness.name}
                              onChange={(e) => setNewBusiness((nb) => ({ ...nb, name: e.target.value }))}
                              className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                              placeholder="e.g., ACME LLC"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Trading As</label>
                            <input
                              type="text"
                              value={newBusiness.trading_as}
                              onChange={(e) => setNewBusiness((nb) => ({ ...nb, trading_as: e.target.value }))}
                              className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                              placeholder="DBA / storefront name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Phone</label>
                            <input
                              type="tel"
                              value={newBusiness.phone}
                              onChange={(e) => setNewBusiness((nb) => ({ ...nb, phone: e.target.value }))}
                              className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                              placeholder="(555) 555-5555"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Email</label>
                            <input
                              type="email"
                              value={newBusiness.email}
                              onChange={(e) => setNewBusiness((nb) => ({ ...nb, email: e.target.value }))}
                              className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                              placeholder="name@example.com"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Website</label>
                            <input
                              type="url"
                              value={newBusiness.website}
                              onChange={(e) => setNewBusiness((nb) => ({ ...nb, website: e.target.value }))}
                              className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                              placeholder="https://..."
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              id="biz-is-closed"
                              type="checkbox"
                              checked={newBusiness.is_closed}
                              onChange={(e) => setNewBusiness((nb) => ({ ...nb, is_closed: e.target.checked }))}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="biz-is-closed" className="text-xs font-medium text-gray-600">
                              Closed
                            </label>
                          </div>
                          {addBusinessError && (
                            <div className="sm:col-span-2 text-sm text-red-600">{addBusinessError}</div>
                          )}
                          <div className="sm:col-span-2 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddBusiness(false);
                                setAddBusinessError(null);
                              }}
                              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={submittingBusiness || !newBusiness.name.trim()}
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              {submittingBusiness ? 'Saving...' : 'Save Business'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                    {businesses.length === 0 ? (
                      <p className="text-sm text-gray-600">No businesses associated with this address.</p>
                    ) : (
                      <ul className="divide-y divide-gray-200 overflow-hidden rounded-md border border-gray-200">
                        {businesses.map((b) => {
                          const formattedPhone = b.phone ? formatPhoneNumber(b.phone) : '';
                          const phoneLabel = formattedPhone !== 'N/A' ? formattedPhone : '';
                          const contactInfo = phoneLabel || b.email || b.website || '';
                          return (
                            <li key={b.id} className="flex items-center justify-between bg-white p-3 text-sm">
                              <div>
                                <Link to={`/business/${b.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                                  {b.name || 'Untitled Business'}
                                </Link>
                                {b.trading_as && <div className="text-xs text-gray-500">Trading as: {b.trading_as}</div>}
                                <div className="text-xs text-gray-500">{contactInfo || 'No contact info'}</div>
                              </div>
                              <span className={`rounded px-2 py-1 text-xs font-medium ${b.is_closed ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {b.is_closed ? 'Closed' : 'Open'}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {activeTab === 'photos' && <AddressPhotos addressId={id} />}
                {activeTab === 'citations' && <Citations addressId={id} />}
                {activeTab === 'comments' && (
                  <div id="address-comments-section">
                    <Comments
                      key={`comments-${commentsRefreshKey}`}
                      addressId={id}
                      pageSize={10}
                      initialPage={1}
                    />
                  </div>
                )}
                {activeTab === 'violations' && <Violations addressId={id} />}
                {activeTab === 'inspections' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-700">Inspections</h2>
                      <button
                        type="button"
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                        onClick={() => setShowAddInspectionForm((v) => !v)}
                        aria-expanded={showAddInspectionForm}
                      >
                        {showAddInspectionForm ? 'Cancel' : 'Add Inspection'}
                      </button>
                    </div>

                    {showAddInspectionForm && (
                      <div className="space-y-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600">Inspection type</label>
                            <select
                              value={inspectionFormType}
                              onChange={(e) => setInspectionFormType(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                              <option value="building_permit">Building/Dumpster/POD Permit</option>
                              <option value="business_license">Business License</option>
                              <option value="single_family_license">Single Family License</option>
                              <option value="multifamily_license">Multifamily License</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          {inspectionFormType === 'building_permit' && (
                            <NewBuildingPermit
                              defaultAddressId={Number(id)}
                              defaultAddressLabel={address?.combadd || ''}
                              onCreated={handleInspectionCreated}
                            />
                          )}
                          {inspectionFormType === 'business_license' && (
                            <NewBusinessLicense
                              defaultAddressId={Number(id)}
                              defaultAddressLabel={address?.combadd || ''}
                              onCreated={handleInspectionCreated}
                            />
                          )}
                          {inspectionFormType === 'single_family_license' && (
                            <NewSFLicense
                              defaultAddressId={Number(id)}
                              defaultAddressLabel={address?.combadd || ''}
                              onCreated={handleInspectionCreated}
                            />
                          )}
                          {inspectionFormType === 'multifamily_license' && (
                            <NewMFLicense
                              defaultAddressId={Number(id)}
                              defaultAddressLabel={address?.combadd || ''}
                              onCreated={handleInspectionCreated}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    <Inspections key={`inspections-${inspectionsRefreshKey}`} addressId={id} />
                  </div>
                )}
                {activeTab === 'complaints' && <Complaints addressId={id} />}
                {activeTab === 'licenses' && <AddressLicenses addressId={id} />}
                {activeTab === 'permits' && <AddressPermits addressId={id} />}
              </div>
            </div>

            <div className="lg:col-start-3">
              <h2 className="text-sm/6 font-semibold text-gray-900">Recent activity</h2>
              <ul role="list" className="mt-6 space-y-6">
                {recentActivity.length === 0 ? (
                  <li className="text-sm text-gray-500">No recent activity yet.</li>
                ) : (
                  recentActivity.map((activityItem, idx) => (
                    <li key={activityItem.id || idx} className="relative flex gap-x-4">
                      <div
                        className={classNames(
                          idx === recentActivity.length - 1 ? 'h-6' : '-bottom-6',
                          'absolute left-0 top-0 flex w-6 justify-center',
                        )}
                      >
                        <div className="w-px bg-gray-200" />
                      </div>
                      <div className="relative mt-3 flex size-6 flex-none items-center justify-center bg-white">
                        <div className="size-1.5 rounded-full bg-indigo-500 ring-2 ring-white" />
                      </div>
                      <div className="flex-auto rounded-md bg-white p-3 ring-1 ring-inset ring-gray-200">
                        <div className="flex justify-between gap-x-4">
                          <p className="text-sm font-medium text-gray-900">
                            {activityItem.user?.name || activityItem.user?.email || 'Unknown user'}
                          </p>
                          <time dateTime={activityItem.created_at} className="flex-none text-xs text-gray-500">
                            {formatActivityTimestamp(activityItem.created_at)}
                          </time>
                        </div>
                        {activityItem.unit && (
                          <p className="mt-1 text-xs text-gray-500">
                            Unit {activityItem.unit.number || activityItem.unit.name}
                          </p>
                        )}
                        <p className="mt-2 text-sm text-gray-600">
                          {activityItem.content || 'Comment recorded.'}
                        </p>
                      </div>
                    </li>
                  ))
                )}
              </ul>

              <div className="mt-6 flex gap-x-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white shadow-sm">
                  {userInitial}
                </span>
                <form
                  action="#"
                  className="relative flex-auto"
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
                >
                  <div className="overflow-hidden rounded-lg pb-14 outline outline-1 -outline-offset-1 outline-gray-300 focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600">
                    <Label htmlFor="quick-comment" className="sr-only">
                      Add your comment
                    </Label>
                    <textarea
                      id="quick-comment"
                      name="quick-comment"
                      rows={3}
                      placeholder="Add your comment..."
                      className="block w-full resize-none bg-transparent px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                      value={quickContent}
                      onChange={(e) => setQuickContent(e.target.value)}
                    />
                    {quickFiles.length > 0 && (
                      <div className="flex items-center justify-between px-3 pb-2 text-xs text-gray-500">
                        <span>
                          {quickFiles.length} attachment{quickFiles.length === 1 ? '' : 's'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuickFiles([])}
                          className="font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between py-2 pl-3 pr-2">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="-m-2.5 flex size-10 items-center justify-center rounded-full text-gray-400 hover:text-gray-500"
                        >
                          <PaperClipIcon aria-hidden="true" className="h-5 w-5" />
                          <span className="sr-only">Attach a file</span>
                        </button>
                      </div>
                      <div className="flex items-center">
                        <Listbox value={selectedUnitId} onChange={setSelectedUnitId}>
                          <Label className="sr-only">Attach to unit</Label>
                          <div className="relative">
                            <ListboxButton className="relative flex items-center gap-x-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50">
                              <BuildingOfficeIcon aria-hidden="true" className="h-5 w-5 text-gray-400" />
                              <span className="whitespace-nowrap">{selectedUnitLabel}</span>
                            </ListboxButton>
                            <ListboxOptions
                              transition
                              className="absolute bottom-12 z-10 w-60 origin-bottom-left rounded-lg bg-white py-2 text-sm shadow-lg outline outline-1 outline-gray-900/5 data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in"
                            >
                              {unitOptions.map((option) => (
                                <ListboxOption
                                  key={option.id || 'none'}
                                  value={option.id}
                                  className="relative cursor-pointer select-none px-3 py-2 text-gray-900 data-[focus]:bg-gray-100"
                                >
                                  {option.label}
                                </ListboxOption>
                              ))}
                            </ListboxOptions>
                          </div>
                        </Listbox>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={submittingQuick || (!quickContent.trim() && quickFiles.length === 0) || !user?.id}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {submittingQuick ? 'Posting…' : 'Comment'}
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      setQuickFiles((prev) => {
                        const merged = [...prev];
                        for (const f of files) {
                          const duplicate = merged.find(
                            (m) => m.name === f.name && m.size === f.size && m.lastModified === f.lastModified,
                          );
                          if (!duplicate) merged.push(f);
                        }
                        return merged;
                      });
                      e.target.value = null;
                    }}
                  />
                </form>
              </div>
              {activityError && <p className="mt-4 text-xs text-red-500">{activityError}</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddressDetails;
