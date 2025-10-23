import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

const EMPTY_FORM = {
  property_name: '',
  aka: '',
  combadd: '',
  streetnumb: '',
  streetname: '',
  streettype: '',
  premisezip: '',
  district: '',
  property_id: '',
  pid: '',
  ownername: '',
  owneraddress: '',
  ownercity: '',
  ownerstate: '',
  ownerzip: '',
  property_type: '',
  landusecode: '',
  zoning: '',
  vacancy_status: '',
  proptype: '',
  latitude: '',
  longitude: '',
  name: '',
};

const VACANCY_OPTIONS = [
  { value: 'occupied', label: 'Occupied' },
  { value: 'potentially vacant', label: 'Potentially Vacant' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'registered', label: 'Registered' },
];

const NewAddressForm = ({ onAddressCreated }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!user || user.role !== 3) return null;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    let nextValue = value;
    if (type === 'checkbox') {
      nextValue = checked;
    } else if (name === 'ownerstate') {
      nextValue = value.toUpperCase();
    }
    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const buildPayload = () => {
    const payload = {};
    Object.entries(form).forEach(([key, rawValue]) => {
      if (typeof rawValue === 'string') {
        const trimmed = rawValue.trim();
        if (!trimmed) return;
        switch (key) {
          case 'ownerstate':
            payload[key] = trimmed.toUpperCase();
            break;
          case 'vacancy_status':
            payload[key] = trimmed;
            break;
          case 'latitude':
          case 'longitude': {
            const num = Number(trimmed);
            if (!Number.isNaN(num)) payload[key] = num;
            break;
          }
          case 'proptype': {
            const num = parseInt(trimmed, 10);
            if (!Number.isNaN(num)) payload[key] = num;
            break;
          }
          default:
            payload[key] = trimmed;
        }
      } else if (typeof rawValue === 'number') {
        if (!Number.isNaN(rawValue)) payload[key] = rawValue;
      } else if (typeof rawValue === 'boolean') {
        payload[key] = rawValue;
      }
    });

    if (!payload.combadd) {
      throw new Error('Combined address is required.');
    }
    if (!payload.streetnumb || !payload.streetname) {
      throw new Error('Street number and street name are required.');
    }
    if (!payload.premisezip) {
      throw new Error('Property ZIP code is required.');
    }

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    let payload;
    try {
      payload = buildPayload();
    } catch (validationError) {
      setError(validationError.message);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/addresses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let msg = 'Failed to create address';
        try {
          const errJson = await response.json();
          if (errJson?.detail) msg = errJson.detail;
        } catch {
          try { msg = await response.text(); } catch {}
        }
        throw new Error(msg);
      }
      const created = await response.json();
      setSuccess(true);
      setForm({ ...EMPTY_FORM });
      if (onAddressCreated) onAddressCreated(created);
      if (created?.id) {
        navigate(`/address/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow mt-4">
      <h2 className="text-lg font-bold mb-2">Add New Address</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Location</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="combadd" className="block text-xs font-medium text-gray-600">
                Combined Address *
              </label>
              <input
                id="combadd"
                name="combadd"
                value={form.combadd}
                onChange={handleChange}
                placeholder="123 Main St"
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div>
              <label htmlFor="streetnumb" className="block text-xs font-medium text-gray-600">
                Street Number *
              </label>
              <input
                id="streetnumb"
                name="streetnumb"
                value={form.streetnumb}
                onChange={handleChange}
                placeholder="123"
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div>
              <label htmlFor="streetname" className="block text-xs font-medium text-gray-600">
                Street Name *
              </label>
              <input
                id="streetname"
                name="streetname"
                value={form.streetname}
                onChange={handleChange}
                placeholder="Main"
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div>
              <label htmlFor="streettype" className="block text-xs font-medium text-gray-600">
                Street Type
              </label>
              <input
                id="streettype"
                name="streettype"
                value={form.streettype}
                onChange={handleChange}
                placeholder="St, Ave, Rd"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="premisezip" className="block text-xs font-medium text-gray-600">
                Property ZIP *
              </label>
              <input
                id="premisezip"
                name="premisezip"
                value={form.premisezip}
                onChange={handleChange}
                placeholder="21202"
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div>
              <label htmlFor="property_name" className="block text-xs font-medium text-gray-600">
                Property Name
              </label>
              <input
                id="property_name"
                name="property_name"
                value={form.property_name}
                onChange={handleChange}
                placeholder="Building or complex"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="aka" className="block text-xs font-medium text-gray-600">
                AKA
              </label>
              <input
                id="aka"
                name="aka"
                value={form.aka}
                onChange={handleChange}
                placeholder="Alternate name"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="district" className="block text-xs font-medium text-gray-600">
                District
              </label>
              <input
                id="district"
                name="district"
                value={form.district}
                onChange={handleChange}
                placeholder="e.g. 01"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="property_id" className="block text-xs font-medium text-gray-600">
                Property ID
              </label>
              <input
                id="property_id"
                name="property_id"
                value={form.property_id}
                onChange={handleChange}
                placeholder="Account number"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="pid" className="block text-xs font-medium text-gray-600">
                PID
              </label>
              <input
                id="pid"
                name="pid"
                value={form.pid}
                onChange={handleChange}
                placeholder="Parcel ID"
                className="w-full border p-2 rounded"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Owner</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="ownername" className="block text-xs font-medium text-gray-600">
                Owner Name
              </label>
              <input
                id="ownername"
                name="ownername"
                value={form.ownername}
                onChange={handleChange}
                placeholder="Owner name"
                className="w-full border p-2 rounded"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="owneraddress" className="block text-xs font-medium text-gray-600">
                Owner Address
              </label>
              <input
                id="owneraddress"
                name="owneraddress"
                value={form.owneraddress}
                onChange={handleChange}
                placeholder="Owner street address"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="ownercity" className="block text-xs font-medium text-gray-600">
                Owner City
              </label>
              <input
                id="ownercity"
                name="ownercity"
                value={form.ownercity}
                onChange={handleChange}
                placeholder="City"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="ownerstate" className="block text-xs font-medium text-gray-600">
                Owner State
              </label>
              <input
                id="ownerstate"
                name="ownerstate"
                value={form.ownerstate}
                onChange={handleChange}
                placeholder="MD"
                maxLength={2}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="ownerzip" className="block text-xs font-medium text-gray-600">
                Owner ZIP
              </label>
              <input
                id="ownerzip"
                name="ownerzip"
                value={form.ownerzip}
                onChange={handleChange}
                placeholder="21201"
                className="w-full border p-2 rounded"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Additional Details</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="vacancy_status" className="block text-xs font-medium text-gray-600">
                Vacancy Status
              </label>
              <select
                id="vacancy_status"
                name="vacancy_status"
                value={form.vacancy_status}
                onChange={handleChange}
                className="w-full border p-2 rounded bg-white"
              >
                <option value="">Select status</option>
                {VACANCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="property_type" className="block text-xs font-medium text-gray-600">
                Property Type
              </label>
              <input
                id="property_type"
                name="property_type"
                value={form.property_type}
                onChange={handleChange}
                placeholder="Single Family, Commercial..."
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="landusecode" className="block text-xs font-medium text-gray-600">
                Land Use Code
              </label>
              <input
                id="landusecode"
                name="landusecode"
                value={form.landusecode}
                onChange={handleChange}
                placeholder="e.g. R-6"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="zoning" className="block text-xs font-medium text-gray-600">
                Zoning
              </label>
              <input
                id="zoning"
                name="zoning"
                value={form.zoning}
                onChange={handleChange}
                placeholder="Zoning designation"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="proptype" className="block text-xs font-medium text-gray-600">
                Proptype
              </label>
              <input
                id="proptype"
                name="proptype"
                value={form.proptype}
                onChange={handleChange}
                placeholder="1"
                type="number"
                min="0"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="latitude" className="block text-xs font-medium text-gray-600">
                Latitude
              </label>
              <input
                id="latitude"
                name="latitude"
                value={form.latitude}
                onChange={handleChange}
                placeholder="39.2904"
                type="number"
                step="any"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label htmlFor="longitude" className="block text-xs font-medium text-gray-600">
                Longitude
              </label>
              <input
                id="longitude"
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
                placeholder="-76.6122"
                type="number"
                step="any"
                className="w-full border p-2 rounded"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-xs font-medium text-gray-600">
                Resident / Business Name
              </label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Occupant name"
                className="w-full border p-2 rounded"
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Address'}
        </button>
        {error && <div className="text-red-500">{error}</div>}
        {success && <div className="text-green-600">Address created!</div>}
      </form>
    </div>
  );
};

export default NewAddressForm;
