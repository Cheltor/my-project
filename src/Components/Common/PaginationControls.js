import React, { useState } from 'react';

const buttonClasses =
  'px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed';

export default function PaginationControls({ currentPage, totalPages, onPageChange, className = '' }) {
  const [isEditing, setIsEditing] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [pageError, setPageError] = useState('');

  const startEditing = () => {
    setPageInput(String(currentPage));
    setPageError('');
    setIsEditing(true);
  };

  const applyInput = () => {
    const parsed = parseInt(pageInput, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > totalPages) {
      setPageError(`Enter a number between 1 and ${totalPages}`);
      return;
    }
    onPageChange(parsed);
    setIsEditing(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyInput();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsEditing(false);
    }
  };

  const handlePrevious = () => onPageChange(currentPage - 1);
  const handleNext = () => onPageChange(currentPage + 1);

  return (
    <div className={`flex justify-between items-center ${className}`}>
      <button
        type="button"
        onClick={handlePrevious}
        disabled={currentPage <= 1}
        className={buttonClasses}
      >
        Previous
      </button>

      <div className="text-sm text-gray-700">
        {isEditing ? (
          <div>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(event) => {
                setPageInput(event.target.value);
                setPageError('');
              }}
              onBlur={applyInput}
              onKeyDown={handleKeyDown}
              className={`w-20 px-2 py-1 border rounded ${pageError ? 'border-red-500' : 'border-gray-300'}`}
              autoFocus
            />
            {pageError && <div className="text-xs text-red-600 mt-1">{pageError}</div>}
          </div>
        ) : (
          <button type="button" onClick={startEditing} className="underline">
            Page {currentPage} of {totalPages}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        className={buttonClasses}
      >
        Next
      </button>
    </div>
  );
}
