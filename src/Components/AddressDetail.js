import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Photos from './Address/AddressPhotos';
import Citations from './Address/AddressCitations';
import Timeline from './Address/AddressTimeline';

const AddressDetails = () => {
  const { id } = useParams();
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline'); // State to track the active tab

  useEffect(() => {
    fetch(`http://localhost:3000/api/v1/addresses/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch address details');
        }
        return response.json();
      })
      .then((data) => {
        setAddress(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="flex justify-center items-center h-screen"><div>Loading...</div></div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Address Details</h1>

      {/* Display Combined Address (combadd) */}
      {address && address.address && (
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-gray-700">Combined Address</h2>
          <p className="text-lg text-gray-600">{address.address.combadd}</p> {/* Access the combined address */}
        </div>
      )}

      {address && (
        <>
          {/* Tab Navigation */}
          <div className="flex justify-center space-x-6 border-b-2 pb-2">
            <button 
              className={`px-4 py-2 ${activeTab === 'timeline' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
              onClick={() => setActiveTab('timeline')}
            >
              Timeline
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
          </div>

          {/* Render content based on active tab */}
          <div className="mt-6">
            {activeTab === 'photos' && <Photos photos={address.photos} />}
            {activeTab === 'timeline' && <Timeline timeline={address.timeline} />}
            {activeTab === 'citations' && <Citations citations={address.citations} />}
          </div>
        </>
      )}
    </div>
  );
};

export default AddressDetails;
