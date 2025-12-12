import React, { createContext, useContext, useState, useEffect } from 'react';

const GeolocationContext = createContext();

export const useGeolocation = () => useContext(GeolocationContext);

/**
 * GeolocationProvider supplies geolocation data and device type (mobile/desktop) to its children via context.
 *
 * Geolocation tracking is enabled only for "mobile" devices, defined as those with a screen width less than 1024px.
 * The `isMobile` threshold (1024px) is used to distinguish mobile devices from desktops/laptops, and is checked on initial render and window resize.
 * When `isMobile` is true and the browser supports geolocation, the component starts a background geolocation watch and updates the context with the user's current location.
 * The context provides: `{ location, error, isMobile }`.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Child components that will have access to geolocation context.
 */
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
