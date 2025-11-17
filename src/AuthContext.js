import React, { createContext, useState, useContext, useEffect } from 'react';
import API from './Services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Store user data or null if not authenticated
  const [token, setToken] = useState(null); // Store token for API requests

  const login = (token) => {
    setToken(token);
    localStorage.setItem('token', token);

    // Fetch user data using the token
    API.get('/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        setUser(response.data); // Store the fetched user data
      })
      .catch((error) => {
        console.error('Error fetching user data:', error);
      });
  };
  

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token'); // Clear token from storage
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setToken(token);
  
      API.get('/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          console.log('Fetched user data:', response.data);  // Ensure full user data is returned
          setUser(response.data);  // Store full user object in state
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
          logout();
        });
    }
  }, []);
  

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
