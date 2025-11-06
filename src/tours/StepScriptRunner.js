import { useEffect, useRef } from 'react';
import { useTour } from '@reactour/tour';
import { useLocation, useNavigate } from 'react-router-dom';

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForElement = async (selector, options = {}, isCancelled) => {
  if (typeof document === 'undefined') return null;

  const { timeout = 5000, interval = 100 } = options;
  const start = Date.now();

  while (Date.now() - start <= timeout) {
    if (isCancelled?.()) {
      return null;
    }

    const element = document.querySelector(selector);
    if (element) {
      return element;
    }

    await wait(interval);
  }

  return null;
};

const typeIntoInput = async (selector, value, options = {}, isCancelled) => {
  const input = await waitForElement(selector, options, isCancelled);
  if (!input || isCancelled?.()) {
    return false;
  }

  input.focus();

  const proto = Object.getPrototypeOf(input);
  const descriptor = proto ? Object.getOwnPropertyDescriptor(proto, 'value') : null;
  if (descriptor && typeof descriptor.set === 'function') {
    descriptor.set.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
};

const StepScriptRunner = () => {
  const { steps, currentStep, isOpen } = useTour();
  const navigate = useNavigate();
  const location = useLocation();

  const executedStepsRef = useRef(new Map());
  const lastStepRef = useRef(-1);
  const stepsIdentityRef = useRef(steps);

  useEffect(() => {
    if (stepsIdentityRef.current !== steps) {
      executedStepsRef.current.clear();
      lastStepRef.current = -1;
      stepsIdentityRef.current = steps;
    }
  }, [steps]);

  useEffect(() => {
    if (!isOpen) {
      executedStepsRef.current.clear();
      lastStepRef.current = -1;
      return;
    }

    if (!Array.isArray(steps) || typeof currentStep !== 'number' || currentStep < 0) {
      return;
    }

    if (lastStepRef.current > currentStep) {
      for (const key of Array.from(executedStepsRef.current.keys())) {
        if (key >= currentStep) {
          executedStepsRef.current.delete(key);
        }
      }
    }

    lastStepRef.current = currentStep;

    const step = steps[currentStep];
    if (!step) {
      return;
    }

    const script = step.meta?.script;
    if (typeof script !== 'function') {
      executedStepsRef.current.set(currentStep, true);
      return;
    }

    if (executedStepsRef.current.has(currentStep)) {
      return;
    }

    executedStepsRef.current.set(currentStep, true);

    let cancelled = false;

    const context = {
      navigate,
      location,
      wait,
      waitForElement: (selector, options) => waitForElement(selector, options, () => cancelled),
      typeIntoInput: (selector, value, options) => typeIntoInput(selector, value, options, () => cancelled),
      queryAll: (selector) => {
        if (typeof document === 'undefined') return [];
        return Array.from(document.querySelectorAll(selector));
      },
    };

    (async () => {
      try {
        await script(context);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('[tour] Step script failed', error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [steps, currentStep, isOpen, navigate, location]);

  return null;
};

export default StepScriptRunner;
