import React, { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { Link } from "react-router-dom";

// Format helper: convert strings like "overgrown_yard" to "Overgrown Yard"
function formatViolationType(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ActiveViolations() {
  const { user } = useAuth();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const violationsPerPage = 10;

  useEffect(() => {
    const fetchActiveViolations = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/dash/violations/${user.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch active violations");
        }
        const data = await response.json();
        const sorted = [...data].sort((a, b) => {
          const da = a?.deadline_date ? new Date(a.deadline_date) : null;
          const db = b?.deadline_date ? new Date(b.deadline_date) : null;
          if (da && db) return da - db; // earliest first
          if (da && !db) return -1;     // items with deadlines before those without
          if (!da && db) return 1;
          return 0;                     // keep relative order if both missing
        });
        setViolations(sorted);
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };

    fetchActiveViolations();
  }, [user.id]);

  const totalPages = Math.ceil(violations.length / violationsPerPage);
  const indexOfLastViolation = currentPage * violationsPerPage;
  const indexOfFirstViolation = indexOfLastViolation - violationsPerPage;
  const currentViolations = violations.slice(indexOfFirstViolation, indexOfLastViolation);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="mt-5 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Active Violations</h1>
        </div>
      </div>

      {violations.length === 0 ? (
        <div className="mt-8 text-center text-gray-500">There are no active violations.</div>
      ) : (
        <>
          {/* Responsive Table Container */}
          <div className="mt-8 overflow-x-auto rounded-lg shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Violation Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deadline Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentViolations.map((violation) => (
                  <tr key={violation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link to={`/violation/${violation.id}`} className="text-indigo-600 hover:text-indigo-900">
                        {formatViolationType(violation.violation_type) || 'N/A'}
                      </Link>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {violation.address_id ? (
                        <Link to={`/address/${violation.address_id}`} className="text-indigo-600 hover:text-indigo-900">
                          {violation.combadd}
                        </Link>
                      ) : (
                        'No address'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {violations.length > violationsPerPage && (
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
          )}
        </>
      )}
    </div>
  );
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}
