import { useEffect, useRef, useState } from 'react';

// useVisibilityAwareInterval
// Runs a callback on an interval, but pauses when the page/tab is not visible.
// - callback: function to run on interval
// - delay: interval in ms, or null to stop
// - options: { immediate: boolean } run callback immediately when started or when visibility resumes
export default function useVisibilityAwareInterval(callback, delay, options = {}) {
  const savedCb = useRef();
  const intervalId = useRef(null);
  const [isRunning, setIsRunning] = useState(Boolean(delay));

  useEffect(() => {
    savedCb.current = callback;
  }, [callback]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let visible = document.visibilityState !== 'hidden';

    function clearIntervalIfSet() {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    }

    function startInterval() {
      clearIntervalIfSet();
      if (delay == null) return;
      intervalId.current = setInterval(() => {
        if (savedCb.current) savedCb.current();
      }, delay);
      setIsRunning(true);
    }

    function handleVisibilityChange() {
      visible = document.visibilityState !== 'hidden';
      if (visible) {
        // optionally run immediately on resume
        if (options && options.immediate && savedCb.current) savedCb.current();
        startInterval();
      } else {
        clearIntervalIfSet();
        setIsRunning(false);
      }
    }

    function handleWindowFocus() {
      // fallback for browsers not supporting Page Visibility API
      if (options && options.immediate && savedCb.current) savedCb.current();
      startInterval();
    }

    function handleWindowBlur() {
      clearIntervalIfSet();
      setIsRunning(false);
    }

    // start initially if visible
    if (visible) {
      if (options && options.immediate && savedCb.current) savedCb.current();
      startInterval();
    } else {
      setIsRunning(false);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange, false);
    window.addEventListener('focus', handleWindowFocus, false);
    window.addEventListener('blur', handleWindowBlur, false);

    return () => {
      clearIntervalIfSet();
      document.removeEventListener('visibilitychange', handleVisibilityChange, false);
      window.removeEventListener('focus', handleWindowFocus, false);
      window.removeEventListener('blur', handleWindowBlur, false);
    };
  }, [delay, options]);

  return isRunning;
}
