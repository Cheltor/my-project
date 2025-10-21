import React, { useEffect, useMemo, useRef, useState } from "react";

const FALLBACK_CENTER = {
  lat: 37.7749,
  lng: -122.4194,
};

const MESSAGE_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#f3f4f6",
  color: "#374151",
  borderRadius: "0.5rem",
  padding: "1rem",
  textAlign: "center",
  boxSizing: "border-box",
};

const SCRIPT_ELEMENT_ID = "google-maps-script";

const loadGoogleMapsScript = (apiKey) => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in the browser."));
  }

  if (window.google && window.google.maps) {
    return Promise.resolve();
  }

  const existingScript = document.getElementById(SCRIPT_ELEMENT_ID);
  if (existingScript) {
    if (existingScript.dataset.loaded === "true") {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const handleLoad = () => {
        existingScript.dataset.loaded = "true";
        resolve();
      };

      const handleError = () => {
        reject(new Error("Failed to load Google Maps script."));
      };

      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ELEMENT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps script."));
    document.head.appendChild(script);
  });
};

const GoogleMapView = ({
  mapHeight = "400px",
  mapWidth = "100%",
  zoom = 14,
  defaultCenter = FALLBACK_CENTER,
  mapOptions = {},
}) => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [mapError, setMapError] = useState("");
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("Location permission denied. Showing default map view.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError("Location information is unavailable. Showing default map view.");
        } else if (error.code === error.TIMEOUT) {
          setLocationError("Location request timed out. Showing default map view.");
        } else {
          setLocationError("Unable to retrieve your location. Showing default map view.");
        }
      }
    );
  }, []);

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  const wrapperStyle = useMemo(
    () => ({
      width: mapWidth,
      height: mapHeight,
      position: "relative",
    }),
    [mapHeight, mapWidth]
  );

  useEffect(() => {
    let isMounted = true;

    if (!apiKey) {
      return () => {
        isMounted = false;
      };
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!isMounted || !mapContainerRef.current) {
          return;
        }

        mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom,
          ...mapOptions,
        });
      })
      .catch((error) => {
        if (isMounted) {
          setMapError(error.message || "Failed to load Google Maps.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey, defaultCenter, mapOptions, zoom]);

  useEffect(() => {
    if (!currentPosition || !mapInstanceRef.current || !window.google?.maps) {
      return;
    }

    mapInstanceRef.current.setCenter(currentPosition);

    if (markerRef.current) {
      markerRef.current.setPosition(currentPosition);
    } else {
      markerRef.current = new window.google.maps.Marker({
        position: currentPosition,
        map: mapInstanceRef.current,
        title: "Current location",
      });
    }
  }, [currentPosition]);

  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, []);

  if (!apiKey) {
    return (
      <div style={{ ...wrapperStyle, padding: "0.5rem" }}>
        <div style={MESSAGE_CONTAINER_STYLE}>
          <p>
            Google Maps API key is missing. Set the <code>REACT_APP_GOOGLE_MAPS_API_KEY</code>{" "}
            environment variable to display the map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "100%", borderRadius: "0.5rem", overflow: "hidden" }}
      />

      {(locationError || mapError) && (
        <div
          style={{
            position: "absolute",
            bottom: "0.75rem",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(17, 24, 39, 0.85)",
            color: "#f9fafb",
            padding: "0.5rem 0.75rem",
            borderRadius: "9999px",
            fontSize: "0.875rem",
            maxWidth: "90%",
            textAlign: "center",
          }}
        >
          {mapError || locationError}
        </div>
      )}
    </div>
  );
};

export default GoogleMapView;
