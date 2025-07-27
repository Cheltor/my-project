
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function titlize(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

const STATUS_OPTIONS = [
  { value: 'occupied', label: 'Occupied' },
  { value: 'potentially vacant', label: 'Potentially Vacant' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'registered', label: 'Registered' },
];

function VacancyStatusList() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    const url = `${process.env.REACT_APP_API_URL}/addresses/by-vacancy-status`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch addresses');
        return res.json();
      })
      .then(data => {
        setAddresses(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleEditClick = (id, currentStatus) => {
    setEditingId(id);
    setNewStatus(currentStatus);
  };

  const handleStatusChange = (e) => {
    setNewStatus(e.target.value);
  };

  const handleConfirm = (id) => {
    const url = `${process.env.REACT_APP_API_URL}/addresses/${id}/vacancy-status`;
    fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vacancy_status: newStatus }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update status');
        return res.json();
      })
      .then(data => {
        setAddresses(addresses.map(addr => (addr.id === id ? { ...addr, vacancy_status: newStatus } : addr)));
        setEditingId(null);
      })
      .catch(err => {
        setError(err.message);
      });
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-4">Addresses by Vacancy Status</h1>
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Address</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Vacancy Status</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {addresses.map(addr => (
            <tr key={addr.id} className="hover:bg-gray-100">
              <td className="px-4 py-2">
                <Link to={`/address/${addr.id}`} className="text-blue-600 hover:underline">
                  {addr.combadd}
                </Link>
              </td>
              <td className="px-4 py-2">
                {editingId === addr.id ? (
                  <select
                    value={newStatus}
                    onChange={handleStatusChange}
                    className="border rounded p-1"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  titlize(addr.vacancy_status)
                )}
              </td>
              <td className="px-4 py-2">
                {editingId === addr.id ? (
                  <>
                    <button
                      onClick={() => handleConfirm(addr.id)}
                      className="bg-green-500 text-white px-2 py-1 rounded mr-2 hover:bg-green-600"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={handleCancel}
                      className="bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleEditClick(addr.id, addr.vacancy_status)}
                    className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    Update
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default VacancyStatusList;
