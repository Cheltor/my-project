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
import LicenseDetail from './Components/LicenseDetail';
import Permits from './Components/Permits';
import PermitDetail from './Components/PermitDetail';
import Complaints from './Components/Complaints';
import ComplaintDetail from './Components/ComplaintDetail';
import Citations from './Components/Citations';
import CitationDetailsPage from './Components/CitationDetailsPage';
import ViolationDetail from './Components/ViolationDetail';
import Login from './Components/Login'; // Import the Login component
import InspectionDetail from './Components/InspectionDetail'; // Import the InspectionDetail component
import Conduct from './Components/Inspection/Conduct'; // Import the Conduct component
import UnitDetail from './Components/Inspection/UnitDetail'; // Import the UnitDetail component
import NewUnit from './Components/Inspection/NewUnit';
import AreaDetail from './Components/Inspection/AreaDetail';
import UnitAreaDetail from './Components/Inspection/UnitAreaDetail';
import Rooms from './Components/Inspection/Rooms';
import RoomDetail from './Components/Inspection/RoomDetail';
import Users from './Components/Users';
import UserDetail from './Components/UserDetails';
import AddressUnitDetail from './Components/Unit/AddressUnitDetail'; // Import the AddressUnitDetail component
import Helpful from './Components/Helpful'; // Import the HelpfulLinks component
import NewAddressPage from './Components/Address/NewAddressPage';
import VacancyStatusList from './Components/VacancyStatusList';
import Review from './Components/Inspection/Review';
import AdminDashboard from './Components/AdminDashboard';
import AdminCommentEditor from './Components/AdminCommentEditor';

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
            <Route path="/license/:id" element={<LicenseDetail />} />
            <Route path="/permits" element={<Permits />} />
            <Route path="/permit/:id" element={<PermitDetail />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/complaint/:id" element={<ComplaintDetail />} />
            <Route path="/citations" element={<Citations />} />
            <Route path="/citation/:id" element={<CitationDetailsPage />} />
            <Route path="/violation/:id" element={<ViolationDetail />} />
            <Route path="/inspection/:id" element={<InspectionDetail />} />
            <Route path="/inspections/:id/conduct" element={<Conduct />} />
            <Route path="/inspections/:id/review" element={<Review />} />
            <Route path="/inspections/:id/unit/:unitId" element={<UnitDetail />} />
            <Route path="/inspections/:id/new-unit" element={<NewUnit />} />
            <Route path="/inspections/:id/area/:areaId" element={<AreaDetail />} />
            <Route path="/inspections/:id/unit/:unitId/area/:areaId" element={<UnitAreaDetail />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/rooms/:id" element={<RoomDetail />} />
            <Route path="/users" element={<Users />} />
            <Route path="/users/:id" element={<UserDetail />} />
            <Route path="/address/:addressId/unit/:unitId" element={<AddressUnitDetail />} />
            <Route path="/helpful" element={<Helpful />} />
            <Route path="/new-address" element={<NewAddressPage />} />
            <Route path="/vacancy-statuses" element={<VacancyStatusList />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/comments/:commentId/edit" element={<AdminCommentEditor />} />
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
