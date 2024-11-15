import React, { useState, useEffect } from 'react';

const FullScreenPhotoViewer = ({ photoUrl, onClose }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseUp = () => setDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseDown = (e) => {
    setDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onClick={onClose}
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <img
          src={photoUrl}
          alt="Full Size"
          style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
          className="max-w-full max-h-screen object-contain"
        />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white text-3xl"
        >
          &times;
        </button>
        <a
          href={photoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 left-2 text-white text-xl"
        >
          Inspect
        </a>
      </div>
    </div>
  );
};

export default FullScreenPhotoViewer;