import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const AddressDetails = () => {
  const { id } = useParams(); // Extract the address ID from the URL
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch the details of a specific address using the ID from the URL
    fetch(`https://www.riverdaleparkcode.com/api/v1/addresses/${id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch address details');
        }
        return response.json();
      })
      .then(data => {
        setAddress(data); // Set the fetched address details
        setLoading(false);
      })
      .catch(error => {
        setError(error.message);
        setLoading(false);
      });
  }, [id]); // Re-run this effect whenever the id changes

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Address Details</h1>
      {address ? (
        <div>
          <p><strong>Address ID:</strong> {address.id}</p>
          <p><strong>Combined Address:</strong> {address.combadd}</p>
          <p><strong>Owner Name:</strong> {address.ownername}</p>
          {/* Add other fields as needed */}
        </div>
      ) : (
        <p>No details available for this address.</p>
      )}
    </div>
  );
};

export default AddressDetails;
