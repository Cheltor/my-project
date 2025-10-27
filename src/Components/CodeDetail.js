import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';

const CodeDetail = () => {
  const { id } = useParams(); // Extract the code ID from the URL
  const [code, setCode] = useState(null); // State to store code details
  const [loading, setLoading] = useState(true); // State to manage loading state
  const [error, setError] = useState(null); // State to manage error state
  const [currentPage, setCurrentPage] = useState(1);

  const violationsPerPage = 10;

  const statusMapping = {
    0: 'Current',
    1: 'Resolved',
    2: 'Pending Trial',
    3: 'Dismissed',
  };

  useEffect(() => {
    // Fetch the details of a specific code using the ID from the URL
    fetch(`${process.env.REACT_APP_API_URL}/codes/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch code details');
        }
        return response.json();
      })
      .then((data) => {
        setCode(data); // Set the fetched code details
        setLoading(false);
        setCurrentPage(1);
      })
      .catch((error) => {
        setError(error.message); // Set error state if the fetch fails
        setLoading(false);
      });
  }, [id]); // Dependency array includes id to refetch if it changes

  const violations = useMemo(() => (Array.isArray(code?.violations) ? code.violations : []), [code]);
  const maxPage = Math.max(1, Math.ceil(violations.length / violationsPerPage));

  useEffect(() => {
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [currentPage, maxPage]);

  const paginatedViolations = useMemo(() => {
    const start = (currentPage - 1) * violationsPerPage;
    return violations.slice(start, start + violationsPerPage);
  }, [violations, currentPage]);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Code Details</h1>
        <Link
          to={`/code/${id}/edit`}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Edit
        </Link>
      </div>
      {code ? (
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Basic Information</h2>
            <p className="text-sm text-gray-600"><strong>Chapter:</strong> {code.chapter}</p>
            <p className="text-sm text-gray-600"><strong>Section:</strong> {code.section}</p>
            <p className="text-sm text-gray-600"><strong>Name:</strong> {code.name}</p>
            <p className="text-sm text-gray-600"><strong>Description:</strong> {code.description}</p>
            <p className="text-sm text-gray-600"><strong>Total Violations:</strong> {code.violation_count ?? 0}</p>
          </div>
          <div className="border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Timestamps</h2>
            <p className="text-sm text-gray-600"><strong>Created At:</strong> {new Date(code.created_at).toLocaleDateString()}</p>
            <p className="text-sm text-gray-600"><strong>Updated At:</strong> {new Date(code.updated_at).toLocaleDateString()}</p>
          </div>
          <div>
            <h2 className="text-xl font-medium text-gray-700 mb-3">Associated Violations</h2>
            {violations.length > 0 ? (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Violation</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedViolations.map((violation) => {
                        const createdDate = violation.created_at ? new Date(violation.created_at) : null;
                        const deadlineDate = violation.deadline_date ? new Date(violation.deadline_date) : null;
                        return (
                          <tr key={violation.id}>
                            <td className="px-4 py-3 text-sm text-indigo-600 font-medium">
                              <Link to={`/violation/${violation.id}`} className="hover:text-indigo-800">
                                {violation.violation_type || violation.description || `View violation ${violation.id}`}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {violation.address_id ? (
                                <Link to={`/address/${violation.address_id}`} className="text-indigo-600 hover:text-indigo-800">
                                  {violation.combadd || 'View address'}
                                </Link>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{statusMapping[violation.status] || 'Unknown'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{createdDate ? createdDate.toLocaleDateString() : '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{deadlineDate ? deadlineDate.toLocaleDateString() : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {violations.length > violationsPerPage && (
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:bg-gray-300"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {maxPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(maxPage, prev + 1))}
                      disabled={currentPage === maxPage}
                      className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:bg-gray-300"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-600">No violations currently reference this code.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-600">No details available for this code.</p>
      )}
    </div>
  );
};

export default CodeDetail;
