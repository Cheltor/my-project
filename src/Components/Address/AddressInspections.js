import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Match Inspections.js status formatting
const formatStatus = (s) => {
  if (!s) return 'Pending';
  return s
    .toString()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const AddressInspections = ({ addressId }) => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch inspections for the specific address
    fetch(`${process.env.REACT_APP_API_URL}/inspections/address/${addressId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch inspections');
        }
        return response.json();
      })
      .then((data) => {
        setInspections(data || []);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [addressId]);

  if (loading) return <p>Loading inspections...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!inspections || inspections.length === 0) return <p>No inspections available.</p>;

  // Newest first: prefer scheduled_datetime, fallback to created_at
  const sorted = [...inspections].sort((a, b) => {
    const da = new Date(a.scheduled_datetime || a.created_at || 0);
    const db = new Date(b.scheduled_datetime || b.created_at || 0);
    return db - da;
  });

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900">Inspections</h2>
      <div className="mt-4 overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map((inspection) => (
              <tr key={inspection.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link to={`/inspection/${inspection.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {inspection.source || '—'}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span
                    className={`inline-block px-2 py-1 text-sm font-semibold rounded 
                      ${inspection.status === 'Satisfactory' || (inspection.status && inspection.status.toLowerCase() === 'completed') ? 'bg-green-100 text-green-800' :
                        inspection.status === 'Unsatisfactory' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'}`}
                  >
                    {formatStatus(inspection.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inspection.scheduled_datetime ? new Date(inspection.scheduled_datetime).toLocaleString() : 'Unscheduled'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AddressInspections;
