import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';

const noop = () => {};

const resolveStepContent = ({ step, steps, current, close, goTo, inDOM }) => {
  if (!step) return null;
  if (typeof step.content === 'function') {
    return step.content({ step, steps, current, close, goTo, inDOM });
  }
  return step.content || null;
};

const Tour = ({
  steps = [],
  isOpen = false,
  startAt = 0,
  onRequestClose = noop,
  accentColor = '#4f46e5',
  rounded = 12,
  className = '',
  maskClassName = '',
  disableCloseOnClickOutside = false,
  disableKeyboardNavigation = false,
}) => {
  const [current, setCurrent] = useState(startAt);
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const clampedStart = Math.max(0, Math.min(startAt, steps.length - 1));
    setCurrent(clampedStart);
  }, [isOpen, startAt, steps.length]);

  const step = steps.length > 0 ? steps[Math.max(0, Math.min(current, steps.length - 1))] : null;

  useEffect(() => {
    if (!isOpen) {
      setRect(null);
      return;
    }

    let cancelled = false;
    const target = step?.selector ? document.querySelector(step.selector) : null;

    if (!target) {
      setRect(null);
      return;
    }

    const computeRect = () => {
      if (!cancelled) {
        const bounds = target.getBoundingClientRect();
        setRect({
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
        });
      }
    };

    computeRect();

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(computeRect);
      observer.observe(target);
    }

    window.addEventListener('resize', computeRect);
    window.addEventListener('scroll', computeRect, true);

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      window.removeEventListener('resize', computeRect);
      window.removeEventListener('scroll', computeRect, true);
    };
  }, [isOpen, step?.selector]);

  useEffect(() => {
    if (!isOpen || disableKeyboardNavigation) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onRequestClose();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setCurrent((prev) => Math.min(prev + 1, steps.length - 1));
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setCurrent((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, steps.length, disableKeyboardNavigation, onRequestClose]);

  const goTo = useMemo(
    () => (index) => {
      if (typeof index !== 'number') return;
      setCurrent((prev) => {
        if (Number.isNaN(index)) return prev;
        const clamped = Math.max(0, Math.min(index, steps.length - 1));
        return clamped;
      });
    },
    [steps.length]
  );

  if (!isOpen || steps.length === 0) {
    return null;
  }

  const close = () => onRequestClose();
  const content = resolveStepContent({ step, steps, current, close, goTo, inDOM: Boolean(rect) });
  const total = steps.length;
  const isFirst = current === 0;
  const isLast = current === total - 1;

  const overlay = (
    <div className={`reactour-portal fixed inset-0 z-[2147483647] ${className}`}> 
      <div
        className={`absolute inset-0 bg-slate-900/60 ${maskClassName}`}
        aria-hidden="true"
        onClick={disableCloseOnClickOutside ? undefined : close}
      />
      {rect ? (
        <div
          className="pointer-events-none border-2 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] transition-all duration-150 ease-out"
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: rounded,
            borderColor: accentColor,
          }}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
          <div className="rounded-full border-4 border-dashed border-white/70 p-16 opacity-80" />
        </div>
      )}
      <div className="reactour-content fixed bottom-12 left-1/2 z-[2147483648] w-full max-w-xl -translate-x-1/2 px-4">
        <div
          className="rounded-xl bg-white p-6 shadow-2xl ring-1 ring-black/10"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm font-medium text-slate-500">
              Step {current + 1} of {total}
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-full bg-transparent p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close tour"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="mt-3 text-base text-slate-700 leading-relaxed">
            {content}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-1" aria-hidden="true">
              {steps.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    index === current ? 'bg-indigo-600' : 'bg-indigo-200 hover:bg-indigo-300'
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrent((prev) => Math.max(prev - 1, 0))}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  isFirst ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
                disabled={isFirst}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isLast) {
                    close();
                  } else {
                    setCurrent((prev) => Math.min(prev + 1, total - 1));
                  }
                }}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {isLast ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(overlay, document.body);
};

export default Tour;

