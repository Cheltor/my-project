import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

const ViolationDetail = () => {
  const { id } = useParams();
  const [violation, setViolation] = useState(null);
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchViolation = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/violation/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch violation');
        }
        const data = await response.json();
        setViolation(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchCitations = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/violation/${id}/citations`);
        if (!response.ok) {
          throw new Error('Failed to fetch citations');
        }
        const data = await response.json();
        setCitations(data);
      } catch (error) {
        setError(error.message);
      }
    };

    fetchViolation();
    fetchCitations();
  }, [id]);

  if (loading) {
    return <p>Loading violation...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (!violation) {
    return <p>No violation available.</p>;
  }

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Violation Details</h2>
      <div className="bg-gray-100 p-4 rounded-lg shadow mt-4">
        <p className="text-gray-700">Violation Type: {violation.violation_type}</p>
        <p className="text-gray-700">Status: {violation.status}</p>
        {violation.deadline && (
          <p className="text-gray-700">Deadline: {new Date(violation.deadline).toLocaleDateString('en-US')}</p>
        )}
        <p className="text-sm text-gray-500 mt-2">Created on {new Date(violation.created_at).toLocaleDateString('en-US')}</p>
        {violation.updated_at && (
          <p className="text-sm text-gray-500">Updated on {new Date(violation.updated_at).toLocaleDateString('en-US')}</p>
        )}
        {violation.comment && (
          <p className="text-sm text-gray-500">Comment: {violation.comment}</p>
        )}
        <p className="text-gray-700">Address: {violation.combadd}</p>
      </div>
      <div className="mt-8">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4 ">Citations</h3>
      <ul className="space-y-4">
        {citations.length > 0 ? (
          citations.map((citation) => (
            <li
              key={citation.id}
              className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200"
            >
              <p className="text-gray-700 mb-2">
                <span className="font-medium">Deadline:</span> {new Date(citation.deadline).toLocaleDateString('en-US')}
              </p>
              <p className="text-gray-700 mb-2">
                <span className="font-medium">Fine:</span> ${citation.fine}
              </p>
              <p className="text-gray-700 mb-2">
                <span className="font-medium">Status:</span> {(() => {
                  switch (citation.status) {
                    case 0:
                      return 'Unpaid';
                    case 1:
                      return 'Paid';
                    case 2:
                      return 'Pending Trial';
                    case 3:
                      return 'Dismissed';
                    default:
                      return 'Unknown';
                  }
                })()}
              </p>
              {citation.trial_date && (
                <p className="text-gray-700 mb-2">
                  <span className="font-medium">Trial Date:</span> {citation.trial_date}
                </p>
              )}
              <p className="text-gray-700 mb-2">
                <span className="font-medium">Code:</span>{' '}
                <Link to={`/code/${citation.code_id}`} className="text-blue-600 hover:text-blue-800 underline">
                  {citation.code_name}
                </Link>
              </p>
              <p className="text-gray-700 mb-2">
                <span className="font-medium">Created At:</span> {citation.created_at}
              </p>
              {citation.updated_at && (
                <p className="text-gray-700">
                  <span className="font-medium">Updated At:</span> {citation.updated_at}
                </p>
              )}
            </li>
          ))
        ) : (
          <p className="text-gray-500">No citations available.</p>
        )}
      </ul>
      </div> 
    </div>
  );
}

export default ViolationDetail;