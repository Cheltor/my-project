import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatPhoneNumber, formatWebsite } from '../utils';

const BusinessesList = () => {
  const [businesses, setBusinesses] = useState([]); // State to store all businesses
  const [loading, setLoading] = useState(true); // State to manage loading state
  const [error, setError] = useState(null); // State to manage error state
  const [currentPage, setCurrentPage] = useState(1); // State for the current page
  const [searchQuery, setSearchQuery] = useState(''); // State for search query
  const businessesPerPage = 10; // Number of businesses to display per page

  useEffect(() => {
    // Fetch businesses from the API
    fetch('https://civicode-2eae16143963.herokuapp.com/businesses/') // Replace with the actual endpoint
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch businesses');
        }
        return response.json();
      })
      .then((data) => {
        setBusinesses(data); // Store the fetched businesses in the state
        setLoading(false); // Set loading to false after fetching data
      })
      .catch((error) => {
        setError(error.message); // Set error state if the fetch fails
        setLoading(false);
      });
  }, []); // Empty dependency array ensures this runs once when the component mounts

  // Filter businesses based on search query
  const filteredBusinesses = businesses.filter((business) => {
    return (
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (business.email && business.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (business.phone && business.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (business.address && business.address.combadd && business.address.combadd.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Calculate the total number of pages
  const totalPages = Math.ceil(filteredBusinesses.length / businessesPerPage);

  // Get the current set of businesses to display
  const indexOfLastBusiness = currentPage * businessesPerPage;
  const indexOfFirstBusiness = indexOfLastBusiness - businessesPerPage;
  const currentBusinesses = filteredBusinesses.slice(indexOfFirstBusiness, indexOfLastBusiness);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle search query change
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><div>Loading...</div></div>;
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
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add business
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
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* Business List Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th scope="col" className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter">
                    Name
                  </th>
                  <th scope="col" className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter">
                    Address
                  </th>
                  <th scope="col" className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter">
                    Phone
                  </th>
                  <th scope="col" className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter">
                    Email
                  </th>
                  <th scope="col" className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter">
                    Website
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentBusinesses.map((business, idx) => (
                  <tr key={business.id}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <Link to={`/business/${business.id}`} className="text-indigo-600 hover:text-indigo-900">
                        {business.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {business.address ? business.address.combadd : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <a href={`tel:${formatPhoneNumber(business.phone)}`}>{formatPhoneNumber(business.phone) || 'N/A'}</a>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {business.email ? (
                        <a href={`mailto:${business.email}`} className="text-indigo-600 hover:text-indigo-900">
                          {business.email}
                        </a>
                      ) : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
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

export default BusinessesList;
