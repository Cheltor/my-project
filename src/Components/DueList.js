import React, { useState, useEffect } from 'react';

const DueList = () => {
  // State to store the count of addresses
  const [addressCount, setAddressCount] = useState(0);
  // State to handle loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Function to fetch the addresses count from the API
    const fetchAddresses = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/addresses/');
        if (!response.ok) {
          throw new Error('Failed to fetch addresses');
        }
        const data = await response.json();
        setAddressCount(data.length); // Assuming data is an array of addresses
        setLoading(false); // Stop loading when data is fetched
      } catch (error) {
        setError(error.message);
        setLoading(false); // Stop loading on error
      }
    };

    fetchAddresses(); // Call the function to fetch addresses
  }, []); // Empty dependency array means this runs only once after the initial render

  // Render component content
  return (
    <div>
      <h1>DueList Page</h1>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p>Error: {error}</p>
      ) : (
        <p>Total Addresses: {addressCount}</p>
      )}
      <p>This is the DueList page content.</p>
    </div>
  );
};

export default DueList;
