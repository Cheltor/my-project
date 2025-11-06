import { useCallback, useEffect, useRef } from 'react';
import { useTour } from '@reactour/tour';
import { TOUR_ADVANCE_EVENT } from './events';

const TourAutoAdvanceListener = () => {
  const { steps, currentStep, setCurrentStep, setIsOpen, isOpen } = useTour();
  const stepsRef = useRef(steps || []);
  const currentStepRef = useRef(currentStep || 0);
  const isOpenRef = useRef(isOpen);
  const completedEventsRef = useRef(new Set());

  useEffect(() => {
    stepsRef.current = Array.isArray(steps) ? steps : [];
  }, [steps]);

  useEffect(() => {
    currentStepRef.current = typeof currentStep === 'number' ? currentStep : 0;
  }, [currentStep]);

  useEffect(() => {
    isOpenRef.current = Boolean(isOpen);
  }, [isOpen]);

  const advanceIfComplete = useCallback(() => {
    const activeSteps = stepsRef.current;
    const activeIndex = currentStepRef.current;
    if (!Array.isArray(activeSteps) || activeIndex < 0 || activeIndex >= activeSteps.length) {
      return;
    }

    const advanceKey = activeSteps[activeIndex]?.meta?.advanceOn;
    if (!advanceKey || !completedEventsRef.current.has(advanceKey)) {
      return;
    }

    const nextIndex = activeIndex + 1;
    if (nextIndex < activeSteps.length) {
      setCurrentStep(nextIndex);
    } else if (isOpenRef.current) {
      setIsOpen(false);
    }
  }, [setCurrentStep, setIsOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleAdvance = (event) => {
      const stepId = event?.detail?.stepId;
      if (!stepId) return;
      completedEventsRef.current.add(stepId);
      advanceIfComplete();
    };

    window.addEventListener(TOUR_ADVANCE_EVENT, handleAdvance);
    return () => {
      window.removeEventListener(TOUR_ADVANCE_EVENT, handleAdvance);
    };
  }, [advanceIfComplete]);

  useEffect(() => {
    advanceIfComplete();
  }, [advanceIfComplete, currentStep]);

  return null;
};

export default TourAutoAdvanceListener;
