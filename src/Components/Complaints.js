import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const complaintsPerPage = 10;
  const [statusFilter, setStatusFilter] = useState('');
  const [printGeneratedAt, setPrintGeneratedAt] = useState('');
  // Cache of unit details keyed by unit_id so we can show Unit numbers
  const [unitsById, setUnitsById] = useState({}); // { [unit_id]: { id, name?, number?, address_id? } }

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/complaints/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch complaints');
        }
        return response.json();
      })
      .then((data) => {
        setComplaints(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const normalizeStatus = (s) => {
    if (!s) return 'Pending';
    const v = String(s).toLowerCase();
    if (v === 'unsatisfactory' || v === 'violation found' || v === 'violation') return 'Violation Found';
    if (v === 'satisfactory' || v === 'no violation found' || v === 'no violation') return 'No Violation Found';
    if (v === 'pending' || v === 'unknown') return 'Pending';
    return s;
  };

  const statusOptions = React.useMemo(() => {
    const set = new Set();
    complaints.forEach((c) => set.add(normalizeStatus(c.status)));
    return Array.from(set).sort();
  }, [complaints]);

  const filteredComplaints = React.useMemo(() => {
    return complaints.filter((c) => {
      if (statusFilter && normalizeStatus(c.status) !== statusFilter) return false;
      return true;
    });
  }, [complaints, statusFilter]);

  // Reset pagination when filter changes
  useEffect(() => { setCurrentPage(1); }, [statusFilter]);

  // Newest first: sort by created_at desc (fallback updated_at)
  const sortedComplaints = React.useMemo(() => {
    const toMillis = (c) => {
      const d = c?.created_at ? new Date(c.created_at) : null;
      if (d && !isNaN(d)) return d.getTime();
      const u = c?.updated_at ? new Date(c.updated_at) : null;
      if (u && !isNaN(u)) return u.getTime();
      return 0;
    };
    return [...filteredComplaints].sort((a, b) => toMillis(b) - toMillis(a));
  }, [filteredComplaints]);

  const totalPages = Math.ceil(sortedComplaints.length / complaintsPerPage) || 1;
  const indexOfLastComplaint = currentPage * complaintsPerPage;
  const indexOfFirstComplaint = indexOfLastComplaint - complaintsPerPage;
  const currentComplaints = sortedComplaints.slice(indexOfFirstComplaint, indexOfLastComplaint);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Print helpers
  const statusFilterLabel = statusFilter ? `Status: ${statusFilter}` : 'All statuses';
  const printableResultsLabel = sortedComplaints.length === 1 ? '1 result' : `${sortedComplaints.length} results`;
  const resolvedPrintTimestamp = printGeneratedAt || new Date().toLocaleString('en-US');

  const handlePrint = async () => {
    // Prefetch any missing unit details for the entire filtered set so names are available in print
    const missingUnitIds = Array.from(
      new Set(
        sortedComplaints
          .map((c) => c.unit_id)
          .filter((id) => id && !unitsById[id])
      )
    );
    if (missingUnitIds.length > 0) {
      try {
        const results = await Promise.all(
          missingUnitIds.map(async (id) => {
            try {
              const r = await fetch(`${process.env.REACT_APP_API_URL}/units/${id}`);
              if (!r.ok) return null;
              return await r.json();
            } catch {
              return null;
            }
          })
        );
        const next = { ...unitsById };
        results.forEach((u) => {
          if (u && u.id) next[u.id] = u;
        });
        setUnitsById(next);
      } catch {
        // ignore fetch errors, we'll still proceed to print
      }
    }
    setPrintGeneratedAt(new Date().toLocaleString('en-US'));
    setTimeout(() => window.print(), 0);
  };

  // Fetch unit numbers for visible complaints that reference a unit
  useEffect(() => {
    const missingUnitIds = Array.from(
      new Set(
        currentComplaints
          .map((c) => c.unit_id)
          .filter((id) => id && !unitsById[id])
      )
    );
    if (missingUnitIds.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          missingUnitIds.map(async (id) => {
            try {
              const r = await fetch(`${process.env.REACT_APP_API_URL}/units/${id}`);
              if (!r.ok) return null;
              return await r.json();
            } catch {
              return null;
            }
          })
        );
        if (cancelled) return;
        const next = { ...unitsById };
        results.forEach((u) => {
          if (u && u.id) next[u.id] = u;
        });
        setUnitsById(next);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [currentComplaints, unitsById]);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  const statusClasses = (label) => {
    if (label === 'Violation Found') return 'bg-red-100 text-red-800';
    if (label === 'No Violation Found') return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800'; // Pending/others
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="print-hidden">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">Complaints</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all complaints, including their status, source, and associated address.
            </p>
          </div>
        {/* Add complaint button removed */}
        </div>

        {/* Filters */}
        <div className="mt-4 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <span>Showing {filteredComplaints.length} of {complaints.length}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter('')}
                className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
              >
                Clear filters
              </button>
              <button
                type="button"
                className="rounded bg-slate-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-500"
                onClick={handlePrint}
              >
                Print Results
              </button>
            </div>
          </div>
        </div>

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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentComplaints.map((complaint, idx) => (
                <tr key={complaint.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Link to={`/complaint/${complaint.id}`} className="text-indigo-600 hover:text-indigo-900">
                      {complaint.source}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(() => {
                      const label = normalizeStatus(complaint.status);
                      return (
                        <span className={`inline-block px-2 py-1 text-sm font-semibold rounded ${statusClasses(label)}`}>
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-col">
                      {complaint.address ? (
                        <Link to={`/address/${complaint.address.id}`} className="text-indigo-600 hover:text-indigo-900">
                          {complaint.address.combadd}
                        </Link>
                      ) : (
                        'No address'
                      )}
                      {complaint.unit_id && (
                        complaint.address ? (
                          <Link
                            to={`/address/${complaint.address.id}/unit/${complaint.unit_id}`}
                            className="text-xs text-indigo-600 hover:text-indigo-900 mt-1"
                          >
                            {unitsById[complaint.unit_id]?.number
                              ? `Unit ${unitsById[complaint.unit_id].number}`
                              : `Unit ${complaint.unit_id}`}
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-500 mt-1">
                            {unitsById[complaint.unit_id]?.number
                              ? `Unit ${unitsById[complaint.unit_id].number}`
                              : `Unit ${complaint.unit_id}`}
                          </span>
                        )
                      )}
                    </div>
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

      {/* Print-only full list */}
      <div className="print-only">
        <h1 className="text-2xl font-semibold text-gray-900">Complaints Report</h1>
        <p className="mt-2 text-sm text-gray-700">
          Generated {resolvedPrintTimestamp} · {statusFilterLabel} · {printableResultsLabel}
        </p>
        <table className="print-table mt-6">
          <thead>
            <tr>
              <th>Source</th>
              <th>Status</th>
              <th>Address</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {sortedComplaints.length === 0 ? (
              <tr>
                <td colSpan={4}>No results match the active filters.</td>
              </tr>
            ) : (
              sortedComplaints.map((complaint) => (
                <tr key={`print-${complaint.id}`}>
                  <td>{complaint.source || '—'}</td>
                  <td>{normalizeStatus(complaint.status) || '—'}</td>
                  <td>{complaint.address?.combadd || 'No address'}</td>
                  <td>
                    {complaint.unit_id
                      ? (unitsById[complaint.unit_id]?.name
                          || (unitsById[complaint.unit_id]?.number ? `Unit ${unitsById[complaint.unit_id].number}` : `Unit ${complaint.unit_id}`))
                      : '—'}
                  </td>
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
