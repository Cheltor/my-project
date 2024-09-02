import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom

export default function Violations() {
  const [violations, setViolations] = useState([]); // State to store all violations
  const [loading, setLoading] = useState(true); // State to manage loading state
  const [error, setError] = useState(null); // State to manage error state
  const [currentPage, setCurrentPage] = useState(1); // State for the current page
  const [statusFilter, setStatusFilter] = useState('all'); // State for the status filter
  const violationsPerPage = 10; // Number of violations to display per page

  useEffect(() => {
    // Fetch violations from the API
    fetch('https://www.riverdaleparkcode.com/api/v1/violations') // Replace with the actual endpoint
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch violations');
        }
        return response.json();
      })
      .then((data) => {
        setViolations(data); // Store the fetched violations in the state
        setLoading(false); // Set loading to false after fetching data
      })
      .catch((error) => {
        setError(error.message); // Set error state if the fetch fails
        setLoading(false);
      });
  }, []); // Empty dependency array ensures this runs once when component mounts

  // Calculate the total number of pages
  const filteredViolations = statusFilter === 'all'
    ? violations
    : violations.filter(violation => violation.status === statusFilter);

  const totalPages = Math.ceil(filteredViolations.length / violationsPerPage);

  // Get the current set of violations to display
  const indexOfLastViolation = currentPage * violationsPerPage;
  const indexOfFirstViolation = indexOfLastViolation - violationsPerPage;
  const currentViolations = filteredViolations.slice(indexOfFirstViolation, indexOfLastViolation);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle filter change
  const handleFilterChange = (event) => {
    setStatusFilter(event.target.value); // Update the status filter
    setCurrentPage(1); // Reset to the first page when changing filter
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Violations</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all the violations including their status, type, and associated address.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add violation
          </button>
        </div>
      </div>
      {/* Filter UI */}
      <div className="mt-4">
        <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
          Filter by Status:
        </label>
        <select
          id="status-filter"
          name="status-filter"
          value={statusFilter}
          onChange={handleFilterChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="all">All</option>
          <option value="current">Current</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter sm:pl-6 lg:pl-8"
                  >
                    ID
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Address
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 py-3.5 pl-3 pr-4 backdrop-blur backdrop-filter sm:pr-6 lg:pr-8"
                  >
                    Deadline
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentViolations.map((violation, idx) => (
                  <tr key={violation.id}>
                    <td
                      className={classNames(
                        idx !== currentViolations.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 lg:pl-8',
                      )}
                    >
                      {violation.id}
                    </td>
                    <td
                      className={classNames(
                        idx !== currentViolations.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
                      )}
                    >
                      {/* Link to the violation details page */}
                      <Link to={`/violation/${violation.id}`} className="text-indigo-600 hover:text-indigo-900">
                        {violation.violation_type}
                      </Link>
                    </td>
                    <td
                      className={classNames(
                        idx !== currentViolations.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
                      )}
                    >
                      {violation.status}
                    </td>
                    <td
                      className={classNames(
                        idx !== currentViolations.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
                      )}
                    >
                      {/* Link to the address details page */}
                      {violation.address ? (
                        <Link to={`/address/${violation.address.id}`} className="text-indigo-600 hover:text-indigo-900">
                          {violation.address.combadd}
                        </Link>
                      ) : (
                        'No address'
                      )}
                    </td>
                    <td
                      className={classNames(
                        idx !== currentViolations.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
                      )}
                    >
                      {violation.deadline}
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
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}
