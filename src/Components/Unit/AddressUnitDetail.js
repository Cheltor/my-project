import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';  // Import Link from react-router-dom
import UnitComments from './UnitComments';  // Import UnitComments component

const AddressUnitDetail = () => {
  const { unitId } = useParams();  // Ensure this matches the route parameter name
  const [unit, setUnit] = useState(null);
  const [address, setAddress] = useState(null);  // State to store address details
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.REACT_APP_API_URL}/units/${unitId}`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch unit');
        return response.json();
      })
      .then((data) => {
        setUnit(data);
        return fetch(`${process.env.REACT_APP_API_URL}/addresses/${data.address_id}`);  // Fetch address details
      })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch address');
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
  }, [unitId]);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  if (!unit || !address) return <div className="text-center mt-10">No unit or address details available.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10 space-y-8">
      {/* Unit Information */}
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 flex flex-wrap items-center">
          <span className="break-words">Unit {unit.number}</span>
        </h1>
      </div>
      
      {/* Address Information */}
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 flex flex-wrap items-center">
          {address.property_name && (
            <>
              <span className="break-words">{address.property_name}</span>
              <span className="mx-2 hidden sm:inline">-</span>
            </>
          )}
          <Link to={`/address/${address.id}`} className="break-words text-blue-500">
            {address.combadd}
          </Link>
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



      {/* Unit Comments */}
      <UnitComments unitId={unitId} addressId={address.id} />
    </div>
  );
};

export default AddressUnitDetail;
