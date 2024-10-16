import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

export default function UnitDetail() {
  const { id: inspectionId, unitId } = useParams();  // Get params correctly
  const [unit, setUnit] = useState(null);
  const [areas, setAreas] = useState([]);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaNotes, setNewAreaNotes] = useState('');
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const navigate = useNavigate();
  
  const params = useParams();
  console.log("Params from useParams:", params);  // Verify what is captured by useParams
  console.log("Inspection ID:", inspectionId);
  console.log("Unit ID:", unitId);

  // Fetch the rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch(`http://localhost:8000/rooms`);
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
        const response = await fetch(`http://localhost:8000/units/${unitId}`);
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
          const response = await fetch(`http://localhost:8000/inspections/${inspectionId}/unit/${unitId}/areas`);
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
    let areaName = newAreaName; // Default to manually inputted name

    if (selectedRoomId) {
      // Fetch the selected room details to get the room name
      try {
        const response = await fetch(`http://localhost:8000/rooms/${selectedRoomId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch selected room');
        }
        const roomData = await response.json();
        areaName = roomData.name; // Override areaName with room name
      } catch (error) {
        console.error(error);
        return; // Exit if fetching room fails
      }
    }

    // Proceed with adding the area
    try {
      const response = await fetch(`http://localhost:8000/inspections/${inspectionId}/unit/${unitId}/areas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: areaName, // Use the updated area name
          notes: newAreaNotes,
        }),
      });
      if (response.ok) {
        const newArea = await response.json();
        setAreas([...areas, newArea]);
        setNewAreaName('');
        setNewAreaNotes('');
        setSelectedRoomId(''); // Reset room selection
      }
    } catch (error) {
      console.error(error);
    }
  };


  if (!unit) {
    return <p className="text-gray-500">Loading unit details...</p>;
  }

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Unit {unit.number} Areas</h2>
      <Link
        to={`/inspections/${inspectionId}/conduct`}
        className="inline-block px-4 py-2 mt-3 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700"
      >
        Back to Inspection
      </Link>
      <ul className="space-y-2 pt-3">
        {areas.length > 0 ? (
          areas.map((area) => (
            <li key={area.id} className="p-4 bg-white rounded-lg shadow-md">
              <Link
                to={`/inspections/${inspectionId}/unit/${unitId}/area/${area.id}`}
                className="text-indigo-600 hover:text-indigo-900"
              >
                {area.name}
              </Link>
            </li>
          ))
        ) : (
          <p className="text-gray-500">No areas created for this unit.</p>
        )}
      </ul>


      <h3 className="text-xl font-semibold text-gray-900 mt-6">Add New Area</h3>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleAddArea();
        }}
      >
        <div>
          <label htmlFor="areaName" className="block text-sm font-medium text-gray-700">
            Area Name
          </label>
          <input
            id="areaName"
            type="text"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <label htmlFor="roomSelect" className="block text-sm font-medium text-gray-700">
            Or Select Room as Area
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

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Area
          </button>
        </div>
      </form>


    </div>
  );
}
