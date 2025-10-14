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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Rooms</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all rooms.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={() => setShowNewRoomForm(!showNewRoomForm)}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {showNewRoomForm ? 'Cancel' : 'Add Room'}
          </button>
        </div>
      </div>
      {showNewRoomForm && <NewRoom onRoomAdded={fetchRooms} />} {/* Pass the callback to NewRoom */}
      <div className="mt-4">
        <ul className="divide-y divide-gray-200">
          {currentRooms.map((room) => (
            <li key={room.id} className="py-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{room.name}</p>
                </div>
                <div>
                  <Link to={`/rooms/${room.id}`} className="text-indigo-600 hover:text-indigo-900">View</Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <nav className="flex justify-between items-center">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-semibold text-gray-500 bg-gray-200 rounded-md hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
          >
            Previous
          </button>
          <div className="text-sm text-gray-700">
            {editingPage ? (
              <div>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => { setPageInput(e.target.value); setPageError(''); }}
                  onBlur={applyPageInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyPageInput();
                    if (e.key === 'Escape') setEditingPage(false);
                  }}
                  className={`w-20 px-2 py-1 border rounded ${pageError ? 'border-red-500' : ''}`}
                  autoFocus
                />
                {pageError && <div className="text-xs text-red-600 mt-1">{pageError}</div>}
              </div>
            ) : (
              <button onClick={startEditPage} className="underline">Page {currentPage} of {totalPages}</button>
            )}
          </div>
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-semibold text-gray-500 bg-gray-200 rounded-md hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  );
}