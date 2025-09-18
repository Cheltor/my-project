import React, { useState } from 'react';
import AsyncSelect from 'react-select/async';
import { useAuth } from '../../AuthContext';

export default function NewBusinessForm({ onCancel, onCreated, embedded = false }) {
  const { user } = useAuth();
  const [units, setUnits] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address_id: null,
    unit_id: null,
    phone: '',
    email: '',
    website: '',
    trading_as: '',
  });

  const loadAddressOptions = async (inputValue) => {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/addresses/search?query=${encodeURIComponent(inputValue)}&limit=5`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((addr) => ({
      value: addr.id,
      label: `${addr.property_name ? addr.property_name + ' - ' : ''}${addr.combadd}${addr.aka ? ` (AKA: ${addr.aka})` : ''}`,
    }));
  };

  const handleAddressChange = async (selected) => {
    const addressId = selected ? selected.value : null;
    setFormData((prev) => ({ ...prev, address_id: addressId, unit_id: null }));
    setUnits([]);
    if (addressId) {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${addressId}/units`);
        if (res.ok) {
          const data = await res.json();
          setUnits(data || []);
        }
      } catch (_) {
        setUnits([]);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async () => {
    setFormError(null);
    if (!formData.name || !formData.address_id) {
      setFormError('Name and Address are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/businesses/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create business');
      const created = await res.json();
      if (typeof onCreated === 'function') onCreated(created);
      if (typeof onCancel === 'function') onCancel();
      setFormData({ name: '', address_id: null, unit_id: null, phone: '', email: '', website: '', trading_as: '' });
      setUnits([]);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submit();
  };

  return (
    embedded ? (
      <div className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        {formError && <div className="mb-4 text-sm text-red-600">{formError}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Name*</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address*</label>
            <AsyncSelect
              cacheOptions
              defaultOptions
              loadOptions={loadAddressOptions}
              onChange={handleAddressChange}
              placeholder="Type to search addresses..."
              className="mt-1"
            />
          </div>
          {units.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Unit (optional)</label>
              <select
                name="unit_id"
                value={formData.unit_id || ''}
                onChange={(e) => setFormData((p) => ({ ...p, unit_id: e.target.value ? Number(e.target.value) : null }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              >
                <option value="">Whole Building</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.number}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Website</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Trading As</label>
            <input
              type="text"
              name="trading_as"
              value={formData.trading_as}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save Business'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <form onSubmit={handleSubmit} className="mt-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
      {formError && <div className="mb-4 text-sm text-red-600">{formError}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Business Name*</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Address*</label>
          <AsyncSelect
            cacheOptions
            defaultOptions
            loadOptions={loadAddressOptions}
            onChange={handleAddressChange}
            placeholder="Type to search addresses..."
            className="mt-1"
          />
        </div>
        {units.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit (optional)</label>
            <select
              name="unit_id"
              value={formData.unit_id || ''}
              onChange={(e) => setFormData((p) => ({ ...p, unit_id: e.target.value ? Number(e.target.value) : null }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            >
              <option value="">Whole Building</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.number}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Website</label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Trading As</label>
          <input
            type="text"
            name="trading_as"
            value={formData.trading_as}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save Business'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
      </form>
    )
  );
}
