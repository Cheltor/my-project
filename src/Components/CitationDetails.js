import React from "react";
import CodeDrawerLink from "./Codes/CodeDrawerLink";
import { toEasternLocaleDateString, toEasternLocaleString } from "../utils";

const statusOptions = [
  { value: 0, label: "Unpaid" },
  { value: 1, label: "Paid" },
  { value: 2, label: "Pending Trial" },
  { value: 3, label: "Dismissed" },
];

function CitationDetails({ citation, onStatusChange, submitting }) {
  if (!citation) {
    return <p className="text-gray-500">No citation selected.</p>;
  }
  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow border border-gray-200 w-full max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Citation Details</h2>
      <div className="mb-4">
        {citation.user && (
          <p className="text-xs text-gray-500 mb-1">
            <span className="font-semibold">User:</span> {citation.user.email ? citation.user.email : (citation.user.name || 'Unknown')}
          </p>
        )}
        <p className="text-gray-700 mb-2">
          <span className="font-medium">Deadline:</span> {(() => {
            const deadline = new Date(citation.deadline);
            const now = new Date();
            const diffMs = deadline - now;
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            let deadlineStatus = '';
            let badgeClass = '';
            // Remove deadline hints for Paid (1) and Dismissed (3)
            if (citation.status === 1 || citation.status === 3) {
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
            return <>
              {toEasternLocaleDateString(deadline, 'en-US')}
              {deadlineStatus && (
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold align-middle ${badgeClass}`}>
                  {deadlineStatus}
                </span>
              )}
            </>;
          })()}
        </p>
        <p className="text-gray-700 mb-2">
          <span className="font-medium">Fine:</span> ${citation.fine}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const newStatus = e.target.elements[`status-${citation.id}`].value;
            if (parseInt(newStatus) === citation.status) return;
            if (onStatusChange) {
              await onStatusChange(citation.id, parseInt(newStatus));
            }
          }}
          className="mb-2"
        >
          <label className="font-medium mr-2">Status:</label>
          <select
            name={`status-${citation.id}`}
            defaultValue={citation.status}
            className="border rounded p-1 text-sm"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="ml-2 px-2 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            disabled={submitting}
          >
            Update
          </button>
        </form>
        {citation.trial_date && (
          <p className="text-gray-700 mb-2">
            <span className="font-medium">Trial Date:</span> {citation.trial_date}
          </p>
        )}
        <p className="text-gray-700 mb-2">
          <span className="font-medium">Code:</span>{' '}
          {citation.code_id && citation.code_name ? (
            <CodeDrawerLink
              codeId={citation.code_id}
              title={citation.code_description || citation.code_name}
            >
              {citation.code_name}
            </CodeDrawerLink>
          ) : (
            <span className="font-semibold text-gray-800">N/A</span>
          )}
          {citation.code_description
            ? ` - ${
                citation.code_description.length > 80
                  ? citation.code_description.slice(0, 80) + "..."
                  : citation.code_description
              }`
            : ""}
        </p>
      </div>
      <div className="flex flex-col items-end justify-end min-w-[160px]">
        <p className="text-gray-500 text-xs">
          Created: {citation.created_at ? toEasternLocaleString(citation.created_at, 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
        </p>
        {citation.updated_at && (
          <p className="text-gray-500 text-xs">
            Updated: {toEasternLocaleString(citation.updated_at, 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}

export default CitationDetails;
