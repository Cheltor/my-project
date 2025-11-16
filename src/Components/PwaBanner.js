// src/Components/PwaBanner.js
import React from 'react';

const PwaBanner = ({ onInstall, onDismiss }) => {
  return (
    <div className="pwa-banner">
      <div className="pwa-banner-content">
        <h3>Install Our App</h3>
        <p>For a better experience, add our app to your home screen.</p>
      </div>
      <div className="pwa-banner-actions">
        <button onClick={onInstall} className="pwa-install-button">
          Install
        </button>
        <button onClick={onDismiss} className="pwa-dismiss-button">
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default PwaBanner;
