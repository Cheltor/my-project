import React from 'react';
import { useAuth } from '../AuthContext';

const Logout = () => {
  const { logout } = useAuth(); // Get logout function from context

  return (
    <button onClick={logout} className="logout-button">
      Logout
    </button>
  );
};

export default Logout;
