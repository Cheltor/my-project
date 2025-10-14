import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Inspections() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const inspectionsPerPage = 10;
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const formatStatus = (s) => {
    if (!s) return 'Pending';
    return s
      .toString()
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/inspections/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch inspections');
        }
        return response.json();
      })
      .then((data) => {
        setInspections(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const normalized = (s) => (s ? s.toString().trim().toLowerCase() : 'pending');
  const sourceOptions = React.useMemo(() => {
    const set = new Set();
    inspections.forEach((i) => { if (i.source) set.add(i.source); });
    return Array.from(set).sort();
  }, [inspections]);
  const statusOptions = React.useMemo(() => {
    const set = new Set();
    inspections.forEach((i) => set.add(normalized(i.status)));
    return Array.from(set).sort();
  }, [inspections]);

  const filteredInspections = React.useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    return inspections.filter((i) => {
      // source filter
      if (sourceFilter && i.source !== sourceFilter) return false;
      // status filter (compare normalized)
      if (statusFilter && normalized(i.status) !== statusFilter) return false;
      // date filters (only include scheduled items when filtering)
      if (from || to) {
        if (!i.scheduled_datetime) return false;
        const d = new Date(i.scheduled_datetime);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  }, [inspections, sourceFilter, statusFilter, dateFrom, dateTo]);

  // Reset to first page when filters change
  useEffect(() => { setCurrentPage(1); }, [sourceFilter, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredInspections.length / inspectionsPerPage) || 1;
  const indexOfLastInspection = currentPage * inspectionsPerPage;
  const indexOfFirstInspection = indexOfLastInspection - inspectionsPerPage;
  const currentInspections = filteredInspections.slice(indexOfFirstInspection, indexOfLastInspection);

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

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Inspections</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all inspections, including their status, source, and associated address.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-auto">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
  {/* Add inspection button removed */}
      </div>

      {/* Filters */}
      {showFilters && (
      <div className="mt-4 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Source</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="">All</option>
              {sourceOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{formatStatus(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Scheduled From</label>
            <input
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Scheduled To</label>
            <input
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>Showing {filteredInspections.length} of {inspections.length}</span>
          <button
            type="button"
            onClick={() => { setSourceFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); }}
            className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
          >
            Clear filters
          </button>
        </div>
      </div>
      )}

      {/* Responsive Table Container */}
      <div className="mt-8 overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scheduled Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentInspections.map((inspection, idx) => (
              <tr key={inspection.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link to={`/inspection/${inspection.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {inspection.source}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span
                    className={`inline-block px-2 py-1 text-sm font-semibold rounded 
                      ${inspection.status === 'Satisfactory' || (inspection.status && inspection.status.toLowerCase() === 'completed') ? 'bg-green-100 text-green-800' :
                        inspection.status === 'Unsatisfactory' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'}`}
                  >
                    {formatStatus(inspection.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inspection.address ? (
                    <Link to={`/address/${inspection.address.id}`} className="text-indigo-600 hover:text-indigo-900">
                      {inspection.address.combadd}
                    </Link>
                  ) : (
                    'No address'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inspection.scheduled_datetime ? new Date(inspection.scheduled_datetime).toLocaleString() : 'Unscheduled'}
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

  {/* Add inspection modal removed */}
    </div>
  );
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}
