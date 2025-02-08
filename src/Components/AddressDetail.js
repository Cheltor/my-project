import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AddressPhotos from './Address/AddressPhotos'; // Update the import statement
import Citations from './Address/AddressCitations';
import Violations from './Address/AddressViolations';
import Comments from './Address/AddressComments';
import Complaints from './Address/AddressComplaints';
import Inspections from './Address/AddressInspections';
import useUnitSearch from './Address/useUnitSearch';
import NewUnit from './Inspection/NewUnit';  // Import NewUnit component

const AddressDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();  // Initialize useNavigate
  const [address, setAddress] = useState(null);
  const [units, setUnits] = useState([]);  // State to store units
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('comments');
  const { searchTerm, showDropdown, filteredUnits, handleSearchChange, handleDropdownSelect } = useUnitSearch(id);
  const [showNewUnitForm, setShowNewUnitForm] = useState(false);  // State to toggle NewUnit form

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.REACT_APP_API_URL}/addresses/${id}`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch address');
        return response.json();
      })
      .then((data) => {
        console.log('Fetched address:', data);  // Debug log
        setAddress(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/addresses/${id}/units`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch units');
        return response.json();
      })
      .then((data) => {
        console.log('Fetched units:', data);  // Debug log
        setUnits(data);
      })
      .catch((error) => {
        setError(error.message);
      });
  }, [id]);

  const handleUnitSelect = (unitId) => {
    navigate(`/address/${id}/unit/${unitId}`);
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  if (!address) return <div className="text-center mt-10">No address details available.</div>;

  console.log('Address units:', units);  // Debug log

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10 space-y-8">
      {/* Address Information */}
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 flex flex-wrap items-center">
          {address.property_name && (
            <>
              <span className="break-words">{address.property_name}</span>
              <span className="mx-2 hidden sm:inline">-</span>
            </>
          )}
          <span className="break-words">{address.combadd}</span>
        </h1>

        <h2 className="text-2xl font-semibold text-gray-700">Owner Name</h2>
        <p className="text-lg text-gray-600">{address.ownername}</p>

        {address.aka && (
          <>
            <h2 className="text-2xl font-semibold text-gray-700">AKA:</h2>
            <p className="text-lg text-gray-600">{address.aka}</p>
          </>
        )}
      </div>

      {/* Unit Search Input with Dropdown */}
      {units.length > 5 && (
        <div className="relative mb-4">
          <label htmlFor="unit-search" className="block text-lg font-semibold text-gray-700">
            Search Units by Number:
          </label>
          <input
            type="text"
            id="unit-search"
            placeholder="Enter unit number..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          
          {showDropdown && (
            <div className="absolute w-full bg-white shadow-md rounded-md z-50 mt-1 max-h-60 overflow-auto">
              <ul>
                {filteredUnits.map((unit) => (
                  <li
                    key={unit.id}
                    onMouseDown={() => handleUnitSelect(unit.id)}  // Navigate to unit detail page
                    className="cursor-pointer p-2 hover:bg-gray-200"
                  >
                    Unit {unit.number}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Button to toggle NewUnit form */}
      <div className="mb-4">
        <button
          onClick={() => setShowNewUnitForm(!showNewUnitForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500"
        >
          {showNewUnitForm ? 'Cancel' : 'Add New Unit'}
        </button>
      </div>

      {/* Conditionally render NewUnit form */}
      {showNewUnitForm && <NewUnit addressId={id} inspectionId={null} />}

      {/* Display existing units as buttons */}
      <div className="mb-4 text-center">
        {units.length > 0 ? (
          <div>
            {units.length <= 5 ? (
              <div className="flex flex-wrap space-x-2">
                {units.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => handleUnitSelect(unit.id)}  // Navigate to unit detail page
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-100"
                  >
                    Unit {unit.number}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-600"></p>
            )}
          </div>
        ) : (
          <p className="text-gray-600">No units for this address in CodeSoft.</p>
        )}
      </div>

      {/* Pill-style Tab Navigation with Icons */}
      <div className="flex space-x-2 overflow-x-auto py-2 scrollbar-hide">
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'comments' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('comments')}
        >
          <i className="fas fa-comments mr-1"></i> Comments
        </button>
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'violations' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('violations')}
        >
          <i className="fas fa-exclamation-circle mr-1"></i> Violations
        </button>
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'photos' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('photos')}
        >
          <i className="fas fa-camera mr-1"></i> Photos
        </button>
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'citations' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('citations')}
        >
          <i className="fas fa-file-alt mr-1"></i> Citations
        </button>
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'inspections' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('inspections')}
        >
          <i className="fas fa-search mr-1"></i> Inspections
        </button>
        <button
          className={`px-4 py-2 rounded-full ${
            activeTab === 'complaints' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
          onClick={() => setActiveTab('complaints')}
        >
          <i className="fas fa-bullhorn mr-1"></i> Complaints
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'photos' && <AddressPhotos addressId={id} />}
        {activeTab === 'citations' && <Citations addressId={id} />}
        {activeTab === 'comments' && <Comments addressId={id} />}
        {activeTab === 'violations' && <Violations addressId={id} />}
        {activeTab === 'inspections' && <Inspections addressId={id} />}
        {activeTab === 'complaints' && <Complaints addressId={id} />}
      </div>
    </div>
  );
};

export default AddressDetails;
