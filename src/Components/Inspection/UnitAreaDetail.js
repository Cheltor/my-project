import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function UnitAreaDetail() {
  const { id, areaId, unitId } = useParams(); // Extract the inspection ID, area ID, and unit ID from the URL parameters
  const [inspection, setInspection] = useState(null);
  const [area, setArea] = useState(null);
  const [unit, setUnit] = useState(null); // State to hold the unit details
  const [prompts, setPrompts] = useState([]);
  const [observations, setObservations] = useState([]);
  const [newObservation, setNewObservation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

    // Fetch area and unit details
    const fetchAreaAndUnitDetails = async () => {
      try {
        const areaResponse = await fetch(`http://localhost:8000/areas/${areaId}`);
        if (!areaResponse.ok) {
          throw new Error('Failed to fetch area details');
        }
        const areaData = await areaResponse.json();
        setArea(areaData);

        // Fetch unit details
        const unitResponse = await fetch(`http://localhost:8000/units/${unitId}`);
        if (!unitResponse.ok) {
          throw new Error('Failed to fetch unit details');
        }
        const unitData = await unitResponse.json();
        setUnit(unitData);

        // Fetch prompts based on the room name matching the area name
        const roomsResponse = await fetch(`http://localhost:8000/rooms/`);
        if (!roomsResponse.ok) {
          throw new Error('Failed to fetch rooms');
        }
        const roomsData = await roomsResponse.json();
        const matchingRoom = roomsData.find((room) => room.name.toLowerCase() === areaData.name.toLowerCase());

        if (matchingRoom) {
          const promptsResponse = await fetch(`http://localhost:8000/rooms/${matchingRoom.id}/prompts`);
          if (!promptsResponse.ok) {
            throw new Error('Failed to fetch prompts');
          }
          const promptsData = await promptsResponse.json();
          setPrompts(promptsData);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching area or unit details:", error);
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
    fetchAreaAndUnitDetails();
    fetchObservations();
  }, [id, areaId, unitId]);

  const handleCreateObservation = async (e) => {
    e.preventDefault();
    if (!newObservation.trim()) {
      return;
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
        setObservations([...observations, createdObservation]);
        setNewObservation('');
      } else {
        console.error('Failed to create observation');
      }
    } catch (error) {
      console.error('Error creating observation:', error);
    }
  };

  if (loading) {
    return <p>Loading unit area details...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className="container mx-auto p-6">
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
              to={`/inspections/${id}/unit/${unitId}`} 
              className="inline-block px-4 py-2 mt-3 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700"
            >
              Back to Unit {unit.number}
            </Link>
          </div>
        </div>
      )}

      {area && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Area: {area.name}</h2>
          {unit && <p className="text-gray-700">Unit Number: {unit.number}</p>}
        </>
      )}

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
