import React, { useState, useEffect } from 'react';
import LeafletMap from './LeafletMap';
import apiFetch from '../api';
import { useAuth } from '../AuthContext';

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
      alert("Failed to save new location.");
      fetchMarkers();
    }
  };

  const activeCount = displayedMarkers.length;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-sm font-medium text-gray-700">Filters:</span>



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

          <div className="flex items-center gap-2 ml-auto">
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
        <div className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <LeafletMap
            markers={displayedMarkers}
            height="calc(100vh - 300px)"
            draggable={true}
            onMarkerDrag={handleMarkerRelocate}
            colorMode={colorMode}
          />
        </div>
      )}
    </div>
  );
};

export default MapPage;

