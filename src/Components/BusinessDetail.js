import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const BusinessDetails = () => {
  const { id } = useParams(); // Extract the business ID from the URL
  const [business, setBusiness] = useState(null); // State to store business details
  const [loading, setLoading] = useState(true); // State to manage loading state
  const [error, setError] = useState(null); // State to manage error state

  useEffect(() => {
    // Fetch the details of a specific business using the ID from the URL
    fetch(`https://www.riverdaleparkcode.com/api/v1/businesses/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch business details');
        }
        return response.json();
      })
      .then((data) => {
        setBusiness(data); // Set the fetched business details
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message); // Set error state if the fetch fails
        setLoading(false);
      });
  }, [id]); // Dependency array includes id to refetch if it changes

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Business Details</h1>
      {business ? (
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Basic Information</h2>
            <p className="text-sm text-gray-600"><strong>Business Name:</strong> {business.name}</p>
            <p className="text-sm text-gray-600"><strong>Email:</strong> <a href={`mailto:${business.email}`} className="text-indigo-600 hover:text-indigo-800">{business.email}</a></p>
            <p className="text-sm text-gray-600"><strong>Phone:</strong> {business.phone || 'N/A'}</p>
            <p className="text-sm text-gray-600"><strong>Website:</strong> {business.website ? <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">{business.website}</a> : 'N/A'}</p>
          </div>
          <div className="border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Address Information</h2>
            {business.address ? (
              <>
                <p className="text-sm text-gray-600"><strong>Combined Address:</strong> {business.address.combadd}</p>
                <p className="text-sm text-gray-600"><strong>Owner Name:</strong> {business.address.ownername}</p>
                <p className="text-sm text-gray-600"><strong>Land Use Code:</strong> {business.address.landusecode}</p>
                <p className="text-sm text-gray-600"><strong>Zoning:</strong> {business.address.zoning}</p>
                <p className="text-sm text-gray-600"><strong>Property Type:</strong> {business.address.property_type}</p>
                <p className="text-sm text-gray-600"><strong>Owner Occupied:</strong> {business.address.owneroccupiedin === 'Y' ? 'Yes' : 'No'}</p>
                <p className="text-sm text-gray-600"><strong>Latitude:</strong> {business.address.latitude}</p>
                <p className="text-sm text-gray-600"><strong>Longitude:</strong> {business.address.longitude}</p>
              </>
            ) : (
              <p className="text-sm text-gray-600">No address information available.</p>
            )}
          </div>
          <div className="border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Additional Information</h2>
            <p className="text-sm text-gray-600"><strong>Created At:</strong> {new Date(business.created_at).toLocaleDateString()}</p>
            <p className="text-sm text-gray-600"><strong>Updated At:</strong> {new Date(business.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-600">No details available for this business.</p>
      )}
    </div>
  );
};

export default BusinessDetails;
