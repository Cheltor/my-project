import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';

export default function Violations() {
  const { user } = useAuth();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailFilter, setEmailFilter] = useState('');
  const [showMyViolations, setShowMyViolations] = useState(false);
  const [onsUsers, setOnsUsers] = useState([]); // <-- Add state for ONS users
  const [printGeneratedAt, setPrintGeneratedAt] = useState('');
  const [showFilters, setShowFilters] = useState(false);
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
    // Fetch ONS users for dropdown
    fetch(`${process.env.REACT_APP_API_URL}/users/ons/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch ONS users');
        }
        return response.json();
      })
      .then((data) => {
        setOnsUsers(data);
      })
      .catch(() => {
        setOnsUsers([]);
      });
  }, []);

  // Filter by status, ONS user email, and "my violations" for role 1
  const filteredViolations = violations.filter(violation => {
    const statusMatch = statusFilter === 'all' || statusMapping[violation.status] === statusFilter;
    let emailMatch = true;
    if (user?.role === 1 && showMyViolations) {
      emailMatch = violation.user && violation.user.email === user.email;
    } else {
      emailMatch = !emailFilter || (violation.user && violation.user.email === emailFilter);
    }
    return statusMatch && emailMatch;
  });

  const totalPages = Math.ceil(filteredViolations.length / violationsPerPage);
  const indexOfLastViolation = currentPage * violationsPerPage;
  const indexOfFirstViolation = indexOfLastViolation - violationsPerPage;
  const currentViolations = filteredViolations.slice(indexOfFirstViolation, indexOfLastViolation);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  const statusFilterLabel = statusFilter === 'all' ? 'All statuses' : capitalize(statusFilter);
  const inspectorFilterLabel = (() => {
    if (user?.role === 1 && showMyViolations) return 'Only my assignments';
    if (emailFilter) return `Inspector: ${emailFilter}`;
    return 'All inspectors';
  })();
  const printableResultsLabel =
    filteredViolations.length === 1 ? '1 result' : `${filteredViolations.length} results`;
  const resolvedPrintTimestamp = printGeneratedAt || new Date().toLocaleString('en-US');

  const handlePrint = () => {
    setPrintGeneratedAt(new Date().toLocaleString('en-US'));
    // allow state to flush before invoking print
    setTimeout(() => window.print(), 0);
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="print-hidden">
        <div className="sm:flex sm:items-center justify-between">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">Violations</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all violations, including their status, type, and associated address.
            </p>
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
        </div>

        {/* Filter UI */}
        {showFilters && (
          <div className="mt-4 bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status-filter"
                  name="status-filter"
                  value={statusFilter}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="all">All</option>
                  <option value="current">Current</option>
                  <option value="resolved">Resolved</option>
                  <option value="pending trial">Pending Trial</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
              {user?.role === 3 && (
                <div>
                  <label htmlFor="email-filter" className="block text-sm font-medium text-gray-700">
                    ONS User Email
                  </label>
                  <select
                    id="email-filter"
                    value={emailFilter}
                    onChange={e => { setEmailFilter(e.target.value); setCurrentPage(1); }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">All</option>
                    {onsUsers.map(user => (
                      <option key={user.id} value={user.email}>
                        {user.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {user?.role === 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assignments</label>
                  <div className="mt-1">
                    <button
                      type="button"
                      className={`${showMyViolations ? 'bg-blue-800' : 'bg-blue-600'} rounded px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500`}
                      onClick={() => {
                        setShowMyViolations(!showMyViolations);
                        setCurrentPage(1);
                      }}
                    >
                      {showMyViolations ? 'Show All Violations' : 'Show My Violations'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
              <span>Showing {filteredViolations.length} results</span>
            </div>
          </div>
        )}

        

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
                      {violation && violation.violation_type ? capitalize(violation.violation_type) : ''}
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

      <div className="print-only">
        <h1 className="text-2xl font-semibold text-gray-900">Violations Report</h1>
        <p className="mt-2 text-sm text-gray-700">
          Generated {resolvedPrintTimestamp} · {statusFilterLabel} · {inspectorFilterLabel} · {printableResultsLabel}
        </p>
        <table className="print-table mt-6">
          <thead>
            <tr>
              <th>Address</th>
              <th>Violation</th>
              <th>Codes</th>
              <th>Status</th>
              <th>Deadline</th>
              <th>Inspector</th>
            </tr>
          </thead>
          <tbody>
            {filteredViolations.length === 0 ? (
              <tr>
                <td colSpan={6}>No results match the active filters.</td>
              </tr>
            ) : (
              filteredViolations.map((violation) => (
                <tr key={`print-${violation.id}`}>
                  <td>{violation.combadd || 'No address'}</td>
                  <td>{violation.violation_type ? capitalize(violation.violation_type) : ''}</td>
                  <td>
                    {Array.isArray(violation.codes) && violation.codes.length > 0
                      ? violation.codes
                          .map(code => {
                            if (!code) return null;
                            const chapter = code.chapter || '';
                            const section = code.section || '';
                            const name = code.name || '';
                            if (chapter || section) {
                              const chSec = `${chapter}${chapter && section ? '-' : ''}${section}`.trim();
                              return `${chSec}${name ? ' ' + name : ''}`.trim();
                            }
                            return name || '';
                          })
                          .filter(Boolean)
                          .join(', ')
                      : '—'}
                  </td>
                  <td>
                    {statusMapping[violation.status]
                      ? capitalize(statusMapping[violation.status])
                      : 'Unknown'}
                  </td>
                  <td>
                    {violation.deadline_date
                      ? new Date(violation.deadline_date).toLocaleDateString('en-US')
                      : '—'}
                  </td>
                  <td>{violation.user?.email || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}
