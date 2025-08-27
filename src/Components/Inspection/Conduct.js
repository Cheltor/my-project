import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import NewUnit from './NewUnit';

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
  const [newAreaName, setNewAreaName] = useState(''); // State for new area name
  const [rooms, setRooms] = useState([]); // State for rooms
  const [selectedRoomId, setSelectedRoomId] = useState(''); // State for selected room
  const [statusValue, setStatusValue] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const [statusSavedAt, setStatusSavedAt] = useState(null);
  const [showNewAreaForm, setShowNewAreaForm] = useState(false);

  const canonicalStatus = (s) => {
    if (!s) return 'Pending';
    const v = String(s).trim().toLowerCase();
    if (v === 'pending') return 'Pending';
    if (v === 'scheduled') return 'Scheduled';
    if (v === 'in progress' || v === 'in-progress') return 'In Progress';
    if (v === 'under review' || v === 'under-review') return 'under review';
    if (v === 'completed') return 'Completed';
    if (v === 'cancelled' || v === 'canceled') return 'Cancelled';
    // Fallback to original (ensures we don't break on unexpected values)
    return s;
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
  setStatusValue(canonicalStatus(data.status));
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
      setStatusValue(updated.status || '');
      setStatusSavedAt(new Date());
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

  const handleAddArea = async (e) => {
    e.preventDefault(); // Prevent the form from refreshing the page
    let areaName = newAreaName;  // This captures the custom area name, if any
    let roomId = null;  // Initialize roomId
  
    // Check if a room is selected
    if (selectedRoomId) {
      const selectedRoom = rooms.find((room) => room.id === parseInt(selectedRoomId)); // Ensure correct comparison
      console.log('Selected Room:', selectedRoom);  // Debugging log
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
    <div>
      <div className="px-4 sm:px-0">
        <h3 className="text-base font-semibold leading-7 text-gray-900 text-center">Conduct Inspection for {inspection.source} - #{inspection.id}</h3>
        {inspection.address && (
          <div className="mt-2 text-center">
            <Link
              to={`/address/${inspection.address.id}`}
              className="text-indigo-600 hover:text-indigo-900"
              title="View address details"
            >
              {inspection.address.combadd}
            </Link>
          </div>
        )}
        {/* Status updater */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <label className="text-sm text-gray-700">Status:</label>
          <select
            className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value)}
          >
            <option value="Pending">Pending</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="under review">Under Review</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button
            type="button"
            onClick={saveStatus}
            disabled={savingStatus}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          >
            {savingStatus ? 'Saving…' : 'Save'}
          </button>
        </div>
        {statusError && (
          <div className="mt-1 text-center text-sm text-red-600">{statusError}</div>
        )}
        {statusSavedAt && !statusError && (
          <div className="mt-1 text-center text-xs text-green-700">Status updated {statusSavedAt.toLocaleTimeString()}</div>
        )}
      </div>

      {/* Review button directly under status */}
      <div className="mt-4 flex items-center justify-center">
        <Link
          to={`/inspections/${id}/review`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500"
        >
          Review Potential Violations
        </Link>
      </div>

      {/* Two-column layout: Units (left) and Areas (right) */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left: Units */}
        <div className="p-4 sm:p-6 rounded-md bg-white shadow">
          <h4 className="text-sm font-semibold leading-5 text-gray-900">Units</h4>
          {/* Search input for filtering units */}
          <div className="mt-3">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search Existing Units</label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={handleSearchChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Search for a unit number"
            />
          </div>

          {/* Units list */}
          <div className="mt-4">
            {filteredUnits.length > 0 ? (
              <ul>
                {filteredUnits.map((unit) => (
                  <li key={unit.id} className="mb-2">
                    <Link
                      to={`/inspections/${id}/unit/${unit.id}`}
                      className="block px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                      Unit {unit.number} ({unitAreaCounts[unit.id] || '0'} areas)
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No units found matching your search.</p>
            )}
          </div>

          {/* New Unit form toggle and form */}
          <div className="mt-4">
            <button
              onClick={() => setShowNewUnitForm(!showNewUnitForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500"
            >
              {showNewUnitForm ? 'Hide New Unit Form' : 'Add New Unit'}
            </button>
          </div>
          {showNewUnitForm && (
            <div className="mt-4">
              <NewUnit addressId={inspection.address.id} inspectionId={id} />
            </div>
          )}
        </div>

        {/* Right: Areas */}
  <div className="p-4 sm:p-6 rounded-md bg-white shadow">
          <h4 className="text-sm font-semibold leading-5 text-gray-900">Areas</h4>
          {/* A list of areas not associated with a unit */}
          <div className="mt-3">
            {areas.filter(area => area.unit_id === null).length > 0 ? (
              <ul className="mt-2 divide-y divide-gray-200 rounded-md">
                {areas.filter(area => area.unit_id === null).map((area) => (
                  <li key={area.id} className="mb-2">
                    <Link
                      to={`/inspections/${id}/area/${area.id}`}
                      className="block px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex w-0 flex-1 items-center">
                          <span className="ml-2 flex-1 w-0 truncate">{area.name}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-5 text-gray-500">No general areas inspected.</p>
            )}
          </div>

          {/* Add a new area form at the bottom of the Areas column */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold leading-5 text-gray-900">Add General/Common Area</h4>
              <button
                type="button"
                onClick={() => setShowNewAreaForm(!showNewAreaForm)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500"
              >
                {showNewAreaForm ? 'Hide Area Form' : 'Add Area'}
              </button>
            </div>
            {showNewAreaForm && (
            <form className="mt-2" onSubmit={handleAddArea}>
              <div className="mt-4">
                <label htmlFor="roomSelect" className="block text-sm font-medium text-gray-700">
                  Select Room as Area
                </label>
                <select
                  id="roomSelect"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              </div>

              <div className="mt-4">
                <label htmlFor="areaName" className="block text-sm font-medium leading-5 text-gray-700">Custom Area Name</label>
                <input
                  id="areaName"
                  className="form-input block w-full sm:text-sm sm:leading-5"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="Type in a custom area name"
                />
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition ease-in-out duration-150"
                >
                  Add Area
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
