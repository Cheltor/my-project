import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// List permits similar to Licenses component
export default function Permits() {
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const permitsPerPage = 10;

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/permits/`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch permits');
        return response.json();
      })
      .then((data) => {
        setPermits(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const totalPages = Math.ceil(permits.length / permitsPerPage) || 1;
  const indexOfLast = currentPage * permitsPerPage;
  const indexOfFirst = indexOfLast - permitsPerPage;
  const currentPermits = permits.slice(indexOfFirst, indexOfLast);

  const paginate = (page) => setCurrentPage(page);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Permits</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all permits including their ID, type, payment status, and creation date.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            disabled
            title="Auto-created from inspections"
          >
            Add permit
          </button>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permit Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentPermits.map((permit) => (
              <tr key={permit.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{permit.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">{permit.permit_type || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{permit.paid ? 'Paid' : 'Not Paid'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(permit.created_at).toLocaleString()}</td>
              </tr>
            ))}
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
        <p className="text-sm text-gray-700">Page {currentPage} of {totalPages}</p>
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
