import React, { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { Link } from "react-router-dom";

export default function PendingInspections() {
  const { user } = useAuth();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const inspectionsPerPage = 10;

  useEffect(() => {
    const fetchPendingInspections = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/dash/inspections/${user.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch pending inspections");
        }
        const data = await response.json();
        setInspections(data);
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };

    fetchPendingInspections();
  }, [user.id]);

  const totalPages = Math.ceil(inspections.length / inspectionsPerPage);
  const indexOfLastInspection = currentPage * inspectionsPerPage;
  const indexOfFirstInspection = indexOfLastInspection - inspectionsPerPage;
  const currentInspections = inspections.slice(indexOfFirstInspection, indexOfLastInspection);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="pt-5 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Pending Inspections</h1>
          {inspections.length > 0 ? (
            <div className="mt-8 overflow-x-auto w-full max-w-full">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentInspections.map((inspection) => (
                    <tr key={inspection.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link to={`/inspection/${inspection.id}`} className="text-indigo-600 hover:text-indigo-900">
                          {inspection.source}
                        </Link>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`inline-block px-2 py-1 text-sm font-semibold rounded 
                            ${inspection.status === 'Satisfactory' ? 'bg-green-100 text-green-800' :
                              inspection.status === 'Unsatisfactory' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'}`}
                        >
                          {inspection.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {inspection.address ? (
                          <Link to={`/address/${inspection.address.id}`} className="text-indigo-600 hover:text-indigo-900">
                            {inspection.address.combadd}
                          </Link>
                        ) : (
                          'No address'
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {inspection.scheduled_datetime ? new Date(inspection.scheduled_datetime).toLocaleString() : 'Unscheduled'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-gray-500">No pending inspections found.</p>
          )}
        </div>
      </div>

      {inspections.length > 10 && (
        <div className="mt-4 flex justify-between w-full max-w-2xl">
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
    </div>
  );
}
