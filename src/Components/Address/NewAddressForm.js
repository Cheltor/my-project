import React, { useState } from 'react';
import { useAuth } from '../../AuthContext';

const NewAddressForm = ({ onAddressCreated }) => {
  const { user } = useAuth();
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
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/addresses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Failed to create address');
      setSuccess(true);
      setForm({ property_name: '', ownername: '', combadd: '', owneraddress: '', ownerzip: '' });
      if (onAddressCreated) onAddressCreated();
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
