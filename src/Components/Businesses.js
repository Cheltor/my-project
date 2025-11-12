import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatPhoneNumber, formatWebsite } from '../utils';
// useAuth not required here - removed unused import
import NewBusinessForm from './Business/NewBusinessForm';
import usePaginatedSearch from '../Hooks/usePaginatedSearch';
import PaginationControls from './Common/PaginationControls';

const BusinessesList = () => {
  // auth not used in this component
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const businessesPerPage = 10;

  const {
    searchQuery,
    handleSearchChange,
    currentPage,
    totalPages,
    currentItems: currentBusinesses,
    goToPage,
  } = usePaginatedSearch(businesses, {
    itemsPerPage: businessesPerPage,
    filterFn: (business, query) =>
      [business.name, business.email, business.phone, business.address?.combadd]
        .filter((field) => field !== undefined && field !== null)
        .some((field) => String(field).toLowerCase().includes(query)),
  });

  const loadBusinesses = () => {
    fetch(`${process.env.REACT_APP_API_URL}/businesses/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch businesses');
        }
        return response.json();
      })
      .then((data) => {
        setBusinesses(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  // Inline form logic removed; handled in NewBusinessForm

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Businesses</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all businesses including their name, owner, address, and status.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            {showForm ? 'Cancel' : 'Add business'}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="mt-4">
        <input
          type="text"
          placeholder="Search businesses..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* Add Business Form */}
      {showForm && (
        <NewBusinessForm
          onCancel={() => setShowForm(false)}
          onCreated={loadBusinesses}
        />
      )}

      {/* Business List Table */}
      <div className="mt-8 overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Website
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentBusinesses.map((business) => (
              <tr key={business.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link to={`/business/${business.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {business.name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Link to={`/address/${business.address?.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {business.address ? business.address.combadd : 'N/A'}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {business.phone ? (
                    <a href={`tel:${formatPhoneNumber(business.phone)}`} className="text-indigo-600 hover:text-indigo-900">
                      {formatPhoneNumber(business.phone)}
                    </a>
                  ) : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {business.email ? (
                    <a href={`mailto:${business.email}`} className="text-indigo-600 hover:text-indigo-900">
                      {business.email}
                    </a>
                  ) : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {business.website ? (
                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900">
                      {formatWebsite(business.website)}
                    </a>
                  ) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <PaginationControls
        className="mt-4"
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
      />
    </div>
  );
};

// removed unused helper classNames

export default BusinessesList;
