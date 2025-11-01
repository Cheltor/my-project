import React, { useEffect, useRef, useState } from 'react';
import Welcome from './Dashboard/Welcome';
import WeeklyStats from './Dashboard/WeeklyStats';
import RecentComments from './Dashboard/RecentComments';
import PendingInspections from './Dashboard/PendingInspections';
import ActiveViolations from './Dashboard/ActiveViolations';
import AdminRecentActivity from './Dashboard/AdminRecentActivity';
import OasOverview from './Dashboard/OasOverview';
import NewComplaint from './Inspection/NewComplaint';
import NewViolationForm from './Inspection/NewViolationForm';
import NewMFLicense from './Inspection/NewMFLicense';
import NewSFLicense from './Inspection/NewSFLicense';
import NewBuildingPermit from './Inspection/NewBuildingPermit';
import NewBusinessLicense from './Inspection/NewBusinessLicense';
import { useAuth } from '../AuthContext';

export default function Example() {
  const { user } = useAuth();
  const [showNewComplaint, setShowNewComplaint] = useState(false); // State to toggle NewComplaint form
  const [showNewMFLicense, setShowNewMFLicense] = useState(false); // State to toggle NewMFLicense form
  const [showNewSFLicense, setShowNewSFLicense] = useState(false); // State to toggle NewSFLicense form
  const [showNewBuildingPermit, setShowNewBuildingPermit] = useState(false); // State to toggle NewBuildingPermit form
  const [showNewBusinessLicense, setShowNewBusinessLicense] = useState(false); // State to toggle NewBusinessLicense form
  const [showNewViolationForm, setShowNewViolationForm] = useState(false); // State to toggle NewViolationForm
  const [showAdminWidgets, setShowAdminWidgets] = useState(false); // Admin widgets toggle
  const [emailTestStatus, setEmailTestStatus] = useState(null);
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false); // Collapse the quick action buttons when not needed

  const [formToast, setFormToast] = useState({ show: false, message: '', variant: 'success' });
  const toastTimeoutRef = useRef(null);

  const showSubmissionToast = (message, variant = 'success') => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setFormToast({ show: true, message, variant });
    toastTimeoutRef.current = window.setTimeout(() => {
      setFormToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const closeAllForms = () => {
    setShowNewComplaint(false);
    setShowNewMFLicense(false);
    setShowNewSFLicense(false);
    setShowNewBuildingPermit(false);
    setShowNewBusinessLicense(false);
    setShowNewViolationForm(false);
  };

  const toggleNewComplaint = () => {
    setShowNewComplaint(!showNewComplaint);
    if (showNewMFLicense) setShowNewMFLicense(false);
    if (showNewSFLicense) setShowNewSFLicense(false);
    if (showNewBuildingPermit) setShowNewBuildingPermit(false);
    if (showNewBusinessLicense) setShowNewBusinessLicense(false);
    if (showNewViolationForm) setShowNewViolationForm(false);
  };

  const toggleNewMFLicense = () => {
    setShowNewMFLicense(!showNewMFLicense);
    if (showNewComplaint) setShowNewComplaint(false);
    if (showNewSFLicense) setShowNewSFLicense(false);
    if (showNewBuildingPermit) setShowNewBuildingPermit(false);
    if (showNewBusinessLicense) setShowNewBusinessLicense(false);
    if (showNewViolationForm) setShowNewViolationForm(false);
  };

  const toggleNewSFLicense = () => {
    setShowNewSFLicense(!showNewSFLicense);
    if (showNewComplaint) setShowNewComplaint(false);
    if (showNewMFLicense) setShowNewMFLicense(false);
    if (showNewBuildingPermit) setShowNewBuildingPermit(false);
    if (showNewBusinessLicense) setShowNewBusinessLicense(false);
    if (showNewViolationForm) setShowNewViolationForm(false);
  };

  const toggleNewBuildingPermit = () => {
    setShowNewBuildingPermit(!showNewBuildingPermit);
    if (showNewComplaint) setShowNewComplaint(false);
    if (showNewMFLicense) setShowNewMFLicense(false);
    if (showNewSFLicense) setShowNewSFLicense(false);
    if (showNewBusinessLicense) setShowNewBusinessLicense(false);
    if (showNewViolationForm) setShowNewViolationForm(false);
  };

  const toggleNewBusinessLicense = () => {
    setShowNewBusinessLicense(!showNewBusinessLicense);
    if (showNewComplaint) setShowNewComplaint(false);
    if (showNewMFLicense) setShowNewMFLicense(false);
    if (showNewSFLicense) setShowNewSFLicense(false);
    if (showNewBuildingPermit) setShowNewBuildingPermit(false);
    if (showNewViolationForm) setShowNewViolationForm(false);
  };

  const toggleNewViolationForm = () => {
    setShowNewViolationForm(!showNewViolationForm);
    if (showNewComplaint) setShowNewComplaint(false);
    if (showNewMFLicense) setShowNewMFLicense(false);
    if (showNewSFLicense) setShowNewSFLicense(false);
    if (showNewBuildingPermit) setShowNewBuildingPermit(false);
    if (showNewBusinessLicense) setShowNewBusinessLicense(false);
  };

  const toggleAdminWidgets = () => {
    setShowAdminWidgets((prev) => !prev);
  };

  const toggleQuickActions = () => {
    setShowQuickActions((prev) => {
      if (prev) {
        closeAllForms();
      }
      return !prev;
    });
  };

  const handleQuickActionCreated = (message) => {
    closeAllForms();
    setShowQuickActions(false);
    showSubmissionToast(message, 'success');
  };

  const sendTestEmail = async () => {
    setEmailTestLoading(true);
    setEmailTestStatus(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/notifications/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
        },
        body: JSON.stringify({
          subject: 'Admin test notification email',
          body: 'This is a test email triggered from the Admin dashboard.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Failed to send test email');
      setEmailTestStatus(`Sent (email_sent=${data.email_sent ? 'true' : 'false'}, id=${data.notification_id})`);
    } catch (e) {
      setEmailTestStatus(`Error: ${e.message}`);
    } finally {
      setEmailTestLoading(false);
    }
  };

  const buttons = [
    {
      label: showNewViolationForm ? "Hide Violation Form" : "New Violation Form",
      state: showNewViolationForm,
      toggle: toggleNewViolationForm,
      color: "bg-red-500",
    },
    {
      label: showNewComplaint ? "Hide Complaint Form" : "New Complaint Form",
      state: showNewComplaint,
      toggle: toggleNewComplaint,
      color: "bg-indigo-500",
    },
    {
      label: showNewMFLicense ? "Hide Multifamily License Form" : "New Multi Family License Application Form",
      state: showNewMFLicense,
      toggle: toggleNewMFLicense,
      color: "bg-green-500",
    },
    {
      label: showNewSFLicense ? "Hide Single Family License Form" : "New Single Family License Application Form",
      state: showNewSFLicense,
      toggle: toggleNewSFLicense,
      color: "bg-teal-500",
    },
    {
      label: showNewBuildingPermit ? "Hide Building Permit Form" : "New Building Permit Application Form",
      state: showNewBuildingPermit,
      toggle: toggleNewBuildingPermit,
      color: "bg-violet-500",
    },
    {
      label: showNewBusinessLicense ? "Hide Business License Form" : "New Business License Application Form",
      state: showNewBusinessLicense,
      toggle: toggleNewBusinessLicense,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <Welcome />

      {formToast.show && (
        <div
          role="status"
          className={`mt-4 mb-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-sm ${
            formToast.variant === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {formToast.message}
        </div>
      )}

      {(user.role === 2 || user.role === 1 || user.role === 3) && (
        <>
          <div className="mt-5 mb-4 flex justify-end">
            <button
              type="button"
              onClick={toggleQuickActions}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {showQuickActions ? 'Hide Quick Actions' : 'Show Quick Actions'}
            </button>
          </div>

          {showQuickActions && (
            <>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                {buttons.map((button, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={button.toggle}
                    className={`relative flex items-center space-x-3 rounded-lg border border-gray-300 px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400 ${button.color}`}
                  >
                    <span className="w-full text-white font-semibold">
                      {button.label}
                    </span>
                  </button>
                ))}
              </div>

              {showNewViolationForm && (
                <NewViolationForm
                  onCreated={() => handleQuickActionCreated('Violation submitted successfully.')}
                />
              )}
              {showNewComplaint && (
                <NewComplaint
                  onCreated={() => handleQuickActionCreated('Complaint submitted successfully.')}
                />
              )}
              {showNewMFLicense && (
                <NewMFLicense
                  onCreated={() => handleQuickActionCreated('Multifamily license inspection submitted successfully.')}
                />
              )}
              {showNewSFLicense && (
                <NewSFLicense
                  onCreated={() => handleQuickActionCreated('Single family license inspection submitted successfully.')}
                />
              )}
              {showNewBuildingPermit && (
                <NewBuildingPermit
                  onCreated={() => handleQuickActionCreated('Building permit inspection submitted successfully.')}
                />
              )}
              {showNewBusinessLicense && (
                <NewBusinessLicense
                  onCreated={() => handleQuickActionCreated('Business license inspection submitted successfully.')}
                />
              )}
            </>
          )}
        </>
      )}
      
      {(user.role === 2 || user.role === 3) && (
        <div className="mt-6">
          <OasOverview />
        </div>
      )}

      {user.role === 1 && (
        <>
          <WeeklyStats />
          <div className="mt-6">
            <RecentComments limit={8} />
          </div>
          <div className="flex flex-wrap -mx-2">
            <div className="w-full xl:w-1/2 px-2 mb-6">
              <PendingInspections />
            </div>
            <div className="w-full xl:w-1/2 px-2 mb-6">
              <ActiveViolations />
            </div>
          </div>
        </>
      )}

      {user.role === 3 && (
        <div className="mt-6">
          <WeeklyStats />
          <div className="mt-6">
            <RecentComments limit={8} startExpanded />
          </div>
          <button
            type="button"
            onClick={toggleAdminWidgets}
            className="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {showAdminWidgets ? 'Hide Admin Activity' : 'Show Admin Activity'}
          </button>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={sendTestEmail}
              disabled={emailTestLoading}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {emailTestLoading ? 'Sending…' : 'Send Test Email'}
            </button>
            {emailTestStatus && (
              <span className="text-sm text-gray-600">{emailTestStatus}</span>
            )}
          </div>

          {showAdminWidgets && (
            <AdminRecentActivity className="mt-6" limit={5} />
          )}
        </div>
      )}
    </div>
  );
}
