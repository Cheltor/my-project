import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import NewCitationForm from "./NewCitationForm";
import CitationsList from "./CitationsList";
import FullScreenPhotoViewer from "./FullScreenPhotoViewer";
import FileUploadInput from "./Common/FileUploadInput";
import CodeLink from "./CodeLink";
import {
  getAttachmentDisplayLabel,
  getAttachmentFilename,
  isImageAttachment
} from "../utils";

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
  const [attachments, setAttachments] = useState([]);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  const firstImageAttachment = useMemo(
    () => attachments.find((attachment) => isImageAttachment(attachment)),
    [attachments]
  );
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
  const [commentFiles, setCommentFiles] = useState([]);
  const handleCommentAttachmentsChange = (files) => {
    const next = Array.isArray(files) ? files : Array.from(files || []);
    setCommentFiles(next);
  };
  const [commentAttachments, setCommentAttachments] = useState({}); // { [commentId]: Attachment[] }
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [assignSuccess, setAssignSuccess] = useState('');
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [isGeneratingCompliance, setIsGeneratingCompliance] = useState(false);
  const [abatingViolation, setAbatingViolation] = useState(false);
  const [isDownloadingNotice, setIsDownloadingNotice] = useState(false);

  useEffect(() => {
    const prefetchCommentAttachments = async (comments) => {
      if (!Array.isArray(comments) || comments.length === 0) {
        setCommentAttachments({});
        return;
      }
      try {
        const entries = await Promise.all(
          comments.map(async (c) => {
            try {
              const r = await fetch(`${process.env.REACT_APP_API_URL}/violation/comment/${c.id}/attachments`);
              if (!r.ok) return [c.id, []];
              const data = await r.json();
              return [c.id, Array.isArray(data) ? data : []];
            } catch {
              return [c.id, []];
            }
          })
        );
        const map = {};
        entries.forEach(([id, arr]) => { map[id] = arr; });
        setCommentAttachments(map);
      } catch {
        setCommentAttachments({});
      }
    };

    const fetchViolation = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch violation');
        }
        const data = await response.json();
        setViolation(data);
        // Prefetch attachments for each violation comment
        if (data && Array.isArray(data.violation_comments)) {
          prefetchCommentAttachments(data.violation_comments);
        } else {
          setCommentAttachments({});
        }
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

    const fetchPhotos = async () => {
      try {
        const r = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}/photos`);
        if (!r.ok) return setAttachments([]);
        const data = await r.json();
        setAttachments(Array.isArray(data) ? data : []);
      } catch {
        setAttachments([]);
      }
    };

    fetchViolation();
    fetchCitations();
    fetchPhotos();
  }, [id]);

  useEffect(() => {
    if (!violation) return;
    setAssigneeId(violation.user_id ? String(violation.user_id) : '');
  }, [violation?.user_id]);

  useEffect(() => {
    if (user?.role !== 3) return;
    const loadAssignable = async () => {
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/users/ons/`);
        if (!resp.ok) throw new Error('Failed to load users');
        const data = await resp.json();
        setAssignableUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        setAssignableUsers([]);
      }
    };
    loadAssignable();
  }, [user?.role]);

  // Add comment submit handler
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      let response;
      if (commentFiles.length > 0) {
        const fd = new FormData();
        fd.append('content', newComment);
        fd.append('user_id', user.id);
        for (const f of commentFiles) fd.append('files', f);
        response = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}/comments/upload`, {
          method: 'POST',
          body: fd,
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        response = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}/comments`, {
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
      }
      if (!response.ok) throw new Error("Failed to post comment");
  setNewComment("");
  setCommentFiles([]);
      // Refetch violation to update comments
  const updated = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}`);
      const updatedData = await updated.json();
      setViolation(updatedData);
  // Trigger an immediate notifications refresh for the current session
  try { window.dispatchEvent(new CustomEvent('notifications:refresh')); } catch (_) {}
      if (updatedData && Array.isArray(updatedData.violation_comments)) {
        // Refresh per-comment attachments too
        const last = updatedData.violation_comments[0]; // newest first if backend returns so; otherwise still fetch all
        // Fetch all to keep counts correct
        const entries = await Promise.all(
          updatedData.violation_comments.map(async (c) => {
            try {
              const r = await fetch(`${process.env.REACT_APP_API_URL}/violation/comment/${c.id}/attachments`);
              if (!r.ok) return [c.id, []];
              const data = await r.json();
              return [c.id, Array.isArray(data) ? data : []];
            } catch {
              return [c.id, []];
            }
          })
        );
        const map = {};
        entries.forEach(([id, arr]) => { map[id] = arr; });
        setCommentAttachments(map);
      } else {
        setCommentAttachments({});
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadCommentAttachments = async (commentId) => {
    try {
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/violation/comment/${commentId}/attachments?download=true`);
      if (!resp.ok) return;
      const files = await resp.json();
      (files || []).forEach((att, idx) => {
        const src = att?.url; if (!src) return;
        const name = att?.filename || `attachment-${idx + 1}`;
        const a = document.createElement('a');
        a.href = src; a.download = name; a.target = '_blank'; a.rel = 'noopener'; a.style.display = 'none';
        document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 0);
      });
    } catch {}
  };

  const assignmentOptions = useMemo(() => {
    const base = Array.isArray(assignableUsers) ? assignableUsers : [];
    if (violation?.user_id && violation?.user) {
      const exists = base.some((u) => Number(u.id) === Number(violation.user_id));
      if (!exists) {
        return [
          ...base,
          {
            id: violation.user_id,
            name: violation.user.name,
            email: violation.user.email,
          },
        ];
      }
    }
    return base;
  }, [assignableUsers, violation?.user_id, violation?.user]);
  const isFormalNotice = useMemo(() => {
    const type = typeof violation?.violation_type === 'string'
      ? violation.violation_type.trim().toLowerCase()
      : '';
    return type === 'formal notice';
  }, [violation?.violation_type]);

  if (loading) {
    return <p>Loading violation...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (!violation) {
    return <p>No violation available.</p>;
  }

  const handleDownloadComplianceLetter = async (closeModal = false) => {
    try {
      setIsGeneratingCompliance(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/violation/${id}/compliance-letter`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to download compliance letter");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const combadd = violation && violation.combadd ? String(violation.combadd) : `violation_${id}`;
      const sanitize = (s) => s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
      const safeAdd = sanitize(combadd) || `violation_${id}`;
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      a.download = `${safeAdd}_compliance_${mm}_${dd}_${yy}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      if (closeModal) {
        setShowComplianceModal(false);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsGeneratingCompliance(false);
    }
  };

  const handleDownloadViolationNotice = async () => {
    try {
      setIsDownloadingNotice(true);
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
      const combadd = violation && violation.combadd ? String(violation.combadd) : `violation_${id}`;
      const sanitize = (s) => s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
      const safeAdd = sanitize(combadd) || `violation_${id}`;
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      a.download = `${safeAdd}_${mm}_${dd}_${yy}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDownloadingNotice(false);
    }
  };

  // Download all violation attachments using signed URLs
  const handleDownloadAttachments = async () => {
    try {
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}/photos?download=true`);
      if (!resp.ok) return;
      const files = await resp.json();
      (files || []).forEach((att, idx) => {
        const src = att?.url; if (!src) return;
        const name = att?.filename || `attachment-${idx + 1}`;
        const a = document.createElement('a');
        a.href = src; a.download = name; a.target = '_blank'; a.rel = 'noopener'; a.style.display = 'none';
        document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 0);
      });
    } catch {}
  };

  const handleAssigneeUpdate = async () => {
    if (user?.role !== 3 || !assigneeId) return;
    try {
      setAssignSaving(true);
      setAssignError(null);
      setAssignSuccess('');
      const fd = new FormData();
      fd.append('user_id', assigneeId);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/violation/${id}/assignee`, {
        method: 'PATCH',
        headers,
        body: fd,
      });
      if (!resp.ok) {
        let msg = 'Failed to update assignment';
        try {
          const errData = await resp.json();
          if (errData?.detail) msg = errData.detail;
        } catch {}
        throw new Error(msg);
      }
      const updated = await resp.json();
      setViolation(updated);
      setAssignSuccess('Assignee updated');
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssignSaving(false);
    }
  };


  // Handler for marking as abated (closed)
  const handleMarkAbated = async () => {
    if (!window.confirm("Are you sure you want to mark this violation as abated (closed)?")) return;
    try {
      setAbatingViolation(true);
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
      setShowComplianceModal(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setAbatingViolation(false);
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
      {showComplianceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800">Print Compliance Letter</h3>
            <p className="mt-3 text-sm text-gray-600">
              This violation is now marked as abated. Would you like to generate a compliance letter to thank the property owner for resolving the issue?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowComplianceModal(false)}
                disabled={isGeneratingCompliance}
                className="px-4 py-2 rounded border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadComplianceLetter(true)}
                disabled={isGeneratingCompliance}
                className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:bg-indigo-300"
              >
                {isGeneratingCompliance ? "Generating..." : "Print Letter"}
              </button>
            </div>
          </div>
        </div>
      )}
      <h2 className="text-2xl font-semibold text-gray-700">Violation Details</h2>
      <div className="bg-gray-100 p-4 rounded-lg shadow mt-4 relative">
        {selectedPhotoUrl && (
          <FullScreenPhotoViewer
            photoUrl={selectedPhotoUrl}
            onClose={() => setSelectedPhotoUrl(null)}
          />
        )}
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

            <div className="mt-3">
              {user?.role === 3 ? (
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                  <div className="mt-1 flex gap-2">
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select an inspector</option>
                      {assignmentOptions.map((ons) => (
                        <option key={ons.id} value={String(ons.id)}>
                          {ons.name || ons.email || `User ${ons.id}`}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAssigneeUpdate}
                      disabled={assignSaving || !assigneeId}
                      className="px-3 py-2 rounded bg-indigo-600 text-white text-xs font-semibold disabled:opacity-60"
                    >
                      {assignSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                  {assignError && <div className="text-xs text-red-600 mt-1">{assignError}</div>}
                  {!assignError && assignSuccess && <div className="text-xs text-green-600 mt-1">{assignSuccess}</div>}
                </div>
              ) : (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Assigned To:</span>{" "}
                  {violation.user
                    ? violation.user.name || violation.user.email || `User ${violation.user_id}`
                    : "Unassigned"}
                </p>
              )}
            </div>


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
                disabled={abatingViolation}
                className="mt-2 px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-xs font-semibold"
              >
                {abatingViolation ? 'Marking...' : 'Mark as Abated'}
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
                  <CodeLink
                    codeId={code.id}
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    {code.chapter}{code.section ? `.${code.section}` : ''}: {code.name}
                  </CodeLink>
                  {code.description ? ` — ${code.description.length > 80 ? code.description.slice(0, 80) + '...' : code.description}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Attachments (if any) */}
        {attachments.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-start mb-2">
              <button
                type="button"
                className="text-indigo-600 hover:underline text-sm font-medium disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                onClick={() => {
                  if (firstImageAttachment) {
                    setSelectedPhotoUrl(firstImageAttachment.url || firstImageAttachment);
                  }
                }}
                disabled={!firstImageAttachment}
              >
                View attachments ({attachments.length})
              </button>
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {attachments.map((attachment, index) => {
                const url = attachment?.url || attachment;
                const filename = getAttachmentFilename(attachment, `Violation attachment ${index + 1}`);
                const isImage = isImageAttachment(attachment);
                const extensionLabel = getAttachmentDisplayLabel(attachment);

                return (
                  <div key={index} className="w-24 flex flex-col items-center">
                    {isImage ? (
                      <img
                        src={url}
                        alt={filename}
                        className="w-24 h-24 object-cover rounded-md shadow cursor-pointer"
                        onClick={() => setSelectedPhotoUrl(url)}
                      />
                    ) : (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-24 h-24 flex flex-col items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-600 shadow hover:bg-gray-100 transition-colors"
                        title={filename}
                      >
                        <span className="text-2xl">📄</span>
                        <span className="mt-1 text-[10px] font-medium uppercase">{extensionLabel}</span>
                      </a>
                    )}
                    <span className="mt-1 text-[10px] text-gray-600 text-center break-words" title={filename}>
                      {filename}
                    </span>
                  </div>
                );
              })}
            </div>
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
      {/* Download buttons above Violation Comments */}
      {((violation.status === 0 || violation.status === 1) || attachments.length > 0) && (
        <div className="mt-2 mb-4 flex items-center gap-2">
          {violation.status === 0 && isFormalNotice && (
            <button
              className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-blue-800 disabled:bg-gray-400 text-xs font-semibold"
              onClick={handleDownloadViolationNotice}
              disabled={isDownloadingNotice}
            >
              {isDownloadingNotice ? 'Preparing...' : 'Download Violation Notice'}
            </button>
          )}
          {violation.status === 1 && (
            <button
              className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-blue-800 disabled:bg-gray-400 text-xs font-semibold"
              onClick={() => handleDownloadComplianceLetter()}
              disabled={isGeneratingCompliance}
            >
              {isGeneratingCompliance ? 'Generating...' : 'Download Compliance Letter'}
            </button>
          )}
          {attachments.length > 0 && (
            <button
              type="button"
              className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs font-semibold"
              onClick={handleDownloadAttachments}
            >
              Download attachments ({attachments.length})
            </button>
          )}
        </div>
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
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <FileUploadInput
                  id="violation-comment-files"
                  name="attachments"
                  label=""
                  files={commentFiles}
                  onChange={handleCommentAttachmentsChange}
                  accept="image/*,application/pdf"
                  disabled={submitting}
                  addFilesLabel={commentFiles.length > 0 ? 'Add files' : 'Choose files'}
                />
              </div>
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
                      {(commentAttachments[c.id]?.length || 0) > 0 && (
                        <div className="mt-1 ml-6">
                          <div className="flex items-center justify-start gap-3">
                            <button
                              type="button"
                              className="text-indigo-600 hover:underline text-xs font-medium disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                              onClick={() => {
                                const firstImage = commentAttachments[c.id].find((att) => isImageAttachment(att));
                                if (firstImage) {
                                  setSelectedPhotoUrl(firstImage.url || firstImage);
                                }
                              }}
                              disabled={!commentAttachments[c.id].some((att) => isImageAttachment(att))}
                            >
                              View attachments ({commentAttachments[c.id].length})
                            </button>
                            <button
                              type="button"
                              className="text-indigo-600 hover:underline text-xs font-medium"
                              onClick={() => handleDownloadCommentAttachments(c.id)}
                            >
                              Download attachments ({commentAttachments[c.id].length})
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {commentAttachments[c.id].map((att, idx) => {
                              const url = att?.url || att;
                              const filename = getAttachmentFilename(att, `Comment attachment ${idx + 1}`);
                              const isImage = isImageAttachment(att);
                              const extensionLabel = getAttachmentDisplayLabel(att);

                              return (
                                <div key={idx} className="w-20 flex flex-col items-center">
                                  {isImage ? (
                                    <img
                                      src={url}
                                      alt={filename}
                                      className="w-20 h-20 object-cover rounded-md shadow cursor-pointer"
                                      onClick={() => setSelectedPhotoUrl(url)}
                                    />
                                  ) : (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-20 h-20 flex flex-col items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-600 shadow hover:bg-gray-100 transition-colors"
                                      title={filename}
                                    >
                                      <span className="text-2xl">📄</span>
                                      <span className="mt-1 text-[10px] font-medium uppercase">{extensionLabel}</span>
                                    </a>
                                  )}
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 text-[10px] text-gray-600 text-center break-words hover:text-indigo-600"
                                    title={filename}
                                  >
                                    {filename}
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
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
function ToggleCitationForm({ violationId, onCitationAdded, codes, showCitationForm, setShowCitationForm, user, violationStatus }) {
  // Accept violationStatus as a prop
  const [localShowForm, setLocalShowForm] = useState(false);
  const showForm = typeof showCitationForm === 'boolean' ? showCitationForm : localShowForm;
  const setShowForm = setShowCitationForm || setLocalShowForm;
  // Get violationStatus from props (directly from prop)
  // Remove arguments hack, use violationStatus prop
  // violationStatus is now passed as a named prop
  // If not provided, default to undefined
  // (no need for arguments[] hack)
  // Already handled by parent
  // Use violationStatus directly
  return (
    <div className="mt-6 w-full">
      {!showForm ? (
        <div className="flex justify-end">
          {typeof violationStatus !== 'undefined' && violationStatus === 0 && (
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





