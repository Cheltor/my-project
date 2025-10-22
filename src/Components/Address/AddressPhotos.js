import React, { useState, useEffect } from 'react';

const AddressPhotos = ({ addressId }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null); // Track the absolute index of the selected photo
  const [currentPage, setCurrentPage] = useState(1); // Current page state
  const [editingPage, setEditingPage] = useState(false); // Track whether the page number is being edited
  const [inputPage, setInputPage] = useState(currentPage); // Hold the page input value
  const [pageError, setPageError] = useState('');
  const [loadedImages, setLoadedImages] = useState([]); // Track loaded images
  const photosPerPage = 6; // Define how many photos you want per page

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const base = process.env.REACT_APP_API_URL;

        // 1) Address comment photos (graceful on 404)
        let addressPhotos = [];
        try {
          const r = await fetch(`${base}/addresses/${addressId}/photos`);
          if (r.ok) {
            addressPhotos = await r.json();
          }
        } catch (_) {
          // ignore; treat as no address photos
        }

        // 2) Violations for this address (graceful on 404)
        let violations = [];
        try {
          const rv = await fetch(`${base}/addresses/${addressId}/violations`);
          if (rv.ok) {
            violations = await rv.json();
          }
        } catch (_) {
          // ignore; treat as no violations
        }

        // 3) For each violation, fetch its photos
        const vioPhotosArrays = await Promise.all(
          (violations || []).map(async (v) => {
            try {
              const rp = await fetch(`${base}/violation/${v.id}/photos`);
              if (rp.ok) return rp.json();
            } catch (_) {
              // ignore
            }
            return [];
          })
        );
        const violationPhotos = vioPhotosArrays.flat();

        // 4) Merge and sort by most recent (created_at desc); fallback to unsorted if timestamps missing
        const toTs = (p) => {
          const v = p?.created_at;
          const t = v ? new Date(v).getTime() : NaN;
          return Number.isNaN(t) ? 0 : t;
        };
        const merged = [
          ...addressPhotos.map((p) => ({ ...p, _source: 'address' })),
          ...violationPhotos.map((p) => ({ ...p, _source: 'violation' })),
        ].sort((a, b) => toTs(b) - toTs(a));

        if (!cancelled) {
          setPhotos(merged);
          setCurrentPage(1);
          setLoadedImages([]);
        }
      } catch (e) {
        if (!cancelled) setError('Failed to fetch photos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [addressId]);

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

  // Function to handle the page number input change
  const handlePageInputChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) { // Ensure the input is a number
      setInputPage(value);
    }
  };

  // Handle pressing "Enter" or blurring the input field
  const handlePageSubmit = () => {
    const pageNumber = parseInt(inputPage, 10);
    if (Number.isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
      setPageError(`Enter a number between 1 and ${totalPages}`);
      return;
    }
    setCurrentPage(pageNumber); // Set to the desired page if it's valid
    setEditingPage(false); // Exit edit mode
    setPageError('');
  };

  // Handle when the user clicks outside the input field
  const handlePageBlur = () => {
    handlePageSubmit();
  };

  // Function to close the modal when clicking outside
  const closeModal = (e) => {
    if (e.target.id === 'modal-backdrop') {
      setSelectedPhotoIndex(null);
    }
  };

  // Handle Next and Previous navigation in the modal
  const handleNextPhoto = () => {
    if (selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const handlePreviousPhoto = () => {
    if (selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  // Function to track loaded images
  const handleImageLoad = (index) => {
    setLoadedImages((prevLoadedImages) => [...prevLoadedImages, index]);
  };

  if (loading) {
    return <p>Loading photos...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (photos.length === 0) {
    return <p>No photos available.</p>;
  }

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Photos</h2>

      <div className="grid grid-cols-3 gap-4">
        {currentPhotos.map((photo, index) => (
          <div key={index} className="relative h-48 bg-gray-200">
            {!loadedImages.includes(index) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="loader">Loading...</div> {/* Placeholder (You can replace this with a spinner or skeleton) */}
              </div>
            )}
            <img 
              src={photo.url} 
              alt={photo.filename || `${index}`} 
              className={`w-full h-full object-cover cursor-pointer transition-transform duration-300 transform hover:scale-105 ${
                loadedImages.includes(index) ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={() => setSelectedPhotoIndex((currentPage - 1) * photosPerPage + index)} // Track the absolute index
              loading="lazy" // Lazy load the image
              onLoad={() => handleImageLoad(index)} // Mark image as loaded
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

        {/* Page number with editable input */}
        <div className="text-gray-700">
          {editingPage ? (
            <div>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={inputPage}
                onChange={(e) => { setInputPage(e.target.value); setPageError(''); }}
                onBlur={handlePageBlur}
                onKeyDown={(e) => e.key === 'Enter' && handlePageSubmit()}
                className={`border px-2 py-1 w-16 text-center ${pageError ? 'border-red-500' : ''}`}
                autoFocus
              />
              {pageError && <div className="text-xs text-red-600 mt-1">{pageError}</div>}
            </div>
          ) : (
            <span onClick={() => { setEditingPage(true); setInputPage(currentPage); }} className="cursor-pointer">
              Page {currentPage}
            </span>
          )} of {totalPages}
        </div>

        <button
          onClick={handleNextPage}
          className={`px-4 py-2 bg-blue-500 text-white rounded ${currentPage === totalPages && 'opacity-50 cursor-not-allowed'}`}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>

      {/* Modal for selected photo */}
      {selectedPhotoIndex !== null && (
        <div
          id="modal-backdrop"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-3xl w-full relative">
            <button 
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              onClick={() => setSelectedPhotoIndex(null)}
            >
              &#x2715; {/* Close button */}
            </button>

            <img src={photos[selectedPhotoIndex].url} alt="Selected" className="w-full h-auto" />

            {/* Previous and Next Buttons */}
            <button
              onClick={handlePreviousPhoto}
              disabled={selectedPhotoIndex === 0}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white px-2 py-1 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={handleNextPhoto}
              disabled={selectedPhotoIndex === photos.length - 1}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white px-2 py-1 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressPhotos;
