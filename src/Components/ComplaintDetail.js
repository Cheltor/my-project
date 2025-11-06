import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { formatPhoneNumber, toEasternLocaleString } from "../utils";
import FileUploadInput from "./Common/FileUploadInput";
import MentionsTextarea from "./MentionsTextarea";
import FullScreenPhotoViewer from "./FullScreenPhotoViewer";
import NewViolationForm from "./Inspection/NewViolationForm";
import AsyncSelect from "react-select/async";

const pickDescription = (payload) => {
  if (!payload || typeof payload !== "object") return "";
  const fields = [
    "description",
    "details",
    "comment",
    "thoughts",
    "result",
    "notes",
    "notes_area_1",
    "notes_area_2",
    "notes_area_3",
  ];
  for (const field of fields) {
    const value = payload[field];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return "";
};

const statusToneMap = {
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  "Violation Found": "bg-rose-50 text-rose-700 ring-rose-200",
  "No Violation Found": "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const formatMetaDate = (value) => {
  if (!value) return "—";
  try {
    return toEasternLocaleString(value);
  } catch (err) {
    return value;
  }
};

const ComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const authToken = token || user?.token;
  const isAdmin = user?.role === 3;

  const [complaint, setComplaint] = useState(null);
  const [unit, setUnit] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [inspectionComments, setInspectionComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const [mentionIds, setMentionIds] = useState([]);
  const [contactMentionIds, setContactMentionIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);

  const [assignableUsers, setAssignableUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [assignSuccess, setAssignSuccess] = useState("");

  const [statusValue, setStatusValue] = useState("Pending");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showViolationPrompt, setShowViolationPrompt] = useState(false);

  const [scheduleValue, setScheduleValue] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState("");

  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMode, setContactMode] = useState("existing");
  const [selectedContact, setSelectedContact] = useState(null);
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "" });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState(null);
  const [contactSuccess, setContactSuccess] = useState("");

  const buildContactOption = useCallback((contact) => {
    if (!contact || contact.id == null) return null;
    const parts = [];
    if (contact.name) parts.push(contact.name);
    if (contact.email) parts.push(contact.email);
    if (contact.phone) {
      const formatted = formatPhoneNumber(contact.phone);
      parts.push(formatted || contact.phone);
    }
    return {
      value: String(contact.id),
      label: parts.length ? parts.join(" · ") : `Contact #${contact.id}`,
    };
  }, []);

  const loadContactOptions = useCallback(
    async (inputValue = "") => {
      try {
        const resp = await fetch(
          `${process.env.REACT_APP_API_URL}/contacts/search?query=${encodeURIComponent(inputValue)}&limit=10`
        );
        if (!resp.ok) return [];
        const data = await resp.json();
        return (Array.isArray(data) ? data : [])
          .map((contact) => buildContactOption(contact))
          .filter(Boolean);
      } catch (_) {
        return [];
      }
    },
    [buildContactOption]
  );

  const canSaveContact = useMemo(() => {
    if (contactMode === "new") {
      return Boolean((newContact.name || "").trim());
    }
    return Boolean(selectedContact?.value);
  }, [contactMode, newContact, selectedContact]);

  const handleContactFormToggle = () => {
    setShowContactForm((prev) => !prev);
    setContactError(null);
    setContactSuccess("");
  };

  const handleContactModeToggle = () => {
    setContactError(null);
    setContactSuccess("");
    setContactMode((prev) => {
      const next = prev === "existing" ? "new" : "existing";
      if (next === "existing") {
        setNewContact({ name: "", email: "", phone: "" });
      } else {
        setSelectedContact(null);
      }
      return next;
    });
  };

  const handleNewContactChange = (event) => {
    const { name, value } = event.target;
    setNewContact((prev) => ({ ...prev, [name]: value }));
    setContactError(null);
    setContactSuccess("");
  };

  const assignContactToComplaint = async (contactId) => {
    const fd = new FormData();
    fd.append("contact_id", String(contactId));
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
    const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/contact`, {
      method: "PATCH",
      headers,
      body: fd,
    });
    if (!resp.ok) {
      let msg = "Failed to update contact";
      try {
        const payload = await resp.json();
        if (payload?.detail) msg = payload.detail;
      } catch (_) {
        /* ignore */
      }
      throw new Error(msg);
    }
    const updated = await resp.json();
    setComplaint(updated);
    return updated;
  };

  const handleContactSave = async () => {
    setContactError(null);
    setContactSuccess("");
    if (!authToken) {
      setContactError("You must be signed in to update contact information");
      return;
    }
    try {
      setContactSaving(true);
      if (contactMode === "new") {
        const name = (newContact.name || "").trim();
        if (!name) {
          setContactError("Name is required to create a contact");
          return;
        }
        const payload = {
          name,
          email: (newContact.email || "").trim() || null,
          phone: (newContact.phone || "").trim() || null,
        };
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/contacts/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          let msg = "Failed to create contact";
          try {
            const errPayload = await resp.json();
            if (errPayload?.detail) msg = errPayload.detail;
          } catch (_) {
            /* ignore */
          }
          throw new Error(msg);
        }
        const created = await resp.json();
        const option = buildContactOption(created);
        if (option) {
          setSelectedContact(option);
        }
        await assignContactToComplaint(created.id);
        setContactSuccess("Contact created and assigned");
        setContactMode("existing");
        setNewContact({ name: "", email: "", phone: "" });
      } else {
        if (!selectedContact?.value) {
          setContactError("Select a contact to assign");
          return;
        }
        await assignContactToComplaint(Number(selectedContact.value));
        setContactSuccess("Contact updated");
      }
    } catch (err) {
      setContactError(err.message || "Failed to update contact");
    } finally {
      setContactSaving(false);
    }
  };

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}`);
        if (!resp.ok) throw new Error("Failed to fetch complaint");
        const data = await resp.json();
        try {
          console.debug("Inspection payload keys:", Object.keys(data || {}));
          console.debug("Inspection payload sample:", data);
        } catch (_) {
          /* no-op */
        }
        const picked = pickDescription(data);
        const merged = picked && picked.trim() ? { ...data, description: picked } : data;
        setComplaint(merged);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchAttachments = async () => {
      try {
        const r = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/photos`);
        if (!r.ok) return setAttachments([]);
        const data = await r.json();
        setAttachments(Array.isArray(data) ? data : []);
      } catch (_) {
        setAttachments([]);
      }
    };

    fetchComplaint();
    fetchAttachments();
  }, [id]);

  useEffect(() => {
    if (!complaint) return;

    const normalizeStatus = (value) => {
      if (!value) return "Pending";
      const lower = String(value).toLowerCase();
      if (["satisfactory", "no violation found", "no violation"].includes(lower)) {
        return "No Violation Found";
      }
      if (["unsatisfactory", "violation found", "violation"].includes(lower)) {
        return "Violation Found";
      }
      if (["pending", "unknown"].includes(lower)) {
        return "Pending";
      }
      return value;
    };

    setStatusValue(normalizeStatus(complaint.status));

    if (complaint.scheduled_datetime) {
      const d = new Date(complaint.scheduled_datetime);
      const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setScheduleValue(isoLocal);
    } else {
      setScheduleValue("");
    }

    if (typeof complaint?.inspector_id !== "undefined") {
      setAssigneeId(complaint.inspector_id ? String(complaint.inspector_id) : "");
    }

    (async () => {
      try {
        if (complaint?.unit_id) {
          const r = await fetch(`${process.env.REACT_APP_API_URL}/units/${complaint.unit_id}`);
          if (r.ok) {
            const data = await r.json();
            setUnit(data);
          } else {
            setUnit(null);
          }
        } else {
          setUnit(null);
        }
      } catch (_) {
        setUnit(null);
      }
    })();
  }, [complaint]);

  useEffect(() => {
    if (complaint?.contact) {
      const option = buildContactOption(complaint.contact);
      setSelectedContact(option);
      setContactMode("existing");
      setNewContact({ name: "", email: "", phone: "" });
    } else {
      setSelectedContact(null);
    }
  }, [complaint?.contact, buildContactOption]);

  useEffect(() => {
    if (!isAdmin) return;
    const loadAssignable = async () => {
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/users/ons/`);
        if (!resp.ok) throw new Error("Failed to load users");
        const data = await resp.json();
        setAssignableUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        setAssignableUsers([]);
      }
    };
    loadAssignable();
  }, [isAdmin]);

  const assignmentOptions = useMemo(() => {
    const base = Array.isArray(assignableUsers) ? assignableUsers : [];
    if (complaint?.inspector && complaint?.inspector_id) {
      const exists = base.some((u) => Number(u.id) === Number(complaint.inspector_id));
      if (!exists) {
        return [
          ...base,
          {
            id: complaint.inspector_id,
            name: complaint.inspector.name,
            email: complaint.inspector.email,
          },
        ];
      }
    }
    return base;
  }, [assignableUsers, complaint?.inspector, complaint?.inspector_id]);

  const handleAttachmentsChange = (files) => {
    const next = Array.isArray(files) ? files : Array.from(files || []);
    setUploadFiles(next);
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    setScheduleMessage("");
    try {
      const fd = new FormData();
      fd.append("scheduled_datetime", scheduleValue || "");
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/schedule`, {
        method: "PATCH",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: fd,
      });
      if (!resp.ok) throw new Error("Failed to update schedule");
      const updated = await resp.json();
      setComplaint(updated);
      setScheduleMessage("Schedule saved");
    } catch (e) {
      setScheduleMessage(e.message || "Failed to save schedule");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFiles.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      uploadFiles.forEach((file) => fd.append("files", file));
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/photos`, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: fd,
      });
      if (!resp.ok) throw new Error("Failed to upload attachments");
      const refresh = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/photos`);
      const data = await refresh.json();
      setAttachments(Array.isArray(data) ? data : []);
      setUploadFiles([]);
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAssigneeUpdate = async () => {
    if (!isAdmin) return;
    setAssignSaving(true);
    setAssignError(null);
    setAssignSuccess("");
    try {
      const fd = new FormData();
      fd.append("inspector_id", assigneeId || "");
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/assignee`, {
        method: "PATCH",
        headers,
        body: fd,
      });
      if (!resp.ok) {
        let msg = "Failed to update assignment";
        try {
          const payload = await resp.json();
          if (payload?.detail) msg = payload.detail;
        } catch (_) {
          /* ignore */
        }
        throw new Error(msg);
      }
      const updated = await resp.json();
      setComplaint(updated);
      setAssignSuccess("Assignee updated");
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssignSaving(false);
    }
  };

  const handleDownloadAll = async () => {
    try {
      const r = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/photos?download=true`);
      if (!r.ok) return;
      const data = await r.json();
      (Array.isArray(data) ? data : []).forEach((attachment) => {
        if (attachment?.url) window.open(attachment.url, "_blank");
      });
    } catch (_) {
      /* ignore */
    }
  };

  const handleSaveStatus = async () => {
    setSavingStatus(true);
    setStatusMessage("");
    try {
      const fd = new FormData();
      fd.append("status", statusValue);
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/status`, {
        method: "PATCH",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: fd,
      });
      if (!resp.ok) throw new Error("Failed to update status");
      const updated = await resp.json();
      setComplaint(updated);
      setStatusMessage("Status saved");
      if ((statusValue || "").toLowerCase() === "violation found") {
        setShowViolationPrompt(true);
      }
    } catch (e) {
      setStatusMessage(e.message || "Failed to save status");
    } finally {
      setSavingStatus(false);
    }
  };

  // Load inspection comments for this complaint
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const loadComments = async () => {
      setCommentsLoading(true);
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/comments`);
        if (!resp.ok) throw new Error("Failed to load comments");
        const data = await resp.json();
        if (!mounted) return;
        setInspectionComments(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!mounted) return;
        setInspectionComments([]);
      } finally {
        if (mounted) setCommentsLoading(false);
      }
    };
    loadComments();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSubmitComment = async (e) => {
    e && e.preventDefault();
    if (!commentText || !commentText.trim()) return;
    setCommentSubmitting(true);
    setCommentError(null);
    try {
      const userId = user?.id || (user && user.user && user.user.id) || "";
      const fd = new FormData();
      fd.append("content", commentText.trim());
      fd.append("user_id", String(userId));
      if (mentionIds && mentionIds.length > 0) {
        fd.append("mentioned_user_ids", mentionIds.join(","));
      }
      if (contactMentionIds && contactMentionIds.length > 0) {
        fd.append("mentioned_contact_ids", contactMentionIds.join(","));
      }

      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/comments`, {
        method: "POST",
        headers,
        body: fd,
      });
      if (!resp.ok) {
        let msg = "Failed to post comment";
        try {
          const payload = await resp.json();
          if (payload?.detail) msg = payload.detail;
        } catch (_) {}
        throw new Error(msg);
      }
      const created = await resp.json();
      // prepend optimistic
      setInspectionComments((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
      setCommentText("");
      setMentionIds([]);
      setContactMentionIds([]);
      try {
        if (created && Array.isArray(created.mentions) && created.mentions.length > 0) {
          window.dispatchEvent(new Event('notifications:refresh'));
        }
      } catch (_) {
        /* ignore */
      }
    } catch (err) {
      setCommentError(err.message || "Failed to submit comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const isImage = (contentType) => typeof contentType === "string" && contentType.startsWith("image/");

  if (loading) {
    return <p>Loading complaint…</p>;
  }

  if (error) {
    return <p className="text-red-600">Error: {error}</p>;
  }

  if (!complaint) {
    return <p>Complaint not found.</p>;
  }

  const statusTone = statusToneMap[statusValue] || "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <div className="bg-slate-50 py-10">
      <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-slate-500">Complaint #{complaint.id}</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                Complaint Details
              </h1>
              <p className="mt-1 text-sm text-slate-500">Source: {complaint.source || "Complaint"}</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-sm font-semibold ring-1 ring-inset ${statusTone}`}>
                {statusValue}
              </span>
              <div className="text-right text-xs text-slate-500">
                <p>Submitted: {formatMetaDate(complaint.created_at || complaint.submitted_at)}</p>
                <p>Last Updated: {formatMetaDate(complaint.updated_at)}</p>
              </div>
            </div>
          </div>

          <dl className="mt-8 grid gap-6 text-sm text-slate-700 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Property</dt>
              <dd className="mt-2 text-base text-slate-900">
                {complaint.address ? (
                  <Link to={`/address/${complaint.address.id}`} className="text-indigo-600 transition hover:text-indigo-500">
                    {complaint.address.combadd || "No address available"}
                  </Link>
                ) : (
                  "No address available"
                )}
              </dd>
              {complaint.unit_id && (
                <div className="mt-3 text-sm text-slate-600">
                  {complaint.address ? (
                    <Link
                      to={`/address/${complaint.address.id}/unit/${complaint.unit_id}`}
                      className="text-indigo-600 transition hover:text-indigo-500"
                    >
                      {unit?.number ? `Unit ${unit.number}` : `Unit ${complaint.unit_id}`}
                    </Link>
                  ) : (
                    <span>{unit?.number ? `Unit ${unit.number}` : `Unit ${complaint.unit_id}`}</span>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primary Contact</dt>
              <dd className="mt-2 space-y-1 text-base text-slate-900">
                {complaint.contact ? (
                  <>
                    <Link
                      to={`/contacts/${complaint.contact.id}`}
                      className="text-indigo-600 transition hover:text-indigo-500"
                    >
                      {complaint.contact.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 text-sm text-slate-600">
                      <span>{complaint.contact.email ? (
                        <a href={`mailto:${complaint.contact.email}`} className="text-indigo-600 transition hover:text-indigo-500">
                          {complaint.contact.email}
                        </a>
                      ) : (
                        "No email provided"
                      )}</span>
                      <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline" />
                      <span>{complaint.contact.phone ? formatPhoneNumber(complaint.contact.phone) : "No phone"}</span>
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-slate-500">No contact information provided.</span>
                )}
              </dd>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleContactFormToggle}
                  className="inline-flex items-center justify-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
                >
                  {showContactForm
                    ? "Hide update form"
                    : complaint.contact
                    ? "Change contact"
                    : "Assign contact"}
                </button>
              </div>
              {showContactForm && (
                <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">Update Primary Contact</p>
                    <button
                      type="button"
                      onClick={handleContactModeToggle}
                      disabled={contactSaving}
                      className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {contactMode === "existing" ? "Create new contact instead" : "Use existing contact"}
                    </button>
                  </div>
                  {contactMode === "existing" ? (
                    <AsyncSelect
                      cacheOptions
                      defaultOptions
                      loadOptions={loadContactOptions}
                      value={selectedContact}
                      onChange={(option) => {
                        setSelectedContact(option);
                        setContactError(null);
                        setContactSuccess("");
                      }}
                      isClearable
                      placeholder="Search contacts by name, email, or phone"
                      className="text-sm"
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        name="name"
                        value={newContact.name}
                        onChange={handleNewContactChange}
                        placeholder="Name"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:col-span-2"
                      />
                      <input
                        type="email"
                        name="email"
                        value={newContact.email}
                        onChange={handleNewContactChange}
                        placeholder="Email (optional)"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                      <input
                        type="tel"
                        name="phone"
                        value={newContact.phone}
                        onChange={handleNewContactChange}
                        placeholder="Phone (optional)"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleContactSave}
                      disabled={contactSaving || !authToken || !canSaveContact}
                      className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {contactSaving ? "Saving…" : "Save Contact"}
                    </button>
                    {!authToken && (
                      <span className="text-xs text-amber-600">Sign in to make changes</span>
                    )}
                  </div>
                  {contactError && <p className="text-sm text-rose-600">{contactError}</p>}
                  {!contactError && contactSuccess && (
                    <p className="text-sm text-emerald-600">{contactSuccess}</p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Complaint Notes</dt>
              <dd className="mt-2 text-sm text-slate-700">
                {complaint.description && complaint.description.trim()
                  ? complaint.description.trim()
                  : "No description provided."}
              </dd>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inspector</dt>
              <dd className="mt-2 text-base text-slate-900">
                {complaint?.inspector ? (
                  complaint.inspector.name || complaint.inspector.email
                ) : (
                  <span className="text-sm text-slate-500">No inspector assigned.</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-lg font-semibold text-slate-900">Manage Complaint</h2>
            <p className="mt-1 text-sm text-slate-500">
              Update assignment, mark inspection results, and manage scheduling information.
            </p>

            <div className="mt-6 space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Inspector Assignment</h3>
                <p className="mt-1 text-sm text-slate-500">Assign or reassign the primary inspector for this complaint.</p>
                {isAdmin ? (
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <select
                        value={assigneeId}
                        onChange={(event) => setAssigneeId(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="">Unassigned</option>
                        {assignmentOptions.map((option) => (
                          <option key={option.id} value={String(option.id)}>
                            {option.name || option.email || `User ${option.id}`}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAssigneeUpdate}
                        disabled={assignSaving}
                        className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {assignSaving ? "Saving…" : "Save"}
                      </button>
                    </div>
                    {assignError && <p className="text-sm text-rose-600">{assignError}</p>}
                    {!assignError && assignSuccess && (
                      <p className="text-sm text-emerald-600">{assignSuccess}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    {complaint?.inspector ? (
                      complaint.inspector.name || complaint.inspector.email
                    ) : (
                      "You do not have permission to reassign inspectors."
                    )}
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">Inspection Outcome</h3>
                <p className="mt-1 text-sm text-slate-500">Mark whether a violation was found during the inspection.</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-auto"
                    value={statusValue}
                    onChange={(event) => setStatusValue(event.target.value)}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Violation Found">Violation Found</option>
                    <option value="No Violation Found">No Violation Found</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleSaveStatus}
                    disabled={savingStatus}
                    className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingStatus ? "Saving…" : "Save"}
                  </button>
                  {statusMessage && <span className="text-sm text-slate-500">{statusMessage}</span>}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">Schedule Follow-up</h3>
                <p className="mt-1 text-sm text-slate-500">Choose a date and time to investigate this complaint.</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-60"
                    value={scheduleValue}
                    onChange={(event) => setScheduleValue(event.target.value)}
                  />
                  <div className="flex flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleSaveSchedule}
                      disabled={savingSchedule}
                      className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingSchedule ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleValue("")}
                      disabled={savingSchedule}
                      className="inline-flex items-center justify-center rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {scheduleMessage && <p className="mt-2 text-sm text-slate-500">{scheduleMessage}</p>}
              </div>

            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Attachments</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review, download, and upload supporting materials for this complaint.
                </p>
              </div>
              {attachments.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                >
                  Download all ({attachments.length})
                </button>
              )}
            </div>

            <div className="mt-6">
              {attachments.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  No attachments uploaded yet.
                </p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {attachments.map((attachment, index) => (
                    <li key={`${attachment.filename}-${index}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                      {isImage(attachment.content_type) ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoUrl(attachment.url)}
                          className="block h-40 w-full overflow-hidden"
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.filename}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                        </button>
                      ) : (
                        <div className="flex h-40 items-center justify-center bg-slate-100 px-4 text-center">
                          <span className="text-xs font-medium text-slate-500 break-words">{attachment.filename}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                        <span className="truncate text-xs font-medium text-slate-600" title={attachment.filename}>
                          {attachment.filename}
                        </span>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-500"
                        >
                          Open
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-8 space-y-4">
              <FileUploadInput
                id="complaint-attachments"
                name="attachments"
                label="Upload new attachments"
                files={uploadFiles}
                onChange={handleAttachmentsChange}
                accept="image/*,application/pdf"
                disabled={uploading}
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!uploadFiles.length || uploading}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? "Uploading…" : "Upload"}
                </button>
                {uploadError && <span className="text-sm text-rose-600">{uploadError}</span>}
                {!uploadError && uploadFiles.length > 0 && (
                  <span className="text-xs text-slate-500">{uploadFiles.length} file(s) ready to upload.</span>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="mx-auto max-w-6xl mt-8 px-4 sm:px-6 lg:px-8">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-lg font-semibold text-slate-900">Inspection Comments</h2>
            <p className="mt-1 text-sm text-slate-500">Leave an internal note about this inspection.</p>

            <form className="mt-4" onSubmit={handleSubmitComment}>
              <MentionsTextarea
                value={commentText}
                onChange={setCommentText}
                onMentionsChange={setMentionIds}
                onContactMentionsChange={setContactMentionIds}
                rows={4}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Add a note for inspectors / admins..."
                disabled={commentSubmitting}
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={commentSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {commentSubmitting ? "Saving…" : "Add Comment"}
                </button>
                {commentError && <span className="text-sm text-rose-600">{commentError}</span>}
              </div>
            </form>

            <div className="mt-6">
              {commentsLoading ? (
                <p className="text-sm text-slate-500">Loading comments…</p>
              ) : inspectionComments.length === 0 ? (
                <p className="text-sm text-slate-500">No inspection comments yet.</p>
              ) : (
                <ul className="space-y-4">
                  {inspectionComments.map((c) => (
                    <li key={c.id} className="rounded-xl border border-slate-100 p-3">
                      <div className="flex items-start justify-between">
                        <div className="w-full">
                          <div className="text-sm text-slate-700">{c.content}</div>

                          {(Array.isArray(c.mentions) && c.mentions.length > 0) || (Array.isArray(c.contact_mentions) && c.contact_mentions.length > 0) ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {Array.isArray(c.mentions) && c.mentions.map((u) => (
                                <span
                                  key={`mention-user-${u.id}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100"
                                >
                                  @{u.name || u.email || `User ${u.id}`}
                                </span>
                              ))}
                              {Array.isArray(c.contact_mentions) && c.contact_mentions.map((ct) => (
                                <span
                                  key={`mention-contact-${ct.id}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100"
                                >
                                  %{ct.name || ct.email || `Contact ${ct.id}`}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="text-xs text-slate-500 ml-4">
                          {c.user?.name || c.user?.email || `User ${c.user_id}`} · {formatMetaDate(c.created_at)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>

      {selectedPhotoUrl && (
        <FullScreenPhotoViewer photoUrl={selectedPhotoUrl} onClose={() => setSelectedPhotoUrl(null)} />
      )}

      {showViolationPrompt && complaint?.address && (
        <NewViolationForm
          isOpen={showViolationPrompt}
          onClose={() => setShowViolationPrompt(false)}
          initialAddressId={complaint.address.id}
          initialAddressLabel={complaint.address.combadd}
          lockAddress
          title="Add a Violation for this Address?"
          description={(
            <span>
              You marked this complaint as “Violation Found”. Create a new violation for
              <span className="font-semibold"> {complaint.address.combadd}</span>?
            </span>
          )}
          onCreated={(violation) => {
            setShowViolationPrompt(false);
            if (violation?.id) navigate(`/violation/${violation.id}`);
          }}
        />
      )}
    </div>
  );
};

export default ComplaintDetail;
