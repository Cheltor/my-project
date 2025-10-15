import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toEasternLocaleString } from '../../utils';

const normalizeStatus = (s) => {
  if (!s) return 'Pending';
  const v = String(s).toLowerCase();
  if (v === 'unsatisfactory' || v === 'violation found' || v === 'violation') return 'Violation Found';
  if (v === 'satisfactory' || v === 'no violation found' || v === 'no violation') return 'No Violation Found';
  if (v === 'pending' || v === 'unknown') return 'Pending';
  return s;
};

const statusClasses = (label) => {
  if (label === 'Violation Found') return 'bg-red-100 text-red-800';
  if (label === 'No Violation Found') return 'bg-green-100 text-green-800';
  return 'bg-yellow-100 text-yellow-800';
};

const AddressComplaints = ({ addressId }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/complaints/address/${addressId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch complaints');
        }
        return response.json();
      })
      .then((data) => {
        setComplaints(data || []);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [addressId]);

  if (loading) return <p>Loading complaints...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!complaints || complaints.length === 0) return <p>No complaints available.</p>;

  // Newest first: created_at desc (fallback updated_at)
  const sorted = [...complaints].sort((a, b) => {
    const da = new Date(a.created_at || a.updated_at || 0);
    const db = new Date(b.created_at || b.updated_at || 0);
    return db - da;
  });

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900">Complaints</h2>
      <div className="mt-4 overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map((complaint) => (
              <tr key={complaint.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link to={`/complaint/${complaint.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {complaint.source || '—'}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {(() => {
                    const label = normalizeStatus(complaint.status);
                    return (
                      <span className={`inline-block px-2 py-1 text-sm font-semibold rounded ${statusClasses(label)}`}>
                        {label}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {complaint.created_at ? toEasternLocaleString(complaint.created_at) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AddressComplaints;
