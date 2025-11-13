import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import UnitComments from './UnitComments';
import { useAuth } from '../../AuthContext';
import { toEasternLocaleString } from '../../utils';
import LoadingSpinner from '../Common/LoadingSpinner';

const RELATIVE_TIME_DIVISIONS = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Infinity, unit: 'year' },
];

const formatRelativeTimeFromNow = (input) => {
  const target = input instanceof Date ? input : new Date(input);
  if (!target || Number.isNaN(target.getTime())) return '';
  let duration = (target.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const division of RELATIVE_TIME_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return '';
};

const formatRecentDescriptor = (input) => {
  const target = input instanceof Date ? input : new Date(input);
  if (!target || Number.isNaN(target.getTime())) return '';
  const diffMs = Math.abs(Date.now() - target.getTime());
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (diffMs <= thirtyDays) {
    const relative = formatRelativeTimeFromNow(target);
    if (relative) return relative;
  }
  return toEasternLocaleString(target, 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const hasValue = (value) => value !== undefined && value !== null && value !== '';

const AddressUnitDetail = () => {
  const { unitId } = useParams();
  const { user } = useAuth();
  const [unit, setUnit] = useState(null);
  const [editing, setEditing] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Quick comment (mobile) state
  const [quickContent, setQuickContent] = useState('');
  const [quickFiles, setQuickFiles] = useState([]);
  const [submittingQuick, setSubmittingQuick] = useState(false);
  const fileInputRef = useRef(null);
  const [commentsRefreshKey, setCommentsRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.REACT_APP_API_URL}/units/${unitId}`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch unit');
        return response.json();
      })
      .then((data) => {
        setUnit(data);
        return fetch(`${process.env.REACT_APP_API_URL}/addresses/${data.address_id}`);
      })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch address');
        return response.json();
      })
      .then((data) => {
        setAddress(data);
        setLoading(false);
      })
      .catch((fetchError) => {
        setError(fetchError.message);
        setLoading(false);
      });
  }, [unitId]);

  const unitHighlights = useMemo(() => {
    if (!unit) return [];
    const highlights = [];
    const pushHighlight = (label, value) => {
      if (!hasValue(value)) return;
      highlights.push({ label, value });
    };

    pushHighlight('Status', hasValue(unit.unit_status) ? unit.unit_status : unit.status);
    pushHighlight('Type', hasValue(unit.unit_type) ? unit.unit_type : unit.type);
    pushHighlight('Use', unit.use);
    pushHighlight('Floor', unit.floor);
    if (hasValue(unit.square_feet)) {
      const sqft = Number(unit.square_feet);
      pushHighlight('Square footage', Number.isFinite(sqft) ? `${sqft.toLocaleString()} sq ft` : unit.square_feet);
    }
    pushHighlight('Bedrooms', unit.bedrooms);
    pushHighlight('Bathrooms', unit.bathrooms);
    pushHighlight('Occupancy limit', unit.occupancy_limit);
    if (unit?.is_vacant !== undefined && unit?.is_vacant !== null) {
      pushHighlight('Vacancy', unit.is_vacant ? 'Vacant' : 'Occupied');
    }
    if (hasValue(unit.last_inspected_at)) {
      pushHighlight('Last inspection', formatRecentDescriptor(unit.last_inspected_at));
    }
    if (hasValue(unit.next_inspection_at)) {
      pushHighlight('Next inspection', formatRecentDescriptor(unit.next_inspection_at));
    }
    return highlights;
  }, [unit]);

  const activityMeta = useMemo(() => {
    if (!unit) return [];
    const rows = [];
    if (hasValue(unit.created_at)) {
      rows.push({
        label: 'Created',
        value: toEasternLocaleString(unit.created_at, 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        hint: formatRecentDescriptor(unit.created_at),
      });
    }
    if (hasValue(unit.updated_at)) {
      rows.push({
        label: 'Last updated',
        value: toEasternLocaleString(unit.updated_at, 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        hint: formatRecentDescriptor(unit.updated_at),
      });
    }
    if (hasValue(unit.last_activity_at)) {
      rows.push({
        label: 'Latest activity',
        value: formatRecentDescriptor(unit.last_activity_at),
      });
    }
    return rows;
  }, [unit]);

  const propertyMeta = useMemo(() => {
    if (!address && !unit) return [];
    const rows = [];
    if (address?.property_name) rows.push({ label: 'Property name', value: address.property_name });
    if (address?.combadd) rows.push({ label: 'Street address', value: address.combadd, link: `/address/${address.id}` });
    if (address?.ownername) rows.push({ label: 'Owner', value: address.ownername });
    if (address?.mailadd) rows.push({ label: 'Mailing address', value: address.mailadd });
    if (address?.aka) rows.push({ label: 'Also known as', value: address.aka });
    if (unit?.notes && unit.notes.trim()) rows.push({ label: 'Unit notes', value: unit.notes.trim() });
    if (unit?.occupant_name) rows.push({ label: 'Occupant', value: unit.occupant_name });
    if (unit?.phone) rows.push({ label: 'Contact phone', value: unit.phone });
    if (unit?.email) rows.push({ label: 'Contact email', value: unit.email });
    return rows;
  }, [address, unit]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600 text-lg font-medium">Loading unit details…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-700 shadow-sm">
          Error loading unit: {error}
        </div>
      </div>
    );
  }

  if (!unit || !address) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-slate-700 shadow-sm">
          No unit or address details available.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-36 sm:pb-10">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm text-slate-500">
                  <Link to={`/address/${address.id}`} className="inline-flex items-center gap-2 font-medium text-slate-600 hover:text-slate-900">
                    <span aria-hidden="true">←</span>
                    Back to {address.combadd}
                  </Link>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {editing ? (
                    <form
                      className="flex flex-wrap items-center gap-3"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (newUnitNumber === unit.number || newUnitNumber.trim() === '') {
                          setEditing(false);
                          return;
                        }
                        try {
                          const res = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${address.id}/units`);
                          if (!res.ok) throw new Error('Failed to fetch units');
                          const units = await res.json();
                          const duplicate = units.find((u) => u.number === newUnitNumber && u.id !== unit.id);
                          if (duplicate) {
                            alert('A unit with this number already exists for this address.');
                            return;
                          }
                          setShowConfirm(true);
                        } catch (err) {
                          alert('Error checking for duplicate unit number.');
                        }
                      }}
                    >
                      <input
                        className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newUnitNumber}
                        onChange={(e) => setNewUnitNumber(e.target.value)}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-400"
                          onClick={() => setEditing(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center gap-4">
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Unit {unit.number}</h1>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                        onClick={() => {
                          setNewUnitNumber(unit.number);
                          setEditing(true);
                        }}
                      >
                        Edit unit number
                      </button>
                    </div>
                  )}
                  {address.property_name && (
                    <div className="text-lg font-medium text-slate-700">
                      {address.property_name}
                    </div>
                  )}
                  {address.ownername && (
                    <div className="text-sm text-slate-500">
                      Owner: {address.ownername}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 text-sm text-slate-500 sm:items-end">
                {activityMeta.map((item) => (
                  <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-500">{item.label}</div>
                    <div className="text-sm font-semibold text-slate-800">{item.value}</div>
                    {item.hint && <div className="text-xs text-slate-500">{item.hint}</div>}
                  </div>
                ))}
              </div>
            </div>
            {unitHighlights.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {unitHighlights.map((highlight, index) => (
                  <div
                    key={`${highlight.label}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {highlight.label}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {highlight.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative -mt-6 pb-10 sm:-mt-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
          {propertyMeta.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-900">Unit & property details</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {propertyMeta.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
                    {item.link ? (
                      <dd className="mt-1 text-base font-medium text-indigo-700">
                        <Link to={item.link} className="hover:underline">
                          {item.value}
                        </Link>
                      </dd>
                    ) : (
                      <dd className="mt-1 text-base text-slate-800 whitespace-pre-line">{item.value}</dd>
                    )}
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <UnitComments key={`unit-comments-${commentsRefreshKey}`} unitId={unitId} addressId={address.id} />
          </section>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Confirm update</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to change the unit number to{' '}
              <span className="font-semibold text-slate-900">{newUnitNumber}</span>?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                onClick={async () => {
                  try {
                    const response = await fetch(`${process.env.REACT_APP_API_URL}/units/${unitId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ number: newUnitNumber }),
                    });
                    if (!response.ok) throw new Error('Failed to update unit number');
                    const updated = await response.json();
                    setUnit((prev) => ({ ...prev, number: updated.number }));
                    setEditing(false);
                    setShowConfirm(false);
                  } catch (err) {
                    alert('Error updating unit number.');
                    setShowConfirm(false);
                  }
                }}
              >
                Yes, update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Quick Unit Comment Bar (mobile only) */}
      <div className="fixed inset-x-0 bottom-0 z-40 sm:hidden">
        <div className="mx-auto max-w-5xl px-4 py-4 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user?.id || !address?.id) return;
              if (!quickContent.trim() && quickFiles.length === 0) return;
              setSubmittingQuick(true);
              try {
                if (quickFiles.length > 0) {
                  const formData = new FormData();
                  formData.append('content', quickContent.trim() || '');
                  formData.append('user_id', String(user.id));
                  formData.append('address_id', String(address.id));
                  for (const f of quickFiles) formData.append('files', f);
                  const res = await fetch(`${process.env.REACT_APP_API_URL}/comments/unit/${unitId}/`, {
                    method: 'POST',
                    body: formData,
                  });
                  if (!res.ok) throw new Error('Failed to post unit comment with file');
                } else {
                  const res = await fetch(`${process.env.REACT_APP_API_URL}/comments/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      content: quickContent.trim(),
                      user_id: user.id,
                      address_id: address.id,
                      unit_id: Number(unitId),
                    }),
                  });
                  if (!res.ok) throw new Error('Failed to post unit comment');
                }
                // Reset and refresh
                setQuickContent('');
                setQuickFiles([]);
                setCommentsRefreshKey((k) => k + 1);
              } catch (err) {
                console.error(err);
              } finally {
                setSubmittingQuick(false);
              }
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                title="Add photo"
                aria-label="Add photo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                  <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  setQuickFiles((prev) => {
                    const merged = [...prev];
                    for (const f of files) {
                      const dup = merged.find(
                        (m) => m.name === f.name && m.size === f.size && m.lastModified === f.lastModified
                      );
                      if (!dup) merged.push(f);
                    }
                    return merged;
                  });
                  e.target.value = null;
                }}
              />

              <input
                type="text"
                placeholder="Add a comment..."
                value={quickContent}
                onChange={(e) => setQuickContent(e.target.value)}
                className="flex-1 h-14 rounded-lg border border-gray-300 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {quickFiles.length > 0 && (
              <div className="flex items-center justify-start gap-3">
                <span className="text-base text-gray-700 whitespace-nowrap px-3 py-2 bg-gray-100 rounded-md">
                  {quickFiles.length} file{quickFiles.length > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setQuickFiles([])}
                  className="text-sm text-gray-700 hover:text-gray-900 underline"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={submittingQuick || (!quickContent.trim() && quickFiles.length === 0) || !user?.id}
                className="inline-flex items-center justify-center h-14 px-8 rounded-lg bg-indigo-600 text-white text-lg font-semibold hover:bg-indigo-500 disabled:bg-gray-300 min-w-[10rem]"
              >
                {submittingQuick ? (
                  <span className="inline-flex items-center gap-2">
                    <LoadingSpinner className="h-5 w-5" />
                    Posting...
                  </span>
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddressUnitDetail;
