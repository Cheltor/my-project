import React, { useState } from 'react';

const Photos = ({ photos }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null); // For handling modal
  const [currentPage, setCurrentPage] = useState(1); // Current page state
  const photosPerPage = 6; // Define how many photos you want per page

  // Calculate total number of pages
  const totalPages = Math.ceil(photos.length / photosPerPage);

  // Get the current photos to display based on the current page
  const currentPhotos = photos.slice(
    (currentPage - 1) * photosPerPage,
    currentPage * photosPerPage
  );

  // Function to handle next page
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Function to handle previous page
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (photos.length === 0) {
    return <p>No photos available.</p>;
  }

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Photos</h2>

      <div className="grid grid-cols-3 gap-4">
        {currentPhotos.map((photo, index) => (
          <div key={index} className="relative">
            <img 
              src={photo} 
              alt={`Photo ${index}`} 
              className="w-full h-auto cursor-pointer transition-transform duration-300 transform hover:scale-105"
              onClick={() => setSelectedPhoto(photo)}
            />
          </div>
        ))}
      </div>

      {/* Pagination controls */}
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={handlePreviousPage}
          className={`px-4 py-2 bg-blue-500 text-white rounded ${currentPage === 1 && 'opacity-50 cursor-not-allowed'}`}
          disabled={currentPage === 1}
        >
          Previous
        </button>

        <span className="text-gray-700">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={handleNextPage}
          className={`px-4 py-2 bg-blue-500 text-white rounded ${currentPage === totalPages && 'opacity-50 cursor-not-allowed'}`}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>

      {/* Modal for selected photo */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-3xl w-full relative">
            <button 
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              onClick={() => setSelectedPhoto(null)}
            >
              &#x2715; {/* Close button */}
            </button>
            <img src={selectedPhoto} alt="Selected" className="w-full h-auto" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Photos;
