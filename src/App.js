// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import API from './Services/api';
import MainLayout from './Layouts/MainLayout';  // Import the MainLayout
import Home from './Components/Home';
import About from './Components/About';
import DueList from './Components/DueList';
import Sir from './Components/Sir';
import AddressDetail from './Components/AddressDetail';
import Contacts from './Components/Contacts';
import ContactDetail from './Components/ContactDetail';
import Violations from './Components/Violations';
import Inspections from './Components/Inspections';
import Businesses from './Components/Businesses';
import BusinessDetail from './Components/BusinessDetail';
import Codes from './Components/Codes';
import Login from './Components/Login'; // Import the Login component

function App() {
  useEffect(() => {
    // Make an initial request to get the CSRF token set in cookies
    API.get('/')
      .then(response => {
        console.log('CSRF token set:', document.cookie);
      })
      .catch(error => {
        console.error('Error setting CSRF token:', error);
      });
  }, []);

  return (
    <Router>
      <Routes>
        {/* Routes that require MainLayout */}
        <Route path="/" element={<MainLayout><Home /></MainLayout>} />
        <Route path="/about" element={<MainLayout><About /></MainLayout>} />
        <Route path="/due-list" element={<MainLayout><DueList /></MainLayout>} />
        <Route path="/sir" element={<MainLayout><Sir /></MainLayout>} />
        <Route path="/address/:id" element={<MainLayout><AddressDetail /></MainLayout>} />
        <Route path="/contacts" element={<MainLayout><Contacts /></MainLayout>} />
        <Route path="/contacts/:id" element={<MainLayout><ContactDetail /></MainLayout>} />
        <Route path="/violations" element={<MainLayout><Violations /></MainLayout>} />
        <Route path="/inspections" element={<MainLayout><Inspections /></MainLayout>} />
        <Route path="/businesses" element={<MainLayout><Businesses /></MainLayout>} />
        <Route path="/business/:id" element={<MainLayout><BusinessDetail /></MainLayout>} />
        <Route path="/codes" element={<MainLayout><Codes /></MainLayout>} />
        
        {/* Routes that do NOT require MainLayout */}
        <Route path="/login" element={<Login />} />
        {/* Add more routes as needed */}
      </Routes>
    </Router>
  );
}

export default App;
