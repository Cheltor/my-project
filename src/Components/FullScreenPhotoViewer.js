import React, { useState, useEffect, useCallback } from 'react';

const FullScreenPhotoViewer = ({ photoUrl, onClose }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [pinching, setPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialScale, setInitialScale] = useState(1);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 6;

  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

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

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = -e.deltaY; // wheel up -> positive
    const step = delta > 0 ? 0.1 : -0.1;
    setScale((prev) => clamp(prev + step, MIN_SCALE, MAX_SCALE));
  }, []);

  // Touch helpers
  const distanceBetween = (touches) => {
    const [a, b] = touches;
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      setPinching(true);
      setInitialPinchDistance(distanceBetween(e.touches));
      setInitialScale(scale);
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      setDragging(true);
      setStartPos({ x: t.clientX - position.x, y: t.clientY - position.y });
    }
  };

  const handleTouchMove = (e) => {
    if (pinching && e.touches.length === 2) {
      e.preventDefault();
      const current = distanceBetween(e.touches);
      const factor = current / (initialPinchDistance || 1);
      setScale(clamp(initialScale * factor, MIN_SCALE, MAX_SCALE));
      return;
    }
    if (dragging && e.touches.length === 1) {
      const t = e.touches[0];
      setPosition({ x: t.clientX - startPos.x, y: t.clientY - startPos.y });
    }
  };

  const handleTouchEnd = () => {
    if (pinching) setPinching(false);
    if (dragging) setDragging(false);
  };

  const zoomIn = () => setScale((s) => clamp(s + 0.25, MIN_SCALE, MAX_SCALE));
  const zoomOut = () => setScale((s) => clamp(s - 0.25, MIN_SCALE, MAX_SCALE));
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  const handleDoubleClick = () => zoomIn();

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onClick={onClose}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative" onClick={(e) => e.stopPropagation()} onDoubleClick={handleDoubleClick}>
        <img
          src={photoUrl}
          alt="Full Size"
          style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
          className="max-w-full max-h-screen object-contain select-none touch-none"
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
        {/* Zoom controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 text-white rounded-full px-3 py-2 shadow-lg">
          <button
            type="button"
            onClick={zoomOut}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl"
            aria-label="Zoom out"
          >
            –
          </button>
          <span className="min-w-[4rem] text-center text-sm">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={zoomIn}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={resetView}
            className="ml-1 px-3 h-8 rounded-full bg-white/10 hover:bg-white/20 text-sm"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullScreenPhotoViewer;