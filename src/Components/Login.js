import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import API from '../Services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // State to store error messages
  const { login } = useAuth(); // Get login function from context

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage(''); // Clear any previous error messages

    try {
      const formData = new FormData();
      formData.append('username', email); // Use 'username' because OAuth2PasswordRequestForm expects it
      formData.append('password', password);

      const response = await API.post('/login', formData);

      // const { user, token } = response.data; // Adjust based on your API response structure
      const { access_token: token } = response.data; // Extract the token from the response
      console.log('Extracted token:', token);

      // Fetch user data using the token
      const user = { email }; // Example user data
      
      login(user, token); // Update context with user data and token

      console.log('Login successful:', user);
    } catch (error) {
      if (error.response?.status === 401) {
        // Show an error message if the credentials are incorrect
        setErrorMessage('Incorrect email or password. Please try again.');
      } else {
        // Handle other types of errors, if any
        setErrorMessage('An error occurred. Please try again later.');
      }
      console.error('Login error:', error.response?.data || error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {errorMessage && (
        <p className="text-red-500">{errorMessage}</p> // Display the error message in red
      )}
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;
