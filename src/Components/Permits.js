import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AddPermitModal from './AddPermitModal';
import { toEasternLocaleDateString } from '../utils';
import PageLoading from './Common/PageLoading';
import PageError from './Common/PageError';

// Feature flag: hide Add Permit for now
const ENABLE_ADD_PERMIT = false;

// Permit listing modeled after Licenses table for consistency
export default function Permits() {
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const permitsPerPage = 10;
  const [showAdd, setShowAdd] = useState(false);
  const [paidFilter, setPaidFilter] = useState('all');
  const [sentFilter, setSentFilter] = useState('all');
  const [addressFilter, setAddressFilter] = useState('');

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/permits/`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch permits');
        return response.json();
      })
      .then((data) => {
        // Debug sample record
        if (Array.isArray(data) && data.length) {
          // eslint-disable-next-line no-console
          console.debug('Permits sample record:', data[0]);
        }
        setPermits(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [paidFilter, sentFilter, addressFilter]);

  const filteredPermits = useMemo(() => {
    const filtered = permits.filter((permit) => {
      if (paidFilter === 'paid' && !permit.paid) return false;
      if (paidFilter === 'not_paid' && permit.paid) return false;
      if (sentFilter === 'sent' && !permit.sent) return false;
      if (sentFilter === 'not_sent' && permit.sent) return false;
      if (addressFilter) {
        const haystack = `${permit.combadd || ''} ${permit.address_id || ''}`.toLowerCase();
        if (!haystack.includes(addressFilter.trim().toLowerCase())) return false;
      }
      return true;
    });

    const toTime = (v) => {
      if (!v) return 0;
      const t = new Date(v).getTime();
      return Number.isNaN(t) ? 0 : t;
    };

    return filtered
      .slice()
      .sort((a, b) => {
        const aTime = toTime(a.created_at);
        const bTime = toTime(b.created_at);
        if (bTime !== aTime) return bTime - aTime;
        return (b.id ?? 0) - (a.id ?? 0);
      });
  }, [permits, paidFilter, sentFilter, addressFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPermits.length / permitsPerPage));
  const indexOfLastPermit = currentPage * permitsPerPage;
  const indexOfFirstPermit = indexOfLastPermit - permitsPerPage;
  const currentPermits = filteredPermits.slice(indexOfFirstPermit, indexOfLastPermit);

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

  if (loading) {
    return <PageLoading message="Loading permits…" />;
  }

  if (error) {
    return <PageError title="Unable to load permits" error={error} />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Permits</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of permits auto-created from inspections with payment and expiration details.
          </p>
        </div>
        {ENABLE_ADD_PERMIT && (
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Add permit
            </button>
          </div>
        )}
      </div>
      {ENABLE_ADD_PERMIT && (
        <AddPermitModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onCreated={(created) => {
            setPermits(prev => [created, ...prev]);
            setCurrentPage(1);
          }}
        />
      )}

      <div className="mt-4 bg-white rounded-lg shadow p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Paid Status</label>
            <select
              value={paidFilter}
              onChange={(e) => setPaidFilter(e.target.value)}
              className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="not_paid">Not Paid</option>
            </select>
          </div>
          {/* Sent Status filter hidden per request */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Address Search</label>
            <input
              type="text"
              value={addressFilter}
              onChange={(e) => setAddressFilter(e.target.value)}
              placeholder="Search address or ID"
              className="mt-1 w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>{filteredPermits.length} of {permits.length} permits</span>
          {(paidFilter !== 'all' || sentFilter !== 'all' || addressFilter) && (
            <button
              type="button"
              onClick={() => {
                setPaidFilter('all');
                setSentFilter('all');
                setAddressFilter('');
              }}
              className="text-indigo-600 hover:text-indigo-500"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permit Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspection</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentPermits.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500">No permits match the current filters.</td>
              </tr>
            ) : (
              currentPermits.map((permit) => (
                <tr key={permit.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Link to={`/permit/${permit.id}`} className="text-indigo-600 hover:text-indigo-800">
                      {permit.permit_type || '—'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {permit.address_id && (permit.combadd || permit.address_id) ? (
                      <Link to={`/address/${permit.address_id}`} className="text-indigo-600 hover:text-indigo-800">
                        {permit.combadd || `Address #${permit.address_id}`}
                      </Link>
                    ) : (
                      <span className="text-gray-400">(no address)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Link to={`/inspection/${permit.inspection_id}`} className="text-indigo-600 hover:text-indigo-800">
                      #{permit.inspection_id}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {permit.paid ? 'Paid' : 'Not Paid'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {permit.created_at ? toEasternLocaleDateString(permit.created_at) || '—' : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
  );
}

// removed unused classNames helper
