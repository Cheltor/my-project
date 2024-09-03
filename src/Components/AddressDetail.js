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
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch address details');
        }
        return response.json();
      })
      .then((data) => {
        setAddress(data); // Set the fetched address details
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [id]); // Re-run this effect whenever the id changes

  if (loading) return <div className="flex justify-center items-center h-screen"><div>Loading...</div></div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Address Details</h1>
      {address ? (
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Basic Information</h2>
            <p className="text-sm text-gray-600"><strong>Address ID:</strong> {address.id}</p>
            <p className="text-sm text-gray-600"><strong>Combined Address:</strong> {address.combadd}</p>
            <p className="text-sm text-gray-600"><strong>Owner Name:</strong> {address.ownername}</p>
            <p className="text-sm text-gray-600"><strong>Owner Address:</strong> {address.owneraddress}, {address.ownercity}, {address.ownerstate} {address.ownerzip}</p>
            <p className="text-sm text-gray-600"><strong>Property ID:</strong> {address.property_id}</p>
          </div>
          <div className="border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Property Details</h2>
            <p className="text-sm text-gray-600"><strong>Street Number:</strong> {address.streetnumb}</p>
            <p className="text-sm text-gray-600"><strong>Street Name:</strong> {address.streetname} {address.streettype}</p>
            <p className="text-sm text-gray-600"><strong>Land Use Code:</strong> {address.landusecode}</p>
            <p className="text-sm text-gray-600"><strong>Zoning:</strong> {address.zoning}</p>
            <p className="text-sm text-gray-600"><strong>District:</strong> {address.district}</p>
            <p className="text-sm text-gray-600"><strong>Vacancy Status:</strong> {address.vacancy_status}</p>
          </div>
          <div className="border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Additional Information</h2>
            <p className="text-sm text-gray-600"><strong>Owner Occupied:</strong> {address.owneroccupiedin === 'Y' ? 'Yes' : 'No'}</p>
            <p className="text-sm text-gray-600"><strong>Created At:</strong> {new Date(address.created_at).toLocaleDateString()}</p>
            <p className="text-sm text-gray-600"><strong>Updated At:</strong> {new Date(address.updated_at).toLocaleDateString()}</p>
            <p className="text-sm text-gray-600"><strong>Latitude:</strong> {address.latitude}</p>
            <p className="text-sm text-gray-600"><strong>Longitude:</strong> {address.longitude}</p>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-600">No details available for this address.</p>
      )}
    </div>
  );
};

export default AddressDetails;
