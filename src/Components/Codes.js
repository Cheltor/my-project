import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation

const Codes = () => {
  const [codes, setCodes] = useState([]); // State to store all codes
  const [loading, setLoading] = useState(true); // State to manage loading state
  const [error, setError] = useState(null); // State to manage error state
  const [currentPage, setCurrentPage] = useState(1); // State for the current page
  const codesPerPage = 10; // Number of codes to display per page

  const [searchTerm, setSearchTerm] = useState(''); // State for text-based filtering
  const [selectedChapter, setSelectedChapter] = useState(''); // State for chapter filter

  useEffect(() => {
    // Fetch codes from the API or use static data for testing
    fetch('https://civicode-2eae16143963.herokuapp.com/codes/') // Replace with actual endpoint
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch codes');
        }
        return response.json();
      })
      .then((data) => {
        setCodes(data); // Store the fetched codes in the state
        setLoading(false); // Set loading to false after fetching data
      })
      .catch((error) => {
        setError(error.message); // Set error state if the fetch fails
        setLoading(false);
      });
  }, []); // Empty dependency array ensures this runs once when the component mounts

  // Calculate the total number of pages
  const totalPages = Math.ceil(codes.length / codesPerPage);

  // Filter codes based on search term and selected filters
  const filteredCodes = codes.filter((code) => {
    const matchesSearchTerm =
      code.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesChapter = selectedChapter ? code.chapter === selectedChapter : true;

    return matchesSearchTerm && matchesChapter;
  });

  // Get the current set of codes to display
  const indexOfLastCode = currentPage * codesPerPage;
  const indexOfFirstCode = indexOfLastCode - codesPerPage;
  const currentCodes = filteredCodes.slice(indexOfFirstCode, indexOfLastCode);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Get unique chapters for filtering options
  const uniqueChapters = [...new Set(codes.map((code) => code.chapter))];

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Code Violations</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of code violations including their chapter, section, name, and description.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
        <input
          type="text"
          placeholder="Search by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <select
          value={selectedChapter}
          onChange={(e) => setSelectedChapter(e.target.value)}
          className="w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">All Chapters</option>
          {uniqueChapters.map((chapter) => (
            <option key={chapter} value={chapter}>
              Chapter {chapter}
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
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter sm:pl-6 lg:pl-8"
                  >
                    Chapter
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Section
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentCodes.map((code, idx) => (
                  <tr key={code.id}>
                    <td
                      className={classNames(
                        idx !== currentCodes.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 lg:pl-8',
                      )}
                    >
                      {code.chapter}
                    </td>
                    <td
                      className={classNames(
                        idx !== currentCodes.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
                      )}
                    >
                      {code.section}
                    </td>
                    <td
                      className={classNames(
                        idx !== currentCodes.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
                      )}
                    >
                      {/* Link to the CodeDetail component */}
                      <Link to={`/code/${code.id}`} className="text-indigo-600 hover:text-indigo-900">
                        {code.name}
                      </Link>
                    </td>
                    <td
                      className={classNames(
                        idx !== currentCodes.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
                      )}
                    >
                      {truncateString(code.description, 50)}
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

function truncateString(str, maxLength) {
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

export default Codes;
