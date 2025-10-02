import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AddPermitModal from './AddPermitModal';

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

  const totalPages = Math.ceil(permits.length / permitsPerPage) || 1;
  const indexOfLastPermit = currentPage * permitsPerPage;
  const indexOfFirstPermit = indexOfLastPermit - permitsPerPage;
  const currentPermits = permits.slice(indexOfFirstPermit, indexOfLastPermit);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

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

      <div className="mt-8 overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permit Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspection</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentPermits.map((permit) => (
              <tr key={permit.id}>
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
                  <Link to={`/permit/${permit.id}`} className="text-indigo-600 hover:text-indigo-800">
                    {permit.permit_type || '—'}
                  </Link>
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
                  {permit.created_at ? new Date(permit.created_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
