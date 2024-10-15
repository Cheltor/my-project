import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Component to show the details of a specific room
export default function RoomDetail() {
  const { id } = useParams(); // Get the room ID from the URL parameters
  const navigate = useNavigate(); // For redirecting after deleting the room
  const [room, setRoom] = useState(null); // State to hold the room details
  const [prompts, setPrompts] = useState([]); // State to hold the room's prompts
  const [newPromptContent, setNewPromptContent] = useState(''); // State for the new prompt content
  const [loading, setLoading] = useState(true); // State to hold loading status
  const [error, setError] = useState(null); // State to hold error status
  const [editingRoom, setEditingRoom] = useState(false); // State to toggle editing mode
  const [roomName, setRoomName] = useState(''); // State for editing room name

  useEffect(() => {
    // Fetch room details from the API
    fetch(`http://localhost:8000/rooms/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch room details');
        }
        return response.json();
      })
      .then((data) => {
        setRoom(data);
        setRoomName(data.name); // Set the room name for editing
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });

    // Fetch prompts for the room
    fetch(`http://localhost:8000/rooms/${id}/prompts`)
      .then((response) => response.json())
      .then((data) => {
        setPrompts(data);
      })
      .catch((error) => {
        console.error('Error fetching prompts:', error);
      });
  }, [id]);

  // Function to handle new prompt creation
  const handleCreatePrompt = (e) => {
    e.preventDefault();
    fetch(`http://localhost:8000/rooms/${id}/prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: newPromptContent }),
    })
      .then((response) => response.json())
      .then((newPrompt) => {
        setPrompts([...prompts, newPrompt]);
        setNewPromptContent(''); // Clear input field
      })
      .catch((error) => {
        console.error('Error creating prompt:', error);
      });
  };

  // Function to handle prompt deletion
  const handleDeletePrompt = (promptId) => {
    fetch(`http://localhost:8000/prompts/${promptId}`, {
      method: 'DELETE',
    })
      .then(() => {
        setPrompts(prompts.filter((prompt) => prompt.id !== promptId));
      })
      .catch((error) => {
        console.error('Error deleting prompt:', error);
      });
  };

  // Function to handle prompt editing
  const handleEditPrompt = (promptId, updatedContent) => {
    fetch(`http://localhost:8000/prompts/${promptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: updatedContent }),
    })
      .then((response) => response.json())
      .then((updatedPrompt) => {
        setPrompts(
          prompts.map((prompt) =>
            prompt.id === promptId ? updatedPrompt : prompt
          )
        );
      })
      .catch((error) => {
        console.error('Error updating prompt:', error);
      });
  };

  // Function to handle room update
  const handleUpdateRoom = () => {
    fetch(`http://localhost:8000/rooms/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: roomName }), // Send updated room name
    })
      .then((response) => response.json())
      .then((updatedRoom) => {
        setRoom(updatedRoom);
        setEditingRoom(false); // Exit editing mode
      })
      .catch((error) => {
        console.error('Error updating room:', error);
      });
  };

  // Function to handle room deletion
  const handleDeleteRoom = () => {
    fetch(`http://localhost:8000/rooms/${id}`, {
      method: 'DELETE',
    })
      .then(() => {
        navigate('/rooms'); // Redirect to the room list after deleting
      })
      .catch((error) => {
        console.error('Error deleting room:', error);
      });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-6">
        {/* Room Details */}
        {editingRoom ? (
          <div>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="border rounded p-2 w-full"
            />
            <button
              onClick={handleUpdateRoom}
              className="mt-2 bg-blue-500 text-white p-2 rounded"
            >
              Save Room
            </button>
            <button
              onClick={() => setEditingRoom(false)}
              className="mt-2 bg-gray-500 text-white p-2 rounded"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{room.name}</h1>
            <button
              onClick={() => setEditingRoom(true)}
              className="mt-2 bg-yellow-500 text-white p-2 rounded"
            >
              Edit Room
            </button>
            <button
              onClick={handleDeleteRoom}
              className="mt-2 bg-red-500 text-white p-2 rounded"
            >
              Delete Room
            </button>
          </div>
        )}

        {/* Form to add a new prompt */}
        <form onSubmit={handleCreatePrompt} className="mt-4">
          <input
            type="text"
            value={newPromptContent}
            onChange={(e) => setNewPromptContent(e.target.value)}
            placeholder="New prompt"
            className="border rounded p-2 w-full"
          />
          <button
            type="submit"
            className="mt-2 bg-blue-500 text-white p-2 rounded"
          >
            Add Prompt
          </button>
        </form>

        {/* List of prompts */}
        <ul className="mt-4">
          {prompts.map((prompt) => (
            <li key={prompt.id} className="border-b py-2">
              <input
                type="text"
                value={prompt.content}
                onChange={(e) => handleEditPrompt(prompt.id, e.target.value)}
                className="border p-2 w-full"
              />
              <button
                onClick={() => handleDeletePrompt(prompt.id)}
                className="mt-2 bg-red-500 text-white p-2 rounded"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
