import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';  // Import Link from react-router-dom
import UnitComments from './UnitComments';  // Import UnitComments component

const AddressUnitDetail = () => {
  const { unitId } = useParams();  // Ensure this matches the route parameter name
  const [unit, setUnit] = useState(null);
  const [editing, setEditing] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
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
          {editing ? (
            <form
              className="inline-flex items-center"
              onSubmit={async (e) => {
                e.preventDefault();
                if (newUnitNumber === unit.number || newUnitNumber.trim() === "") {
                  setEditing(false);
                  return;
                }
                // Check for duplicate unit number before showing confirm
                try {
                  const res = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${address.id}/units`);
                  if (!res.ok) throw new Error('Failed to fetch units');
                  const units = await res.json();
                  const duplicate = units.find(u => u.number === newUnitNumber && u.id !== unit.id);
                  if (duplicate) {
                    alert('A unit with this number already exists for this address.');
                    return;
                  }
                  setShowConfirm(true);
                } catch (err) {
                  alert('Error checking for duplicate unit number.');
                }
              }}
            >
              <input
                className="border border-gray-300 rounded px-2 py-1 text-lg mr-2"
                value={newUnitNumber}
                onChange={e => setNewUnitNumber(e.target.value)}
                autoFocus
              />
              <button type="submit" className="bg-green-500 text-white px-2 py-1 rounded mr-2">Save</button>
              <button type="button" className="bg-gray-300 px-2 py-1 rounded" onClick={() => setEditing(false)}>Cancel</button>
            </form>
          ) : (
            <>
              <span className="break-words">Unit {unit.number}</span>
              <button
                className="ml-3 px-4 py-2 text-base bg-yellow-400 rounded hover:bg-yellow-500 font-semibold shadow"
                onClick={() => {
                  setNewUnitNumber(unit.number);
                  setEditing(true);
                }}
              >Edit</button>
            </>
          )}
        </h1>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Confirm Update</h3>
            <p>Are you sure you want to change the unit number to <span className="font-bold">{newUnitNumber}</span>?</p>
            <div className="flex justify-end mt-4 space-x-2">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={async () => {
                  try {
                    const response = await fetch(`${process.env.REACT_APP_API_URL}/units/${unitId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ number: newUnitNumber })
                    });
                    if (!response.ok) throw new Error("Failed to update unit number");
                    const updated = await response.json();
                    setUnit((prev) => ({ ...prev, number: updated.number }));
                    setEditing(false);
                    setShowConfirm(false);
                  } catch (err) {
                    alert("Error updating unit number.");
                    setShowConfirm(false);
                  }
                }}
              >
                Yes, Update
              </button>
              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
