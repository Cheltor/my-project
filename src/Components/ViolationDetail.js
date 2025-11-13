import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import NewCitationForm from "./NewCitationForm";
import CitationsList from "./CitationsList";
import CodeDrawerLink from "./Codes/CodeDrawerLink";
import FullScreenPhotoViewer from "./FullScreenPhotoViewer";
import FileUploadInput from "./Common/FileUploadInput";
import PageLoading from "./Common/PageLoading";
import PageError from "./Common/PageError";
import {
  getAttachmentDisplayLabel,
  getAttachmentFilename,
  isImageAttachment,
  toEasternLocaleDateString,
  toEasternLocaleString
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

const statusToneMap = {
  0: 'bg-rose-50 text-rose-700 ring-rose-200',
  1: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  2: 'bg-amber-50 text-amber-700 ring-amber-200',
  3: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const formatViolationType = (value) => {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateLabel = (value, { includeTime = false } = {}) => {
  if (!value) return '';
  if (includeTime) {
    return toEasternLocaleString(value, 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return toEasternLocaleDateString(value, 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const computeDeadlineMeta = (deadlineDate, status) => {
  if (!deadlineDate) return null;
  const deadline = new Date(deadlineDate);
  if (Number.isNaN(deadline.getTime())) return null;
  if (status === 1) {
    return {
      deadline,
      formatted: formatDateLabel(deadline, { includeTime: false }),
      badgeLabel: '',
      badgeClass: '',
    };
  }
  const now = new Date();
  const diffDays = (deadline - now) / (1000 * 60 * 60 * 24);
  let badgeLabel = '';
  let badgeClass = '';
  if (diffDays < 0) {
    badgeLabel = 'Past Due';
    badgeClass = 'bg-rose-50 text-rose-700 ring-rose-200';
  } else if (diffDays <= 3) {
    badgeLabel = 'Approaching';
    badgeClass = 'bg-amber-50 text-amber-700 ring-amber-200';
  } else {
    badgeLabel = 'Plenty of Time';
    badgeClass = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  return {
    deadline,
    formatted: formatDateLabel(deadline, { includeTime: false }),
    badgeLabel,
    badgeClass,
  };
};

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
  }, [violation]);

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
    const deadlineMeta = useMemo(
      () => computeDeadlineMeta(violation?.deadline_date, violation?.status),
      [violation?.deadline_date, violation?.status]
    );
    const sortedComments = useMemo(() => {
      const list = Array.isArray(violation?.violation_comments) ? violation.violation_comments : [];
      return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [violation?.violation_comments]);

  if (loading) {
    return <PageLoading message="Loading violation…" />;
  }

  if (error) {
    return <PageError title="Unable to load violation" error={error} />;
  }

  if (!violation) {
    return <PageError title="Violation not found" message="The requested violation could not be located." />;
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

    const violationTitle = formatViolationType(violation.violation_type) || 'Violation';
    const statusLabel = statusMapping[violation.status] || 'Unknown';
    const createdLabel = formatDateLabel(violation.created_at, { includeTime: true });
    const updatedLabel = formatDateLabel(violation.updated_at, { includeTime: true });
    const hasCodes = Array.isArray(violation.codes) && violation.codes.length > 0;
    const hasAttachments = attachments.length > 0;
    const displayAssignee = violation.user
      ? violation.user.name || violation.user.email || `User ${violation.user_id}`
      : 'Unassigned';
  const showDocumentActions = (violation.status === 0 && isFormalNotice) || violation.status === 1;

  return (
    <div className="space-y-10">
      {showComplianceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Print Compliance Letter</h3>
            <p className="mt-3 text-sm text-gray-600">
              This violation is now marked as abated. Would you like to generate a compliance letter to thank the property owner for resolving the issue?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowComplianceModal(false)}
                disabled={isGeneratingCompliance}
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadComplianceLetter(true)}
                disabled={isGeneratingCompliance}
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingCompliance ? 'Generating…' : 'Print Letter'}
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedPhotoUrl && (
        <FullScreenPhotoViewer
          photoUrl={selectedPhotoUrl}
          onClose={() => setSelectedPhotoUrl(null)}
        />
      )}

      <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5 border-b border-gray-100 px-6 py-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-500">
              <span className="font-medium text-gray-900">Violation #{violation.id}</span>
              {createdLabel && <span>Created {createdLabel}</span>}
            </div>
            <h1 className="text-3xl font-semibold text-gray-900">{violationTitle || 'Violation'}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="font-medium text-gray-500">Address</span>
              {violation.address_id ? (
                <Link
                  to={`/address/${violation.address_id}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-500"
                >
                  {violation.combadd || 'View address'}
                </Link>
              ) : (
                <span className="text-gray-900">{violation.combadd || '—'}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span
              className={classNames(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset',
                statusToneMap[violation.status] || 'bg-slate-100 text-slate-700 ring-slate-200'
              )}
              title={statusLabel}
            >
              {statusLabel}
            </span>
            {violation.status === 0 && user && (
              <button
                type="button"
                onClick={handleMarkAbated}
                disabled={abatingViolation}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {abatingViolation ? 'Marking…' : 'Mark as Abated'}
              </button>
            )}
            {violation.status === 1 && user && (
              <button
                type="button"
                onClick={handleReopen}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-400"
              >
                Reopen Violation
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-6 border-b border-gray-100 px-6 py-6 lg:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Assignment</p>
            {user?.role === 3 ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {assignSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
                {assignError && <p className="text-sm text-rose-600">{assignError}</p>}
                {!assignError && assignSuccess && <p className="text-sm text-emerald-600">{assignSuccess}</p>}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-700">
                <span className="font-medium text-gray-900">Assigned to:</span> {displayAssignee}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Deadline</p>
            {deadlineMeta ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="text-base font-semibold text-gray-900">{deadlineMeta.formatted}</p>
                  {deadlineMeta.badgeLabel && (
                    <span
                      className={classNames(
                        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset',
                        deadlineMeta.badgeClass || 'bg-slate-100 text-slate-700 ring-slate-200'
                      )}
                    >
                      {deadlineMeta.badgeLabel}
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  {!extendingDeadline && user && (
                    <button
                      type="button"
                      onClick={() => {
                        setExtendDays('');
                        setExtendingDeadline(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-400"
                    >
                      Extend Deadline
                    </button>
                  )}
                  {extendingDeadline && (
                    <form onSubmit={handleExtendDeadline} className="flex flex-wrap items-center gap-3">
                      <label htmlFor="extend-days" className="sr-only">
                        Days to extend
                      </label>
                      <input
                        id="extend-days"
                        type="number"
                        min="1"
                        value={extendDays}
                        onChange={(e) => setExtendDays(e.target.value)}
                        className="h-10 w-24 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        placeholder="Days"
                        required
                      />
                      <button
                        type="submit"
                        disabled={deadlineSubmitting}
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deadlineSubmitting ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExtendingDeadline(false)}
                        disabled={deadlineSubmitting}
                        className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                  {extendError && <p className="text-sm text-rose-600">{extendError}</p>}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-gray-600">No deadline recorded for this violation.</p>
            )}
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Details</p>
            <dl className="mt-4 space-y-3 text-sm text-gray-700">
              {violation.user?.email && (
                <div>
                  <dt className="font-medium text-gray-500">Created by</dt>
                  <dd className="mt-1 text-gray-900">{violation.user.email}</dd>
                </div>
              )}
              {createdLabel && (
                <div>
                  <dt className="font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-gray-900">{createdLabel}</dd>
                </div>
              )}
              {updatedLabel && (
                <div>
                  <dt className="font-medium text-gray-500">Last updated</dt>
                  <dd className="mt-1 text-gray-900">{updatedLabel}</dd>
                </div>
              )}
              {violation.priority && (
                <div>
                  <dt className="font-medium text-gray-500">Priority</dt>
                  <dd className="mt-1 text-gray-900">{violation.priority}</dd>
                </div>
              )}
              {violation.unit && (
                <div>
                  <dt className="font-medium text-gray-500">Unit</dt>
                  <dd className="mt-1 text-gray-900">{violation.unit}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="space-y-8 px-6 py-6">
          {violation.comment && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <h3 className="text-sm font-semibold text-gray-900">Inspector Notes</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{violation.comment}</p>
            </div>
          )}

          {hasCodes && (
            <div className="rounded-2xl border border-gray-100 bg-white/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">Codes</h3>
                <span className="text-xs uppercase tracking-wide text-gray-400">{violation.codes.length} {violation.codes.length === 1 ? 'entry' : 'entries'}</span>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                {violation.codes.map((code) => {
                  const description = code.description
                    ? code.description.length > 160
                      ? `${code.description.slice(0, 160)}…`
                      : code.description
                    : '';
                  return (
                    <li key={code.id} className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3 shadow-sm">
                      <div className="flex flex-col gap-2">
                        <CodeDrawerLink
                          codeId={code.id}
                          title={code.description || code.name}
                          className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                        >
                          {code.chapter}{code.section ? `.${code.section}` : ''}: {code.name}
                        </CodeDrawerLink>
                        {description && <p className="text-sm text-gray-600">{description}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {hasAttachments && (
            <div className="rounded-2xl border border-gray-100 bg-white/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Attachments</h3>
                  <p className="text-xs text-gray-500">Uploaded photos and supporting documents.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (firstImageAttachment) {
                        setSelectedPhotoUrl(firstImageAttachment.url || firstImageAttachment);
                      }
                    }}
                    disabled={!firstImageAttachment}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    View Gallery
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadAttachments}
                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                  >
                    Download ({attachments.length})
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {attachments.map((attachment, index) => {
                  const url = attachment?.url || attachment;
                  const filename = getAttachmentFilename(attachment, `Violation attachment ${index + 1}`);
                  const isImage = isImageAttachment(attachment);
                  const extensionLabel = getAttachmentDisplayLabel(attachment);
                  return (
                    <div key={index} className="group rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                      {isImage ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoUrl(url)}
                          className="relative block aspect-square w-full overflow-hidden rounded-lg"
                        >
                          <img
                            src={url}
                            alt={filename}
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                          />
                        </button>
                      ) : (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-28 w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600"
                          title={filename}
                        >
                          <span className="text-2xl">📄</span>
                          <span className="mt-1 text-[10px] font-medium uppercase tracking-wide">{extensionLabel}</span>
                        </a>
                      )}
                      <p className="mt-2 line-clamp-2 text-xs font-medium text-gray-600" title={filename}>
                        {filename}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showDocumentActions && (
            <div className="rounded-2xl border border-gray-100 bg-white/60 p-5">
              <h3 className="text-sm font-semibold text-gray-900">Notices & Letters</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {violation.status === 0 && isFormalNotice && (
                  <button
                    type="button"
                    onClick={handleDownloadViolationNotice}
                    disabled={isDownloadingNotice}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDownloadingNotice ? 'Preparing…' : 'Download Violation Notice'}
                  </button>
                )}
                {violation.status === 1 && (
                  <button
                    type="button"
                    onClick={() => handleDownloadComplianceLetter()}
                    disabled={isGeneratingCompliance}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGeneratingCompliance ? 'Generating…' : 'Download Compliance Letter'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-semibold text-gray-900">Violation Comments</h3>
            <p className="text-sm text-gray-500">Collaborate with your team and track updates in one place.</p>
          </div>
        </div>
        <div className="space-y-8 px-6 py-6">
          {user && (
            <form onSubmit={handleCommentSubmit} className="space-y-4 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-5">
              <div>
                <label htmlFor="new-violation-comment" className="block text-sm font-semibold text-gray-900">
                  Add a comment
                </label>
                <textarea
                  id="new-violation-comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  placeholder="Share an update or leave instructions for your team…"
                  className="mt-2 w-full rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  disabled={submitting}
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <FileUploadInput
                  id="violation-comment-files"
                  name="attachments"
                  label=""
                  files={commentFiles}
                  onChange={handleCommentAttachmentsChange}
                  accept="image/*,application/pdf"
                  disabled={submitting}
                  addFilesLabel={commentFiles.length > 0 ? 'Add more files' : 'Attach files'}
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? 'Posting…' : 'Post Comment'}
                </button>
              </div>
            </form>
          )}

          {sortedComments.length > 0 ? (
            <ul className="space-y-4">
              {sortedComments.map((c) => {
                const commentList = commentAttachments[c.id] || [];
                const hasCommentImages = commentList.some((att) => isImageAttachment(att));
                let displayName = 'User';
                if (c.user?.email) {
                  displayName = c.user.email.split('@')[0];
                }
                return (
                  <li key={c.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-gray-900">{displayName}</div>
                      {c.created_at && (
                        <div className="text-xs text-gray-500">
                          {formatDateLabel(c.created_at, { includeTime: true })}
                        </div>
                      )}
                    </div>
                    {c.content && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{c.content}</p>
                    )}
                    {commentList.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => {
                              if (!hasCommentImages) return;
                              const firstImage = commentList.find((att) => isImageAttachment(att));
                              if (firstImage) {
                                setSelectedPhotoUrl(firstImage.url || firstImage);
                              }
                            }}
                            disabled={!hasCommentImages}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            View attachments ({commentList.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadCommentAttachments(c.id)}
                            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                          >
                            Download attachments ({commentList.length})
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {commentList.map((att, idx) => {
                            const url = att?.url || att;
                            const filename = getAttachmentFilename(att, `Comment attachment ${idx + 1}`);
                            const isImage = isImageAttachment(att);
                            const extensionLabel = getAttachmentDisplayLabel(att);
                            return (
                              <div key={idx} className="group rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                                {isImage ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPhotoUrl(url)}
                                    className="relative block aspect-square w-full overflow-hidden rounded-lg"
                                  >
                                    <img
                                      src={url}
                                      alt={filename}
                                      className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                                    />
                                  </button>
                                ) : (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex h-24 w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600"
                                    title={filename}
                                  >
                                    <span className="text-2xl">📄</span>
                                    <span className="mt-1 text-[10px] font-medium uppercase tracking-wide">{extensionLabel}</span>
                                  </a>
                                )}
                                <p className="mt-2 line-clamp-2 text-xs font-medium text-gray-600" title={filename}>
                                  {filename}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No comments yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-semibold text-gray-900">Citations</h3>
            <p className="text-sm text-gray-500">Manage enforcement activity for this violation.</p>
          </div>
        </div>
        <div className="space-y-6 px-6 py-6">
          <ToggleCitationForm
            violationId={id}
            onCitationAdded={refreshCitations}
            codes={violation.codes || []}
            showCitationForm={showCitationForm}
            setShowCitationForm={setShowCitationForm}
            user={user}
            violationStatus={violation.status}
          />
          <CitationsList
            citations={citations}
            submitting={submitting}
            refreshCitations={refreshCitations}
          />
        </div>
      </section>
    </div>
  );

}

// Toggleable citation form component
function ToggleCitationForm({ violationId, onCitationAdded, codes, showCitationForm, setShowCitationForm, user, violationStatus }) {
  const [localShowForm, setLocalShowForm] = useState(false);
  const showForm = typeof showCitationForm === 'boolean' ? showCitationForm : localShowForm;
  const setShowForm = setShowCitationForm || setLocalShowForm;

  return (
    <div className="w-full space-y-4">
      {!showForm ? (
        <div className="flex justify-end">
          {typeof violationStatus !== 'undefined' && violationStatus === 0 && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
              onClick={() => setShowForm(true)}
            >
              Add New Citation
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">New Citation</h4>
            <button
              type="button"
              className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-500"
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





