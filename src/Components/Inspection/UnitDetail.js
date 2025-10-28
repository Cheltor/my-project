import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function UnitDetail() {
  const { id: inspectionId, unitId } = useParams(); // Get params correctly
  const [unit, setUnit] = useState(null);
  const [areas, setAreas] = useState([]);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaNotes, setNewAreaNotes] = useState('');
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Fetch the rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/rooms`);
        if (!response.ok) {
          throw new Error('Failed to fetch rooms');
        }
        const data = await response.json();
        setRooms(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchRooms();
  }, []);

  // Fetch the unit details
  useEffect(() => {
    const fetchUnit = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/units/${unitId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch unit');
        }
        const data = await response.json();
        setUnit(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchUnit();
  }, [unitId, inspectionId]);

  // Fetch the areas for the unit
  useEffect(() => {
    if (inspectionId) {
      const fetchAreas = async () => {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${inspectionId}/unit/${unitId}/areas`);
          if (!response.ok) {
            throw new Error('Failed to fetch areas');
          }
          const data = await response.json();
          setAreas(data);
        } catch (error) {
          console.error(error);
        }
      };
      fetchAreas();
    }
  }, [inspectionId, unitId]);

  // Add a new area to the unit
  const handleAddArea = async () => {
    let areaName = (newAreaName || '').trim();
    if (selectedRoomId) {
      const selected = rooms.find((r) => String(r.id) === String(selectedRoomId));
      if (selected?.name) {
        areaName = selected.name;
      }
    }
    if (!areaName) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/inspections/${inspectionId}/unit/${unitId}/areas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: areaName,
            notes: newAreaNotes,
          }),
        }
      );
      if (response.ok) {
        const newArea = await response.json();
        setAreas((prev) => [...prev, newArea]);
        setNewAreaName('');
        setNewAreaNotes('');
        setSelectedRoomId('');
      }
    } catch (error) {
      console.error(error);
    }
  };


  if (!unit) {
    return <p className="text-gray-500">Loading unit details...</p>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 pb-12 sm:px-6 lg:px-8">
      <header className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Inspection #{inspectionId}</p>
            <h1 className="text-2xl font-semibold text-gray-900">Unit {unit.number}</h1>
            <p className="mt-1 text-sm text-gray-500">Manage areas within this unit.</p>
          </div>
          <Link
            to={`/inspections/${inspectionId}/conduct`}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Back to Conduct
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Areas</h2>
            <p className="text-xs text-gray-500">{areas.length} item{areas.length === 1 ? '' : 's'}</p>
          </div>
          <div className="mt-4 space-y-2">
            {areas.length > 0 ? (
              areas.map((area) => (
                <Link
                  key={area.id}
                  to={`/inspections/${inspectionId}/unit/${unitId}/area/${area.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-300 hover:bg-gray-100"
                >
                  <span className="truncate">{area.name || `Area #${area.id}`}</span>
                  <span className="text-xs text-gray-500">Open</span>
                </Link>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
                No areas created for this unit.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Add New Area</h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleAddArea();
            }}
          >
            <div className="grid gap-3">
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
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={selectedRoomId ? (rooms.find((r) => String(r.id) === String(selectedRoomId))?.name || '') : newAreaName}
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

            <div className="pt-1">
              <button
                type="submit"
                disabled={!selectedRoomId && !(newAreaName || '').trim()}
                className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${selectedRoomId || (newAreaName || '').trim() ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                Add Area
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
