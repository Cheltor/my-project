import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Citations() {
  const [citations, setCitations] = useState([]); // State to store all citations
  const [loading, setLoading] = useState(true); // State to manage loading state
  const [error, setError] = useState(null); // State to manage error state
  const [currentPage, setCurrentPage] = useState(1); // State for the current page
  const citationsPerPage = 10; // Number of citations to display per page

  useEffect(() => {
    // Fetch citations from the API
    fetch('${process.env.REACT_APP_API_URL}/citations/') // Replace with the actual endpoint
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch citations');
        }
        return response.json();
      })
      .then((data) => {
        setCitations(data); // Store the fetched citations in the state
        setLoading(false); // Set loading to false after fetching data
      })
      .catch((error) => {
        setError(error.message); // Set error state if the fetch fails
        setLoading(false);
      });
  }, []); // Empty dependency array ensures this runs once when the component mounts

  // Calculate the total number of pages
  const totalPages = Math.ceil(citations.length / citationsPerPage);

  // Get the current set of citations to display
  const indexOfLastCitation = currentPage * citationsPerPage;
  const indexOfFirstCitation = indexOfLastCitation - citationsPerPage;
  const currentCitations = citations.slice(indexOfFirstCitation, indexOfLastCitation);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Citations</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all citations, including their ID, Violation ID, and Deadline.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add Citation
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
                    Citation ID
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-center text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Violation ID
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-center text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Deadline
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentCitations.map((citation, idx) => (
                  <tr key={citation.id}>
                    <td
                      className={classNames(
                        idx !== currentCitations.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center',
                      )}
                    >
                      {/* Link to the citation details page */}
                      <Link to={`/citation/${citation.id}`} className="text-indigo-600 hover:text-indigo-900">
                        {citation.citationid}
                      </Link>
                    </td>
                    <td
                      className={classNames(
                        idx !== currentCitations.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center',
                      )}
                    >
                      <Link to={`/violation/${citation.violation_id}`} className="text-indigo-600 hover:text-indigo-900">
                        {citation.combadd} -&nbsp;
                        Violation ID: {citation.violation_id}
                      </Link>
                    </td>
                    <td
                      className={classNames(
                        idx !== currentCitations.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center',
                      )}
                    >
                      {citation.deadline ? new Date(citation.deadline).toLocaleDateString() : 'N/A'}
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
