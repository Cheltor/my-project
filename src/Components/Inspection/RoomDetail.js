import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

// Component to show the details of a specific room
export default function RoomDetail() {
  const { id } = useParams(); // Get the room ID from the URL parameters
  const navigate = useNavigate(); // For redirecting after deleting the room
  const [room, setRoom] = useState(null); // State to hold the room details
  const [prompts, setPrompts] = useState([]); // State to hold the room's prompts
  const [newPromptContent, setNewPromptContent] = useState(''); // State for the new prompt content
  const [editingPromptId, setEditingPromptId] = useState(null); // Track which prompt is being edited
  const [editedPromptContent, setEditedPromptContent] = useState(''); // Temp state for editing a prompt
  const [loading, setLoading] = useState(true); // State to hold loading status
  const [error, setError] = useState(null); // State to hold error status
  const [editingRoom, setEditingRoom] = useState(false); // State to toggle editing mode
  const [roomName, setRoomName] = useState(''); // State for editing room name

  useEffect(() => {
    // Fetch room details from the API
    fetch(`${process.env.REACT_APP_API_URL}/rooms/${id}`)
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
    fetch(`${process.env.REACT_APP_API_URL}/rooms/${id}/prompts`)
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
    fetch(`${process.env.REACT_APP_API_URL}/rooms/${id}/prompts`, {
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
    fetch(`${process.env.REACT_APP_API_URL}/prompts/${promptId}`, {
      method: 'DELETE',
    })
      .then(() => {
        setPrompts(prompts.filter((prompt) => prompt.id !== promptId));
        if (editingPromptId === promptId) {
          handleCancelEditPrompt();
        }
      })
      .catch((error) => {
        console.error('Error deleting prompt:', error);
      });
  };

  // Function to handle prompt editing
  const handleStartEditPrompt = (prompt) => {
    setEditingPromptId(prompt.id);
    setEditedPromptContent(prompt.content);
  };

  const handleCancelEditPrompt = () => {
    setEditingPromptId(null);
    setEditedPromptContent('');
  };

  const handleUpdatePrompt = (promptId) => {
    fetch(`${process.env.REACT_APP_API_URL}/prompts/${promptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: editedPromptContent }),
    })
      .then((response) => response.json())
      .then((updatedPrompt) => {
        setPrompts(
          prompts.map((prompt) =>
            prompt.id === promptId ? updatedPrompt : prompt
          )
        );
        handleCancelEditPrompt();
      })
      .catch((error) => {
        console.error('Error updating prompt:', error);
      });
  };

  // Function to handle room update
  const handleUpdateRoom = () => {
    fetch(`${process.env.REACT_APP_API_URL}/rooms/${id}`, {
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
    fetch(`${process.env.REACT_APP_API_URL}/rooms/${id}`, {
      method: 'DELETE',
    })
      .then(() => {
        navigate('/rooms'); // Redirect to the room list after deleting
      })
      .catch((error) => {
        console.error('Error deleting room:', error);
      });
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-gray-600">
        Loading room details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pt-6 pb-10 sm:pb-12">
      <nav className="mb-4 text-sm font-medium text-indigo-600">
        <Link
          to="/rooms"
          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-indigo-600 transition hover:bg-indig
o-100"
        >
          <span aria-hidden="true">←</span>
          <span>Back to rooms</span>
        </Link>
      </nav>
      <div className="space-y-6 rounded-2xl bg-white px-5 py-6 shadow-md ring-1 ring-gray-200/70 sm:px-6">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {editingRoom ? (
              <>
                <div className="flex-1 min-w-0">
                  <label htmlFor="room-name" className="sr-only">
                    Room name
                  </label>
                  <input
                    id="room-name"
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base font-semibold text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUpdateRoom}
                    className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingRoom(false)}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">Room</p>
                  <h1 className="mt-1 text-2xl font-bold text-gray-800 sm:text-3xl">{room.name}</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Prompts linked to this room appear during inspection workflows.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setEditingRoom(true)}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteRoom}
                    className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Add prompt</h2>
          <p className="mt-1 text-sm text-gray-600">
            Create reusable prompt language that will be associated with this room.
          </p>
          <form onSubmit={handleCreatePrompt} className="mt-4 space-y-3">
            <label htmlFor="new-room-prompt" className="sr-only">
              New prompt
            </label>
            <input
              id="new-room-prompt"
              type="text"
              value={newPromptContent}
              onChange={(e) => setNewPromptContent(e.target.value)}
              placeholder="Describe what inspectors should ask or verify..."
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Add prompt
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Existing prompts</h2>
            <span className="text-sm font-medium text-gray-500">{prompts.length} total</span>
          </div>
          {prompts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
              No prompts have been created for this room yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {prompts.map((prompt) => (
                <li
                  key={prompt.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow"
                >
                  {editingPromptId === prompt.id ? (
                    <>
                      <label htmlFor={`prompt-${prompt.id}`} className="sr-only">
                        Prompt content
                      </label>
                      <textarea
                        id={`prompt-${prompt.id}`}
                        value={editedPromptContent}
                        onChange={(e) => setEditedPromptContent(e.target.value)}
                        rows={3}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      />
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdatePrompt(prompt.id)}
                          className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditPrompt}
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700">
                        <span className="block whitespace-pre-wrap break-words">{prompt.content}</span>
                      </p>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditPrompt(prompt)}
                          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
