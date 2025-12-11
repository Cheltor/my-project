import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Switch } from '@headlessui/react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

// Fix for default marker icons significantly missing in Webpack/React
// See: https://github.com/PaulLeCam/react-leaflet/issues/453
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

const DEFAULT_CENTER = [38.9618936, -76.9281597];
const DEFAULT_ZOOM = 14;

// Helper to update map center when props change
function ChangeView({ center, zoom }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const VIOLATION_STATUS_MAPPING = {
  0: 'current',
  1: 'resolved',
  2: 'pending trial',
  3: 'dismissed',
};

const formatStatus = (status, type) => {
  if (type === 'violation' && status !== null) {
    const s = VIOLATION_STATUS_MAPPING[status];
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : status;
  }
  return status;
};

// Generate a consistent color for a user ID
const getUserColor = (userId) => {
  if (!userId) return 'bg-gray-400';
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-400',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];
  return colors[userId % colors.length];
};

const LeafletMap = ({ markers = [], center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM, height = "600px", onMarkerDrag, draggable = false, colorMode = 'type' }) => {
  const navigate = useNavigate();
  const [draggableAddressId, setDraggableAddressId] = useState(null);

  // Derive unique users for the legend
  const uniqueUsers = React.useMemo(() => {
    if (colorMode !== 'user') return [];
    const users = new Map();
    markers.forEach(m => {
      if (m.assigned_user_id && m.assigned_user_name) {
        if (!users.has(m.assigned_user_id)) {
          users.set(m.assigned_user_id, m.assigned_user_name);
        }
      }
    });
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [markers, colorMode]);

  // Group markers by address_id to handle multiple notices at the same location
  const groupedMarkers = React.useMemo(() => {
    const groups = {};
    markers.forEach(marker => {
      const key = marker.address_id || `${marker.lat},${marker.lng}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(marker);
    });
    return Object.values(groups);
  }, [markers]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <div style={{ height: height, width: "100%", borderRadius: "0.75rem", overflow: "hidden", zIndex: 0, position: "relative" }}>
      {/* zIndex 0 is important so it doesn't cover dropdowns/modals */}
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <ChangeView center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {groupedMarkers.map((group) => {
          const marker = group[0]; // Primary marker for position

          // Determine color/type priority for the group icon
          let displayType = 'property';
          let displayUser = marker.assigned_user_id;

          if (group.some(m => m.type === 'violation')) {
            displayType = 'violation';
            displayUser = group.find(m => m.type === 'violation').assigned_user_id;
          } else if (group.some(m => m.type === 'inspection')) {
            displayType = 'inspection';
            displayUser = group.find(m => m.type === 'inspection').assigned_user_id;
          }

          // Determine color based on mode
          let colorClass = 'bg-blue-500'; // Default

          if (colorMode === 'user') {
            colorClass = getUserColor(displayUser);
          } else {
            // Color by type
            if (displayType === 'violation') colorClass = 'bg-red-600';
            else if (displayType === 'property') colorClass = 'bg-gray-500';
            else colorClass = 'bg-blue-600';
          }

          // Create custom icon
          const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="${colorClass} w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                    ${group.length > 1 ? '<span class="absolute -top-2 -right-2 bg-white text-black text-[9px] font-bold px-1.5 rounded-full shadow border border-gray-300">' + group.length + '</span>' : ''}
                   </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10], // Center it
            popupAnchor: [0, -12]
          });

          return (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={customIcon}
              draggable={draggable && marker.address_id === draggableAddressId}
              eventHandlers={{
                dragend: (e) => {
                  if (onMarkerDrag && marker.address_id) {
                    const newPos = e.target.getLatLng();
                    onMarkerDrag(marker.address_id, newPos.lat, newPos.lng);
                  }
                },
              }}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <h3
                    className="font-bold text-gray-900 mb-2 cursor-pointer hover:text-indigo-600 hover:underline border-b pb-1"
                    onClick={() => navigate(`/address/${marker.address_id}`)}
                  >
                    {marker.address}
                  </h3>
                  <div className="flex flex-col gap-4 max-h-64 overflow-y-auto">
                    {group.map((item, idx) => (
                      <div key={item.id} className={`${idx > 0 ? "pt-4 border-t border-gray-200" : ""}`}>
                        {/* Header row: Badge + Inspector */}
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold
                            ${item.type === 'violation' ? 'bg-red-100 text-red-800' :
                              item.type === 'property' ? 'bg-gray-100 text-gray-700' :
                                'bg-blue-100 text-blue-800'}`}>
                            {item.type === 'violation' ? 'Violation' :
                              item.type === 'property' ? 'Property' :
                                'Inspection'}
                          </span>

                          {item.assigned_user_name && (
                            <span className="text-xs text-gray-500 truncate max-w-[120px]" title={item.assigned_user_name}>
                              {item.assigned_user_name}
                            </span>
                          )}
                        </div>

                        {/* Info Grid */}
                        <div className="bg-gray-50 rounded-md px-3 py-2 space-y-1.5 mb-2">
                          {item.status !== null && item.status !== undefined && (
                            <div className="flex items-center text-xs">
                              <span className="text-gray-500 w-16">Status:</span>
                              <span className="text-gray-700 font-medium">{formatStatus(item.status, item.type)}</span>
                            </div>
                          )}

                          {item.type === 'violation' && item.deadline && (
                            <div className="flex items-center text-xs">
                              <span className="text-gray-500 w-16">Deadline:</span>
                              <span className="text-red-600 font-semibold">{formatDate(item.deadline)}</span>
                            </div>
                          )}

                          {item.description && !(item.type === 'violation' && item.deadline) && (
                            <p className="text-gray-600 text-xs line-clamp-2 pt-1">{item.description}</p>
                          )}
                        </div>

                        {/* Action Button */}
                        <button
                          onClick={() => navigate(`/${item.type}/${item.entity_id}`)}
                          className="w-full text-center text-indigo-600 hover:text-white hover:bg-indigo-600 text-xs font-semibold border border-indigo-300 bg-indigo-50 px-3 py-1.5 rounded-md transition-colors"
                        >
                          {item.type === 'violation'
                            ? (item.violation_type?.toLowerCase() === 'doorhanger' ? 'Door Hanger' : 'Formal Notice')
                            : item.type === 'inspection' ? 'Doorhanger'
                              : 'View Property'}
                        </button>
                      </div>
                    ))}

                    {/* Common controls for the address */}
                    {draggable && marker.address_id && (
                      <div className="mt-2 text-center pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs text-gray-500">Relocate Address</span>
                          <Switch
                            checked={marker.address_id === draggableAddressId}
                            onChange={(checked) => setDraggableAddressId(checked ? marker.address_id : null)}
                            className={`${marker.address_id === draggableAddressId ? 'bg-indigo-600' : 'bg-gray-200'
                              } relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                          >
                            <span
                              className={`${marker.address_id === draggableAddressId ? 'translate-x-4' : 'translate-x-1'
                                } inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform`}
                            />
                          </Switch>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* User Legend Overlay */}
      {colorMode === 'user' && uniqueUsers.length > 0 && (
        <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 z-[1000] max-h-64 overflow-y-auto">
          <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Inspectors</h4>
          <div className="flex flex-col gap-2">
            {uniqueUsers.map(u => (
              <div key={u.id} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getUserColor(u.id)} border border-gray-300 shadow-sm`}></div>
                <span className="text-xs text-gray-800 font-medium">{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeafletMap;
