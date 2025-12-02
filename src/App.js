// src/App.js
/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useEffect } from 'react';
// useVisibilityAwareInterval and apiFetch are now used in SettingsContext
import { AuthProvider, useAuth } from './AuthContext';
import { SettingsProvider, useSettings } from './SettingsContext';
import { OfflineProvider } from './OfflineContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react'; // added import
import OfflineIndicator from './Components/OfflineIndicator';
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
import TownCode from './Components/TownCode';
import Codes from './Components/Codes';
import CodeDetail from './Components/CodeDetail';
import CodeEdit from './Components/CodeEdit';
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
import AdminCodeSync from './Components/AdminCodeSync';
import AdminCommentEditor from './Components/AdminCommentEditor';
import AdminContactCommentEditor from './Components/AdminContactCommentEditor';
import ChatWidget from './Components/ChatWidget';
import AdminImageAnalysis from './Components/AdminImageAnalysis';
import ScheduleCalendar from './Components/ScheduleCalendar';
import MapPage from './Components/MapPage';
import AdminChat from './Components/AdminChat';
import NotificationsPage from './Components/NotificationsPage';
import ResidentConcern from './Components/ResidentConcern';
import ForgotPassword from './Components/ForgotPassword';
import ResetPassword from './Components/ResetPassword';
import LandingPage from './Components/LandingPage';
import StaffWorkloadDashboard from './Components/StaffWorkloadDashboard';
import TemplateLibrary from './Components/TemplateLibrary';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <OfflineProvider>
          <MainApp />
        </OfflineProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

function MainApp() {
  const { user } = useAuth(); // Get user data and logout from context
  const [showUpdateNotice, setShowUpdateNotice] = React.useState(false);
  const updateNoticeTimeoutRef = React.useRef(null);
  // Settings are now managed by SettingsProvider, but we still need to handle SW updates
  // and render the app structure.
  // We will wrap MainApp in SettingsProvider in the App component.

  useEffect(() => {
    const handleSwUpdated = () => {
      setShowUpdateNotice(true);
      if (updateNoticeTimeoutRef.current) {
        clearTimeout(updateNoticeTimeoutRef.current);
      }
      updateNoticeTimeoutRef.current = setTimeout(() => {
        setShowUpdateNotice(false);
        updateNoticeTimeoutRef.current = null;
      }, 5000);
    };

    window.addEventListener('civiccode:sw-updated', handleSwUpdated);

    return () => {
      window.removeEventListener('civiccode:sw-updated', handleSwUpdated);
      if (updateNoticeTimeoutRef.current) {
        clearTimeout(updateNoticeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <OfflineIndicator />
      {showUpdateNotice && (
        <div className="sw-update-notice" role="status" aria-live="assertive">
          Refreshing to apply updates...
        </div>
      )}
      <Router>
        <AppRoutes />
      </Router>
    </>
  );
}

// Separated routes to use useSettings hook
function AppRoutes() {
  const { user } = useAuth();
  const { chatEnabled, imageAnalysisEnabled, setChatEnabled, setImageAnalysisEnabled } = useSettings();

  return (
    <>
      {user ? (
        <>
          {chatEnabled && <ChatWidget />}
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
              <Route path="/calendar" element={<ScheduleCalendar />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/codes" element={<TownCode />} />
              <Route path="/code/:id" element={<CodeDetail />} />
              <Route path="/code/:id/edit" element={<CodeEdit />} />
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
              <Route
                path="/inspections/:id/unit/:unitId/area/:areaId"
                element={<UnitAreaDetail />}
              />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/rooms/:id" element={<RoomDetail />} />
              <Route path="/users" element={<Users />} />
              <Route path="/users/:id" element={<UserDetail />} />
              <Route path="/address/:addressId/unit/:unitId" element={<AddressUnitDetail />} />
              <Route path="/helpful" element={<Helpful />} />
              <Route path="/new-address" element={<NewAddressPage />} />
              <Route path="/vacancy-statuses" element={<VacancyStatusList />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/code-sync" element={<AdminCodeSync />} />
              <Route path="/admin/workload" element={<StaffWorkloadDashboard />} />
              <Route path="/templates" element={<TemplateLibrary />} />
              <Route path="/admin/comments/:commentId/edit" element={<AdminCommentEditor />} />
              <Route
                path="/admin/contact-comments/:commentId/edit"
                element={<AdminContactCommentEditor />}
              />
              <Route
                path="/admin-chat"
                element={
                  <AdminChat
                    user={user}
                    chatEnabled={chatEnabled}
                    setChatEnabled={setChatEnabled}
                  />
                }
              />
              <Route
                path="/admin-image-analysis"
                element={
                  <AdminImageAnalysis
                    user={user}
                    enabled={imageAnalysisEnabled}
                    setEnabled={setImageAnalysisEnabled}
                  />
                }
              />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/resident-concern" element={<ResidentConcern />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* Add more routes as needed */}
            </Routes>
          </Sidebar>
        </>
      ) : (
        <main id="main-content" role="main" className="min-h-screen focus:outline-none">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/resident-concern" element={<ResidentConcern />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<LandingPage />} />
            {/* Redirect any other route to landing if not authenticated */}
          </Routes>
        </main>
      )}
      <Analytics /> {/* render here so it's always mounted while Router is active */}
    </>
  );
}

export default App;
