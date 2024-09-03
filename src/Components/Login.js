// src/components/Login.js
import React, { useState } from 'react';
import API from '../Services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await API.post('/users/sign_in', {
        user: { email, password }
      });
      console.log('Login successful:', response.data);
      // Handle successful login, e.g., set user in state
    } catch (error) {
      console.error('Login error:', error.response.data);
      // Handle login error, e.g., show error message
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;
