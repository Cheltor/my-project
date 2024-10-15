import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function AreaDetail() {
  const { id, areaId } = useParams(); // Extract the inspection ID and area ID from the URL parameters
  const [inspection, setInspection] = useState(null); // State to hold the inspection details
  const [area, setArea] = useState(null); // State to hold the area details
  const [prompts, setPrompts] = useState([]); // State to hold the checklist prompts
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

    // Fetch area details and the prompts associated with the room (if room_id is present)
    const fetchAreaDetails = async () => {
      try {
        const response = await fetch(`http://localhost:8000/areas/${areaId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch area details');
        }
        const areaData = await response.json();
        setArea(areaData);

        // If the area is based on a room, fetch the related prompts for the checklist
        if (areaData.room_id) {
          const promptsResponse = await fetch(`http://localhost:8000/rooms/${areaData.room_id}/prompts`);
          if (!promptsResponse.ok) {
            throw new Error('Failed to fetch prompts');
          }
          const promptsData = await promptsResponse.json();
          setPrompts(promptsData);
        }

        setLoading(false); // Finished loading
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };

    fetchInspectionDetails();
    fetchAreaDetails();
  }, [id, areaId]);

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

      {/* Checklist based on room prompts */}
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
    </div>
  );
}
