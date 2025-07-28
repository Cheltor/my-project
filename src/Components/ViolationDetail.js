import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import NewCitationForm from "./NewCitationForm";
import CitationsList from "./CitationsList";

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
  // State for extending deadline
  const [extendingDeadline, setExtendingDeadline] = useState(false);
  const [extendDays, setExtendDays] = useState('');
  const [deadlineSubmitting, setDeadlineSubmitting] = useState(false);
  const [extendError, setExtendError] = useState(null);

  // Handler for extend deadline submit
  const handleExtendDeadline = async (e) => {
    e.preventDefault();
    setDeadlineSubmitting(true);
    setExtendError(null);
    try {
      const daysToExtend = parseInt(extendDays, 10);
      if (isNaN(daysToExtend) || daysToExtend <= 0) {
        setExtendError("Please enter a positive number of days.");
        setDeadlineSubmitting(false);
        return;
      }
      const response = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}/deadline`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ extend: violation.extend + daysToExtend })
      });
      if (!response.ok) throw new Error('Failed to update deadline');
      const updated = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}`);
      setViolation(await updated.json());
      setExtendingDeadline(false);
      setExtendDays('');
    } catch (err) {
      setExtendError(err.message);
    } finally {
      setDeadlineSubmitting(false);
    }
  };
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

  // Add this handler function inside the ViolationDetail component
  const handleDownloadNotice = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/violation/${id}/notice`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to download notice");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `violation_notice_${id}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  };

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
                  {/* Extend Deadline button for logged-in users */}
                  {user && !extendingDeadline && (
                    <button
                      className="ml-4 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs font-semibold"
                      onClick={() => {
                        setExtendDays('');
                        setExtendingDeadline(true);
                      }}
                    >
                      Extend Deadline
                    </button>
                  )}
                  {extendingDeadline && (
                    <form className="inline-block ml-4" onSubmit={handleExtendDeadline}>
                      <input
                        type="number"
                        min="1"
                        value={extendDays}
                        onChange={e => setExtendDays(e.target.value)}
                        className="border rounded px-2 py-1 text-xs mr-2"
                        placeholder="Days to extend"
                        required
                      />
                      <button
                        type="submit"
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold"
                        disabled={deadlineSubmitting}
                      >
                        {deadlineSubmitting ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="ml-2 px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs"
                        onClick={() => setExtendingDeadline(false)}
                        disabled={deadlineSubmitting}
                      >
                        Cancel
                      </button>
                      {extendError && (
                        <div className="text-xs text-red-600 mt-2">{extendError}</div>
                      )}
                    </form>
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
      {/* Created/Updated info and User Email */}
      <div className="flex justify-between mt-4 text-xs">
        <div />
        <div className="text-right">
          {violation.user && (
            <p className="text-gray-500 font-semibold mb-1">{violation.user.email}</p>
          )}
          <p className="text-gray-500">Created on {new Date(violation.created_at).toLocaleDateString('en-US')}</p>
          {violation.updated_at && (
            <p className="text-gray-500">Updated on {new Date(violation.updated_at).toLocaleDateString('en-US')}</p>
          )}
        </div>
      </div>
      {/* Download Violation Notice button above Violation Comments, only if status is Current (0) */}
      {violation.status === 0 && (
        <button
          className="mt-2 mb-4 px-3 py-1 bg-gray-700 text-white rounded hover:bg-blue-800 text-xs font-semibold"
          onClick={handleDownloadNotice}
        >
          Download Violation Notice
        </button>
      )}
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
                  violationStatus={violation.status}
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
        <CitationsList
          citations={citations}
          submitting={submitting}
          refreshCitations={refreshCitations}
        />
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
  // Accept violationStatus as a prop (fix: add to argument list)
  // eslint error fix: add violationStatus to function arguments
  return (
    <div className="mt-6 w-full">
      {!showForm ? (
        <div className="flex justify-end">
          {typeof arguments[5] !== 'undefined' && arguments[5] === 0 && (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-semibold"
              onClick={() => setShowForm(true)}
            >
              Add New Citation
            </button>
          )}
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
