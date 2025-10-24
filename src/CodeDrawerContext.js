import React, { createContext, useCallback, useContext, useState } from 'react';

const CodeDrawerContext = createContext(null);

export function CodeDrawerProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCodeId, setActiveCodeId] = useState(null);
  const [code, setCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    setActiveCodeId(null);
    setCode(null);
    setError(null);
  }, []);

  const fetchCode = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/codes/${id}`);
      if (!resp.ok) {
        throw new Error('Failed to load code details');
      }
      const data = await resp.json();
      setCode(data);
    } catch (err) {
      setError(err.message || 'Failed to load code details');
      setCode(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const openDrawer = useCallback((id) => {
    if (!id) return;
    setActiveCodeId(id);
    setIsOpen(true);
    setCode(null);
    setError(null);
    fetchCode(id);
  }, [fetchCode]);

  const value = {
    isOpen,
    activeCodeId,
    code,
    loading,
    error,
    openDrawer,
    closeDrawer,
  };

  return (
    <CodeDrawerContext.Provider value={value}>
      {children}
    </CodeDrawerContext.Provider>
  );
}

export function useCodeDrawer() {
  const context = useContext(CodeDrawerContext);
  if (!context) {
    throw new Error('useCodeDrawer must be used within a CodeDrawerProvider');
  }
  return context;
}
