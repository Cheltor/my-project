// src/App.js
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Sidebar from './Layouts/Sidebar';  // Adjust path based on your project structure
import Home from './Components/Home';
import About from './Components/About';  // Example component
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
import CodeDetail from './Components/CodeDetail';
import Licenses from './Components/Licenses';
import Complaints from './Components/Complaints';
import Citations from './Components/Citations';
import ViolationDetail from './Components/ViolationDetail';
import Login from './Components/Login'; // Import the Login component

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

function MainApp() {
  const { user } = useAuth(); // Get user data from context

  useEffect(() => {
    // Make an initial request to get the CSRF token set in cookies
    /*
    API.get('/')
      .then(response => {
        console.log('CSRF token set:', document.cookie);
      })
      .catch(error => {
        console.error('Error setting CSRF token:', error);
      });
    */
  }, []);

  return (
    <Router>
      {user ? (
        // If the user is logged in, show the Sidebar and main content
        <Sidebar>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/due-list" element={<DueList />} />
            <Route path="/sir" element={<Sir />} />
            <Route path="/address/:id" element={<AddressDetail />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/contacts/:id" element={<ContactDetail />} />
            <Route path="/violations" element={<Violations />} />
            <Route path="/inspections" element={<Inspections />} />
            <Route path="/businesses" element={<Businesses />} />
            <Route path="/business/:id" element={<BusinessDetail />} />
            <Route path="/codes" element={<Codes />} />
            <Route path="/code/:id" element={<CodeDetail />} />
            <Route path="/licenses" element={<Licenses />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/citations" element={<Citations />} />
            <Route path="/violation/:id" element={<ViolationDetail />} />
            {/* Add more routes as needed */}
          </Routes>
        </Sidebar>
      ) : (
        // If the user is not logged in, show the Login page
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Login />} /> {/* Redirect any other route to login if not authenticated */}
        </Routes>
      )}
    </Router>
  );
}

export default App;
