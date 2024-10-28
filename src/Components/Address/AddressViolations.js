import React, { useState, useEffect } from 'react';
import NewAddressViolation from './NewAddressViolation';

// Utility function to format the date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const AddressViolations = ({ addressId }) => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);  // For loading state
  const [error, setError] = useState(null);      // For error state

  // Define the status mapping object
  const statusMapping = {
    0: 'Current',
    1: 'Resolved',
    2: 'Pending Trial',
    3: 'Dismissed'
  };

    // Function to add a new violation to the list
    const handleViolationAdded = (newViolation) => {
      setViolations((prevViolations) => [newViolation, ...prevViolations]);
    };

  useEffect(() => {
    // Fetch violations for the specific address
    fetch(`${process.env.REACT_APP_API_URL}/violations/address/${addressId}`)
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
      
      {/* Render the NewAddressViolation form */}
      <NewAddressViolation addressId={addressId} onViolationAdded={handleViolationAdded} />


      <ul className="space-y-4 mt-4">
        {violations.map((violation) => (
          <li key={violation.id} className="bg-gray-100 p-4 rounded-lg shadow">
            <p className="text-gray-700">Violation Type: {violation.violation_type}</p>
            <p className="text-gray-700">
              Status: 
              <span
                className={`ml-2 px-2 py-1 rounded ${
                  violation.status === 0 ? 'bg-red-100 text-red-800' :
                  violation.status === 1 ? 'bg-green-100 text-green-800' :
                  violation.status === 2 ? 'bg-yellow-100 text-yellow-800' :
                  violation.status === 3 ? 'bg-gray-100 text-gray-800' : ''
                }`}
              >
                {statusMapping[violation.status]}
              </span>
            </p>
            {violation.deadline_date && (
              <p className="text-gray-700">Deadline: {new Date(violation.deadline_date).toLocaleDateString('en-US')}</p>
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
