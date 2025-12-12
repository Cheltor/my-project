import React, { useState, useEffect } from 'react';
import LeafletMap from './LeafletMap';
import apiFetch from '../api';
import { useAuth } from '../AuthContext';
import { useGeolocation } from '../GeolocationContext';

const MapPage = () => {
  const { user } = useAuth();
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    includeClosed: false,
    showInspections: false,
    showViolations: true,
    showAllProperties: false
  });
  const [colorMode, setColorMode] = useState('type'); // 'type' or 'user'
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const { location: userLocation, isMobile } = useGeolocation();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Center map on user location initially if available
  useEffect(() => {
    if (userLocation && !mapCenter) {
      setMapCenter(userLocation);
    }
  }, [userLocation, mapCenter]);

  useEffect(() => {
    fetchMarkers();
  }, [filters.includeClosed, filters.showAllProperties]);

  const fetchMarkers = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/map/markers?include_closed=${filters.includeClosed}&show_all_properties=${filters.showAllProperties}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setMarkers(data);
    } catch (err) {
      console.error("Failed to fetch map markers:", err);
      setError("Failed to load map data.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Extract unique users from markers
  const availableUsers = React.useMemo(() => {
    const users = new Map();
    markers.forEach(m => {
      if (m.assigned_user_id && m.assigned_user_name) {
        users.set(m.assigned_user_id, m.assigned_user_name);
      }
    });
    return Array.from(users.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [markers]);

  // Client-side filtering for display toggles
  const displayedMarkers = markers.filter(m => {
    if (m.type === 'inspection' && !filters.showInspections) return false;
    if (m.type === 'violation' && !filters.showViolations) return false;

    // User filter
    if (selectedUserIds.length > 0) {
      if (!m.assigned_user_id || !selectedUserIds.includes(m.assigned_user_id)) return false;
    }

    return true;
  });

  const handleMarkerRelocate = async (addressId, newLat, newLng) => {
    // 1. Optimistic Update
    setMarkers(prev => prev.map(m => {
      if (m.address_id === addressId) {
        return { ...m, lat: newLat, lng: newLng };
      }
      return m;
    }));

    // 2. API Call
    try {
      const res = await apiFetch(`/addresses/${addressId}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: newLat, longitude: newLng })
      });
      if (!res.ok) {
        throw new Error("Failed to update location");
      }
    } catch (err) {
      console.error("Relocation failed:", err);
      // Revert on failure (could be improved by refetching)
      setToast({ type: 'error', message: 'Failed to save new location.' });
      fetchMarkers();
    }
  };

  const activeCount = displayedMarkers.length;

  const locateUser = () => {
    if (userLocation) {
      setMapCenter(userLocation);
    } else {
      setToast({ type: 'error', message: 'Location not available yet. Please wait for GPS signal.' });
    }
  };

  return (
    <div className={`w-full ${!isMobile ? 'max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8' : 'h-[calc(100vh-64px)] flex flex-col overflow-hidden relative'}`}>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`${
            isMobile 
              ? 'fixed top-4 left-4 right-4 z-[2000]' 
              : 'mb-4'
          } p-3 rounded-lg shadow-lg ${
            toast.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{toast.message}</span>
            <button 
              className="ml-3 text-xs underline hover:no-underline font-semibold" 
              onClick={() => setToast(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      {/* Desktop Header */}
      {!isMobile && (
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Town Map</h1>
            <p className="mt-1 text-sm text-gray-600">
              View active inspections and violations across town.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
              {activeCount} Active Cases
            </span>
          </div>
        </header>
      )}

      {/* Controls Container */}
      <div className={`${!isMobile ? 'bg-white p-4 rounded-lg shadow mb-6 border border-gray-200' : `absolute top-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-lg transition-transform duration-300 ${showMobileFilters ? 'translate-y-0' : '-translate-y-full'}`}`}>
        <div className={`flex flex-wrap gap-4 items-center ${isMobile ? 'p-4 gap-y-3' : ''}`}>
          {!isMobile && <span className="text-sm font-medium text-gray-700">Filters:</span>}

          {isMobile && (
            <div className="flex w-full justify-between items-center mb-2">
              <span className="font-semibold text-gray-800">Map Filters</span>
              <button onClick={() => setShowMobileFilters(false)} className="text-gray-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          <label className="inline-flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
              checked={filters.showViolations}
              onChange={() => toggleFilter('showViolations')}
            />
            <span className="text-sm text-gray-700">Violations</span>
          </label>

          <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>

          <label className="inline-flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-gray-600 rounded border-gray-300 focus:ring-gray-500"
              checked={filters.includeClosed}
              onChange={() => toggleFilter('includeClosed')}
            />
            <span className="text-sm text-gray-700">Include Closed Cases</span>
          </label>

          {user?.role === 3 && (
            <>
              <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>
              <label className="inline-flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-gray-600 rounded border-gray-300 focus:ring-gray-500"
                  checked={filters.showAllProperties}
                  onChange={() => toggleFilter('showAllProperties')}
                />
                <span className="text-sm text-gray-700">Show All Properties</span>
              </label>
            </>
          )}

          <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>

          {availableUsers.length > 0 && (
            <div className="relative group">
              <button type="button" className="inline-flex items-center gap-2 text-sm border-gray-300 rounded-md shadow-sm border px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700">
                <span>Filter Inspectors {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}</span>
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute left-0 top-full pt-1 w-56 z-50 hidden group-hover:block">
                <div className="bg-white border border-gray-200 rounded-md shadow-lg p-2 max-h-64 overflow-y-auto">
                  <div className="space-y-1">
                    <label className="flex items-center p-1 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.length === 0}
                        onChange={() => setSelectedUserIds([])}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mr-2"
                      />
                      <span className="text-sm text-gray-700 font-medium">All Inspectors</span>
                    </label>
                    <hr className="my-1 border-gray-100" />
                    {availableUsers.map(u => (
                      <label key={u.id} className="flex items-center p-1 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds(prev => [...prev, u.id]);
                            } else {
                              setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                            }
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mr-2"
                        />
                        <span className="text-sm text-gray-700 truncate" title={u.name}>{u.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={`flex items-center gap-2 ${isMobile ? 'w-full pt-2 border-t border-gray-100' : 'ml-auto'}`}>
            <label className="text-sm font-medium text-gray-700">Color By:</label>
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-1 pl-2 pr-8"
            >
              <option value="type">Status/Type</option>
              <option value="user">Assigned User</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      ) : (
        <div className={!isMobile && !isFullScreen ? "rounded-xl border border-gray-200 bg-white p-1 shadow-sm relative" : "flex-1 relative bg-white"}>
          {isFullScreen && !isMobile && (
            <button
              onClick={() => setIsFullScreen(false)}
              className="absolute top-4 right-4 z-[1000] bg-white text-gray-800 p-2 rounded-md shadow-md hover:bg-gray-100 font-bold flex items-center gap-2 border border-gray-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              Exit Full Screen
            </button>
          )}
          {!isFullScreen && !isMobile && (
            <button
              onClick={() => setIsFullScreen(true)}
              className="absolute top-2 right-2 z-[400] bg-white/90 text-gray-700 p-1.5 rounded shadow-sm hover:bg-white border border-gray-200"
              title="Full Screen"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            </button>
          )}

          {/* Mobile Filter Toggle Button */}
          {isMobile && !showMobileFilters && (
            <button
              onClick={() => setShowMobileFilters(true)}
              className="absolute top-4 right-4 z-[1000] bg-white text-gray-700 p-2.5 rounded-full shadow-lg font-medium border border-gray-200 flex items-center justify-center transition-transform active:scale-95"
              title="Filters"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </button>
          )}

          {/* Locate Me Button (Mobile Only) */}
          {isMobile && (
            <button
              onClick={locateUser}
              className="absolute bottom-8 right-4 z-[1000] bg-white text-blue-600 p-2.5 rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-transform active:scale-95"
              title="Locate Me"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}

          <LeafletMap
            markers={displayedMarkers}
            height={isMobile || isFullScreen ? "100%" : "calc(100vh - 300px)"}
            draggable={true}
            onMarkerDrag={handleMarkerRelocate}
            colorMode={colorMode}
            center={mapCenter}
            userLocation={userLocation}
          />
        </div>
      )}
    </div>
  );
};

export default MapPage;

