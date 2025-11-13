import React, { useEffect, useState } from 'react';
import LoadingSpinner from './Common/LoadingSpinner';

const LICENSE_TYPES = [
  { value: '1', label: 'Business License' },
  { value: '2', label: 'Single Family License' },
  { value: '3', label: 'Multifamily License' },
];

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DELAY_MS = 300;

export default function AddLicenseModal({ open, onClose, onCreated }) {
  const [licenseType, setLicenseType] = useState('1');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [dateIssued, setDateIssued] = useState('');
  const [paid, setPaid] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [businessQuery, setBusinessQuery] = useState('');
  const [businessResults, setBusinessResults] = useState([]);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [businessError, setBusinessError] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  const [addressQuery, setAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);

  useEffect(() => {
    if (!open) {
      setLicenseType('1');
      setLicenseNumber('');
      setDateIssued('');
      setPaid(false);
      setSent(false);
      setSubmitting(false);
      setError(null);

      setBusinessQuery('');
      setBusinessResults([]);
      setBusinessLoading(false);
      setBusinessError(null);
      setSelectedBusiness(null);

      setAddressQuery('');
      setAddressResults([]);
      setAddressLoading(false);
      setAddressError(null);
      setSelectedAddress(null);
    }
  }, [open]);

  useEffect(() => {
    setBusinessQuery('');
    setBusinessResults([]);
    setSelectedBusiness(null);
    setBusinessError(null);
    setAddressQuery('');
    setAddressResults([]);
    setSelectedAddress(null);
    setAddressError(null);
  }, [licenseType]);

  useEffect(() => {
    if (licenseType !== '1') return;
    const query = businessQuery.trim();
    if (query.length < MIN_SEARCH_LENGTH) {
      setBusinessResults([]);
      setBusinessLoading(false);
      setBusinessError(null);
      return;
    }
    setBusinessLoading(true);
    setBusinessError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`${process.env.REACT_APP_API_URL}/businesses/search?query=${encodeURIComponent(query)}&limit=10`, { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || 'Failed to search businesses');
          }
          return res.json();
        })
        .then((data) => {
          setBusinessResults(Array.isArray(data) ? data : []);
          setBusinessLoading(false);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setBusinessError(err.message || 'Failed to search businesses');
          setBusinessLoading(false);
        });
    }, SEARCH_DELAY_MS);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [businessQuery, licenseType]);

  useEffect(() => {
    if (licenseType === '1') return;
    const query = addressQuery.trim();
    if (query.length < MIN_SEARCH_LENGTH) {
      setAddressResults([]);
      setAddressLoading(false);
      setAddressError(null);
      return;
    }
    setAddressLoading(true);
    setAddressError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`${process.env.REACT_APP_API_URL}/addresses/search?query=${encodeURIComponent(query)}&limit=10`, { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || 'Failed to search addresses');
          }
          return res.json();
        })
        .then((data) => {
          setAddressResults(Array.isArray(data) ? data : []);
          setAddressLoading(false);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setAddressError(err.message || 'Failed to search addresses');
          setAddressLoading(false);
        });
    }, SEARCH_DELAY_MS);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [addressQuery, licenseType]);

  if (!open) return null;

  const today = new Date();
  const baseDate = dateIssued ? new Date(dateIssued) : today;
  const month = baseDate.getMonth() + 1;
  const year = baseDate.getFullYear();
  const fyEndYear = month < 7 ? year : year + 1;
  const fiscalYear = `${fyEndYear - 1}-${fyEndYear}`;
  const expirationDate = new Date(fyEndYear, 5, 30).toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const type = Number(licenseType);
    if (type === 1 && !selectedBusiness) {
      setError('Please select a business for this license.');
      return;
    }
    if ((type === 2 || type === 3) && !selectedAddress) {
      setError('Please select an address for this license.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        license_type: type,
        license_number: licenseNumber.trim() || undefined,
        paid,
        sent,
        date_issued: dateIssued || undefined,
        fiscal_year: fiscalYear,
        expiration_date: expirationDate,
      };

      if (type === 1 && selectedBusiness) {
        payload.business_id = selectedBusiness.id;
      }
      if (type !== 1 && selectedAddress) {
        payload.address_id = selectedAddress.id;
      }

      const res = await fetch(`${process.env.REACT_APP_API_URL}/licenses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to create license');
      }
      const created = await res.json();
      onCreated && onCreated(created);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create license');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-base font-semibold text-gray-800">Add License</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">License Type</label>
            <select
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value)}
              className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            >
              {LICENSE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">License Number (optional)</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              placeholder="e.g. BL-2025-001"
            />
          </div>

          {licenseType === '1' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">Business</label>
              <input
                type="text"
                value={businessQuery}
                onChange={(e) => setBusinessQuery(e.target.value)}
                className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                placeholder="Search business name..."
              />
              <p className="mt-1 text-xs text-gray-500">Enter at least {MIN_SEARCH_LENGTH} characters to search</p>
              {businessLoading && <p className="mt-1 text-xs text-gray-500">Searching...</p>}
              {businessError && <p className="mt-1 text-xs text-red-600">{businessError}</p>}
              {businessResults.length > 0 && (
                <select
                  value={selectedBusiness ? selectedBusiness.id : ''}
                  onChange={(e) => {
                    const chosen = businessResults.find((b) => String(b.id) === e.target.value);
                    setSelectedBusiness(chosen || null);
                  }}
                  className="mt-2 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Select a business</option>
                  {businessResults.map((business) => (
                    <option key={business.id} value={business.id}>
                      {(business.name?.trim() || business.trading_as?.trim() || `Business #${business.id}`)}
                    </option>
                  ))}
                </select>
              )}
              {selectedBusiness && (
                <p className="mt-2 text-xs text-gray-600">Selected business: {(selectedBusiness.name?.trim() || selectedBusiness.trading_as?.trim() || `Business #${selectedBusiness.id}`)}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input
                type="text"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                placeholder="Search address..."
              />
              <p className="mt-1 text-xs text-gray-500">Enter at least {MIN_SEARCH_LENGTH} characters to search</p>
              {addressLoading && <p className="mt-1 text-xs text-gray-500">Searching...</p>}
              {addressError && <p className="mt-1 text-xs text-red-600">{addressError}</p>}
              {addressResults.length > 0 && (
                <select
                  value={selectedAddress ? selectedAddress.id : ''}
                  onChange={(e) => {
                    const chosen = addressResults.find((a) => String(a.id) === e.target.value);
                    setSelectedAddress(chosen || null);
                  }}
                  className="mt-2 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Select an address</option>
                  {addressResults.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.combadd || `Address #${address.id}`}
                    </option>
                  ))}
                </select>
              )}
              {selectedAddress && (
                <p className="mt-2 text-xs text-gray-600">Selected address: {selectedAddress.combadd || `Address #${selectedAddress.id}`}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Date Issued (optional)</label>
            <input
              type="date"
              value={dateIssued}
              onChange={(e) => setDateIssued(e.target.value)}
              className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Paid
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={sent}
                onChange={(e) => setSent(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Sent
            </label>
          </div>

          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <p>Fiscal Year (preview): <span className="font-medium">{fiscalYear}</span></p>
            <p>Expiration (preview): <span className="font-medium">{expirationDate}</span></p>
            <p className="mt-1">(Derived July 1 - June 30. Backend finalizes values.)</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner />
                  Saving...
                </span>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
