import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  getAttachmentDisplayLabel,
  getAttachmentFilename,
  isImageAttachment,
  toEasternLocaleString,
  formatPhoneNumber
} from '../utils';

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
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scheduleInput, setScheduleInput] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsError, setAttachmentsError] = useState(null);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [assignSuccess, setAssignSuccess] = useState('');
  const formatStatus = (s) => {
    if (!s) return 'Pending';
    return s
      .toString()
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
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
  // Prefill the schedule input
  setScheduleInput(formatForInput(data.scheduled_datetime));
  // Fetch attachments for this inspection
  try {
    const photosRes = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/photos`);
    if (photosRes.ok) {
      const photos = await photosRes.json();
      setAttachments(Array.isArray(photos) ? photos : []);
    } else {
      setAttachments([]);
    }
  } catch (e) {
    setAttachments([]);
    setAttachmentsError('Failed to load attachments');
  }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInspection();
  }, [id]);


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

  if (loading) {
    return <p>Loading inspection...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      <div className="px-4 sm:px-0">
        <h3 className="text-base font-semibold leading-7 text-gray-900">Inspection Information for {inspection.source} - #{inspection.id}</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">Details of the inspection and related information.</p>
      </div>

      {/* CTA to Conduct Inspection. Only show if inspection is pending */}
      {inspection.status === null && (
        <div className="px-4 py-6 sm:px-0">
          <Link to={`/inspections/${inspection.id}/conduct`} className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            Conduct Inspection
          </Link>
        </div>
      )}

      {/* Edit Inspection Button if inspection status is not null */}
      {inspection.status !== null && (
        <div className="px-4 py-6 sm:px-0">
          <Link to={`/inspections/${inspection.id}/conduct`} className="block rounded-md bg-indigo-50 px-3 py-2 text-center text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            Edit Inspection
          </Link>
        </div>
      )}
      
      <div className="mt-6 border-t border-gray-100">
        <dl className="divide-y divide-gray-100">
          
          {/* Address Information with Link */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Property Address</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.address ? (
                <Link to={`/address/${inspection.address.id}`} className="text-indigo-600 hover:text-indigo-900">
                  {inspection.address.combadd || "No address available"}
                </Link>
              ) : "No address available"}
            </dd>
          </div>

          {/* Business (if associated) */}
          {inspection.business_id && (
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">Business</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                <Link to={`/businesses/${inspection.business_id}`} className="text-indigo-600 hover:text-indigo-900">
                  Business #{inspection.business_id}
                </Link>
              </dd>
            </div>
          )}
          
          {/* Inspector Information */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Inspector</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.inspector?.name || "No inspector assigned"}
            </dd>
          </div>

          {/* Inspector Contact Information with Mailto 
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Inspector Contact</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.inspector?.email ? (
                <a href={`mailto:${inspection.inspector.email}`} className="text-indigo-600 hover:text-indigo-900">
                  {inspection.inspector.email}
                </a>
              ) : "N/A"} | {inspection.inspector?.phone ? formatPhoneNumber(inspection.inspector.phone) : "N/A"}
            </dd>
          </div>*/}

          {/* Status */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Inspection Status</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusBadgeClasses(inspection.status)}`}>
                {formatStatus(inspection.status)}
              </span>
            </dd>
          </div>

          {/* Inspector Assignment */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Assigned Inspector</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {user?.role === 3 ? (
                <div className="max-w-md">
                  <div className="flex gap-2">
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Unassigned</option>
                      {assignmentOptions.map((ons) => (
                        <option key={ons.id} value={String(ons.id)}>
                          {ons.name || ons.email || `User ${ons.id}`}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAssigneeUpdate}
                      disabled={assignSaving}
                      className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-60"
                    >
                      {assignSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                  {assignError && <div className="text-xs text-red-600 mt-1">{assignError}</div>}
                  {!assignError && assignSuccess && <div className="text-xs text-green-600 mt-1">{assignSuccess}</div>}
                </div>
              ) : (
                <span>
                  {inspection.inspector
                    ? inspection.inspector.name || inspection.inspector.email || `User ${inspection.inspector_id}`
                    : "Unassigned"}
                </span>
              )}
            </dd>
          </div>

          {/* Scheduled Date/Time */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Scheduled Date/Time</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              <div className="mb-2">
                {inspection.scheduled_datetime ? toEasternLocaleString(inspection.scheduled_datetime) : "Not scheduled"}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={scheduleInput}
                  onChange={(e) => setScheduleInput(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={saveSchedule}
                  disabled={scheduleSaving}
                  className="px-3 py-1 rounded bg-indigo-600 text-white text-sm disabled:opacity-60"
                >
                  {scheduleSaving ? 'Saving…' : 'Save'}
                </button>
                {inspection.scheduled_datetime && (
                  <button
                    type="button"
                    onClick={clearSchedule}
                    disabled={scheduleSaving}
                    className="px-3 py-1 rounded bg-gray-200 text-gray-800 text-sm disabled:opacity-60"
                  >
                    Clear
                  </button>
                )}
              </div>
              {scheduleError && <div className="text-red-600 text-sm mt-1">{scheduleError}</div>}
            </dd>
          </div>

          {/* Attachments */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Attachments</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {attachmentsError && (
                <div className="text-red-600">{attachmentsError}</div>
              )}
              {attachments.length === 0 && !attachmentsError && (
                <div className="text-gray-500">No attachments</div>
              )}
              {attachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {attachments.map((attachment, idx) => {
                    const url = attachment?.url || attachment;
                    const filename = getAttachmentFilename(attachment, `attachment-${idx + 1}`);
                    const isImage = isImageAttachment(attachment);
                    const extensionLabel = getAttachmentDisplayLabel(attachment);

                    return (
                      <div key={idx} className="border rounded p-2 flex flex-col items-start gap-2">
                        {isImage ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full">
                            <img src={url} alt={filename} className="w-full h-32 object-cover rounded" />
                          </a>
                        ) : (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full"
                          >
                            <div className="w-full h-32 flex flex-col items-center justify-center rounded bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors">
                              <span className="text-3xl">📄</span>
                              <span className="mt-1 text-xs font-medium uppercase">{extensionLabel}</span>
                            </div>
                          </a>
                        )}
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 break-all text-xs" title={filename}>
                          {filename}
                        </a>
                      </div>
                    );
                  })}
            </div>
          )}
        </dd>
      </div>

          {/* Contact Information with Link */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Contact Information</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.contact ? (
                <>
                  <Link to={`/contacts/${inspection.contact.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {inspection.contact.name}
                  </Link> | 
                  <a href={`mailto:${inspection.contact.email}`} className="text-indigo-600 hover:text-indigo-900">
                    {inspection.contact.email}
                  </a> | {inspection.contact.phone ? formatPhoneNumber(inspection.contact.phone) : "N/A"}
                </>
              ) : "No contact information available"}
            </dd>
          </div>

          {/* Property Owner Information */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Owner Name</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.address?.ownername || "No owner information available"}
            </dd>
          </div>

          {/* Property Location 
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Latitude/Longitude</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              Latitude: {inspection.address?.latitude || "N/A"}, Longitude: {inspection.address?.longitude || "N/A"}
            </dd>
          </div>*/}

          {/* Additional Details 
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Additional Notes</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.comment || "No additional notes provided."}
            </dd>
          </div>*/}
        </dl>
      </div>
    </div>
  );
}





