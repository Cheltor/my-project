import React from 'react';
import GoogleMapView from './GoogleMapView';

const MapPage = () => {
  return (
    <div className="max-w-6xl mx-auto py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Town Map</h1>
        <p className="mt-2 text-sm text-gray-600">
          View your current location on the map. Grant location access in your browser to recenter automatically.
        </p>
      </header>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <GoogleMapView mapHeight="600px" mapWidth="100%" />
      </div>
    </div>
  );
};

export default MapPage;

