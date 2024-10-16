import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Store user data or null if not authenticated
  const [token, setToken] = useState(null); // Store token for API requests

  const login = (userData, token) => {
    console.log('Setting user and token:', userData, token);
    setToken(token);
    localStorage.setItem('token', token);
  
    // Fetch user data after login
    fetch('${process.env.REACT_APP_API_URL}/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(response => response.json())
      .then(fetchedUserData => {
        console.log('User data fetched after login:', fetchedUserData); // Ensure full user data
        setUser(fetchedUserData);  // Store full user object in state
      })
      .catch(error => {
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
  
      fetch('${process.env.REACT_APP_API_URL}/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json())
        .then((userData) => {
          console.log('Fetched user data:', userData);  // Ensure full user data is returned
          setUser(userData);  // Store full user object in state
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
