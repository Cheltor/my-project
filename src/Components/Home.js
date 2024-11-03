import React from 'react';
import Welcome from './Dashboard/Welcome';
import WeeklyStats from './Dashboard/WeeklyStats';
import PendingInspections from './Dashboard/PendingInspections';
import ActiveViolations from './Dashboard/ActiveViolations';

export default function Example() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <Welcome />
      <WeeklyStats />
      
      {/* Responsive layout for PendingInspections and ActiveViolations */}
      <div className="flex flex-wrap -mx-2">
        {/* Pending Inspections - Full width on small and large screens, half width on extra-large screens and above */}
        <div className="w-full xl:w-1/2 px-2 mb-6">
          <PendingInspections />
        </div>

        {/* Active Violations - Full width on small and large screens, half width on extra-large screens and above */}
        <div className="w-full xl:w-1/2 px-2 mb-6">
          <ActiveViolations />
        </div>
      </div>
    </div>
  );
}
