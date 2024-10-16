import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function AreaDetail() {
  const { id, areaId } = useParams(); // Extract the inspection ID and area ID from the URL parameters
  const [inspection, setInspection] = useState(null); // State to hold the inspection details
  const [area, setArea] = useState(null); // State to hold the area details
  const [prompts, setPrompts] = useState([]); // State to hold the checklist prompts from the matching room
  const [observations, setObservations] = useState([]); // State to hold the observations
  const [newObservation, setNewObservation] = useState(''); // State to hold new observation content
  const [loading, setLoading] = useState(true); // State to track loading
  const [error, setError] = useState(null); // State to handle errors

  useEffect(() => {
    // Fetch inspection details
    const fetchInspectionDetails = async () => {
      try {
        const response = await fetch(`http://localhost:8000/inspections/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch inspection details');
        }
        const inspectionData = await response.json();
        setInspection(inspectionData);
      } catch (error) {
        setError(error.message);
      }
    };

    // Fetch area details and check if the area name matches a room's name
    const fetchAreaAndRoomDetails = async () => {
      try {
        const areaResponse = await fetch(`http://localhost:8000/areas/${areaId}`);
        if (!areaResponse.ok) {
          throw new Error('Failed to fetch area details');
        }
        const areaData = await areaResponse.json();
        setArea(areaData);

        // Fetch all rooms to match room.name with area.name
        const roomsResponse = await fetch(`http://localhost:8000/rooms/`);
        if (!roomsResponse.ok) {
          throw new Error('Failed to fetch rooms');
        }
        const roomsData = await roomsResponse.json();

        // Check if there's a room whose name matches the area name
        const matchingRoom = roomsData.find((room) => room.name.toLowerCase() === areaData.name.toLowerCase());
        
        if (matchingRoom) {
          console.log("Matching Room found: ", matchingRoom);  // Debugging log
          // Fetch prompts for the matching room
          const promptsResponse = await fetch(`http://localhost:8000/rooms/${matchingRoom.id}/prompts`);
          if (!promptsResponse.ok) {
            throw new Error('Failed to fetch prompts');
          }
          const promptsData = await promptsResponse.json();
          setPrompts(promptsData);
        } else {
          console.log("No matching room found for the area name.");
        }

        setLoading(false); // Finished loading
      } catch (error) {
        console.error("Error fetching area or prompts:", error); // Debugging log
        setError(error.message);
        setLoading(false);
      }
    };

    // Fetch existing observations for the area
    const fetchObservations = async () => {
      try {
        const response = await fetch(`http://localhost:8000/areas/${areaId}/observations`);
        if (!response.ok) {
          throw new Error('Failed to fetch observations');
        }
        const observationsData = await response.json();
        setObservations(observationsData);
      } catch (error) {
        console.error('Error fetching observations:', error);
      }
    };

    fetchInspectionDetails();
    fetchAreaAndRoomDetails();
    fetchObservations();
  }, [id, areaId]);

  const handleCreateObservation = async (e) => {
    e.preventDefault();
    if (!newObservation.trim()) {
      return; // Don't submit empty observation
    }

    try {
      const response = await fetch(`http://localhost:8000/areas/${areaId}/observations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newObservation,
          area_id: areaId,
          user_id: 1, // Replace with the actual user ID
        }),
      });

      if (response.ok) {
        const createdObservation = await response.json();
        setObservations([...observations, createdObservation]); // Add new observation to the list
        setNewObservation(''); // Clear the input field
      } else {
        console.error('Failed to create observation');
      }
    } catch (error) {
      console.error('Error creating observation:', error);
    }
  };

  if (loading) {
    return <p>Loading area details...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className="container mx-auto p-6">
      {/* Inspection Information at the top */}
      {inspection && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Inspection #{inspection.id}</h2>
          <p className="text-gray-700">Source: {inspection.source}</p>
          {inspection.address && (
            <div className="mb-2">
              <Link 
                to={`/address/${inspection.address.id}`} 
                className="text-indigo-600 hover:text-indigo-900"
              >
                Address: {inspection.address.combadd}
              </Link>
            </div>
          )}
          <div>
            <Link 
              to={`/inspections/${id}/conduct`} 
              className="inline-block px-4 py-2 mt-3 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700"
            >
              Back to Inspection Overview
            </Link>
          </div>
        </div>
      )}

      {/* Area Information */}
      {area && <h2 className="text-2xl font-bold text-gray-900 mb-4">Area: {area.name}</h2>}

      {/* Checklist dynamically fetched from the matching room */}
      {prompts.length > 0 ? (
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Checklist</h3>
          <ul className="mt-4 space-y-4">
            {prompts.map((prompt) => (
              <li key={prompt.id} className="flex items-center space-x-4">
                <input type="checkbox" id={`prompt-${prompt.id}`} />
                <label htmlFor={`prompt-${prompt.id}`} className="text-gray-700">
                  {prompt.content}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-gray-500">No checklist available for this area.</p>
      )}

      {/* Display Observations */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold text-gray-900">Observations</h3>
        {observations.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {observations.map((observation) => (
              <li key={observation.id} className="p-4 bg-gray-100 rounded-md">
                <p>{observation.content}</p>
                <p className="text-sm text-gray-600">Created at: {new Date(observation.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No observations yet for this area.</p>
        )}
      </div>

      {/* Create New Observation */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold text-gray-900">Add New Observation</h3>
        <form onSubmit={handleCreateObservation} className="mt-4">
          <textarea
            value={newObservation}
            onChange={(e) => setNewObservation(e.target.value)}
            placeholder="Enter your observation..."
            className="w-full p-2 border rounded"
            rows="4"
          />
          <button
            type="submit"
            className="mt-2 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Add Observation
          </button>
        </form>
      </div>
    </div>
  );
}
