import React, { useState, useEffect } from 'react';

// Utility function to format the date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const AddressComplaints = ({ addressId }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);  // For loading state
  const [error, setError] = useState(null);      // For error state

  useEffect(() => {
    // Fetch complaints for the specific address
    fetch(`http://127.0.0.1:8000/complaints/address/${addressId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch complaints');
        }
        return response.json();
      })
      .then((data) => {
        setComplaints(data);  // Set the fetched complaints
        setLoading(false);   // Set loading to false once data is fetched
      })
      .catch((error) => {
        setError(error.message);  // Handle any errors
        setLoading(false);
      });
  }, [addressId]);

  if (loading) {
    return <p>Loading complaints...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (complaints.length === 0) {
    return <p>No complaints available.</p>;
  }

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Complaints</h2>
      <ul className="space-y-4 mt-4">
        {complaints.map((complaint) => (
          <li key={complaint.id} className="bg-gray-100 p-4 rounded-lg shadow">
            <p className="text-gray-700"><strong>Status:</strong> {complaint.status || 'Pending'}</p>
            <p className="text-gray-700"><strong>Complaint Type:</strong> {complaint.complaint_type || 'N/A'}</p>
            {complaint.comment && (
              <p className="text-gray-700"><strong>Comment:</strong> {complaint.comment}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">Created on {formatDate(complaint.created_at)}</p>
            {complaint.updated_at && (
              <p className="text-sm text-gray-500">Updated on {formatDate(complaint.updated_at)}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AddressComplaints;
