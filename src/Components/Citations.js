import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toEasternLocaleString } from '../utils';
// import CitationDetails from './CitationDetails';

export default function Citations() {
  // Filter state
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 0, 1, 2, 3
  const [filterPastDue, setFilterPastDue] = useState('all'); // 'all', 'pastdue', 'notpastdue'
  const [filterCitationId, setFilterCitationId] = useState(''); // citation ID filter
  const [printGeneratedAt, setPrintGeneratedAt] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  // Sorting state
  const [sortBy, setSortBy] = useState(null); // 'unpaid' | 'pastdue' | null
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  // Sorting logic
  function getIsPastDue(citation) {
    if (!citation.deadline) return false;
    const deadline = new Date(citation.deadline);
    const now = new Date();
    return (citation.status !== 1 && citation.status !== 3 && deadline < now);
  }

  function sortCitations(citations) {
    if (!sortBy) return citations;
    let sorted = [...citations];
    if (sortBy === 'unpaid') {
      sorted.sort((a, b) => {
        const aUnpaid = a.status === 0 ? 1 : 0;
        const bUnpaid = b.status === 0 ? 1 : 0;
        return sortDirection === 'asc' ? aUnpaid - bUnpaid : bUnpaid - aUnpaid;
      });
    } else if (sortBy === 'pastdue') {
      sorted.sort((a, b) => {
        const aPastDue = getIsPastDue(a) ? 1 : 0;
        const bPastDue = getIsPastDue(b) ? 1 : 0;
        return sortDirection === 'asc' ? aPastDue - bPastDue : bPastDue - aPastDue;
      });
    }
    return sorted;
  }
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  // const [selectedCitation, setSelectedCitation] = useState(null);
  const citationsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/citations/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch citations');
        }
        return response.json();
      })
      .then((data) => {
        setCitations(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const totalPages = Math.ceil(citations.length / citationsPerPage);
  const indexOfLastCitation = currentPage * citationsPerPage;
  const indexOfFirstCitation = indexOfLastCitation - citationsPerPage;
  // Filtering logic
  function filterCitations(citations) {
    return citations.filter(citation => {
      let statusMatch = true;
      let pastDueMatch = true;
      let citationIdMatch = true;
      if (filterStatus !== 'all') {
        statusMatch = citation.status === Number(filterStatus);
      }
      if (filterPastDue !== 'all') {
        const isPastDue = getIsPastDue(citation);
        pastDueMatch = filterPastDue === 'pastdue' ? isPastDue : !isPastDue;
      }
      if (filterCitationId.trim() !== '') {
        citationIdMatch = citation.citationid && citation.citationid.toString().toLowerCase().includes(filterCitationId.trim().toLowerCase());
      }
      return statusMatch && pastDueMatch && citationIdMatch;
    });
  }

  const filteredCitations = filterCitations(citations);
  const sortedCitations = sortCitations(filteredCitations);
  const currentCitations = sortedCitations.slice(indexOfFirstCitation, indexOfLastCitation);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const [editingPage, setEditingPage] = useState(false);
  const [pageInput, setPageInput] = useState('');

  const startEditPage = () => {
    setPageInput(String(currentPage));
    setEditingPage(true);
  };

  const applyPageInput = () => {
    const n = parseInt(pageInput, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= totalPages) {
      paginate(n);
    }
    setEditingPage(false);
  };

  // Labels for print summary
  const statusFilterLabel = (() => {
    if (filterStatus === 'all') return 'All statuses';
    const map = { '0': 'Unpaid', '1': 'Paid', '2': 'Pending Trial', '3': 'Dismissed' };
    return map[filterStatus] || 'Unknown';
  })();
  const pastDueFilterLabel = (() => {
    if (filterPastDue === 'all') return 'All deadlines';
    return filterPastDue === 'pastdue' ? 'Past Due only' : 'Not Past Due only';
  })();
  const idFilterLabel = filterCitationId.trim() ? `ID contains "${filterCitationId.trim()}"` : 'All IDs';
  const printableResultsLabel = filteredCitations.length === 1 ? '1 result' : `${filteredCitations.length} results`;
  const resolvedPrintTimestamp = printGeneratedAt || toEasternLocaleString(new Date(), 'en-US');

  const handlePrint = () => {
    setPrintGeneratedAt(toEasternLocaleString(new Date(), 'en-US'));
    setTimeout(() => window.print(), 0);
  };


  // Add loading state for status update
  const [loadingStatus, setLoadingStatus] = useState(false);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="flex flex-col md:flex-row px-4 sm:px-6 lg:px-8 gap-8">
      {/* Sidebar/Table */}
      <div className="w-full">
        <div className="print-hidden">
          <div className="sm:flex sm:items-center justify-between flex-wrap gap-4">
            <div className="sm:flex-auto">
              <h1 className="text-base font-semibold leading-6 text-gray-900">Citations</h1>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600"
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              <button
                type="button"
                className="rounded bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-500"
                onClick={handlePrint}
              >
                Print Results
              </button>
            </div>
            {/* Filters */}
            {showFilters && (
              <div className="mt-4 bg-white rounded-lg shadow p-4 w-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Citation ID</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Search by ID"
                      value={filterCitationId}
                      onChange={e => setFilterCitationId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="0">Unpaid</option>
                      <option value="1">Paid</option>
                      <option value="2">Pending Trial</option>
                      <option value="3">Dismissed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Past Due</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={filterPastDue}
                      onChange={e => setFilterPastDue(e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="pastdue">Past Due</option>
                      <option value="notpastdue">Not Past Due</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                  <span>Showing {filteredCitations.length} of {citations.length}</span>
                  <button
                    type="button"
                    onClick={() => { setFilterCitationId(''); setFilterStatus('all'); setFilterPastDue('all'); }}
                    className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 overflow-x-auto rounded-lg shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Citation ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => {
                      if (sortBy === 'pastdue') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('pastdue');
                        setSortDirection('desc');
                      }
                    }}>
                    Deadline
                    <span className="ml-1 text-xs align-middle">{sortBy === 'pastdue' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => {
                      if (sortBy === 'unpaid') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('unpaid');
                        setSortDirection('desc');
                      }
                    }}>
                    Status
                    <span className="ml-1 text-xs align-middle">{sortBy === 'unpaid' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentCitations.map((citation, idx) => (
                  <tr key={citation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link to={`/citation/${citation.id}`} className="text-indigo-600 hover:text-indigo-900">
                        {citation.citationid ? citation.citationid : 'Missing'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {citation.combadd ? (
                        <span>{citation.combadd}</span>
                      ) : (
                        <span className="text-gray-400 italic">No Address</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-2">
                      {(() => {
                        if (!citation.deadline) return 'N/A';
                        const deadline = new Date(citation.deadline);
                        const now = new Date();
                        const diffMs = deadline - now;
                        const diffDays = diffMs / (1000 * 60 * 60 * 24);
                        let deadlineStatus = '';
                        let badgeClass = '';
                        // Remove deadline hints for Paid (1) and Dismissed (3)
                        if (citation.status === 1 || citation.status === 3) {
                          deadlineStatus = '';
                          badgeClass = '';
                        } else if (diffDays < 0) {
                          deadlineStatus = 'Past Due';
                          badgeClass = 'bg-red-200 text-red-800';
                        } else if (diffDays <= 3) {
                          deadlineStatus = 'Approaching';
                          badgeClass = 'bg-yellow-200 text-yellow-900';
                        } else {
                          deadlineStatus = 'Plenty of Time';
                          badgeClass = 'bg-green-100 text-green-800';
                        }
                        return <>
                          {deadline.toLocaleDateString('en-US')}
                          {deadlineStatus && (
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold align-middle ${badgeClass}`}>
                              {deadlineStatus}
                            </span>
                          )}
                        </>;
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                        ${citation.status === 0 ? 'bg-red-100 text-red-800 border border-red-200' :
                          citation.status === 1 ? 'bg-green-100 text-green-800 border border-green-200' :
                          citation.status === 2 ? 'bg-yellow-100 text-yellow-900 border border-yellow-200' :
                          citation.status === 3 ? 'bg-gray-200 text-gray-700 border border-gray-300' :
                          'bg-gray-100 text-gray-700 border border-gray-200'}`}
                      >
                        {citation.status === 0 && 'Unpaid'}
                        {citation.status === 1 && 'Paid'}
                        {citation.status === 2 && 'Pending Trial'}
                        {citation.status === 3 && 'Dismissed'}
                        {![0,1,2,3].includes(citation.status) && 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:bg-gray-300"
                >
                  Previous
                </button>
                <div className="text-sm text-gray-700">
                  {editingPage ? (
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onBlur={applyPageInput}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') applyPageInput();
                        if (e.key === 'Escape') setEditingPage(false);
                      }}
                      className="w-20 px-2 py-1 border rounded"
                      autoFocus
                    />
                  ) : (
                    <button onClick={startEditPage} className="underline">
                      Page {currentPage} of {totalPages}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:bg-gray-300"
                >
                  Next
                </button>
              </div>
        </div>

        {/* Print-only full list */}
        <div className="print-only">
          <h1 className="text-2xl font-semibold text-gray-900">Citations Report</h1>
          <p className="mt-2 text-sm text-gray-700">
            Generated {resolvedPrintTimestamp} · {statusFilterLabel} · {pastDueFilterLabel} · {idFilterLabel} · {printableResultsLabel}
          </p>
          <table className="print-table mt-6">
            <thead>
              <tr>
                <th>Citation ID</th>
                <th>Address</th>
                <th>Deadline</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCitations.length === 0 ? (
                <tr>
                  <td colSpan={4}>No results match the active filters.</td>
                </tr>
              ) : (
                filteredCitations.map((citation) => {
                  const statusLabel = (citation.status === 0 && 'Unpaid') ||
                    (citation.status === 1 && 'Paid') ||
                    (citation.status === 2 && 'Pending Trial') ||
                    (citation.status === 3 && 'Dismissed') || 'Unknown';
                  return (
                    <tr key={`print-${citation.id}`}>
                      <td>{citation.citationid || 'Missing'}</td>
                      <td>{citation.combadd || 'No Address'}</td>
                      <td>{citation.deadline ? new Date(citation.deadline).toLocaleDateString('en-US') : 'N/A'}</td>
                      <td>{statusLabel}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}
