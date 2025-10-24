import React from "react";
import NewComplaint from "../Inspection/NewComplaint";

export default function ResidentConcernPage({ standalone = true }) {
  const outerClassName = standalone ? "min-h-screen bg-gray-50 py-10 px-4" : "py-6";
  const innerClassName = standalone ? "max-w-4xl mx-auto" : "max-w-4xl mx-auto px-4";

  return (
    <div className={outerClassName}>
      <div className={innerClassName}>
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-gray-900">Resident Concern Portal</h1>
          <p className="mt-2 text-gray-700">
            Submit a concern directly to our team. Please provide your contact information so we can follow up if needed.
          </p>
        </div>
        <NewComplaint isPublic title="Submit a Resident Concern" submitButtonLabel="Submit Concern" />
      </div>
    </div>
  );
}
