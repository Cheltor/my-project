import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

// Status mapping for display
const statusMapping = {
  0: 'Current',
  1: 'Resolved',
  2: 'Pending Trial',
  3: 'Dismissed'
};

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const ViolationDetail = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const [violation, setViolation] = useState(null);
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchViolation = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}`);
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
        const response = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}/citations`);
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

  // Add comment submit handler
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newComment,
          user_id: user.id,
          violation_id: id,
        }),
      });
      if (!response.ok) throw new Error("Failed to post comment");
      setNewComment("");
      // Refetch violation to update comments
      const updated = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}`);
      setViolation(await updated.json());
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
      <div className="bg-gray-100 p-4 rounded-lg shadow mt-4 relative">
        <div className="flex justify-between items-start">
          <p className="text-gray-700 mt-2">
            {violation.address_id ? (
              <Link
                to={`/address/${violation.address_id}`}
                className="text-blue-700 hover:underline font-semibold"
              >
                {violation.combadd}
              </Link>
            ) : (
              violation.combadd
            )}
          </p>
          <p className="text-gray-700">
            {violation.violation_type}
          </p>
          <span
            className={classNames(
              'ml-2 px-2 py-1 rounded text-xs whitespace-nowrap',
              violation.status === 0 ? 'bg-red-100 text-red-800' : '',
              violation.status === 1 ? 'bg-green-100 text-green-800' : '',
              violation.status === 2 ? 'bg-yellow-100 text-yellow-800' : '',
              violation.status === 3 ? 'bg-gray-100 text-gray-800' : ''
            )}
            title={statusMapping[violation.status]}
          >
            {statusMapping[violation.status]}
          </span>
        </div>
        {/* Codes (if present) */}
        {violation.codes && violation.codes.length > 0 && (
          <div className="text-gray-700 text-sm mt-1">
            <span className="font-medium">Codes:</span>
            <ul className="list-disc ml-6">
              {violation.codes.map((code) => (
                <li key={code.id} title={code.description}>
                  <Link
                    to={`/code/${code.id}`}
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    {code.chapter}{code.section ? `.${code.section}` : ''}: {code.name}
                  </Link>
                  {code.description ? ` — ${code.description.length > 80 ? code.description.slice(0, 80) + '...' : code.description}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
        {violation.comment && (
          <p className="text-sm text-gray-500">Comment: {violation.comment}</p>
        )}
        {/* Violation Comments */}
        {violation.violation_comments && (
          <div className="mt-4">
            <span className="font-medium text-gray-700">Violation Comments:</span>
            <ul className="list-disc ml-6 mt-1">
              {violation.violation_comments.length > 0 ? violation.violation_comments.map((c) => {
                let displayName = 'User';
                if (c.user && c.user.email) {
                  displayName = c.user.email.split('@')[0];
                }
                return (
                  <li key={c.id} className="text-sm text-gray-700">
                    <span className="font-semibold">{displayName}:</span> {c.content}
                    {c.created_at && (
                      <span className="ml-2 text-xs text-gray-400">({new Date(c.created_at).toLocaleDateString('en-US')})</span>
                    )}
                  </li>
                );
              }) : <li className="text-sm text-gray-500">No comments yet.</li>}
            </ul>
            {user && (
              <form onSubmit={handleCommentSubmit} className="mt-4 flex flex-col gap-2">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="border rounded p-2 text-sm"
                  rows={2}
                  placeholder="Add a comment..."
                  disabled={submitting}
                />
                <button
                  type="submit"
                  className="self-end px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? "Posting..." : "Post Comment"}
                </button>
              </form>
            )}
          </div>
        )}
        <div className="flex justify-between mt-4 text-xs">
          <div className="text-left">
            {violation.deadline_date && (() => {
              const deadline = new Date(violation.deadline_date);
              const now = new Date();
              const diffMs = deadline - now;
              const diffDays = diffMs / (1000 * 60 * 60 * 24);
              let deadlineStatus = '';
              let badgeClass = '';
              // If resolved, no color or badge
              if (violation.status === 1) {
                deadlineStatus = '';
                badgeClass = '';
              } else if (diffDays < 0) {
                deadlineStatus = 'Past Due';
                badgeClass = 'bg-red-200 text-red-800';
              } else if (diffDays <= 3) {
                deadlineStatus = 'Approaching';
                badgeClass = 'bg-yellow-200 text-yellow-900';
              } else {
                deadlineStatus = 'Plenty of Time';
                badgeClass = 'bg-green-100 text-green-800';
              }
              return (
                <>
                  <span className="text-gray-700 mr-2 text-base font-semibold">Deadline: {deadline.toLocaleDateString('en-US')}</span>
                  {deadlineStatus && (
                    <span className={`ml-1 px-2 py-0.5 rounded text-xs font-semibold align-middle ${badgeClass}`}>
                      {deadlineStatus}
                    </span>
                  )}
                </>
              );
            })()}
          </div>
          <div className="text-right">
            <p className="text-gray-500">Created on {new Date(violation.created_at).toLocaleDateString('en-US')}</p>
            {violation.updated_at && (
              <p className="text-gray-500">Updated on {new Date(violation.updated_at).toLocaleDateString('en-US')}</p>
            )}
          </div>
        </div>

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
};

export default ViolationDetail;
