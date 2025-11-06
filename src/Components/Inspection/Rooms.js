import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NewRoom from './NewRoom'; // Import the NewRoom component

// Component to show all the rooms in the database
export default function Rooms() {
  const [rooms, setRooms] = useState([]); // State to hold the rooms
  const [loading, setLoading] = useState(true); // State to hold loading status
  const [error, setError] = useState(null); // State to hold error status
  const [currentPage, setCurrentPage] = useState(1); // State to hold the current page
  const [roomsPerPage] = useState(10); // State to hold the number of rooms per page
  const [showNewRoomForm, setShowNewRoomForm] = useState(false); // State to toggle NewRoom form

  const fetchRooms = () => {
    setLoading(true);
    fetch(`${process.env.REACT_APP_API_URL}/rooms/`) // Replace with the actual endpoint
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch rooms');
        }
        return response.json();
      })
      .then((data) => {
        setRooms(data); // Store the fetched rooms in the state
        setLoading(false); // Set loading to false after fetching data
      })
      .catch((error) => {
        setError(error.message); // Set error state if the fetch fails
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRooms();
  }, []); // Empty dependency array ensures this runs once when the component mounts

  // Calculate the total number of pages
  const totalPages = Math.ceil(rooms.length / roomsPerPage);

  // Get the current set of rooms to display
  const indexOfLastRoom = currentPage * roomsPerPage;
  const indexOfFirstRoom = indexOfLastRoom - roomsPerPage;
  const currentRooms = rooms.slice(indexOfFirstRoom, indexOfLastRoom);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const [editingPage, setEditingPage] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [pageError, setPageError] = useState('');

  const startEditPage = () => { setPageInput(String(currentPage)); setPageError(''); setEditingPage(true); };
  const applyPageInput = () => {
    const n = parseInt(pageInput, 10);
    if (Number.isNaN(n) || n < 1 || n > totalPages) {
      setPageError(`Enter a number between 1 and ${totalPages}`);
      return;
    }
    paginate(n);
    setEditingPage(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-gray-600">
        Loading rooms...
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
    <div className="max-w-4xl mx-auto px-5 pt-6 pb-10 sm:pb-12">
      <div className="space-y-6 rounded-2xl bg-white px-5 py-6 shadow-md ring-1 ring-gray-200/70 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">Rooms</h1>
            <p className="mt-1 text-sm text-gray-600">
              Browse and manage the room definitions used throughout inspections.
            </p>
          </div>
          <button
            onClick={() => setShowNewRoomForm(!showNewRoomForm)}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {showNewRoomForm ? 'Cancel' : 'Add Room'}
          </button>
        </div>

        {showNewRoomForm && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 shadow-sm">
            <NewRoom onRoomAdded={fetchRooms} />
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 shadow-sm">
          {currentRooms.length === 0 ? (
            <p className="text-sm text-gray-600">No rooms found.</p>
          ) : (
            <ul className="space-y-3">
              {currentRooms.map((room) => (
                <li
                  key={room.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-indigo-200 hover:shadow"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-gray-800">{room.name}</p>
                  </div>
                  <Link
                    to={`/rooms/${room.id}`}
                    className="inline-flex items-center rounded-md border border-indigo-600 px-3 py-1.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-600 hover:text-white"
                  >
                    View details
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:justify-between">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
            >
              Previous
            </button>
            <div className="text-sm text-gray-700">
              {editingPage ? (
                <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageInput}
                    onChange={(e) => {
                      setPageInput(e.target.value);
                      setPageError('');
                    }}
                    onBlur={applyPageInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyPageInput();
                      if (e.key === 'Escape') setEditingPage(false);
                    }}
                    className={`w-20 rounded-md border px-2 py-1 text-center text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${pageError ? 'border-red-500 focus:border-red-500 focus:ring-red-300/60' : 'border-gray-300'}`}
                    autoFocus
                  />
                  {pageError && <div className="text-xs font-medium text-red-600">{pageError}</div>}
                </div>
              ) : (
                <button
                  onClick={startEditPage}
                  className="inline-flex items-center text-sm font-medium text-indigo-600 underline-offset-2 hover:text-indigo-500 hover:underline"
                >
                  Page {currentPage} of {totalPages}
                </button>
              )}
            </div>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}