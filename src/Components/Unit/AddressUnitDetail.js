import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';  // Import Link from react-router-dom
import UnitComments from './UnitComments';  // Import UnitComments component
import { useAuth } from '../../AuthContext';

const AddressUnitDetail = () => {
  const { unitId } = useParams();  // Ensure this matches the route parameter name
  const { user } = useAuth();
  const [unit, setUnit] = useState(null);
  const [editing, setEditing] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [address, setAddress] = useState(null);  // State to store address details
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Quick comment (mobile) state
  const [quickContent, setQuickContent] = useState('');
  const [quickFiles, setQuickFiles] = useState([]);
  const [submittingQuick, setSubmittingQuick] = useState(false);
  const fileInputRef = useRef(null);
  const [commentsRefreshKey, setCommentsRefreshKey] = useState(0);

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
    <div className="max-w-4xl mx-auto px-5 pt-4 pb-36 sm:pb-6 bg-white shadow-md rounded-lg mt-10 space-y-8">
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
      <UnitComments key={`unit-comments-${commentsRefreshKey}`} unitId={unitId} addressId={address.id} />

      {/* Sticky Quick Unit Comment Bar (mobile only) */}
      <div className="fixed inset-x-0 bottom-0 sm:hidden z-40">
        <div className="mx-auto max-w-4xl px-4 py-4 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user?.id || !address?.id) return;
              if (!quickContent.trim() && quickFiles.length === 0) return;
              setSubmittingQuick(true);
              try {
                if (quickFiles.length > 0) {
                  const formData = new FormData();
                  formData.append('content', quickContent.trim() || '');
                  formData.append('user_id', String(user.id));
                  formData.append('address_id', String(address.id));
                  for (const f of quickFiles) formData.append('files', f);
                  const res = await fetch(`${process.env.REACT_APP_API_URL}/comments/unit/${unitId}/`, {
                    method: 'POST',
                    body: formData,
                  });
                  if (!res.ok) throw new Error('Failed to post unit comment with file');
                } else {
                  const res = await fetch(`${process.env.REACT_APP_API_URL}/comments/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      content: quickContent.trim(),
                      user_id: user.id,
                      address_id: address.id,
                      unit_id: Number(unitId),
                    }),
                  });
                  if (!res.ok) throw new Error('Failed to post unit comment');
                }
                // Reset and refresh
                setQuickContent('');
                setQuickFiles([]);
                setCommentsRefreshKey((k) => k + 1);
              } catch (err) {
                console.error(err);
              } finally {
                setSubmittingQuick(false);
              }
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                title="Add photo"
                aria-label="Add photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                  <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  setQuickFiles((prev) => {
                    const merged = [...prev];
                    for (const f of files) {
                      const dup = merged.find(
                        (m) => m.name === f.name && m.size === f.size && m.lastModified === f.lastModified
                      );
                      if (!dup) merged.push(f);
                    }
                    return merged;
                  });
                  e.target.value = null;
                }}
              />

              <input
                type="text"
                placeholder="Add a comment..."
                value={quickContent}
                onChange={(e) => setQuickContent(e.target.value)}
                className="flex-1 h-14 rounded-lg border border-gray-300 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {quickFiles.length > 0 && (
              <div className="flex items-center justify-start gap-3">
                <span className="text-base text-gray-700 whitespace-nowrap px-3 py-2 bg-gray-100 rounded-md">
                  {quickFiles.length} file{quickFiles.length > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setQuickFiles([])}
                  className="text-sm text-gray-700 hover:text-gray-900 underline"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={submittingQuick || (!quickContent.trim() && quickFiles.length === 0) || !user?.id}
                className="inline-flex items-center justify-center h-14 px-8 rounded-lg bg-indigo-600 text-white text-lg font-semibold hover:bg-indigo-500 disabled:bg-gray-300 min-w-[10rem]"
              >
                {submittingQuick ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddressUnitDetail;
