import React, { useState, useEffect } from 'react';

// Utility function to format the date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const AddressInspections = ({ addressId }) => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);  // For loading state
  const [error, setError] = useState(null);      // For error state

  useEffect(() => {
    // Fetch inspections for the specific address
    fetch(`https://civicode-2eae16143963.herokuapp.com/inspections/address/${addressId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch inspections');
        }
        return response.json();
      })
      .then((data) => {
        setInspections(data);  // Set the fetched inspections
        setLoading(false);   // Set loading to false once data is fetched
      })
      .catch((error) => {
        setError(error.message);  // Handle any errors
        setLoading(false);
      });
  }, [addressId]);

  if (loading) {
    return <p>Loading inspections...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (inspections.length === 0) {
    return <p>No inspections available.</p>;
  }

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Inspections</h2>
      <ul className="space-y-4 mt-4">
        {inspections.map((inspection) => (
          <li key={inspection.id} className="bg-gray-100 p-4 rounded-lg shadow">
            <p className="text-gray-700"><strong>Status:</strong> {inspection.status || 'Pending'}</p>
            <p className="text-gray-700"><strong>Inspection Type:</strong> {inspection.inspection_type || 'N/A'}</p>
            {inspection.comment && (
              <p className="text-gray-700"><strong>Comment:</strong> {inspection.comment}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">Created on {formatDate(inspection.created_at)}</p>
            {inspection.updated_at && (
              <p className="text-sm text-gray-500">Updated on {formatDate(inspection.updated_at)}</p>
            )}
            <a href={`/inspection/${inspection.id}`} className="text-blue-500 hover:underline mt-2 block">View Inspection</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AddressInspections;
