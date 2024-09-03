import React from 'react';
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


function App() {
  return (
    <Router>
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
          {/* Add more routes as needed */}
        </Routes>
      </Sidebar>
    </Router>
  );
}

export default App;
