import React from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-semibold text-gray-900">Welcome to CiviCode</h1>
        <p className="mt-4 text-base text-gray-600">
          Sign in to manage inspections, or submit a resident concern without an account.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center rounded-md border border-indigo-600 px-5 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50 sm:w-auto"
          >
            Staff Login
          </Link>
          <Link
            to="/resident-concern"
            className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 sm:w-auto"
          >
            Submit a Resident Concern
          </Link>
        </div>
      </div>
    </div>
  );
}

