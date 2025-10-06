import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

const NewAddressForm = ({ onAddressCreated }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    property_name: '',
    ownername: '',
    combadd: '',
    owneraddress: '',
    ownerzip: '',
    // Add more fields as needed
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!user || user.role !== 3) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    // Basic client validation: require a combined address string
    const payload = {
      property_name: (form.property_name || '').trim(),
      ownername: (form.ownername || '').trim(),
      combadd: (form.combadd || '').trim(),
      owneraddress: (form.owneraddress || '').trim(),
      ownerzip: (form.ownerzip || '').trim(),
    };
    if (!payload.combadd) {
      setError('Combined Address is required.');
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
        // Try to show server-provided error details when available
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
      setForm({ property_name: '', ownername: '', combadd: '', owneraddress: '', ownerzip: '' });
      if (onAddressCreated) onAddressCreated(created);
      // Navigate to the newly created address page
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
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          name="property_name"
          value={form.property_name}
          onChange={handleChange}
          placeholder="Property Name"
          className="w-full border p-2 rounded"
        />
        <input
          name="ownername"
          value={form.ownername}
          onChange={handleChange}
          placeholder="Owner Name"
          className="w-full border p-2 rounded"
        />
        <input
          name="combadd"
          value={form.combadd}
          onChange={handleChange}
          placeholder="Combined Address"
          className="w-full border p-2 rounded"
        />
        <input
          name="owneraddress"
          value={form.owneraddress}
          onChange={handleChange}
          placeholder="Owner Address"
          className="w-full border p-2 rounded"
        />
        <input
          name="ownerzip"
          value={form.ownerzip}
          onChange={handleChange}
          placeholder="Owner ZIP Code"
          className="w-full border p-2 rounded"
        />
        {/* Add more fields as needed */}
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
