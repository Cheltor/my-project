import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import NewUnit from './NewUnit';
import {
  canonicalInspectionStatus,
  formatInspectionStatusLabel,
  inferInspectionStatusSuggestion,
  toEasternLocaleTimeString
} from '../../utils';

const getStatusBadgeClasses = (status) => {
  const normalized = (status || '').toString().toLowerCase();
  if (normalized.includes('pending')) return 'bg-slate-100 text-slate-800 ring-slate-500/20';
  if (normalized.includes('completed')) return 'bg-emerald-100 text-emerald-800 ring-emerald-500/20';
  if (normalized.includes('progress')) return 'bg-indigo-100 text-indigo-800 ring-indigo-500/20';
  if (normalized.includes('review')) return 'bg-amber-100 text-amber-800 ring-amber-500/20';
  if (normalized.includes('schedule')) return 'bg-blue-100 text-blue-800 ring-blue-500/20';
  if (normalized.includes('cancel')) return 'bg-rose-100 text-rose-800 ring-rose-500/20';
  return 'bg-slate-100 text-slate-800 ring-slate-500/20';
};

export default function Conduct() {
  const { id } = useParams(); // inspection ID
  const navigate = useNavigate(); // For redirecting 
  const [inspection, setInspection] = useState(null);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [units, setUnits] = useState([]);
  const [unitAreaCounts, setUnitAreaCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState(''); // For searching units
  const [showNewUnitForm, setShowNewUnitForm] = useState(false);
  const [showUnitsCard, setShowUnitsCard] = useState(true);
  const [newAreaName, setNewAreaName] = useState(''); // State for new area name
  const [rooms, setRooms] = useState([]); // State for rooms
  const [selectedRoomId, setSelectedRoomId] = useState(''); // State for selected room
  const [statusValue, setStatusValue] = useState('');
  const [statusTouched, setStatusTouched] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const [statusSavedAt, setStatusSavedAt] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showNewAreaForm, setShowNewAreaForm] = useState(false);
  const [potentialCount, setPotentialCount] = useState(null); // count of potential violations

  useEffect(() => {
    const fetchInspection = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch inspection');
        }
        const data = await response.json();
        setInspection(data);
        setStatusValue(canonicalInspectionStatus(data.status));
        setStatusTouched(false);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchAreas = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/areas`);
        if (!response.ok) {
          throw new Error('Failed to fetch areas');
        }
        const data = await response.json();
        setAreas(data);
      } catch (error) {
        setError(error.message);
      }
    };

    const fetchRooms = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/rooms`);
        if (!response.ok) {
          throw new Error('Failed to fetch rooms');
        }
        const data = await response.json();
        setRooms(data);
      } catch (error) {
        setError(error.message);
      }
    };

    fetchInspection();
    fetchAreas();
    fetchRooms();
  }, [id]);

  useEffect(() => {
    // Fetch potential observations count for badge on Review button
    let cancelled = false;
    async function loadCount() {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/potential-observations`);
        if (!res.ok) throw new Error('Failed to fetch potential observations');
        const list = await res.json();
        if (!cancelled) setPotentialCount(Array.isArray(list) ? list.length : 0);
      } catch {
        if (!cancelled) setPotentialCount(0);
      }
    }
    if (id) loadCount();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        if (inspection && inspection.address && inspection.address.id) {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${inspection.address.id}/units`);
          if (!response.ok) {
            throw new Error('Failed to fetch units');
          }
          const data = await response.json();
          setUnits(data);
        }
      } catch (error) {
        setError(error.message);
      }
    };

    fetchUnits();
  }, [inspection]);

  const saveStatus = async () => {
    try {
      setSavingStatus(true);
      setStatusError(null);
      setStatusSavedAt(null);
      const form = new FormData();
      form.append('status', statusValue ?? '');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/status`, {
        method: 'PATCH',
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to update status');
      }
      const updated = await res.json();
      setInspection(updated);
      setStatusValue(canonicalInspectionStatus(updated.status));
      setStatusTouched(false);
      setStatusSavedAt(new Date());
      if (updated.status_message) {
        setStatusMessage(updated.status_message);
      } else {
        setStatusMessage('');
      }
    } catch (e) {
      setStatusError(e.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const fetchAreaCount = async (unitId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/unit/${unitId}/areas/count`);
      const areaCount = await response.json();
      setUnitAreaCounts(prev => ({ ...prev, [unitId]: areaCount })); // Store count in state
    } catch (error) {
      console.error('Failed to fetch area count', error);
    }
  };

  useEffect(() => {
    // Fetch area counts for all units when units are loaded
    units.forEach(unit => {
      fetchAreaCount(unit.id);
    });
  }, [units]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const filteredUnits = units.filter((unit) =>
    unit.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generalAreas = areas.filter((area) => area.unit_id === null);
  const canonicalServerStatus = canonicalInspectionStatus(inspection?.status);
  const suggestion = useMemo(
    () => inferInspectionStatusSuggestion({ inspection, areas, potentialCount }),
    [inspection, areas, potentialCount]
  );
  const shouldAutoApplySuggestion = useMemo(() => {
    if (!suggestion) return false;
    if (statusTouched) return false;
    if (!canonicalServerStatus) return true;
    return canonicalServerStatus === 'Pending' || canonicalServerStatus === 'Scheduled';
  }, [suggestion, statusTouched, canonicalServerStatus]);

  useEffect(() => {
    if (shouldAutoApplySuggestion && suggestion?.status) {
      if (statusValue !== suggestion.status) {
        setStatusValue(suggestion.status);
      }
    } else if (!statusTouched && !statusValue && canonicalServerStatus) {
      if (statusValue !== canonicalServerStatus) {
        setStatusValue(canonicalServerStatus);
      }
    }
  }, [shouldAutoApplySuggestion, suggestion, statusTouched, statusValue, canonicalServerStatus]);

  const statusDisplay = formatInspectionStatusLabel(
    canonicalInspectionStatus(statusValue || inspection?.status)
  );
  const savedAtLabel = statusSavedAt ? toEasternLocaleTimeString(statusSavedAt) : '';
  const reviewCountLabel = potentialCount === null ? '…' : potentialCount;
  const selectedRoom = rooms.find((r) => String(r.id) === String(selectedRoomId));
  const selectedRoomName = selectedRoom?.name || '';
  const canAddArea = Boolean(selectedRoomId || (newAreaName || '').trim());
  const showSuggestedStatus = Boolean(
    suggestion?.status &&
      suggestion.status !== canonicalServerStatus &&
      canonicalServerStatus !== 'Completed' &&
      canonicalServerStatus !== 'Cancelled'
  );

  const handleAddArea = async (e) => {
    e.preventDefault(); // Prevent the form from refreshing the page
    let areaName = newAreaName;  // This captures the custom area name, if any
    let roomId = null;  // Initialize roomId
  
    // Check if a room is selected
    if (selectedRoomId) {
      const selectedRoom = rooms.find((room) => room.id === parseInt(selectedRoomId)); // Ensure correct comparison
      if (selectedRoom) {
        areaName = selectedRoom.name;  // Set the area name to the selected room's name
        roomId = selectedRoom.id;  // Set the room ID
      }
    }
  
    // Ensure the area name is not empty before proceeding
    if (!areaName) {
      console.error('Area name cannot be empty');
      return; // Prevent submission if the area name is empty
    }
  
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/areas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: areaName,  // Send the area name (either custom or from room)
          room_id: roomId,  // Send room_id if a room is selected
        }),
      });
  
      if (response.ok) {
        const newArea = await response.json();
        setAreas([...areas, newArea]);
        setNewAreaName('');  // Clear input fields
  
        // If a room was selected, navigate to the AreaDetail page with the prompts checklist
        navigate(`/inspections/${id}/area/${newArea.id}`);
      } else {
        console.error('Failed to add area, status:', response.status);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return <p>Loading inspection...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 pb-12 sm:px-6 lg:px-8">
      <header className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-indigo-600">Conduct Inspection</p>
            <h1 className="text-2xl font-semibold text-gray-900">{inspection.source || 'Inspection'} #{inspection.id}</h1>
            {inspection.address && (
              <Link
                to={`/address/${inspection.address.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                {inspection.address.combadd}
              </Link>
            )}
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusBadgeClasses(statusDisplay)}`}>
            {statusDisplay}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Status & Review</h2>
                <p className="mt-1 text-xs text-gray-500">Update the inspection status and review any potential violations.</p>
              </div>
              <Link
                to={`/inspections/${id}/review`}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
              >
                <span>Review Potential Violations</span>
                <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  {reviewCountLabel}
                </span>
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="sm:flex-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="inspection-status">
                  Status
                </label>
                <select
                  id="inspection-status"
                  className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={statusValue}
                  onChange={(e) => {
                    setStatusTouched(true);
                    setStatusValue(e.target.value);
                  }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="under review">Under Review</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <button
                type="button"
                onClick={saveStatus}
                disabled={savingStatus}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingStatus ? 'Saving…' : 'Save Status'}
              </button>
            </div>
            {statusError && <div className="mt-3 text-xs text-rose-600">{statusError}</div>}
            {!statusError && savedAtLabel && (
              <div className="mt-3 text-xs text-emerald-700">Status updated {savedAtLabel}</div>
            )}
            {statusMessage && !statusError && (
              <div className="mt-3 rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                {statusMessage}
              </div>
            )}
            {showSuggestedStatus && (
              <div className="mt-3 rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                <div>
                  Suggested status:{' '}
                  <strong>{formatInspectionStatusLabel(suggestion.status)}</strong>
                </div>
                {suggestion.reason && (
                  <div className="mt-1 text-[11px] text-indigo-600/80">{suggestion.reason}</div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">General Areas</h2>
              <button
                type="button"
                onClick={() => setShowNewAreaForm((prev) => !prev)}
                className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-500"
              >
                {showNewAreaForm ? 'Hide area form' : 'Add new area'}
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {generalAreas.length > 0 ? (
                generalAreas.map((area) => (
                  <Link
                    key={area.id}
                    to={`/inspections/${id}/area/${area.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-300 hover:bg-gray-100"
                  >
                    <span className="truncate">{area.name || `Area #${area.id}`}</span>
                    <span className="text-xs text-gray-500">Open</span>
                  </Link>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                  No general or common areas logged yet.
                </div>
              )}
            </div>

            {showNewAreaForm && (
              <form className="mt-6 space-y-4" onSubmit={handleAddArea}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="roomSelect" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Choose a room
                    </label>
                    <select
                      id="roomSelect"
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                    >
                      <option value="">-- Select Room --</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Pick a room from the list. If the room isn't listed, enter a custom area name.</p>
                  </div>

                  <div>
                    <label htmlFor="areaName" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Custom area name
                    </label>
                    <input
                      id="areaName"
                      className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={selectedRoomId ? selectedRoomName : newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      placeholder={selectedRoomId ? 'Using selected room name — use "Use custom name" to override' : 'Type a custom area name (if room not listed)'}
                      readOnly={Boolean(selectedRoomId)}
                    />
                    {selectedRoomId ? (
                      <button
                        type="button"
                        onClick={() => {
                          // clear selection and make the custom input editable
                          setSelectedRoomId('');
                          setNewAreaName('');
                        }}
                        className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                      >
                        Use custom name instead
                      </button>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">If your room is not listed above, enter a custom area name here.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={!canAddArea}
                    className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${canAddArea ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gray-300 cursor-not-allowed'}`}
                  >
                    Add Area
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewAreaForm(false);
                      setNewAreaName('');
                      setSelectedRoomId('');
                    }}
                    className="text-xs font-semibold text-gray-500 transition hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900">Units</h2>
              <button
                type="button"
                onClick={() => setShowUnitsCard((prev) => !prev)}
                className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-500"
              >
                {showUnitsCard ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {showUnitsCard && (
              <>
                <div className="mt-4">
                  <label htmlFor="unit-search" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Search Units
                  </label>
                  <input
                    id="unit-search"
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search for a unit number"
                    className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  {filteredUnits.length > 0 ? (
                    filteredUnits.map((unit) => (
                      <Link
                        key={unit.id}
                        to={`/inspections/${id}/unit/${unit.id}`}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-300 hover:bg-gray-100"
                      >
                        <span>Unit {unit.number}</span>
                        <span className="text-xs text-gray-500">{unitAreaCounts[unit.id] || 0} areas</span>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500">
                      No units found matching your search.
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => setShowNewUnitForm((prev) => !prev)}
                    className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                  >
                    {showNewUnitForm ? 'Hide new unit form' : 'Add new unit'}
                  </button>
                  {showNewUnitForm && inspection.address?.id && (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <NewUnit addressId={inspection.address.id} inspectionId={id} />
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
