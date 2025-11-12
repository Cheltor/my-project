import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import { getRoleName, formatPhoneNumber, toEasternLocaleDateString } from './../utils'; // Import utility functions

const Users = () => {
  const [users, setUsers] = useState([]); // State to store all users
  const [loading, setLoading] = useState(true); // State to manage loading state
  const [error, setError] = useState(null); // State to manage error state
  const [currentPage, setCurrentPage] = useState(1); // State for the current page
  const usersPerPage = 10; // Number of users to display per page

  const [searchTerm, setSearchTerm] = useState(''); // State for text-based filtering
  const [selectedRole, setSelectedRole] = useState(''); // State for role filter

  useEffect(() => {
    // Fetch users from the API or use static data for testing
    fetch(`${process.env.REACT_APP_API_URL}/users/`) // Replace with actual endpoint
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        return response.json();
      })
      .then((data) => {
        setUsers(data); // Store the fetched users in the state
        setLoading(false); // Set loading to false after fetching data
      })
      .catch((error) => {
        setError(error.message); // Set error state if the fetch fails
        setLoading(false);
      });
  }, []); // Empty dependency array ensures this runs once when the component mounts

  // Calculate the total number of pages
  const totalPages = Math.ceil(users.length / usersPerPage);

  // Filter users based on search term and selected filters
  const filteredUsers = users.filter((user) => {
    const matchesSearchTerm =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = selectedRole ? user.role === parseInt(selectedRole) : true;

    return matchesSearchTerm && matchesRole;
  });

  // Get the current set of users to display
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Get unique roles for filtering options
  const uniqueRoles = [...new Set(users.map((user) => user.role))];

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Users</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of users including their email, name, phone, role, and creation date.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">All Roles</option>
          {uniqueRoles.map((role) => (
            <option key={role} value={role}>
              {getRoleName(role)}
            </option>
          ))}
        </select>
      </div>

      {/* Responsive Table Container */}
      <div className="mt-8 flow-root">
        <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter sm:pl-6 lg:pl-8"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Phone
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user, idx) => (
                  <tr key={user.id}>
                    <td
                      className={classNames(
                        idx !== currentUsers.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
                      )}
                    >
                      <Link to={`/users/${user.id}`} className="text-indigo-600 hover:text-indigo-900">
                        {user.name || 'N/A'}
                      </Link>
                    </td>
                    <td
                      className={classNames(
                        idx !== currentUsers.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 lg:pl-8',
                      )}
                    >
                      <a href={`mailto:${user.email}`} className="text-indigo-600 hover:text-indigo-900">
                        {user.email}
                      </a>
                    </td>
                    <td
                      className={classNames(
                        idx !== currentUsers.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
                      )}
                    >
                      {user.phone ? (
                        <a href={`tel:${user.phone}`} className="text-indigo-600 hover:text-indigo-900">
                          {formatPhoneNumber(user.phone)}
                        </a>
                      ) : (
                        <span>N/A</span>
                      )}
                    </td>
                    <td
                      className={classNames(
                        idx !== currentUsers.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
                      )}
                    >
                      {getRoleName(user.role)}
                    </td>
                    <td
                      className={classNames(
                        idx !== currentUsers.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
                      )}
                    >
                      {toEasternLocaleDateString(user.created_at) || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:bg-gray-300"
        >
          Previous
        </button>
        <p className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </p>
        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:bg-gray-300"
        >
          Next
        </button>
      </div>
    </div>
  );
};

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default Users;
