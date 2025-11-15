import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './AuthContext';
import API from './Services/api';
import MockAdapter from 'axios-mock-adapter';

// Mock the API service
const mock = new MockAdapter(API);

describe('Login Flow', () => {
  afterEach(() => {
    mock.reset();
  });

  test('should fetch and store the full user object after login', async () => {
    // Arrange
    const email = 'test@example.com';
    const password = 'password';
    const token = 'fake-token';
    const user = { id: 1, email, name: 'Test User' };

    // Mock the login API call
    mock.onPost('/login').reply(200, { access_token: token });

    // Mock the user data fetch API call
    mock.onGet('/user').reply(200, user);

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Act
    fireEvent.click(screen.getByRole('link', { name: /staff login/i }));
    fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: email } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Assert
    await waitFor(() => {
      // Check if the home page content is displayed after login
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
  });
});
