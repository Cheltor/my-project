import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function InspectionDetail() {
  const { id } = useParams();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scheduleInput, setScheduleInput] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
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
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInspection();
  }, [id]);

  const pad2 = (n) => String(n).padStart(2, '0');
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
              ) : "N/A"} | {inspection.inspector?.phone || "N/A"}
            </dd>
          </div>*/}

          {/* Status */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Inspection Status</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {formatStatus(inspection.status)}
            </dd>
          </div>

          {/* Scheduled Date/Time */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Scheduled Date/Time</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              <div className="mb-2">
                {inspection.scheduled_datetime ? new Date(inspection.scheduled_datetime).toLocaleString() : "Not scheduled"}
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
                  </a> | {inspection.contact.phone || "N/A"}
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
