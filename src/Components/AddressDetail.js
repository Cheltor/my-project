import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Photos from './Address/AddressPhotos';
import Citations from './Address/AddressCitations';
import Violations from './Address/AddressViolations';
import Comments from './Address/AddressComments';
import Complaints from './Address/AddressComplaints';
import Inspections from './Address/AddressInspections';

const AddressDetails = () => {
  const { id } = useParams();
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('comments'); // State to track the active tab

  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/addresses/${id}`)  // Make sure 'id' is correct
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch address');
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched address data:", data);  // Debug log to verify state
        setAddress(data);  // Store the address data in state
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [id]);  // Dependency on id (ensure it's defined)
  

  if (loading) return <div className="flex justify-center items-center h-screen"><div>Loading...</div></div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  if (!address) return <div className="text-center mt-10">No address details available.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10 space-y-8">

    {/* Display Combined Address (combadd) */}
    {address && (
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
          {/* Conditionally render Property Name if it exists */}
          {address.property_name && (
            <>
              <span>{address.property_name}</span>
              <span className="mx-2">-</span> {/* Separator between property_name and combadd */}
            </>
          )}
          <span>{address.combadd}</span> {/* Always render combined address */}
        </h1>

        <h2 className="text-2xl font-semibold text-gray-700">Owner Name</h2>
        <p className="text-lg text-gray-600">{address.ownername}</p> {/* Access the owner name */}
        
        {/* Conditionally render AKA if not null */}
        {address.aka && (
          <>
            <h2 className="text-2xl font-semibold text-gray-700">AKA:</h2>
            <p className="text-lg text-gray-600">{address.aka}</p>
          </>
        )}
      </div>
    )}


      {address && (
        <>
          {/* Tab Navigation */}
          <div className="flex justify-center space-x-6 border-b-2 pb-2 overflow-x-auto">
  <button
    className={`px-4 py-2 ${activeTab === 'comments' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
    onClick={() => setActiveTab('comments')}
  >
    Comments
  </button>
  <button
    className={`px-4 py-2 ${activeTab === 'violations' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
    onClick={() => setActiveTab('violations')}
  >
    Violations
  </button>
  <button
    className={`px-4 py-2 ${activeTab === 'photos' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
    onClick={() => setActiveTab('photos')}
  >
    Photos
  </button>
  <button
    className={`px-4 py-2 ${activeTab === 'citations' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
    onClick={() => setActiveTab('citations')}
  >
    Citations
  </button>
  <button
    className={`px-4 py-2 ${activeTab === 'inspections' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
    onClick={() => setActiveTab('inspections')}
  >
    Inspections
  </button>
  <button
    className={`px-4 py-2 ${activeTab === 'complaints' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
    onClick={() => setActiveTab('complaints')}
  >
    Complaints
  </button>
</div>


          {/* Render content based on active tab */}
          <div className="mt-6">
            {activeTab === 'photos' && <Photos photos={address.photos} />}
            {activeTab === 'citations' && <Citations addressId={id} />}
            {activeTab === 'comments' && <Comments addressId={id} />}
            {activeTab === 'violations' && <Violations addressId={id} />}
            {activeTab === 'inspections' && <Inspections addressId={id} />}
            {activeTab === 'complaints' && <Complaints addressId={id} />}
          </div>
        </>
      )}
    </div>
  );
};

export default AddressDetails;
