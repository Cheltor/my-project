import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Inspections() {
  const [inspections, setInspections] = useState([]); // State to store all inspections
  const [loading, setLoading] = useState(true); // State to manage loading state
  const [error, setError] = useState(null); // State to manage error state
  const [currentPage, setCurrentPage] = useState(1); // State for the current page
  const inspectionsPerPage = 10; // Number of inspections to display per page

  useEffect(() => {
    // Fetch inspections from the API
    fetch('http://127.0.0.1:8000/inspections/') // Replace with the actual endpoint
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch inspections');
        }
        return response.json();
      })
      .then((data) => {
        setInspections(data); // Store the fetched inspections in the state
        setLoading(false); // Set loading to false after fetching data
      })
      .catch((error) => {
        setError(error.message); // Set error state if the fetch fails
        setLoading(false);
      });
  }, []); // Empty dependency array ensures this runs once when the component mounts

  // Calculate the total number of pages
  const totalPages = Math.ceil(inspections.length / inspectionsPerPage);

  // Get the current set of inspections to display
  const indexOfLastInspection = currentPage * inspectionsPerPage;
  const indexOfFirstInspection = indexOfLastInspection - inspectionsPerPage;
  const currentInspections = inspections.slice(indexOfFirstInspection, indexOfLastInspection);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Inspections</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all inspections, including their status, source, and associated address.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add inspection
          </button>
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-center text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Source
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-center text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-center text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Address
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 py-3.5 pl-3 pr-4 text-center backdrop-blur backdrop-filter sm:pr-6 lg:pr-8"
                  >
                    Scheduled Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentInspections.map((inspection, idx) => (
                  <tr key={inspection.id}>
                    <td
                      className={classNames(
                        idx !== currentInspections.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center',
                      )}
                    >
                      {/* Link to the inspection details page */}
                      <Link to={`/inspection/${inspection.id}`} className="text-indigo-600 hover:text-indigo-900">
                        {inspection.source}
                      </Link>
                    </td>
                    <td
                      className={classNames(
                        idx !== currentInspections.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center',
                      )}
                    >
                                            <span
                        className={`inline-block px-2 py-1 text-sm font-semibold rounded 
                          ${inspection.status === 'Satisfactory' ? 'bg-green-100 text-green-800' :
                            inspection.status === 'Unsatisfactory' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'}`}
                      >
                        {inspection.status ? inspection.status : 'Pending'}
                      </span>

                    </td>
                    <td
                      className={classNames(
                        idx !== currentInspections.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center',
                      )}
                    >
                      {/* Link to the address details page */}
                      {inspection.address ? (
                        <Link to={`/address/${inspection.address.id}`} className="text-indigo-600 hover:text-indigo-900">
                          {inspection.address.combadd}
                        </Link>
                      ) : (
                        'No address'
                      )}
                    </td>
                    <td
                      className={classNames(
                        idx !== currentInspections.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center',
                      )}
                    >
                      {inspection.scheduled_datetime ? new Date(inspection.scheduled_datetime).toLocaleString() : 'unscheduled'}                    </td>
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
