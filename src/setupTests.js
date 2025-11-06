// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

jest.mock(
  '@vercel/analytics/react',
  () => ({
    Analytics: () => null,
  }),
  { virtual: true }
);

jest.mock(
  '@reactour/tour',
  () => {
    const React = require('react');
    return {
      TourProvider: ({ children }) => React.createElement(React.Fragment, null, children),
      useTour: () => ({
        setIsOpen: jest.fn(),
        setCurrentStep: jest.fn(),
        setSteps: jest.fn(),
      }),
    };
  },
  { virtual: true }
);

jest.mock('axios', () => {
  const interceptors = {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  };
  const instance = { interceptors };
  const mockCreate = jest.fn(() => instance);
  const axios = { create: mockCreate, interceptors };
  axios.default = axios;
  return axios;
});
