import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Violations() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const violationsPerPage = 10;


  // Map status integer to string for display
  const statusMapping = {
    0: 'current',
    1: 'resolved',
    2: 'pending trial',
    3: 'dismissed'
  };

  // Utility function for capitalizing first letter
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/violations/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch violations');
        }
        return response.json();
      })
      .then((data) => {
        setViolations(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const filteredViolations = statusFilter === 'all'
    ? violations
    : violations.filter(violation => statusMapping[violation.status] === statusFilter);

  const totalPages = Math.ceil(filteredViolations.length / violationsPerPage);
  const indexOfLastViolation = currentPage * violationsPerPage;
  const indexOfFirstViolation = indexOfLastViolation - violationsPerPage;
  const currentViolations = filteredViolations.slice(indexOfFirstViolation, indexOfLastViolation);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Violations</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all violations, including their status, type, and associated address.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
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
          className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="all">All</option>
          <option value="current">Current</option>
          <option value="resolved">Resolved</option>
          <option value="pending trial">Pending Trial</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {/* Responsive Table Container */}
      <div className="mt-8 overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deadline
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deadline Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentViolations.map((violation) => (
              <tr key={violation.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link to={`/violation/${violation.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {violation.violation_type}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span
                    className={classNames(
                      violation.status === 0 ? 'bg-red-100 text-red-800' : '',
                      violation.status === 1 ? 'bg-green-100 text-green-800' : '',
                      violation.status === 2 ? 'bg-yellow-100 text-yellow-800' : '',
                      violation.status === 3 ? 'bg-gray-100 text-gray-800' : '',
                      'px-2 py-1 rounded'
                    )}
                  >
                    {capitalize(statusMapping[violation.status])}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {violation.combadd ? (
                    <Link to={`/address/${violation.address_id}`} className="text-indigo-600 hover:text-indigo-900">
                      {violation.combadd}
                    </Link>
                  ) : (
                    'No address'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(violation.deadline_date).toLocaleDateString('en-US')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {(() => {
                    if (!violation.deadline_date) return '';
                    const deadline = new Date(violation.deadline_date);
                    const now = new Date();
                    const diffMs = deadline - now;
                    const diffDays = diffMs / (1000 * 60 * 60 * 24);
                    if (violation.status === 1) return '';
                    if (diffDays < 0) return <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded font-semibold">Past Due</span>;
                    if (diffDays <= 3) return <span className="bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded font-semibold">Approaching</span>;
                    return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-semibold">Plenty of Time</span>;
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
