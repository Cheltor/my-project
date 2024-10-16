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


  useEffect(() => {
    const fetchInspection = async () => {
      try {
        const response = await fetch(`https://civicode-2eae16143963.herokuapp.com/inspections/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch inspection');
        }
        const data = await response.json();
        setInspection(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchAreas = async () => {
      try {
        const response = await fetch(`https://civicode-2eae16143963.herokuapp.com/inspections/${id}/areas`);
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
        const response = await fetch(`https://civicode-2eae16143963.herokuapp.com/rooms`);
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
          const response = await fetch(`https://civicode-2eae16143963.herokuapp.com/addresses/${inspection.address.id}/units`);
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

  const fetchAreaCount = async (unitId) => {
    try {
      const response = await fetch(`https://civicode-2eae16143963.herokuapp.com/inspections/${id}/unit/${unitId}/areas/count`);
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
      const response = await fetch(`https://civicode-2eae16143963.herokuapp.com/inspections/${id}/areas`, {
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
        <h3 className="text-base font-semibold leading-7 text-gray-900">Conduct Inspection for {inspection.source} - #{inspection.id}</h3>
      </div>

      {/* Search input for filtering units */}
      <div className="mt-4">
        <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search Units</label>
        <input
          type="text"
          id="search"
          value={searchQuery}
          onChange={handleSearchChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Search for a unit number"
        />
      </div>

      {/* Select from the list of units associated with the property. Then link to the inspection/:id/unit/unit_id */}
      <div className="mt-6">
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

        <button
          onClick={() => setShowNewUnitForm(!showNewUnitForm)} // Toggle form visibility
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500"
        >
          {showNewUnitForm ? 'Hide New Unit Form' : 'Add New Unit'}
        </button>
      </div>

      {/* Show New Unit form when the user clicks the 'Add New Unit' button */}
      {showNewUnitForm && (
        <div className="mt-6">
          <NewUnit addressId={inspection.address.id} inspectionId={id} /> {/* Pass addressId and inspectionId to NewUnit */}
        </div>
      )}

      {/* A list of areas not associated with a unit */}
      <div className="px-4 py-6 sm:px-0">
        <h4 className="text-sm font-semibold leading-5 text-gray-900">Areas</h4>
        {areas.filter(area => area.unit_id === null).length > 0 ? (
          <ul className="mt-2 divide-y divide-gray-200 rounded-md">
            {areas.filter(area => area.unit_id === null).map((area) => (
              <li key={area.id} className="mb-2">
                <Link 
                  to={`/inspections/${id}/area/${area.id}`} // Link to the area detail page
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



      {/* Add a new area component */}
      <div className="px-4 py-6 sm:px-0">
        <h4 className="text-sm font-semibold leading-5 text-gray-900">Add General/Common Area</h4>
        <form className="mt-2" onSubmit={handleAddArea}>
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

          <div className="mt-6">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition ease-in-out duration-150"
            >
              Add Area
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
