import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import NewCitationForm from "./NewCitationForm";

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
  // State for toggling citation form
  const [showCitationForm, setShowCitationForm] = useState(false);
  const { id } = useParams();
  const { user, token } = useAuth();
  const [violation, setViolation] = useState(null);
  const [citations, setCitations] = useState([]);
  // Helper to refresh citations after adding
  const refreshCitations = async () => {
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

  // Handler for marking as abated (closed)
  const handleMarkAbated = async () => {
    if (!window.confirm("Are you sure you want to mark this violation as abated (closed)?")) return;
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}/abate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 1 }) // 1 = Resolved/Closed
      });
      if (!response.ok) throw new Error("Failed to mark as abated");
      // Refetch violation to update UI
      const updated = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}`);
      setViolation(await updated.json());
    } catch (err) {
      alert(err.message);
    }
  };

  // Handler for reopening a violation (set status back to 0)
  const handleReopen = async () => {
    if (!window.confirm("Are you sure you want to reopen this violation?")) return;
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}/reopen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 0 }) // 0 = Current/Open
      });
      if (!response.ok) throw new Error("Failed to reopen violation");
      // Refetch violation to update UI
      const updated = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}`);
      setViolation(await updated.json());
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Violation Details</h2>
      <div className="bg-gray-100 p-4 rounded-lg shadow mt-4 relative">
        <div className="flex justify-between items-start">
          <div className="flex-1">
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
            {/* Deadline moved here */}
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
                <div className="mt-1 mb-2">
                  <span className="text-gray-700 text-base font-semibold">Deadline: {deadline.toLocaleDateString('en-US')}</span>
                  {deadlineStatus && (
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold align-middle ${badgeClass}`}>
                      {deadlineStatus}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="flex flex-col items-end ml-4">
            <span
              className={classNames(
                'px-2 py-1 rounded text-xs whitespace-nowrap',
                violation.status === 0 ? 'bg-red-100 text-red-800' : '',
                violation.status === 1 ? 'bg-green-100 text-green-800' : '',
                violation.status === 2 ? 'bg-yellow-100 text-yellow-800' : '',
                violation.status === 3 ? 'bg-gray-100 text-gray-800' : ''
              )}
              title={statusMapping[violation.status]}
            >
              {statusMapping[violation.status]}
            </span>
            {/* Mark as Abated button, only show if status is Current (0) and user is logged in */}
            {violation.status === 0 && user && (
              <button
                onClick={handleMarkAbated}
                className="mt-2 px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold"
              >
                Mark as Abated
              </button>
            )}
            {/* Reopen button, only show if status is Resolved (1) and user is logged in */}
            {violation.status === 1 && user && (
              <button
                onClick={handleReopen}
                className="mt-2 px-4 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs font-semibold"
              >
                Reopen Violation
              </button>
            )}
          </div>
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
      {/* Violation User */}
      {violation.user && (
        <p className="text-xs text-gray-500 mt-1">
          <span className="font-semibold">User:</span> {violation.user.email ? violation.user.email : (violation.user.name || 'Unknown')}
        </p>
      )}
      {/* Created/Updated info moved here */}
      <div className="flex justify-between mt-4 text-xs">
        <div />
        <div className="text-right">
          <p className="text-gray-500">Created on {new Date(violation.created_at).toLocaleDateString('en-US')}</p>
          {violation.updated_at && (
            <p className="text-gray-500">Updated on {new Date(violation.updated_at).toLocaleDateString('en-US')}</p>
          )}
        </div>
      </div>
      {/* Violation Comments */}
      {violation.violation_comments && (
        <div className="mt-4">
          <span className="font-medium text-gray-700">Violation Comments:</span>
          {user && (
            <form onSubmit={handleCommentSubmit} className="mb-4 flex flex-col gap-2">
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
          <ul className="list-disc ml-6 mt-1">
            {violation.violation_comments.length > 0 ? (
              [...violation.violation_comments]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((c) => {
                  let displayName = 'User';
                  if (c.user && c.user.email) {
                    displayName = c.user.email.split('@')[0];
                  }
                  return (
                    <li key={c.id} className="text-sm text-gray-700">
                      <span className="font-semibold">{displayName}:</span> {c.content}
                      {c.created_at && (
                        <span className="ml-2 text-xs text-gray-400">
                          ({new Date(c.created_at).toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})
                        </span>
                      )}
                    </li>
                  );
                })
            ) : (
              <li className="text-sm text-gray-500">No comments yet.</li>
            )}
          </ul>
        </div>
      )}
        {/* Created/Updated info moved above */}

      </div>
      <div className="mt-8">
        {/* Citations Heading and Toggle Button */}
        {user ? (
          <>
            {/* When form is hidden, show heading and button side by side */}
            {!showCitationForm ? (
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-semibold text-gray-800">Citations</h3>
                <ToggleCitationForm
                  violationId={id}
                  onCitationAdded={refreshCitations}
                  codes={violation.codes || []}
                  showCitationForm={showCitationForm}
                  setShowCitationForm={setShowCitationForm}
                  user={user}
                />
              </div>
            ) : (
              <div className="mb-4">
                <h3 className="text-2xl font-semibold text-gray-800 mb-2">Citations</h3>
                <ToggleCitationForm
                  violationId={id}
                  onCitationAdded={refreshCitations}
                  codes={violation.codes || []}
                  showCitationForm={showCitationForm}
                  setShowCitationForm={setShowCitationForm}
                  user={user}
                />
              </div>
            )}
          </>
        ) : (
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Citations</h3>
        )}
        <ul className="space-y-4">
          {citations.length > 0 ? (
            [...citations]
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .map((citation) => (
                <li
                  key={citation.id}
                  className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200"
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      {/* Citation User */}
                      {citation.user && (
                        <p className="text-xs text-gray-500 mb-1">
                          <span className="font-semibold">User:</span> {citation.user.email ? citation.user.email : (citation.user.name || 'Unknown')}
                        </p>
                      )}
                      <p className="text-gray-700 mb-2">
                        <span className="font-medium">Deadline:</span> {(() => {
                          const deadline = new Date(citation.deadline);
                          const now = new Date();
                          const diffMs = deadline - now;
                          const diffDays = diffMs / (1000 * 60 * 60 * 24);
                          let deadlineStatus = '';
                          let badgeClass = '';
                          if (citation.status === 1) {
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
                          return <>
                            {deadline.toLocaleDateString('en-US')}
                            {deadlineStatus && (
                              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold align-middle ${badgeClass}`}>
                                {deadlineStatus}
                              </span>
                            )}
                          </>;
                        })()}
                      </p>
                      <p className="text-gray-700 mb-2">
                        <span className="font-medium">Fine:</span> ${citation.fine}
                      </p>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const newStatus = e.target.elements[`status-${citation.id}`].value;
                          if (parseInt(newStatus) === citation.status) return;
                          try {
                            const res = await fetch(`${process.env.REACT_APP_API_URL}/citations/${citation.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: parseInt(newStatus) })
                            });
                            if (!res.ok) throw new Error('Failed to update status');
                            await refreshCitations();
                          } catch (err) {
                            alert(err.message);
                          }
                        }}
                        className="mb-2"
                      >
                        <label className="font-medium mr-2">Status:</label>
                        <select
                          name={`status-${citation.id}`}
                          defaultValue={citation.status}
                          className="border rounded p-1 text-sm"
                        >
                          <option value={0}>Unpaid</option>
                          <option value={1}>Paid</option>
                          <option value={2}>Pending Trial</option>
                          <option value={3}>Dismissed</option>
                        </select>
                        <button
                          type="submit"
                          className="ml-2 px-2 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          disabled={submitting}
                        >
                          Update
                        </button>
                      </form>
                      {citation.trial_date && (
                        <p className="text-gray-700 mb-2">
                          <span className="font-medium">Trial Date:</span> {citation.trial_date}
                        </p>
                      )}
                      <p className="text-gray-700 mb-2">
                        <span className="font-medium">Code:</span>{' '}
                        <Link
                          to={`/code/${citation.code_id}`}
                          className="font-semibold text-blue-700 hover:underline"
                          title={citation.code_description || citation.code_name}
                        >
                          {citation.code_name}
                        </Link>
                        {citation.code_description ? ` — ${citation.code_description.length > 80 ? citation.code_description.slice(0, 80) + '...' : citation.code_description}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-end min-w-[160px]">
                      <p className="text-gray-500 text-xs">
                        Created: {citation.created_at ? new Date(citation.created_at).toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                      {citation.updated_at && (
                        <p className="text-gray-500 text-xs">
                          Updated: {new Date(citation.updated_at).toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
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

// Toggleable citation form component
function ToggleCitationForm({ violationId, onCitationAdded, codes, showCitationForm, setShowCitationForm, user }) {
  // If parent controls showCitationForm, use that, else fallback to local state for backward compatibility
  const [localShowForm, setLocalShowForm] = useState(false);
  const showForm = typeof showCitationForm === 'boolean' ? showCitationForm : localShowForm;
  const setShowForm = setShowCitationForm || setLocalShowForm;
  return (
    <div className="mt-6 w-full">
      {!showForm ? (
        <div className="flex justify-end">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-semibold"
            onClick={() => setShowForm(true)}
          >
            Add New Citation
          </button>
        </div>
      ) : (
        <div className="w-full">
          <div className="flex justify-end">
            <button
              className="mb-2 text-sm px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 border border-gray-300 transition-colors duration-150"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
          <div className="w-full">
            <NewCitationForm
              violationId={violationId}
              onCitationAdded={() => {
                setShowForm(false);
                if (onCitationAdded) onCitationAdded();
              }}
              codes={codes}
              userId={user ? user.id : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ViolationDetail;
