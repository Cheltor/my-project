import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Store user data or null if not authenticated
  const [token, setToken] = useState(null); // Store token for API requests

  const login = (userData, token) => {
    console.group('Setting user and token:', userData, token);
    setUser(userData);
    setToken(token);
    localStorage.setItem('token', token); // Store token in local storage for persistence
    console.log('Token saved to localStorage:', localStorage.getItem('token'));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token'); // Clear token from storage
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Fetch user data from the API using the token
      // Update the user state with the user data
      setToken(token);

      // API.get('/user')
      fetch('http://127.0.0.1:8000/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch user data');
          }
          return response.json();
        })
        .then((userData) => {
          setUser(userData); // Set the user data
        })
        .catch((error) => {
          console.error(error);
          logout(); // Log out the user if an error occurs
        });
    }
  }, []); // Run only on component mount

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
