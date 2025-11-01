import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NewAddressViolation from './NewAddressViolation';
import CodeDrawerLink from "../Codes/CodeDrawerLink";
import { toEasternLocaleDateString, toEasternLocaleString } from '../../utils';

// Utility function to format the date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return toEasternLocaleString(dateString, undefined, options);
};

const AddressViolations = ({ addressId }) => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);  // For loading state
  const [error, setError] = useState(null);      // For error state
  const [statusFilter, setStatusFilter] = useState('all');
  const [codeFilter, setCodeFilter] = useState('all');

  // Define the status mapping object
  const statusMapping = {
    0: 'Current',
    1: 'Resolved',
    2: 'Pending Trial',
    3: 'Dismissed'
  };

    // Function to add a new violation to the list
    const handleViolationAdded = (newViolation) => {
      setViolations((prevViolations) => [newViolation, ...prevViolations]);
    };

  useEffect(() => {
    // Fetch violations for the specific address
    fetch(`${process.env.REACT_APP_API_URL}/violations/address/${addressId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch violations');
        }
        return response.json();
      })
      .then((data) => {
        setViolations(data);  // Set the fetched violations
        setLoading(false);   // Set loading to false once data is fetched
      })
      .catch((error) => {
        setError(error.message);  // Handle any errors
        setLoading(false);
      });
  }, [addressId]);

  if (loading) {
    return <p>Loading violations...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }


  // Gather all unique codes for filter dropdown
  const allCodes = Array.from(
    violations.reduce((acc, v) => {
      (v.codes || []).forEach(code => acc.set(code.id, code));
      return acc;
    }, new Map()).values()
  );

  // Sort violations: most recent first (prefer updated_at, fallback to created_at)
  const sortedViolations = [...violations].sort((a, b) => {
    const aDate = new Date(a.updated_at || a.created_at || 0);
    const bDate = new Date(b.updated_at || b.created_at || 0);
    return bDate - aDate;
  });

  // Filtering logic
  const filteredViolations = sortedViolations.filter(v => {
    const statusMatch = statusFilter === 'all' || v.status === parseInt(statusFilter, 10);
    const codeMatch = codeFilter === 'all' || (v.codes && v.codes.some(c => String(c.id) === codeFilter));
    return statusMatch && codeMatch;
  });

  // Do not return early if no results; always show selectors and message below

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Violations</h2>

      {/* Render the NewAddressViolation form */}
      <NewAddressViolation addressId={addressId} onViolationAdded={handleViolationAdded} />

      {/* Filter controls */}
      <div className="flex flex-wrap gap-4 mt-2 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            className="border border-gray-300 rounded px-2 py-1"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="0">Current</option>
            <option value="1">Resolved</option>
            <option value="2">Pending Trial</option>
            <option value="3">Dismissed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Violation Code</label>
          <select
            className="border border-gray-300 rounded px-2 py-1"
            value={codeFilter}
            onChange={e => setCodeFilter(e.target.value)}
          >
            <option value="all">All</option>
            {allCodes.map(code => (
              <option key={code.id} value={code.id}>
                {code.chapter}{code.section ? `.${code.section}` : ''}: {code.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredViolations.length === 0 ? (
        <p className="text-gray-500 italic">No violations match your filter.</p>
      ) : (
        <ul className="space-y-4 mt-4">
          {filteredViolations.map((violation) => (
            <li key={violation.id} className="bg-gray-100 p-4 rounded-lg shadow relative">
              <div className="flex justify-between items-start">
                <p className="text-gray-700">
                  <Link
                    to={`/violation/${violation.id}`}
                    className="font-semibold text-indigo-700 hover:underline"
                  >
                    {violation.violation_type
                      ? violation.violation_type.charAt(0).toUpperCase() + violation.violation_type.slice(1)
                      : ''}
                  </Link>
                </p>
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs whitespace-nowrap ${
                    violation.status === 0 ? 'bg-red-100 text-red-800' :
                    violation.status === 1 ? 'bg-green-100 text-green-800' :
                    violation.status === 2 ? 'bg-yellow-100 text-yellow-800' :
                    violation.status === 3 ? 'bg-gray-100 text-gray-800' : ''
                  }`}
                  title={statusMapping[violation.status]}
                >
                  {statusMapping[violation.status]}
                </span>
              </div>
              {violation.codes && violation.codes.length > 0 && (
                <div className="text-gray-700 text-sm mt-1">
                  <span className="font-medium">Codes:</span>
                  <ul className="list-disc ml-6">
                    {violation.codes.map((code) => (
                      <li key={code.id} title={code.description}>
                        <CodeDrawerLink
                          codeId={code.id}
                          title={code.description || code.name}
                        >
                          {code.chapter}{code.section ? `.${code.section}` : ''}: {code.name}
                        </CodeDrawerLink>
                        {code.description
                          ? ` - ${
                              code.description.length > 80
                                ? code.description.slice(0, 80) + "..."
                                : code.description
                            }`
                          : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Status moved to top right */}
              {violation.comment && (
                <p className="text-sm text-gray-500">Comment: {violation.comment}</p>
              )}
              <div className="flex justify-between mt-4 text-xs">
                <div className="text-left">
                  {violation.deadline_date && (() => {
                    const deadline = new Date(violation.deadline_date);
                    const now = new Date();
                    const diffMs = deadline - now;
                    const diffDays = diffMs / (1000 * 60 * 60 * 24);
                    let deadlineStatus = '';
                    let badgeClass = '';
                    // If resolved, no color or badge
                    if (violation.status === 1) {
                      deadlineStatus = '';
                      badgeClass = '';
                    } else if (diffDays < 0) {
                      deadlineStatus = 'Past Due';
                      badgeClass = 'bg-red-200 text-red-800';
                    } else if (diffDays <= 3) {
                      deadlineStatus = 'Approaching';
                      badgeClass = 'bg-yellow-200 text-yellow-900';
                    } else {
                      deadlineStatus = 'Plenty of Time';
                      badgeClass = 'bg-green-100 text-green-800';
                    }
                    return (
                      <>
                        <span className="text-gray-700 mr-2 text-base font-semibold">Deadline: {toEasternLocaleDateString(deadline, 'en-US')}</span>
                        {deadlineStatus && (
                          <span className={`ml-1 px-2 py-0.5 rounded text-xs font-semibold align-middle ${badgeClass}`}>
                            {deadlineStatus}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="text-right">
                  <p className="text-gray-500">Created on {formatDate(violation.created_at)}</p>
                  {violation.updated_at && (
                    <p className="text-gray-500">Updated on {formatDate(violation.updated_at)}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressViolations;
