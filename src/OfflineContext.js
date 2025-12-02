import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const OfflineContext = createContext();

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('offlineQueue');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const { token } = useAuth();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('offlineQueue', JSON.stringify(queue));
  }, [queue]);

  const queueAction = useCallback((action) => {
    setQueue((prev) => [...prev, { ...action, id: Date.now(), timestamp: new Date().toISOString() }]);
  }, []);

  const removeFromQueue = useCallback((id) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const syncQueue = useCallback(async () => {
    if (queue.length === 0 || !isOnline || !token) return;

    console.log('Syncing offline queue...', queue);

    // Process queue sequentially
    for (const item of queue) {
      try {
        if (item.type === 'ADD_COMMENT') {
          const formData = new FormData();
          formData.append('content', item.payload.content);
          formData.append('user_id', item.payload.user_id);
          if (item.payload.mentioned_user_ids) {
            formData.append('mentioned_user_ids', item.payload.mentioned_user_ids);
          }
          if (item.payload.mentioned_contact_ids) {
            formData.append('mentioned_contact_ids', item.payload.mentioned_contact_ids);
          }
          // Note: Files are not currently supported in offline mode

          const response = await fetch(`${process.env.REACT_APP_API_URL}/comments/${item.payload.addressId}/address/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Failed to sync comment: ${response.statusText}`);
          }

          console.log('Successfully synced comment:', item.id);
          removeFromQueue(item.id);

          // Trigger a refresh event so UI can update
          window.dispatchEvent(new Event('civiccode:comment-synced'));
        }
      } catch (error) {
        console.error('Error syncing item:', item, error);
        // Optionally keep in queue or move to a "failed" list
        // For now, we keep it in queue to retry later, unless it's a 4xx error which might be permanent
      }
    }
  }, [queue, isOnline, token, removeFromQueue]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncQueue();
    }
  }, [isOnline, syncQueue]);

  return (
    <OfflineContext.Provider value={{ isOnline, queue, queueAction }}>
      {children}
    </OfflineContext.Provider>
  );
};
