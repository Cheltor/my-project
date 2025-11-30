import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from './api';
import { useAuth } from './AuthContext';
import useVisibilityAwareInterval from './Hooks/useVisibilityAwareInterval';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const { logout } = useAuth();
  const [chatEnabled, setChatEnabled] = useState(true);
  const [imageAnalysisEnabled, setImageAnalysisEnabled] = useState(true);

  // Poll the settings while the tab is visible. Pause when hidden.
  const fetchSettings = useCallback(async () => {
    try {
      // Chat setting
      const respChat = await apiFetch('/settings/chat', {}, { onUnauthorized: logout });
      if (respChat && respChat.ok) {
        const data = await respChat.json();
        if (typeof data.enabled === 'boolean') setChatEnabled(data.enabled);
      }

      // Image Analysis setting
      const respImg = await apiFetch('/settings/image-analysis', {}, { onUnauthorized: logout });
      if (respImg && respImg.ok) {
        const data = await respImg.json();
        if (typeof data.enabled === 'boolean') setImageAnalysisEnabled(data.enabled);
      }
    } catch (e) {
      // ignore and leave current value
    }
  }, [logout]);

  // run every 60s while visible; run immediately on mount/when visibility resumes
  useVisibilityAwareInterval(fetchSettings, 60_000, { immediate: true });

  useEffect(() => {
    // subscribe to server-sent events for settings updates
    let es;
    try {
      es = new EventSource(`${process.env.REACT_APP_API_URL}/settings/stream`);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data && data.key === 'chat_enabled') {
            setChatEnabled(Boolean(data.enabled));
          }
          if (data && data.key === 'image_analysis_enabled') {
            setImageAnalysisEnabled(Boolean(data.enabled));
          }
        } catch (e) {
          // ignore
        }
      };
    } catch (e) {
      // ignore if SSE not available
    }

    return () => {
      if (es) es.close();
    };
  }, []);

  const value = {
    chatEnabled,
    setChatEnabled,
    imageAnalysisEnabled,
    setImageAnalysisEnabled,
    fetchSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
