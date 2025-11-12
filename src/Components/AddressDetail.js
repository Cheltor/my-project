import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { formatPhoneNumber, toEasternLocaleDateString, toEasternLocaleString } from '../utils';
import useContactLinking from '../Hooks/useContactLinking';
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
import ContactLinkModal from './Contact/ContactLinkModal';

const TAB_META = {
  contacts: {
    label: 'Contacts',
    description: 'Owners, residents, and other points of contact.',
    group: 'people',
    badgeLabel: 'contact',
  },
  businesses: {
    label: 'Businesses',
    description: 'Businesses registered at this location.',
    group: 'people',
    badgeLabel: 'business',
  },
  units: {
    label: 'Units',
    description: 'Dwelling or commercial units tied to the address.',
    group: 'property',
    badgeLabel: 'unit',
  },
  photos: {
    label: 'Photos',
    description: 'Photo documentation from staff and inspections.',
    group: 'property',
    badgeLabel: 'photo',
  },
  comments: {
    label: 'Comments',
    description: 'Internal notes and communication history.',
    group: 'activity',
    badgeLabel: 'comment',
  },
  inspections: {
    label: 'Inspections',
    description: 'Scheduled and completed inspections.',
    group: 'activity',
    badgeLabel: 'inspection',
  },
  complaints: {
    label: 'Complaints',
    description: 'Resident and 311 complaint submissions.',
    group: 'activity',
    badgeLabel: 'complaint',
  },
  violations: {
    label: 'Violations',
    description: 'Open and resolved code violations.',
    group: 'compliance',
    badgeLabel: 'violation',
  },
  citations: {
    label: 'Citations',
    description: 'Citations and penalties issued for this address.',
    group: 'compliance',
    badgeLabel: 'citation',
  },
  licenses: {
    label: 'Licenses',
    description: 'Housing and business licenses associated here.',
    group: 'compliance',
    badgeLabel: 'license',
  },
  permits: {
    label: 'Permits',
    description: 'Permit history and active applications.',
    group: 'compliance',
    badgeLabel: 'permit',
  },
};

const TAB_GROUPS = [
  {
    id: 'activity',
    title: 'Activity Feed',
    description: 'Follow day-to-day updates for this address.',
  },
  {
    id: 'people',
    title: 'People & Businesses',
    description: 'Stay on top of who is connected to this property.',
  },
  {
    id: 'property',
    title: 'Property Snapshot',
    description: 'See how the property is configured and documented.',
  },
  {
    id: 'compliance',
    title: 'Compliance & Records',
    description: 'Review compliance history and required approvals.',
  },
];

const sanitizeBusinessPhoneDigits = (value) => String(value || '').replace(/\D/g, '');

const RELATIVE_TIME_DIVISIONS = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Infinity, unit: 'year' },
];

const formatRelativeTimeFromNow = (input) => {
  const target = input instanceof Date ? input : new Date(input);
  if (!target || Number.isNaN(target.getTime())) return '';
  let duration = (target.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const division of RELATIVE_TIME_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return '';
};

const formatRecentDescriptor = (input) => {
  const target = input instanceof Date ? input : new Date(input);
  if (!target || Number.isNaN(target.getTime())) return '';
  const diffMs = Math.abs(Date.now() - target.getTime());
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (diffMs <= thirtyDays) {
    const relative = formatRelativeTimeFromNow(target);
    if (relative) return relative;
  }
  return toEasternLocaleString(target, 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getLatestTimestamp = (list, fields) => {
  if (!Array.isArray(list) || list.length === 0) return null;
  let latest = -Infinity;
  list.forEach((item) => {
    fields.forEach((field) => {
      const value = item?.[field];
      if (!value) return;
      const ms = new Date(value).getTime();
      if (!Number.isNaN(ms) && ms > latest) {
        latest = ms;
      }
    });
  });
  return Number.isFinite(latest) ? new Date(latest) : null;
};

const inspectionStatusIsPending = (status) => {
  const value = (status || '').toString().trim().toLowerCase();
  if (!value) return true;
  const closedKeywords = ['satisfactory', 'unsatisfactory', 'completed', 'complete', 'closed', 'cancelled', 'canceled', 'failed', 'passed'];
  if (closedKeywords.some((keyword) => value.includes(keyword))) return false;
  const pendingKeywords = ['pending', 'scheduled', 'open', 'in progress', 'in-progress', 'awaiting', 'requested', 'draft'];
  return pendingKeywords.some((keyword) => value.includes(keyword));
};

const normalizeComplaintStatus = (status) => {
  if (!status) return 'Pending';
  const value = status.toString().toLowerCase();
  if (value === 'unsatisfactory' || value === 'violation found' || value === 'violation') return 'Violation Found';
  if (value === 'satisfactory' || value === 'no violation found' || value === 'no violation') return 'No Violation Found';
  if (value === 'pending' || value === 'unknown') return 'Pending';
  return status;
};

const violationIsCurrent = (violation) => {
  if (!violation) return false;
  const candidates = [violation.status, violation.status_id, violation.status_code];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    const numeric = Number(candidate);
    if (!Number.isNaN(numeric)) {
      return numeric === 0;
    }
    const label = String(candidate).trim().toLowerCase();
    if (!label) continue;
    if (label === 'current') return true;
    if (label === 'resolved' || label === 'closed' || label === 'dismissed') return false;
  }
  return false;
};

const citationIsUnpaid = (citation) => {
  if (!citation) return false;
  const candidates = [
    citation.status,
    citation.status_id,
    citation.status_code,
    citation.statusValue,
    citation.status_label,
    citation.status_name,
    citation.statusText,
  ];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    const numeric = Number(candidate);
    if (!Number.isNaN(numeric)) {
      if (numeric === 0) return true;
      if (numeric === 1 || numeric === 3) return false;
      continue;
    }
    const label = String(candidate).trim().toLowerCase();
    if (!label) continue;
    if (label === 'unpaid') return true;
    if (label === 'paid' || label === 'dismissed') return false;
  }
  return false;
};

// Utility function to titlize a string
function titlize(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

const BUSINESS_MATCH_REASON_LABELS = {
  name: 'name',
  trading: 'trading name',
  email: 'email',
  phone: 'phone',
  website: 'website',
};

const formatBusinessMatchReasons = (reasons = []) => {
  if (!Array.isArray(reasons) || reasons.length === 0) return '';
  const labels = reasons
    .map((reason) => BUSINESS_MATCH_REASON_LABELS[reason] || reason)
    .filter(Boolean);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  const head = labels.slice(0, -1).join(', ');
  return `${head}, and ${labels[labels.length - 1]}`;
};

const deriveBusinessMatchReasons = (business, {
  nameTerm = '',
  tradingTerm = '',
  emailTerm = '',
  phoneDigitsTerm = '',
  websiteTerm = '',
} = {}) => {
  const reasons = new Set(Array.isArray(business?.matchReasons) ? business.matchReasons : []);
  const normalized = (value) => (value || '').toLowerCase();
  const nameValue = normalized(business?.name);
  const tradingValue = normalized(business?.trading_as);
  const emailValue = normalized(business?.email);
  const websiteValue = normalized(business?.website);
  const phoneDigitsValue = sanitizeBusinessPhoneDigits(business?.phone);

  if (nameTerm) {
    const term = nameTerm.toLowerCase();
    if (nameValue && nameValue.includes(term)) reasons.add('name');
  }

  if (tradingTerm) {
    const term = tradingTerm.toLowerCase();
    if (tradingValue && tradingValue.includes(term)) reasons.add('trading');
  }

  if (emailTerm) {
    const term = emailTerm.toLowerCase();
    if (emailValue && emailValue.includes(term)) reasons.add('email');
  }

  if (websiteTerm) {
    const term = websiteTerm.toLowerCase();
    if (websiteValue && websiteValue.includes(term)) reasons.add('website');
  }

  if (phoneDigitsTerm) {
    if (phoneDigitsValue && phoneDigitsValue.includes(phoneDigitsTerm)) reasons.add('phone');
  }

  return {
    ...business,
    matchReasons: Array.from(reasons),
  };
};

const fetchSimilarBusinesses = async ({ name, tradingAs, email, phoneDigits, website, signal }) => {
  const searchConfigs = [];
  if (name) searchConfigs.push({ value: name, type: 'name' });
  if (tradingAs) searchConfigs.push({ value: tradingAs, type: 'trading' });
  if (email) searchConfigs.push({ value: email, type: 'email' });
  if (phoneDigits) searchConfigs.push({ value: phoneDigits, type: 'phone' });
  if (website) searchConfigs.push({ value: website, type: 'website' });

  const seenValues = new Set();
  const queries = [];

  searchConfigs.forEach((config) => {
    const normalizedValue = config.value.toLowerCase();
    if (seenValues.has(normalizedValue)) return;
    seenValues.add(normalizedValue);

    const url = `${process.env.REACT_APP_API_URL}/businesses/search?query=${encodeURIComponent(config.value)}&limit=5`;
    queries.push(
      (async () => {
        try {
          const res = await fetch(url, { signal });
          if (!res.ok) {
            return { items: [], type: config.type };
          }
          const payload = await res.json();
          const items = Array.isArray(payload) ? payload : [];
          return { items, type: config.type };
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('Error searching for similar businesses:', err);
          }
          return { items: [], type: config.type };
        }
      })()
    );
  });

  if (queries.length === 0) return [];

  const responses = await Promise.all(queries);
  const matchesMap = new Map();

  const scoreWeights = {
    email: 4,
    phone: 3,
    name: 2,
    trading: 2,
    website: 1,
  };

  responses.forEach(({ items, type }) => {
    items.forEach((business) => {
      if (!business || !business.id) return;
      const entry = matchesMap.get(business.id) || {
        business,
        score: 0,
        reasons: new Set(),
      };
      entry.reasons.add(type);
      entry.score += scoreWeights[type] || 1;
      matchesMap.set(business.id, entry);
    });
  });

  return Array.from(matchesMap.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({
      ...entry.business,
      matchReasons: Array.from(entry.reasons),
    }))
    .slice(0, 6);
};

const AddressDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();  // Initialize useNavigate
  const { user } = useAuth();
  const [address, setAddress] = useState(null);
  const [units, setUnits] = useState([]);  // State to store units
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
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
  const [tabHighlights, setTabHighlights] = useState({});
  // Quick comment (mobile) state
  const [quickContent, setQuickContent] = useState('');
  const [quickFiles, setQuickFiles] = useState([]);
  const [submittingQuick, setSubmittingQuick] = useState(false);
  const fileInputRef = useRef(null);
  const [commentsRefreshKey, setCommentsRefreshKey] = useState(0);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [modalTab, setModalTab] = useState(null);
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
  } = useContactLinking('addresses', id);
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
  const [removeBusinessError, setRemoveBusinessError] = useState(null);
  const [removingBusinessId, setRemovingBusinessId] = useState(null);
  const [potentialBusinessMatches, setPotentialBusinessMatches] = useState([]);
  const [isCheckingBusinessMatches, setIsCheckingBusinessMatches] = useState(false);
  const [businessDuplicateSummary, setBusinessDuplicateSummary] = useState('');
  const [addingSuggestedBusinessId, setAddingSuggestedBusinessId] = useState(null);
  const businessDuplicateRequestRef = useRef(0);
  const closeContactModal = useCallback(() => {
    setShowAddContact(false);
    resetContactLinkState();
  }, [resetContactLinkState]);
  const { searchTerm, showDropdown, filteredUnits, handleSearchChange } = useUnitSearch(id);
  const [showNewUnitForm, setShowNewUnitForm] = useState(false);  // State to toggle NewUnit form
  const [isEditing, setIsEditing] = useState(false); // State to toggle edit mode
  // New Inspection form state (within Inspections tab)
  const [showAddInspectionForm, setShowAddInspectionForm] = useState(false);
  const [inspectionFormType, setInspectionFormType] = useState('building_permit');
  const [inspectionsRefreshKey, setInspectionsRefreshKey] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });
  const [isSyncingOwner, setIsSyncingOwner] = useState(false);

  const handleInspectionCreated = (created) => {
    // Close form, ensure Inspections tab is active, refresh list and update count optimistically
    setShowAddInspectionForm(false);
    setActiveTab('inspections');
    setModalTab('inspections');
    setInspectionsRefreshKey((k) => k + 1);
    setCounts((prev) => ({ ...prev, inspections: (prev.inspections || 0) + 1 }));
    setToast({ show: true, message: 'Inspection created successfully.', variant: 'success' });
    window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  };
  
  const handleAddSuggestedBusiness = async (businessMatch) => {
    if (!businessMatch || !businessMatch.id || !id) return;

    const addressId = Number(id);
    if (!Number.isFinite(addressId)) {
      setAddBusinessError('Invalid address identifier.');
      return;
    }

    if (Array.isArray(businesses) && businesses.some((biz) => biz.id === businessMatch.id)) {
      setAddBusinessError('This business is already linked to the address.');
      return;
    }

    const payload = {
      address_id: addressId,
      name: (businessMatch.name || '').trim(),
      trading_as: (businessMatch.trading_as || businessMatch.trade_name || '').trim(),
      phone: businessMatch.phone || '',
      email: businessMatch.email || '',
      website: businessMatch.website || '',
      is_closed: Boolean(businessMatch.is_closed),
    };

    if (!payload.name) {
      setAddBusinessError('Suggested business is missing a name.');
      return;
    }

    setAddBusinessError(null);
    setAddingSuggestedBusinessId(businessMatch.id);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/businesses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.detail || 'Could not add business.';
        throw new Error(message);
      }
      if (!data) {
        throw new Error('Unexpected response while adding business.');
      }
      const createdBusiness = data;
      setBusinesses((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        return [createdBusiness, ...list];
      });
      setPotentialBusinessMatches((prev) => prev.filter((candidate) => candidate.id !== businessMatch.id));
      setNewBusiness({ name: '', trading_as: '', phone: '', email: '', website: '', is_closed: false });
      setToast({ show: true, message: `Added ${createdBusiness?.name || 'business'} to this address.`, variant: 'success' });
      window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    } catch (err) {
      setAddBusinessError(err.message || 'Could not add business.');
    } finally {
      setAddingSuggestedBusinessId(null);
    }
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

  const canSyncOwner = useMemo(() => {
    const account = String(address?.property_id || address?.pid || '').trim();
    const districtVal = String(address?.district || '').trim();
    return Boolean(account && districtVal);
  }, [address]);

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

  useEffect(() => {
    if (!showAddBusiness) {
      businessDuplicateRequestRef.current += 1;
      setPotentialBusinessMatches([]);
      setIsCheckingBusinessMatches(false);
      setBusinessDuplicateSummary('');
      return;
    }

    const name = (newBusiness.name || '').trim();
    const trading = (newBusiness.trading_as || '').trim();
    const email = (newBusiness.email || '').trim();
    const phoneRaw = (newBusiness.phone || '').trim();
    const website = (newBusiness.website || '').trim();
    const phoneDigits = sanitizeBusinessPhoneDigits(phoneRaw);

    const shouldSearchName = name.length >= 3;
    const shouldSearchTrading = trading.length >= 3;
    const shouldSearchEmail = email.length >= 3;
    const shouldSearchPhone = phoneDigits.length >= 4;
    const shouldSearchWebsite = website.length >= 5;

    if (!shouldSearchName && !shouldSearchTrading && !shouldSearchEmail && !shouldSearchPhone && !shouldSearchWebsite) {
      businessDuplicateRequestRef.current += 1;
      setPotentialBusinessMatches([]);
      setIsCheckingBusinessMatches(false);
      setBusinessDuplicateSummary('');
      return;
    }

  const requestId = ++businessDuplicateRequestRef.current;
    const controller = new AbortController();

    const summaryPieces = [];
    if (shouldSearchName) summaryPieces.push(name);
    if (shouldSearchTrading) summaryPieces.push(trading);
    if (shouldSearchEmail) summaryPieces.push(email);
    if (shouldSearchPhone) summaryPieces.push(phoneRaw);
    if (!summaryPieces.length && shouldSearchWebsite) summaryPieces.push(website);
    setBusinessDuplicateSummary(summaryPieces.join(', '));
    setIsCheckingBusinessMatches(true);

    const timeoutId = setTimeout(async () => {
      try {
        const matches = await fetchSimilarBusinesses({
          name: shouldSearchName ? name : '',
          tradingAs: shouldSearchTrading ? trading : '',
          email: shouldSearchEmail ? email : '',
          phoneDigits: shouldSearchPhone ? phoneDigits : '',
          website: shouldSearchWebsite ? website : '',
          signal: controller.signal,
        });
        if (businessDuplicateRequestRef.current === requestId) {
          const existingIds = new Set((Array.isArray(businesses) ? businesses : []).map((biz) => biz.id));
          const augmented = matches
            .filter((business) => !existingIds.has(business.id))
            .map((business) =>
              deriveBusinessMatchReasons(business, {
                nameTerm: shouldSearchName ? name : '',
                tradingTerm: shouldSearchTrading ? trading : '',
                emailTerm: shouldSearchEmail ? email : '',
                phoneDigitsTerm: shouldSearchPhone ? phoneDigits : '',
                websiteTerm: shouldSearchWebsite ? website : '',
              })
            );
          setPotentialBusinessMatches(augmented);
          setIsCheckingBusinessMatches(false);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error checking for similar businesses:', err);
        }
        if (businessDuplicateRequestRef.current === requestId) {
          setIsCheckingBusinessMatches(false);
        }
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [businesses, newBusiness.name, newBusiness.trading_as, newBusiness.email, newBusiness.phone, newBusiness.website, showAddBusiness]);

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
      const base = process.env.REACT_APP_API_URL;
      const endpoints = {
        comments: `/addresses/${id}/comments`,
        violations: `/addresses/${id}/violations`,
        inspections: `/addresses/${id}/inspections`,
        complaints: `/complaints/address/${id}`,
        citations: `/citations/address/${id}`,
        photos: `/addresses/${id}/photos`,
      };

      try {
        const entries = Object.entries(endpoints);
        const results = await Promise.allSettled(
          entries.map(([key, path]) =>
            fetch(`${base}${path}`)
              .then((r) => (r.ok ? r.json() : []))
              .then((data) => ({ key, data: Array.isArray(data) ? data : [] }))
              .catch(() => ({ key, data: [] }))
          )
        );

        const nextCounts = {};
        const nextHighlights = { comments: '', inspections: '', complaints: '', violations: '', citations: '' };
        let violationList = [];

        results.forEach((res) => {
          if (res.status !== 'fulfilled') return;
          const { key, data } = res.value;
          const list = Array.isArray(data) ? data : [];
          nextCounts[key] = list.length;
          if (key === 'violations') {
            violationList = list;
          }

          if (key === 'comments') {
            if (list.length === 0) {
              nextHighlights.comments = 'No comments yet';
            } else {
              const latest = getLatestTimestamp(list, ['created_at', 'updated_at']);
              nextHighlights.comments = latest
                ? `Most recent · ${formatRecentDescriptor(latest)}`
                : 'Latest timing unavailable';
            }
          }

          if (key === 'inspections') {
            if (list.length === 0) {
              nextHighlights.inspections = 'No inspections yet';
            } else {
              const pendingCount = list.filter((item) => inspectionStatusIsPending(item?.status)).length;
              nextHighlights.inspections = pendingCount > 0
                ? (pendingCount === 1 ? '1 pending inspection' : `${pendingCount} pending inspections`)
                : 'No pending inspections';
            }
          }

          if (key === 'complaints') {
            if (list.length === 0) {
              nextHighlights.complaints = 'No complaints yet';
            } else {
              const pendingCount = list.filter((item) => normalizeComplaintStatus(item?.status) === 'Pending').length;
              nextHighlights.complaints = pendingCount > 0
                ? (pendingCount === 1 ? '1 pending complaint' : `${pendingCount} pending complaints`)
                : 'No pending complaints';
            }
          }

          if (key === 'violations') {
            if (list.length === 0) {
              nextHighlights.violations = 'No violations yet';
            } else {
              const currentCount = list.filter(violationIsCurrent).length;
              nextHighlights.violations = currentCount > 0
                ? (currentCount === 1 ? '1 open violation' : `${currentCount} open violations`)
                : 'No open violations';
            }
          }

          if (key === 'citations') {
            if (list.length === 0) {
              nextHighlights.citations = 'No citations yet';
            } else {
              const unpaidCount = list.filter(citationIsUnpaid).length;
              nextHighlights.citations = unpaidCount > 0
                ? (unpaidCount === 1 ? '1 unpaid citation' : `${unpaidCount} unpaid citations`)
                : 'No unpaid citations';
            }
          }
        });

        try {
          let vList = Array.isArray(violationList) ? violationList : [];
          if (vList.length === 0 && (nextCounts.violations || 0) > 0) {
            const vRes = await fetch(`${base}/addresses/${id}/violations`);
            if (vRes.ok) {
              const fetched = await vRes.json();
              vList = Array.isArray(fetched) ? fetched : [];
            }
          }
          const vPhotoSettled = await Promise.allSettled(
            vList.map((v) =>
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
          nextCounts.photos = (nextCounts.photos || 0) + vPhotoCount;
        } catch {
          // ignore photo aggregation fallbacks
        }

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
        nextCounts.permits = permitsLen;

        if (!cancelled) {
          setCounts((prev) => ({ ...prev, ...nextCounts }));
          setTabHighlights((prev) => ({ ...prev, ...nextHighlights }));
        }
      } catch {
        if (!cancelled) {
          setTabHighlights((prev) => ({
            ...prev,
            comments: '',
            inspections: '',
            complaints: '',
            violations: '',
            citations: '',
          }));
        }
      }
    };
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (!modalTab) {
      document.body.style.overflow = '';
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setModalTab(null);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [modalTab]);

  const mostRecentHousingLicense = useMemo(() => {
    if (!Array.isArray(addrLicenses) || addrLicenses.length === 0) return null;
    const housingTypes = new Set([2, 3]);
    const getTime = (license) => {
      if (license?.created_at) {
        const t = new Date(license.created_at).getTime();
        if (!Number.isNaN(t)) return t;
      }
      if (license?.date_issued) {
        const t = new Date(license.date_issued).getTime();
        if (!Number.isNaN(t)) return t;
      }
      if (license?.expiration_date) {
        const t = new Date(license.expiration_date).getTime();
        if (!Number.isNaN(t)) return t;
      }
      return 0;
    };
    const eligible = addrLicenses.filter((license) => {
      const typeValue = Number(license?.license_type);
      return !Number.isNaN(typeValue) && housingTypes.has(typeValue);
    });
    if (eligible.length === 0) return null;
    const arr = [...eligible];
    arr.sort((a, b) => getTime(b) - getTime(a));
    return arr[0];
  }, [addrLicenses]);

  const mostRecentHousingLicenseStatus = useMemo(() => {
    if (!mostRecentHousingLicense) return null;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const exp = mostRecentHousingLicense?.expiration_date ? new Date(mostRecentHousingLicense.expiration_date) : null;
    if (exp && exp.getTime() < startOfToday.getTime()) return { state: 'expired', date: exp };
    if (exp) return { state: 'active', date: exp };
    return { state: 'active', date: null }; // treat missing expiration as active/no-exp
  }, [mostRecentHousingLicense]);

  const handleUnitSelect = (unitId) => {
    navigate(`/address/${id}/unit/${unitId}`);
    setModalTab(null);
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

  const handleRefreshOwner = async () => {
    if (!canSyncOwner) {
      setToast({ show: true, message: 'SDAT sync needs both a district and account number.', variant: 'error' });
      window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
      return;
    }
    setIsSyncingOwner(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${id}/refresh-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to refresh owner information.');
      }
      if (data?.address) {
        setAddress(data.address);
      }
      const updatedFields = Array.isArray(data?.updated_fields) ? data.updated_fields : [];
      const msg = updatedFields.length
        ? `Updated ${updatedFields.join(', ')} from SDAT.`
        : 'SDAT owner information already matches this record.';
      setToast({ show: true, message: msg, variant: 'success' });
      window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3500);
    } catch (err) {
      setToast({ show: true, message: err.message || 'Unable to refresh owner information.', variant: 'error' });
      window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4500);
    } finally {
      setIsSyncingOwner(false);
    }
  };

  const tabCounts = useMemo(() => ({
    contacts: counts?.contacts || 0,
    businesses: Array.isArray(businesses) ? businesses.length : 0,
    units: Array.isArray(units) ? units.length : 0,
    photos: counts?.photos || 0,
    comments: counts?.comments || 0,
    inspections: counts?.inspections || 0,
    complaints: counts?.complaints || 0,
    violations: counts?.violations || 0,
    citations: counts?.citations || 0,
    licenses: counts?.licenses || 0,
    permits: counts?.permits || 0,
  }), [counts, businesses, units]);

  const groupedTabs = useMemo(() => TAB_GROUPS.map((group) => ({
    ...group,
    items: Object.entries(TAB_META)
      .filter(([, meta]) => meta.group === group.id)
      .map(([key, meta]) => ({
        id: key,
        ...meta,
        count: tabCounts[key] ?? 0,
        highlight: tabHighlights[key] ?? '',
      })),
  })).filter((group) => group.items.length > 0), [tabCounts, tabHighlights]);

  const tabOptions = useMemo(
    () => groupedTabs.flatMap((group) => group.items),
    [groupedTabs],
  );

  const currentTabId = modalTab ?? activeTab;
  const tabPickerValue = tabOptions.some((item) => item.id === currentTabId) ? currentTabId : '';

  const handleTabSelect = (nextTab) => {
    if (!nextTab) return;
    setActiveTab(nextTab);
    setModalTab(nextTab);
  };

  const closeModal = () => {
    setModalTab(null);
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  if (!address) return <div className="text-center mt-10">No address details available.</div>;

  console.log('Address units:', units);  // Debug log

  const formatCountLabel = (count, label) => {
    if (!label) return String(count);
    const safeCount = Number.isFinite(count) ? count : 0;
    const suffix = safeCount === 1 ? '' : 's';
    return `${safeCount} ${label}${suffix}`;
  };

  const renderTabIcon = (key, className) => {
    switch (key) {
      case 'contacts':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="3" />
          </svg>
        );
      case 'businesses':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 21V7a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2v14" />
            <path d="M3 10h18" />
          </svg>
        );
      case 'units':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 21V7a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2v14" />
            <path d="M3 10h18" />
            <path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2M15 18h2" />
          </svg>
        );
      case 'photos':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        );
      case 'comments':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 15a4 4 0 0 1-4 4H8l-4 3V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4z" />
            <path d="M8 9h8M8 12h5" />
          </svg>
        );
      case 'violations':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        );
      case 'citations':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8M16 17H8M10 9H8" />
          </svg>
        );
      case 'inspections':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-3.5-3.5" />
          </svg>
        );
      case 'complaints':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
          </svg>
        );
      case 'licenses':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8" cy="12" r="2" />
            <path d="M12 12h6M12 16h6" />
          </svg>
        );
      case 'permits':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M9 3h6a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1V5a2 2 0 0 1 2-2z" />
            <path d="M9 5h6" />
            <path d="M9 14l2 2 4-4" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="9" />
            <path d="M9 12h6" />
          </svg>
        );
    }
  };

  const renderBusinessMatchesPanel = () => {
    if (!showAddBusiness) return null;
    const hasMatches = potentialBusinessMatches.length > 0;
    if (!isCheckingBusinessMatches && !hasMatches) return null;

    const title = hasMatches ? 'Possible existing businesses found' : 'Searching businesses';
    let description = '';
    if (businessDuplicateSummary) {
      if (hasMatches) {
        description = `These records overlap with "${businessDuplicateSummary}".`;
      } else {
        description = `Looking for matches similar to "${businessDuplicateSummary}"...`;
      }
    }

    return (
      <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="font-semibold">{title}</div>
        {description && <p className="mt-1 text-xs text-amber-800">{description}</p>}
        {hasMatches && (
          <ul className="mt-3 space-y-3">
            {potentialBusinessMatches.map((match) => (
              <li key={match.id} className="rounded-md border border-amber-200 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-base font-semibold text-gray-900">{match.name || 'Unnamed business'}</div>
                    {match.trading_as && (
                      <div className="text-xs text-gray-600">Trading as {match.trading_as}</div>
                    )}
                    {Array.isArray(match.matchReasons) && match.matchReasons.length > 0 && (
                      <div className="text-xs text-amber-700">
                        Matches on {formatBusinessMatchReasons(match.matchReasons)}.
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddSuggestedBusiness(match)}
                    disabled={addingSuggestedBusinessId === match.id}
                    className="inline-flex items-center rounded border border-indigo-600 px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-600 hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {addingSuggestedBusinessId === match.id ? 'Adding...' : 'Add this business'}
                  </button>
                </div>
                <div className="mt-2 grid gap-2 text-xs text-gray-700 sm:grid-cols-2">
                  {match.phone && <div>Phone: {formatPhoneNumber(match.phone)}</div>}
                  {match.email && <div>Email: {match.email}</div>}
                  {match.website && <div>Website: {match.website}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {isCheckingBusinessMatches && !hasMatches && (
          <p className="mt-2 text-xs text-amber-700">Searching for matching businesses...</p>
        )}
      </div>
    );
  };

  const renderModalBody = (tabId) => {
    switch (tabId) {
      case 'units':
        return (
          <div className="space-y-4">
            {units.length > 5 && (
              <div className="relative">
                <label htmlFor="unit-search" className="block text-sm font-semibold text-gray-700">
                  Search Units by Number
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
            <div>
              <button
                onClick={() => setShowNewUnitForm(!showNewUnitForm)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500"
              >
                {showNewUnitForm ? 'Cancel' : 'Add New Unit'}
              </button>
            </div>
            {showNewUnitForm && <NewUnit addressId={id} inspectionId={null} />}
            <div>
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
        );
      case 'contacts':
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-700">Contacts</h3>
              <button
                className="px-3 py-1 bg-green-500 text-white rounded text-sm"
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
              <p className="text-gray-500">No contacts associated with this address.</p>
            )}
            {contacts.length > 0 && (
              <ul className="space-y-2">
                {contacts.map((contact) => (
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
                          title={`Call ${formatPhoneNumber(contact.phone)}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm10-10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                          {formatPhoneNumber(contact.phone)}
                        </a>
                      )}
                    </div>
                    <button
                      className="ml-2 px-2 py-1 bg-red-400 text-white rounded text-xs"
                      onClick={() => handleRemoveContact(contact.id, { confirmMessage: 'Remove this contact from the address?' })}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showAddContact && (
              <ContactLinkModal
                isOpen={showAddContact}
                onClose={closeContactModal}
                title="Link a Contact"
                description="Search for an existing person or create a new contact to associate with this address."
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
          </div>
        );
      case 'businesses':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-700">Businesses</h3>
              <button
                type="button"
                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-500"
                onClick={() => setShowAddBusiness((v) => !v)}
                aria-expanded={showAddBusiness}
              >
                {showAddBusiness ? 'Cancel' : 'Add Business'}
              </button>
            </div>
            {showAddBusiness && (
              <div className="p-4 bg-white border rounded shadow">
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
                      setBusinesses((prev) => (Array.isArray(prev) ? [created, ...prev] : [created]));
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
                      placeholder="(555) 555-5555"
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
                {renderBusinessMatchesPanel()}
              </div>
            )}
            {removeBusinessError && (
              <div className="text-sm text-red-600">{removeBusinessError}</div>
            )}
            {businesses.length === 0 ? (
              <p className="text-gray-500">No businesses associated with this address.</p>
            ) : (
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                {businesses.map((b) => {
                  const formattedPhone = b.phone ? formatPhoneNumber(b.phone) : '';
                  const phoneLabel = formattedPhone !== 'N/A' ? formattedPhone : '';
                  const contactInfo = phoneLabel || b.email || b.website || '';

                  return (
                    <li key={b.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/business/${b.id}`} className="font-semibold text-blue-700 hover:underline hover:text-blue-900">
                          {b.name || 'Untitled Business'}
                        </Link>
                        {b.trading_as && (
                          <div className="text-xs text-gray-500">Trading as: {b.trading_as}</div>
                        )}
                        <div className="text-xs text-gray-500">{contactInfo}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-1 rounded ${b.is_closed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {b.is_closed ? 'Closed' : 'Open'}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm('Remove this business from the address?')) return;
                            setRemoveBusinessError(null);
                            setRemovingBusinessId(b.id);
                            try {
                              const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/${b.id}`, {
                                method: 'DELETE',
                              });
                              if (!res.ok && res.status !== 204) throw new Error('Failed to remove business');
                              setBusinesses((prev) => prev.filter((biz) => biz.id !== b.id));
                            } catch (err) {
                              setRemoveBusinessError('Could not remove business.');
                            } finally {
                              setRemovingBusinessId(null);
                            }
                          }}
                          disabled={removingBusinessId === b.id}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {removingBusinessId === b.id ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      case 'photos':
        return (
          <div className="space-y-4">
            <AddressPhotos addressId={id} />
          </div>
        );
      case 'citations':
        return (
          <div className="space-y-4">
            <Citations addressId={id} />
          </div>
        );
      case 'comments':
        return (
          <div className="space-y-4">
            <Comments
              key={`comments-${commentsRefreshKey}`}
              addressId={id}
              pageSize={10}
              initialPage={1}
            />
          </div>
        );
      case 'violations':
        return (
          <div className="space-y-4">
            <Violations addressId={id} />
          </div>
        );
      case 'inspections':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-700">Inspections</h3>
              <button
                type="button"
                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-500"
                onClick={() => setShowAddInspectionForm((v) => !v)}
                aria-expanded={showAddInspectionForm}
              >
                {showAddInspectionForm ? 'Cancel' : 'Add Inspection'}
              </button>
            </div>

            {showAddInspectionForm && (
              <div className="p-4 bg-white border rounded shadow space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Inspection type</label>
                    <select
                      value={inspectionFormType}
                      onChange={(e) => setInspectionFormType(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                    >
                      <option value="building_permit">Building/Dumpster/POD Permit</option>
                      <option value="business_license">Business License</option>
                      <option value="single_family_license">Single Family License</option>
                      <option value="multifamily_license">Multifamily License</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Select the correct form, then complete and submit.</p>
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
        );
      case 'complaints':
        return (
          <div className="space-y-4">
            <Complaints addressId={id} />
          </div>
        );
      case 'licenses':
        return (
          <div className="space-y-4">
            <AddressLicenses addressId={id} />
          </div>
        );
      case 'permits':
        return (
          <div className="space-y-4">
            <AddressPermits addressId={id} />
          </div>
        );
      default:
        return null;
    }
  };


  // License type labels for quick badges
  const LICENSE_TYPE_LABELS = {
    0: 'Business License',
    1: 'Business License',
    2: 'Single Family License',
    3: 'Multifamily License',
  };
  const toastBgClass = toast.variant === 'error' ? 'bg-red-600' : 'bg-emerald-600';

  return (
    <div className="max-w-4xl mx-auto px-5 pt-4 pb-36 sm:pb-6 bg-white shadow-md rounded-lg mt-6 space-y-8">
      {toast.show && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className={`flex items-center gap-2 rounded-md ${toastBgClass} text-white px-4 py-2 shadow-lg`}>
            {toast.variant === 'error' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <circle cx="12" cy="12" r="9" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="ml-2 text-white/80 hover:text-white"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}
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
                <label htmlFor="parcel-id" className="block text-xs font-medium text-gray-600">Parcel ID</label>
                <input
                  id="parcel-id"
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 text-sm"
                  value={address.pid || ''}
                  onChange={(e) => setAddress({ ...address, pid: e.target.value })}
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
              <div>
                <div className="text-xs text-gray-500">Parcel ID</div>
                <div className="text-gray-800">{address.pid || 'N/A'}</div>
              </div>
              {mostRecentHousingLicense && (
                <div>
                  <div className="text-xs text-gray-500">License</div>
                  <div className="text-sm">
                    <Link
                      to={`/license/${mostRecentHousingLicense.id}`}
                      className={`inline-flex items-center gap-2 px-2 py-1 rounded ${
                        mostRecentHousingLicenseStatus?.state === 'expired'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                      title="View license details"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        {mostRecentHousingLicenseStatus?.state === 'expired' ? (
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
                        {mostRecentHousingLicenseStatus?.state === 'expired'
                          ? `Expired ${mostRecentHousingLicenseStatus?.date ? toEasternLocaleDateString(mostRecentHousingLicenseStatus.date) : ''}`
                          : `Active${mostRecentHousingLicenseStatus?.date ? ` until ${toEasternLocaleDateString(mostRecentHousingLicenseStatus.date)}` : ''}`}
                        {(() => {
                          const t = mostRecentHousingLicense?.license_type;
                          const label = LICENSE_TYPE_LABELS?.[t] || (t != null ? String(t) : '');
                          return label ? ` • ${label}` : '';
                        })()}
                        {mostRecentHousingLicense.license_number ? ` • #${mostRecentHousingLicense.license_number}` : ''}
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

  {/* External links and grouped navigation */}
  <div className="mt-2 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Open address in Google Maps"
            onClick={() => {
              const parts = [address.streetnumb, address.streetname, address.ownerstate, address.ownerzip].filter(Boolean).join(' ');
              const query = encodeURIComponent(parts || address.combadd || '');
              window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener');
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

          <button
            type="button"
            onClick={handleRefreshOwner}
            disabled={isSyncingOwner || !canSyncOwner}
            className={`group inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-[.97] ${isSyncingOwner || !canSyncOwner ? 'cursor-not-allowed opacity-60' : 'hover:from-indigo-600 hover:to-purple-700'}`}
            title={canSyncOwner ? 'Sync owner info from SDAT' : 'Provide district and account number to enable sync'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-5 w-5 text-white drop-shadow-sm ${isSyncingOwner ? 'animate-spin' : ''}`}
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15.48-5.94L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15.48 5.94L3 16" />
            </svg>
            <span className="whitespace-nowrap">
              {isSyncingOwner ? 'Syncing...' : 'Sync Owner from SDAT'}
            </span>
          </button>
        </div>

        <section aria-labelledby="address-navigation" className="rounded-xl border border-gray-200/80 bg-slate-50/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600" id="address-navigation">
                Explore This Address
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Navigate by theme to find the information you need faster.
              </p>
            </div>
            <div className="sm:min-w-[14rem]">
              <label htmlFor="address-tab-picker" className="sr-only">
                Jump to a section
              </label>
              <select
                id="address-tab-picker"
                value={tabPickerValue}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next) handleTabSelect(next);
                }}
                disabled={tabOptions.length === 0}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="" disabled hidden>
                  Select a section
                </option>
                {groupedTabs.map((group) => (
                  <optgroup key={group.id} label={group.title}>
                    {group.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {groupedTabs.map((group) => (
              <div key={group.id} className="rounded-lg border border-gray-200 bg-white/80 p-4 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">{group.title}</h3>
                  {group.description && (
                    <p className="mt-1 text-xs text-gray-500">{group.description}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;
                    const badgeText = formatCountLabel(item.count, item.badgeLabel);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleTabSelect(item.id)}
                        aria-pressed={isActive}
                        className={`group flex h-full flex-col justify-between rounded-lg border bg-white p-4 text-left shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isActive ? 'border-indigo-500 shadow-md ring-1 ring-indigo-200' : 'border-gray-200 hover:border-indigo-400 hover:shadow-md'}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`flex h-10 w-10 items-center justify-center rounded-full transition ${isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'}`}>
                            {renderTabIcon(item.id, 'h-5 w-5')}
                          </span>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-gray-900">{item.label}</span>
                            {item.description && (
                              <span className="text-xs leading-snug text-gray-500">{item.description}</span>
                            )}
                            {item.highlight && (
                              <span className="text-xs font-semibold text-indigo-600">{item.highlight}</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs">
                          <span className={`font-medium ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                            View section
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 group-hover:bg-indigo-600/10 group-hover:text-indigo-700'}`}>
                            {badgeText}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {modalTab && typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[1200] bg-slate-900/60"
              onClick={closeModal}
              aria-hidden="true"
            />
            <div
              className="fixed inset-0 z-[1210] flex items-center justify-center px-4 py-8 sm:p-10"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeModal();
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`modal-heading-${modalTab}`}
                className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
                  <div>
                    <h2 id={`modal-heading-${modalTab}`} className="text-lg font-semibold text-gray-900">
                      {TAB_META[modalTab]?.label ?? titlize(modalTab)}
                    </h2>
                    {TAB_META[modalTab]?.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {TAB_META[modalTab].description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                      {formatCountLabel(tabCounts[modalTab] ?? 0, TAB_META[modalTab]?.badgeLabel)}
                    </span>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      aria-label="Close modal"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                  {renderModalBody(modalTab)}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

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
                setModalTab('comments');
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
                accept="image/*,application/pdf"
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
