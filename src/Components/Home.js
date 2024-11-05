import React, { useState } from 'react';
import Welcome from './Dashboard/Welcome';
import WeeklyStats from './Dashboard/WeeklyStats';
import PendingInspections from './Dashboard/PendingInspections';
import ActiveViolations from './Dashboard/ActiveViolations';
import NewComplaint from './Inspection/NewComplaint';
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

  const toggleNewComplaint = () => {
    setShowNewComplaint(!showNewComplaint);
    if (showNewMFLicense) setShowNewMFLicense(false);
    if (showNewSFLicense) setShowNewSFLicense(false);
    if (showNewBuildingPermit) setShowNewBuildingPermit(false);
    if (showNewBusinessLicense) setShowNewBusinessLicense(false);
  };

  const toggleNewMFLicense = () => {
    setShowNewMFLicense(!showNewMFLicense);
    if (showNewComplaint) setShowNewComplaint(false);
    if (showNewSFLicense) setShowNewSFLicense(false);
    if (showNewBuildingPermit) setShowNewBuildingPermit(false);
    if (showNewBusinessLicense) setShowNewBusinessLicense(false);
  };

  const toggleNewSFLicense = () => {
    setShowNewSFLicense(!showNewSFLicense);
    if (showNewComplaint) setShowNewComplaint(false);
    if (showNewMFLicense) setShowNewMFLicense(false);
    if (showNewBuildingPermit) setShowNewBuildingPermit(false);
    if (showNewBusinessLicense) setShowNewBusinessLicense(false);
  };

  const toggleNewBuildingPermit = () => {
    setShowNewBuildingPermit(!showNewBuildingPermit);
    if (showNewComplaint) setShowNewComplaint(false);
    if (showNewMFLicense) setShowNewMFLicense(false);
    if (showNewSFLicense) setShowNewSFLicense(false);
    if (showNewBusinessLicense) setShowNewBusinessLicense(false);
  };

  const toggleNewBusinessLicense = () => {
    setShowNewBusinessLicense(!showNewBusinessLicense);
    if (showNewComplaint) setShowNewComplaint(false);
    if (showNewMFLicense) setShowNewMFLicense(false);
    if (showNewSFLicense) setShowNewSFLicense(false);
    if (showNewBuildingPermit) setShowNewBuildingPermit(false);
  };

  const buttons = [
    {
      label: showNewComplaint ? "Hide Complaint Form" : "New Complaint",
      state: showNewComplaint,
      toggle: toggleNewComplaint,
      color: "bg-indigo-500",
    },
    {
      label: showNewMFLicense ? "Hide Multifamily License Form" : "New Multifamily License",
      state: showNewMFLicense,
      toggle: toggleNewMFLicense,
      color: "bg-green-500",
    },
    {
      label: showNewSFLicense ? "Hide Single Family License Form" : "New Single Family License",
      state: showNewSFLicense,
      toggle: toggleNewSFLicense,
      color: "bg-teal-500",
    },
    {
      label: showNewBuildingPermit ? "Hide Building Permit Form" : "New Building Permit",
      state: showNewBuildingPermit,
      toggle: toggleNewBuildingPermit,
      color: "bg-violet-500",
    },
    {
      label: showNewBusinessLicense ? "Hide Business License Form" : "New Business License",
      state: showNewBusinessLicense,
      toggle: toggleNewBusinessLicense,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <Welcome />

      {(user.role === 2 || user.role === 1 || user.role === 3) && (
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

          {showNewComplaint && <NewComplaint />}
          {showNewMFLicense && <NewMFLicense />}
          {showNewSFLicense && <NewSFLicense />}
          {showNewBuildingPermit && <NewBuildingPermit />}
          {showNewBusinessLicense && <NewBusinessLicense />}
        </>
      )}
      
      {user.role === 1 && (
        <>
          <WeeklyStats />
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
    </div>
  );
}