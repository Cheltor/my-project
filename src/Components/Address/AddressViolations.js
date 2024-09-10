import React, { useState, useEffect } from 'react';

// Utility function to format the date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const AddressViolations = ({ addressId }) => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);  // For loading state
  const [error, setError] = useState(null);      // For error state

  useEffect(() => {
    // Fetch violations for the specific address
    fetch(`http://localhost:3000/api/v1/addresses/${addressId}/violations`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch violations');
        }
        return response.json();
      })
      .then((data) => {
        setViolations(data);  // Set the fetched violations
        setLoading(false);   // Set loading to false once data is fetched
      })
      .catch((error) => {
        setError(error.message);  // Handle any errors
        setLoading(false);
      });
  }, [addressId]);

  if (loading) {
    return <p>Loading violations...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (violations.length === 0) {
    return <p>No violations available.</p>;
  }

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Violations</h2>
      <ul className="space-y-4 mt-4">
        {violations.map((violation) => (
          <li key={violation.id} className="bg-gray-100 p-4 rounded-lg shadow">
            <p className="text-gray-700">Violation Type: {violation.violation_type}</p>
            <p className="text-gray-700">Status: {violation.status}</p>
            {violation.deadline && (
              <p className="text-gray-700">Deadline: {violation.deadline}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">Created on {formatDate(violation.created_at)}</p>
            {violation.updated_at && (
              <p className="text-sm text-gray-500">Updated on {formatDate(violation.updated_at)}</p>
            )}
            {violation.comment && (
              <p className="text-sm text-gray-500">Comment: {violation.comment}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AddressViolations;
