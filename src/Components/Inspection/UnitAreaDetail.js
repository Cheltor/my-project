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
  const [photos, setPhotos] = useState([]); // State to hold the photos
  const [selectedImage, setSelectedImage] = useState(null); // State to hold the selected image
  const [isModalOpen, setIsModalOpen] = useState(false); // State to toggle the modal
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch inspection details
    const fetchInspectionDetails = async () => {
      try {
        const response = await fetch(`https://civicode-2eae16143963.herokuapp.com/inspections/${id}`);
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
        const areaResponse = await fetch(`https://civicode-2eae16143963.herokuapp.com/areas/${areaId}`);
        if (!areaResponse.ok) {
          throw new Error('Failed to fetch area details');
        }
        const areaData = await areaResponse.json();
        setArea(areaData);

        // Fetch unit details
        const unitResponse = await fetch(`https://civicode-2eae16143963.herokuapp.com/units/${unitId}`);
        if (!unitResponse.ok) {
          throw new Error('Failed to fetch unit details');
        }
        const unitData = await unitResponse.json();
        setUnit(unitData);

        // Fetch prompts based on the room name matching the area name
        const roomsResponse = await fetch(`https://civicode-2eae16143963.herokuapp.com/rooms/`);
        if (!roomsResponse.ok) {
          throw new Error('Failed to fetch rooms');
        }
        const roomsData = await roomsResponse.json();
        const matchingRoom = roomsData.find((room) => room.name.toLowerCase() === areaData.name.toLowerCase());

        if (matchingRoom) {
          const promptsResponse = await fetch(`https://civicode-2eae16143963.herokuapp.com/rooms/${matchingRoom.id}/prompts`);
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
        const response = await fetch(`https://civicode-2eae16143963.herokuapp.com/areas/${areaId}/observations`);
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
        return; // Don't submit empty observation
    }

    try {
        // Step 1: Create Observation (Without Photos)
        const observationData = {
            content: newObservation,
            potentialvio: false,
        };

        const observationResponse = await fetch(`https://civicode-2eae16143963.herokuapp.com/areas/${areaId}/observations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(observationData),
        });

        if (!observationResponse.ok) {
            throw new Error('Failed to create observation');
        }

        const createdObservation = await observationResponse.json();
        setObservations([...observations, createdObservation]); // Add new observation to the list
        setNewObservation(''); // Clear the input field

        // Step 2: Upload Photos for the Created Observation
        if (photos.length > 0) {
            const formData = new FormData();
            photos.forEach((photo) => {
                formData.append('files', photo);
            });

            const photoUploadResponse = await fetch(
                `https://civicode-2eae16143963.herokuapp.com/observations/${createdObservation.id}/photos`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            if (!photoUploadResponse.ok) {
                throw new Error('Failed to upload photos');
            }

            // Update the created observation with photos after successful upload
            const updatedObservation = await observationResponse.json();
            setObservations((prev) =>
                prev.map((obs) => (obs.id === createdObservation.id ? updatedObservation : obs))
            );

            setPhotos([]); // Clear the selected photos
        }
    } catch (error) {
        console.error('Error creating observation:', error);
    }
};

  

  const handlePhotoChange = (e) => {
    setPhotos(Array.from(e.target.files)); // Set selected files to the state
  };

  // Function to handle image click
  const handleImageClick = (url) => {
    setSelectedImage(url);
    setIsModalOpen(true);
  };

  // Function to close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
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

      {/* Display Observations */}
      <div className="observations-list mt-8">
        {observations.map((observation) => (
          <div key={observation.id} className="observation-item border p-4 mb-4 rounded-lg shadow-sm">
            <p className="font-semibold">{observation.content}</p>
            <div className="photos flex flex-wrap mt-2">
              {observation.photos && observation.photos.length > 0 ? (
                observation.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo.url}
                    alt={`Observation Photo ${index + 1}`}
                    onClick={() => handleImageClick(photo.url)}
                    className="w-32 h-auto mr-2 mb-2 cursor-pointer border rounded-lg hover:opacity-80 transition"
                  />
                ))
              ) : (
                <p className="italic text-gray-500">No photos attached</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white rounded-lg shadow-lg max-w-2xl p-6">
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              &times; {/* Close button */}
            </button>
            <img
              src={selectedImage}
              alt="Selected Observation"
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}

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
                    <input
            type="file"
            multiple
            onChange={handlePhotoChange}
            className="mt-2"
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
