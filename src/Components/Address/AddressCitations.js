import React, { useState, useEffect } from 'react';

// Utility function to format the date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const AddressCitations = ({ addressId }) => {
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(true);  // For loading state
  const [error, setError] = useState(null);      // For error state

  useEffect(() => {
    // Fetch citations for the specific address
    fetch(`${process.env.REACT_APP_API_URL}/citations/address/${addressId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch citations');
        }
        return response.json();
      })
      .then((data) => {
        setCitations(data);  // Set the fetched citations
        setLoading(false);   // Set loading to false once data is fetched
      })
      .catch((error) => {
        setError(error.message);  // Handle any errors
        setLoading(false);
      });
  }, [addressId]);

  if (loading) {
    return <p>Loading citations...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (citations.length === 0) {
    return <p>No citations available.</p>;
  }

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Citations</h2>
      <ul className="space-y-4 mt-4">
        {citations.map((citation) => (
          <li key={citation.id} className="bg-gray-100 p-4 rounded-lg shadow">
            <p className="text-gray-700">Violation ID: {citation.violation_id}</p>
            {citation.deadline && (
              <p className="text-gray-700">Deadline: {citation.deadline}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">Created on {formatDate(citation.created_at)}</p>
            {citation.updated_at && (
              <p className="text-sm text-gray-500">Updated on {formatDate(citation.updated_at)}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AddressCitations;
