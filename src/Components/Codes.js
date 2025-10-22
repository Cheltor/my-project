import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import { useAuth } from '../AuthContext';
import AddCodeModal from './AddCodeModal';

const Codes = () => {
  const { user, token } = useAuth();
  const authToken = token || user?.token;
  const isAdmin = user?.role === 3;

  const [codes, setCodes] = useState([]); // State to store all codes
  const [loading, setLoading] = useState(true); // State to manage loading state
  const [error, setError] = useState(null); // State to manage error state
  const [statusMessage, setStatusMessage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); // State for the current page
  const codesPerPage = 10; // Number of codes to display per page

  const [searchTerm, setSearchTerm] = useState(''); // State for text-based filtering
  const [selectedChapter, setSelectedChapter] = useState(''); // State for chapter filter

  const [editingPage, setEditingPage] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${process.env.REACT_APP_API_URL}/codes/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch codes');
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        setCodes(Array.isArray(data) ? data : []);
        setLoading(false);
        setStatusMessage('');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to fetch codes');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Filter codes based on search term and selected filters
  const filteredCodes = codes.filter((code) => {
    const matchesSearchTerm =
      (code.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (code.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesChapter = selectedChapter ? code.chapter === selectedChapter : true;

    return matchesSearchTerm && matchesChapter;
  });

  // Get the current set of codes to display
  const maxFilteredPages = Math.max(1, Math.ceil(filteredCodes.length / codesPerPage));
  const indexOfLastCode = currentPage * codesPerPage;
  const indexOfFirstCode = indexOfLastCode - codesPerPage;
  const currentCodes = filteredCodes.slice(indexOfFirstCode, indexOfLastCode);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const startEditPage = () => {
    setPageInput(String(currentPage));
    setPageError('');
    setEditingPage(true);
  };

  const applyPageInput = () => {
    const n = parseInt(pageInput, 10);
    const maxPage = maxFilteredPages;
    if (Number.isNaN(n) || n < 1 || n > maxPage) {
      setPageError(`Enter a number between 1 and ${maxPage}`);
      return;
    }
    paginate(n);
    setEditingPage(false);
  };

  // Get unique chapters for filtering options
  const uniqueChapters = [...new Set(codes.map((code) => code.chapter))];

  useEffect(() => {
    if (currentPage > maxFilteredPages) {
      setCurrentPage(maxFilteredPages);
    }
  }, [currentPage, maxFilteredPages]);

  const handleCodeCreated = (newCode) => {
    if (!newCode) return;
    setCodes((prev) => {
      const existing = prev.filter((code) => code.id !== newCode.id);
      return [newCode, ...existing];
    });
    setCurrentPage(1);
    setStatusMessage('Code created successfully.');
    setShowAddModal(false);
    setError(null);
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">Code Violations</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of code violations including their chapter, section, name, and description.
            </p>
          </div>
          {isAdmin && (
            <div className="mt-4 sm:mt-0 sm:ml-16 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStatusMessage('');
                  setShowAddModal(true);
                }}
                className="inline-flex items-center rounded-md border border-indigo-600 px-3 py-2 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Add Code
              </button>
              <Link
                to="/admin/code-sync"
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Open Code Sync
              </Link>
            </div>
          )}
        </div>

        {statusMessage && (
          <div className="mt-4 flex items-start justify-between rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={() => setStatusMessage('')}
              className="ml-4 rounded border border-transparent px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              Dismiss
            </button>
          </div>
        )}

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
                        {truncateString(code.description || '', 50)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => paginate(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:bg-gray-300"
          >
            Previous
          </button>
          <div className="text-sm text-gray-700">
            {editingPage ? (
              <div>
                <input
                  type="number"
                  min={1}
                  max={maxFilteredPages}
                  value={pageInput}
                  onChange={(e) => {
                    setPageInput(e.target.value);
                    setPageError('');
                  }}
                  onBlur={applyPageInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyPageInput();
                    if (e.key === 'Escape') setEditingPage(false);
                  }}
                  className={`w-20 px-2 py-1 border rounded ${pageError ? 'border-red-500' : ''}`}
                  autoFocus
                />
                {pageError && <div className="text-xs text-red-600 mt-1">{pageError}</div>}
              </div>
            ) : (
              <button onClick={startEditPage} className="underline">
                Page {currentPage} of {maxFilteredPages}
              </button>
            )}
          </div>
          <button
            onClick={() => paginate(Math.min(maxFilteredPages, currentPage + 1))}
            disabled={currentPage >= maxFilteredPages}
            className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:bg-gray-300"
          >
            Next
          </button>
        </div>
      </div>

      {isAdmin && (
        <AddCodeModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onCreated={handleCodeCreated}
          authToken={authToken}
        />
      )}
    </>
  );
};

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function truncateString(str, maxLength) {
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

export default Codes;
