// src/Layouts/MainLayout.js
import React from 'react';
import Sidebar from './Sidebar'; // Adjust path based on your project structure

const MainLayout = ({ children }) => {
  return (
    <div className="main-layout">
      <Sidebar />
      <div className="content">
        {children}
      </div>
    </div>
  );
};

export default MainLayout;
