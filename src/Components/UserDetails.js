import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getRoleName, roles, formatPhoneNumber, toEasternLocaleDateString, isUserActive } from './../utils'; // Import the utility function and roles

const UserDetail = () => {
  const { id } = useParams(); // Extract the user ID from the URL
  const [user, setUser] = useState(null); // State to store user details
  const [loading, setLoading] = useState(true); // State to manage loading state
  const [error, setError] = useState(null); // State to manage error state
  const [isEditing, setIsEditing] = useState(false); // State to manage edit mode

  useEffect(() => {
    // Fetch the details of a specific user using the ID from the URL
    fetch(`${process.env.REACT_APP_API_URL}/users/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch user details');
        }
        return response.json();
      })
      .then((data) => {
        // Default to active when the API doesn't send an explicit value
        const normalized = data && typeof data.active === 'undefined' ? { ...data, active: true } : data;
        setUser(normalized); // Set the fetched user details
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message); // Set error state if the fetch fails
        setLoading(false);
      });
  }, [id]); // Dependency array includes id to refetch if it changes

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
  };

  const handleActiveToggle = (e) => {
    setUser({ ...user, active: e.target.checked });
  };

  const handleSave = () => {
    // Save the updated user details
    fetch(`${process.env.REACT_APP_API_URL}/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to update user details');
        }
        return response.json();
      })
      .then((data) => {
        setUser(data); // Update the user details with the response data
        setIsEditing(false); // Exit edit mode
      })
      .catch((error) => {
        setError(error.message); // Set error state if the update fails
      });
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">User Details</h1>
      {user ? (
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Basic Information</h2>
            <div className="text-sm text-gray-600">
              <strong>Email:</strong>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={user.email}
                  onChange={handleInputChange}
                  className="ml-2 border border-gray-300 rounded-md p-1"
                />
              ) : (
                <a href={`mailto:${user.email}`} className="ml-2 text-indigo-600 hover:text-indigo-900">
                  {user.email}
                </a>
              )}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Name:</strong>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={user.name || ''}
                  onChange={handleInputChange}
                  className="ml-2 border border-gray-300 rounded-md p-1"
                />
              ) : (
                <span className="ml-2">{user.name || 'N/A'}</span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Phone:</strong>
              {isEditing ? (
                <input
                  type="text"
                  name="phone"
                  value={user.phone || ''}
                  onChange={handleInputChange}
                  className="ml-2 border border-gray-300 rounded-md p-1"
                />
              ) : user.phone ? (
                <a href={`tel:${user.phone}`} className="ml-2 text-indigo-600 hover:text-indigo-900">
                  {formatPhoneNumber(user.phone)}
                </a>
              ) : (
                <span className="ml-2">N/A</span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Role:</strong>
              {isEditing ? (
                <select
                  name="role"
                  value={user.role}
                  onChange={handleInputChange}
                  className="ml-2 border border-gray-300 rounded-md p-1"
                >
                  {Object.keys(roles).map((key) => (
                    <option key={key} value={key}>
                      {roles[key]}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="ml-2">{getRoleName(user.role)}</span>
              )}
            </div>
            <div className="text-sm text-gray-600 flex items-center">
              <strong>Status:</strong>
              {isEditing ? (
                <label className="ml-2 inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="active"
                    checked={isUserActive(user)}
                    onChange={handleActiveToggle}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Active (can receive assignments)
                </label>
              ) : isUserActive(user) ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Active
                </span>
              ) : (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                  Inactive
                </span>
              )}
            </div>
          </div>
          <div className="border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Timestamps</h2>
            <p className="text-sm text-gray-600"><strong>Created At:</strong> {toEasternLocaleDateString(user.created_at) || '—'}</p>
            <p className="text-sm text-gray-600"><strong>Updated At:</strong> {toEasternLocaleDateString(user.updated_at) || '—'}</p>
          </div>
          {isEditing ? (
            <button
              onClick={handleSave}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Save
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md"
            >
              Edit
            </button>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-600">No details available for this user.</p>
      )}
    </div>
  );
};

export default UserDetail;
