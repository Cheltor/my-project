import React, { createContext, useContext, useState, useEffect } from 'react';

const GeolocationContext = createContext();

export const useGeolocation = () => useContext(GeolocationContext);

export const GeolocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Monitor screen size
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Watch position if on mobile
  useEffect(() => {
    let watchId;

    // Only verify navigator.geolocation availability
    if (isMobile && navigator.geolocation) {
      console.log("Starting background geolocation watch (Mobile detected)");

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLoc = [position.coords.latitude, position.coords.longitude];
          setLocation(newLoc);
          setError(null);
        },
        (err) => {
          console.warn("Geolocation monitor error:", err);
          setError(err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        }
      );
    } else if (!isMobile) {
      // Logic to clear location if switching to desktop? 
      // Maybe unnecessary, but keeps state clean.
      // setLocation(null); 
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isMobile]);

  return (
    <GeolocationContext.Provider value={{ location, error, isMobile }}>
      {children}
    </GeolocationContext.Provider>
  );
};
