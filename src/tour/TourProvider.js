import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import './tour.css';

const TourContext = React.createContext(null);

const DEFAULT_PADDING = 12;

function useTargetRect(selector, isOpen, padding = DEFAULT_PADDING) {
  const [rect, setRect] = useState(null);
  const latestSelector = useRef(selector);

  useLayoutEffect(() => {
    latestSelector.current = selector;
  }, [selector]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setRect(null);
      return () => {};
    }

    const resolveRect = () => {
      const currentSelector = latestSelector.current;
      if (!currentSelector) {
        setRect(null);
        return;
      }
      const element = typeof currentSelector === 'string'
        ? document.querySelector(currentSelector)
        : currentSelector instanceof HTMLElement
          ? currentSelector
          : currentSelector?.();

      if (!element || !(element instanceof Element)) {
        setRect(null);
        return;
      }

      const box = element.getBoundingClientRect();
      setRect({
        left: box.left - padding,
        top: box.top - padding,
        width: box.width + padding * 2,
        height: box.height + padding * 2,
      });
    };

    resolveRect();
    const handle = window.setInterval(resolveRect, 100);
    window.addEventListener('resize', resolveRect);
    window.addEventListener('scroll', resolveRect, true);

    return () => {
      window.clearInterval(handle);
      window.removeEventListener('resize', resolveRect);
      window.removeEventListener('scroll', resolveRect, true);
    };
  }, [isOpen, padding]);

  return rect;
}

function computeTooltipPosition(rect, placement = 'bottom', offset = 16) {
  if (!rect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  switch (placement) {
    case 'top':
      return {
        left: centerX,
        top: rect.top - offset,
        transform: 'translate(-50%, -100%)',
      };
    case 'left':
      return {
        left: rect.left - offset,
        top: centerY,
        transform: 'translate(-100%, -50%)',
      };
    case 'right':
      return {
        left: rect.left + rect.width + offset,
        top: centerY,
        transform: 'translate(0, -50%)',
      };
    case 'center':
      return {
        left: centerX,
        top: centerY,
        transform: 'translate(-50%, -50%)',
      };
    case 'bottom':
    default:
      return {
        left: centerX,
        top: rect.top + rect.height + offset,
        transform: 'translate(-50%, 0)',
      };
  }
}

const TourOverlay = ({
  steps,
  currentStep,
  isOpen,
  onClose,
  onPrev,
  onNext,
}) => {
  const step = steps[currentStep];
  const rect = useTargetRect(step?.selector, isOpen, step?.padding ?? DEFAULT_PADDING);

  useEffect(() => {
    if (!isOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !step) return null;

  return ReactDOM.createPortal(
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Application walkthrough">
      <div className="tour-backdrop" onClick={onClose} />
      {rect && (
        <div
          className="tour-highlight"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}
      <div className="tour-tooltip" style={computeTooltipPosition(rect, step.placement, step.offset)}>
        {step.title && <h3 className="tour-title">{step.title}</h3>}
        {typeof step.content === 'function' ? step.content() : step.content}
        <div className="tour-footer">
          <button type="button" className="tour-skip" onClick={onClose}>
            Skip tour
          </button>
          <div className="tour-actions">
            <button type="button" className="tour-nav" onClick={onPrev} disabled={currentStep === 0}>
              Back
            </button>
            <button
              type="button"
              className="tour-nav tour-nav-primary"
              onClick={onNext}
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export const TourProvider = ({ steps, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [meta, setMetaState] = useState({});

  const setMeta = useCallback((next) => {
    setMetaState((prev) => {
      if (typeof next === 'function') {
        return next(prev);
      }
      return { ...prev, ...next };
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setCurrentStep(0);
  }, []);

  const value = useMemo(() => ({
    steps,
    isOpen,
    setIsOpen,
    currentStep,
    setCurrentStep,
    goTo: setCurrentStep,
    next: () => setCurrentStep((step) => Math.min(step + 1, steps.length - 1)),
    prev: () => setCurrentStep((step) => Math.max(step - 1, 0)),
    meta,
    setMeta,
  }), [isOpen, steps, meta, setMeta]);

  return (
    <TourContext.Provider value={value}>
      {children}
      <TourOverlay
        steps={steps}
        currentStep={currentStep}
        isOpen={isOpen}
        onClose={close}
        onPrev={() => setCurrentStep((step) => Math.max(step - 1, 0))}
        onNext={() => {
          if (currentStep === steps.length - 1) {
            close();
          } else {
            setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
          }
        }}
      />
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return ctx;
};

export default TourProvider;
