import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AddLicenseModal from './AddLicenseModal';

export default function Licenses() {
  const LICENSE_TYPE_LABELS = {
    1: 'Business License',
    2: 'Single Family License',
    3: 'Multifamily License',
  };
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const licensesPerPage = 10;
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/licenses/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch licenses');
        }
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          // Debug: inspect first item structure
          // eslint-disable-next-line no-console
          console.debug('Licenses sample record:', data[0]);
        }
        setLicenses(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const totalPages = Math.ceil(licenses.length / licensesPerPage);
  const indexOfLastLicense = currentPage * licensesPerPage;
  const indexOfFirstLicense = indexOfLastLicense - licensesPerPage;
  const currentLicenses = licenses.slice(indexOfFirstLicense, indexOfLastLicense);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <AddLicenseModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(created) => {
          setLicenses(prev => [created, ...prev]);
          setCurrentPage(1);
        }}
      />
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Licenses</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all licenses including their ID, type, status, and whether payment has been made.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Add license
          </button>
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className="mt-8 overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                License #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                License Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Inspection
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paid
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expiration
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentLicenses.map((license) => (
              <tr key={license.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link to={`/license/${license.id}`} className="text-indigo-600 hover:text-indigo-800">
                    {license.license_number || '—'}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {license.address_id && (license.combadd || license.address_id) ? (
                    <Link to={`/address/${license.address_id}`} className="text-indigo-600 hover:text-indigo-800">
                      {license.combadd || `Address #${license.address_id}`}
                    </Link>
                  ) : (
                    <span className="text-gray-400">(no address)</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Link to={`/license/${license.id}`} className="text-indigo-600 hover:text-indigo-800">
                    {LICENSE_TYPE_LABELS[license.license_type] || String(license.license_type)}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Link to={`/inspection/${license.inspection_id}`} className="text-indigo-600 hover:text-indigo-800">
                    #{license.inspection_id}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {license.paid ? 'Paid' : 'Not Paid'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {license.sent ? 'Sent' : 'Not Sent'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {license.expiration_date ? new Date(license.expiration_date).toLocaleDateString() : '—'}
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
  );
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}
