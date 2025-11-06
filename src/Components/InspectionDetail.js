import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AsyncSelect from 'react-select/async';
import {
  getAttachmentDisplayLabel,
  getAttachmentFilename,
  isImageAttachment,
  toEasternLocaleString,
  formatPhoneNumber,
  canonicalInspectionStatus,
  formatInspectionStatusLabel,
  inferInspectionStatusSuggestion
} from '../utils';
import FileUploadInput from './Common/FileUploadInput';

const pad2 = (n) => String(n).padStart(2, '0');

const getStatusBadgeClasses = (status) => {
  if (!status) return 'bg-slate-100 text-slate-800 ring-slate-500/20';
  const normalized = status.toString().toLowerCase();
  if (normalized.includes('no violation')) {
    return 'bg-emerald-100 text-emerald-800 ring-emerald-500/20';
  }
  if (normalized.includes('violation')) {
    return 'bg-rose-100 text-rose-800 ring-rose-500/20';
  }
  if (normalized.includes('pending')) {
    return 'bg-indigo-100 text-indigo-800 ring-indigo-500/20';
  }
  if (normalized.includes('complete') || normalized.includes('pass')) {
    return 'bg-emerald-100 text-emerald-800 ring-emerald-500/20';
  }
  if (normalized.includes('fail')) {
    return 'bg-rose-100 text-rose-800 ring-rose-500/20';
  }
  if (normalized.includes('schedule')) {
    return 'bg-amber-100 text-amber-800 ring-amber-500/20';
  }
  return 'bg-slate-100 text-slate-800 ring-slate-500/20';
};

function formatForInput(dtStr) {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function InspectionDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const authToken = token || user?.token;
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scheduleInput, setScheduleInput] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsError, setAttachmentsError] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [assignSuccess, setAssignSuccess] = useState('');
  const [contactMode, setContactMode] = useState('existing');
  const [selectedContact, setSelectedContact] = useState(null);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '' });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState(null);
  const [contactSuccess, setContactSuccess] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [areas, setAreas] = useState([]);
  const [potentialCount, setPotentialCount] = useState(null);

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
      label: parts.length ? parts.join(' · ') : `Contact #${contact.id}`,
    };
  }, []);

  const loadAttachments = useCallback(async () => {
    try {
      setAttachmentsError(null);
      const photosRes = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/photos`);
      if (!photosRes.ok) {
        throw new Error('Failed to load attachments');
      }
      const photos = await photosRes.json();
      setAttachments(Array.isArray(photos) ? photos : []);
    } catch (e) {
      setAttachments([]);
      setAttachmentsError('Failed to load attachments');
    }
  }, [id]);

  const loadContactOptions = useCallback(
    async (inputValue = '') => {
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/contacts/search?query=${encodeURIComponent(inputValue)}&limit=10`);
        if (!resp.ok) return [];
        const data = await resp.json();
        return (Array.isArray(data) ? data : [])
          .map((contact) => buildContactOption(contact))
          .filter(Boolean);
      } catch {
        return [];
      }
    },
    [buildContactOption]
  );

  const handleAttachmentsChange = (files) => {
    const next = Array.isArray(files) ? files : Array.from(files || []);
    setUploadFiles(next);
    setUploadError(null);
    setUploadSuccess('');
  };

  const handleUploadAttachments = async () => {
    if (!uploadFiles.length) {
      setUploadError('Select at least one file');
      return;
    }
    if (!authToken) {
      setUploadError('You must be signed in to upload attachments');
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadSuccess('');
    try {
      const fd = new FormData();
      uploadFiles.forEach((file) => fd.append('files', file));
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/photos`, {
        method: 'POST',
        headers,
        body: fd,
      });
      if (!resp.ok) {
        let msg = 'Failed to upload attachments';
        try {
          const errData = await resp.json();
          if (errData?.detail) msg = errData.detail;
        } catch {}
        throw new Error(msg);
      }
      await loadAttachments();
      setUploadFiles([]);
      setUploadSuccess('Attachments uploaded');
    } catch (err) {
      setUploadError(err.message || 'Failed to upload attachments');
    } finally {
      setUploading(false);
    }
  };

  const handleContactModeToggle = () => {
    setContactError(null);
    setContactSuccess('');
    setContactMode((prev) => {
      const next = prev === 'existing' ? 'new' : 'existing';
      if (next === 'new') {
        setSelectedContact(null);
      } else {
        if (inspection?.contact) {
          const option = buildContactOption(inspection.contact);
          setSelectedContact(option);
        }
        setNewContact({ name: '', email: '', phone: '' });
      }
      return next;
    });
  };

  const handleNewContactChange = (e) => {
    const { name, value } = e.target;
    setNewContact((prev) => ({ ...prev, [name]: value }));
    setContactError(null);
    setContactSuccess('');
  };

  const assignContactToInspection = async (contactId) => {
    const fd = new FormData();
    fd.append('contact_id', String(contactId));
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/contact`, {
      method: 'PATCH',
      headers,
      body: fd,
    });
    if (!resp.ok) {
      let msg = 'Failed to update contact';
      try {
        const errData = await resp.json();
        if (errData?.detail) msg = errData.detail;
      } catch {}
      throw new Error(msg);
    }
    const updated = await resp.json();
    setInspection(updated);
    return updated;
  };

  const handleContactSave = async () => {
    if (!authToken) {
      setContactError('You must be signed in to update contact information');
      return;
    }
    try {
      setContactSaving(true);
      setContactError(null);
      setContactSuccess('');
      if (contactMode === 'new') {
        const name = (newContact.name || '').trim();
        if (!name) {
          setContactError('Name is required to create a contact');
          return;
        }
        const payload = {
          name,
          email: (newContact.email || '').trim() || null,
          phone: (newContact.phone || '').trim() || null,
        };
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/contacts/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          let msg = 'Failed to create contact';
          try {
            const errData = await resp.json();
            if (errData?.detail) msg = errData.detail;
          } catch {}
          throw new Error(msg);
        }
        const created = await resp.json();
        const option = buildContactOption(created);
        if (option) setSelectedContact(option);
        await assignContactToInspection(created.id);
        setContactSuccess('Contact created and assigned');
        setContactMode('existing');
        setNewContact({ name: '', email: '', phone: '' });
      } else {
        if (!selectedContact?.value) {
          setContactError('Select a contact to assign');
          return;
        }
        await assignContactToInspection(Number(selectedContact.value));
        setContactSuccess('Contact updated');
      }
    } catch (err) {
      setContactError(err.message || 'Failed to update contact');
    } finally {
      setContactSaving(false);
    }
  };

  useEffect(() => {
    const fetchInspection = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch inspection');
        }
        const data = await response.json();
        setInspection(data);
        setScheduleInput(formatForInput(data.scheduled_datetime));
        await loadAttachments();
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInspection();
  }, [id, loadAttachments]);

  useEffect(() => {
    let cancelled = false;

    const loadAreas = async () => {
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/areas`);
        if (!resp.ok) throw new Error('Failed to load areas');
        const data = await resp.json();
        if (!cancelled) setAreas(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setAreas([]);
      }
    };

    const loadPotential = async () => {
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/potential-observations`);
        if (!resp.ok) throw new Error('Failed to load potential observations');
        const list = await resp.json();
        if (!cancelled) setPotentialCount(Array.isArray(list) ? list.length : 0);
      } catch {
        if (!cancelled) setPotentialCount(0);
      }
    };

    if (id) {
      loadAreas();
      loadPotential();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (inspection?.contact) {
      const option = buildContactOption(inspection.contact);
      setSelectedContact(option);
      setContactMode('existing');
      setNewContact({ name: '', email: '', phone: '' });
    } else {
      setSelectedContact(null);
    }
  }, [inspection?.contact, buildContactOption]);


  useEffect(() => {
    if (typeof inspection?.inspector_id === "undefined") return;
    setAssigneeId(inspection?.inspector_id ? String(inspection.inspector_id) : '');
  }, [inspection?.inspector_id]);

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
  const saveSchedule = async () => {
    try {
      setScheduleSaving(true);
      setScheduleError(null);
      const fd = new FormData();
      fd.append('scheduled_datetime', scheduleInput || '');
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/schedule`, {
        method: 'PATCH',
        body: fd,
      });
      if (!resp.ok) {
        let msg = 'Failed to update schedule';
        try { const j = await resp.json(); if (j?.detail) msg = j.detail; } catch {}
        throw new Error(msg);
      }
      const updated = await resp.json();
      setInspection(updated);
      setScheduleInput(formatForInput(updated.scheduled_datetime));
    } catch (e) {
      setScheduleError(e.message);
    } finally {
      setScheduleSaving(false);
    }
  };

  const clearSchedule = async () => {
    setScheduleInput('');
    await saveSchedule();
  };

  const handleAssigneeUpdate = async () => {
    if (user?.role !== 3) return;
    try {
      setAssignSaving(true);
      setAssignError(null);
      setAssignSuccess('');
      const fd = new FormData();
      if (assigneeId) {
        fd.append('inspector_id', assigneeId);
      } else {
        fd.append('inspector_id', '');
      }
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/assignee`, {
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
      setInspection(updated);
      setAssignSuccess('Assignee updated');
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssignSaving(false);
    }
  };


  const assignmentOptions = useMemo(() => {
    const base = Array.isArray(assignableUsers) ? assignableUsers : [];
    if (inspection?.inspector_id && inspection?.inspector) {
      const exists = base.some((u) => Number(u.id) === Number(inspection.inspector_id));
      if (!exists) {
        return [
          ...base,
          {
            id: inspection.inspector_id,
            name: inspection.inspector.name,
            email: inspection.inspector.email,
          },
        ];
      }
    }
    return base;
  }, [assignableUsers, inspection?.inspector_id, inspection?.inspector]);

  const canSaveContact = contactMode === 'existing'
    ? Boolean(selectedContact?.value)
    : Boolean((newContact.name || '').trim());
  const canonicalStatus = canonicalInspectionStatus(inspection?.status);
  const statusLabel = formatInspectionStatusLabel(canonicalStatus);
  const suggestion = useMemo(
    () => inferInspectionStatusSuggestion({ inspection, areas, potentialCount }),
    [inspection, areas, potentialCount]
  );
  const showSuggestedStatus = Boolean(
    suggestion?.status &&
      suggestion.status !== canonicalStatus &&
      canonicalStatus !== 'Completed' &&
      canonicalStatus !== 'Cancelled'
  );
  const scheduledLabel = inspection?.scheduled_datetime ? toEasternLocaleString(inspection.scheduled_datetime) : 'Not scheduled';
  const assignedInspectorName = inspection?.inspector?.name || inspection?.inspector?.email || 'Unassigned';

  if (loading) {
    return <p>Loading inspection...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }
  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 pb-12 sm:px-6 lg:px-8">
      <header className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Inspection #{inspection.id}</p>
            <h1 className="text-2xl font-semibold text-gray-900">{inspection.source || 'Inspection'}</h1>
            <p className="mt-1 text-sm text-gray-500">Review scheduling, attachments, and contact information for this inspection.</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusBadgeClasses(inspection.status)}`}>
            {statusLabel}
          </span>
        </div>
        {showSuggestedStatus && (
          <div className="mt-4 rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
            <div>
              Suggested status: <strong>{formatInspectionStatusLabel(suggestion.status)}</strong>
            </div>
            {suggestion.reason && (
              <div className="mt-1 text-[11px] text-indigo-600/80">{suggestion.reason}</div>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {inspection.status === null ? (
            <Link
              to={`/inspections/${inspection.id}/conduct`}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Conduct Inspection
            </Link>
          ) : (
            <Link
              to={`/inspections/${inspection.id}/conduct`}
              className="inline-flex items-center justify-center rounded-md bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Edit Inspection
            </Link>
          )}
          {inspection.address?.id && (
            <Link
              to={`/address/${inspection.address.id}`}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:text-gray-900"
            >
              View Property
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Key Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Property</span>
                <div className="mt-1 text-sm text-gray-900">
                  {inspection.address ? (
                    <Link to={`/address/${inspection.address.id}`} className="text-indigo-600 hover:text-indigo-800">
                      {inspection.address.combadd || 'No address available'}
                    </Link>
                  ) : (
                    'No address available'
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Scheduled</span>
                <div className="mt-1 text-sm text-gray-900">{scheduledLabel}</div>
              </div>
              {inspection.business_id && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Business</span>
                  <div className="mt-1 text-sm text-gray-900">
                    <Link to={`/businesses/${inspection.business_id}`} className="text-indigo-600 hover:text-indigo-800">
                      Business #{inspection.business_id}
                    </Link>
                  </div>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inspector</span>
                <div className="mt-1 text-sm text-gray-900">{assignedInspectorName}</div>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Owner</span>
                <div className="mt-1 text-sm text-gray-900">{inspection.address?.ownername || 'No owner information available'}</div>
              </div>
              {inspection.contact && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Primary Contact</span>
                  <div className="mt-1 text-sm text-gray-900">
                    <Link to={`/contacts/${inspection.contact.id}`} className="text-indigo-600 hover:text-indigo-800">
                      {inspection.contact.name || `Contact #${inspection.contact.id}`}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Attachments</h2>
              <p className="text-xs text-gray-500">{attachments.length ? `${attachments.length} file${attachments.length > 1 ? 's' : ''}` : 'No files uploaded yet'}</p>
            </div>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <FileUploadInput
                  label="Upload attachments"
                  files={uploadFiles}
                  onChange={handleAttachmentsChange}
                  disabled={uploading}
                  addFilesLabel="Add attachments"
                  emptyStateLabel="No files selected"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleUploadAttachments}
                    disabled={uploading || uploadFiles.length === 0}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-indigo-500"
                  >
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                  {uploading && <span className="text-xs text-gray-500">Uploading files…</span>}
                </div>
                {uploadError && <div className="text-xs text-red-600">{uploadError}</div>}
                {!uploadError && uploadSuccess && <div className="text-xs text-green-600">{uploadSuccess}</div>}
              </div>
              {attachmentsError && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{attachmentsError}</div>}
              {attachments.length === 0 && !attachmentsError && (
                <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
                  No attachments yet. Upload site photos, inspection notes, or related documents.
                </div>
              )}
              {attachments.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {attachments.map((attachment, idx) => {
                    const url = attachment?.url || attachment;
                    const filename = getAttachmentFilename(attachment, `attachment-${idx + 1}`);
                    const isImage = isImageAttachment(attachment);
                    const extensionLabel = getAttachmentDisplayLabel(attachment);

                    return (
                      <div key={idx} className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                        {isImage ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded">
                            <img src={url} alt={filename} className="h-32 w-full object-cover transition hover:scale-105" />
                          </a>
                        ) : (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                            <div className="flex h-32 w-full flex-col items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-600 transition hover:border-gray-300 hover:bg-gray-100">
                              <span className="text-3xl">📄</span>
                              <span className="mt-1 text-xs font-medium uppercase">{extensionLabel}</span>
                            </div>
                          </a>
                        )}
                        <a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-xs font-medium text-indigo-600 hover:text-indigo-800" title={filename}>
                          {filename}
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Contact</h2>
              <button
                type="button"
                onClick={() => setShowContactForm((s) => !s)}
                className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-500"
              >
                {showContactForm ? 'Hide update' : 'Update contact'}
              </button>
            </div>
            <div className="mt-3 space-y-3 text-sm text-gray-700">
              {inspection.contact ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link to={`/contacts/${inspection.contact.id}`} className="text-indigo-600 hover:text-indigo-800">
                    {inspection.contact.name || `Contact #${inspection.contact.id}`}
                  </Link>
                  {inspection.contact.email && (
                    <a href={`mailto:${inspection.contact.email}`} className="text-indigo-600 hover:text-indigo-800">
                      {inspection.contact.email}
                    </a>
                  )}
                  <span className="text-gray-600">
                    {inspection.contact.phone ? formatPhoneNumber(inspection.contact.phone) : 'No phone on file'}
                  </span>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-gray-500">
                  No contact information assigned yet.
                </div>
              )}
            </div>

            {showContactForm && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800">Update Contact</p>
                  <button
                    type="button"
                    onClick={handleContactModeToggle}
                    disabled={contactSaving}
                    className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-500 disabled:opacity-60"
                  >
                    {contactMode === 'existing' ? 'Create new contact instead' : 'Use existing contact'}
                  </button>
                </div>
                {contactMode === 'existing' ? (
                  <div className="mt-3">
                    <AsyncSelect
                      cacheOptions
                      defaultOptions
                      loadOptions={loadContactOptions}
                      value={selectedContact}
                      onChange={(option) => {
                        setSelectedContact(option);
                        setContactError(null);
                        setContactSuccess('');
                      }}
                      isClearable
                      placeholder="Search contacts by name, email, or phone"
                      className="mt-2 text-sm"
                    />
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      name="name"
                      value={newContact.name}
                      onChange={handleNewContactChange}
                      placeholder="Name"
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm sm:col-span-2"
                    />
                    <input
                      type="email"
                      name="email"
                      value={newContact.email}
                      onChange={handleNewContactChange}
                      placeholder="Email (optional)"
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <input
                      type="tel"
                      name="phone"
                      value={newContact.phone}
                      onChange={handleNewContactChange}
                      placeholder="Phone (optional)"
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleContactSave}
                    disabled={contactSaving || !authToken || !canSaveContact}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-indigo-500"
                  >
                    {contactSaving ? 'Saving…' : 'Save Contact'}
                  </button>
                  {!authToken && <span className="text-xs text-amber-600">Sign in to make changes</span>}
                </div>
                {contactError && <div className="mt-2 text-xs text-red-600">{contactError}</div>}
                {!contactError && contactSuccess && <div className="mt-2 text-xs text-green-600">{contactSuccess}</div>}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Scheduling & Assignment</h2>
            <p className="mt-2 text-sm text-gray-600">{scheduledLabel}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                type="datetime-local"
                value={scheduleInput}
                onChange={(e) => setScheduleInput(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:w-auto"
              />
              <button
                type="button"
                onClick={saveSchedule}
                disabled={scheduleSaving}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-indigo-500"
              >
                {scheduleSaving ? 'Saving…' : 'Save'}
              </button>
              {inspection.scheduled_datetime && (
                <button
                  type="button"
                  onClick={clearSchedule}
                  disabled={scheduleSaving}
                  className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear
                </button>
              )}
            </div>
            {scheduleError && <div className="mt-2 text-xs text-red-600">{scheduleError}</div>}

            {user?.role === 3 && (
              <div className="mt-6 border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-gray-900">Assigned Inspector</h3>
                <p className="mt-1 text-xs text-gray-500">Update the assigned inspector for this inspection.</p>
                <div className="mt-3 flex flex-col gap-3">
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {assignmentOptions.map((ons) => (
                      <option key={ons.id} value={String(ons.id)}>
                        {ons.name || ons.email || `User ${ons.id}`}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAssigneeUpdate}
                      disabled={assignSaving}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-indigo-500"
                    >
                      {assignSaving ? 'Saving…' : 'Save Assignment'}
                    </button>
                    {assignError && <span className="text-xs text-red-600">{assignError}</span>}
                    {!assignError && assignSuccess && <span className="text-xs text-green-600">{assignSuccess}</span>}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}





