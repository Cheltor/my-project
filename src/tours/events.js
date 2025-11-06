export const TOUR_ADVANCE_EVENT = 'app:tour:advance';

export const dispatchTourAdvance = (stepId) => {
  if (!stepId || typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(TOUR_ADVANCE_EVENT, {
      detail: { stepId },
    }),
  );
};
