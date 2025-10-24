import React from "react";
import CodeLink from "./CodeLink";

const statusOptions = [
  { value: 0, label: "Unpaid" },
  { value: 1, label: "Paid" },
  { value: 2, label: "Pending Trial" },
  { value: 3, label: "Dismissed" },
];

function CitationsList({ citations, submitting, refreshCitations }) {
  if (!citations || citations.length === 0) {
    return <p className="text-gray-500">No citations available.</p>;
  }
  return (
    <ul className="space-y-4">
      {[...citations]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((citation) => (
          <li
            key={citation.id}
            className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex justify-between">
              <div className="flex-1">
                {/* Citation User */}
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
                    if (citation.status === 1) {
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
                      {deadline.toLocaleDateString('en-US')}
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
                    try {
                      const res = await fetch(`${process.env.REACT_APP_API_URL}/citations/${citation.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: parseInt(newStatus) })
                      });
                      if (!res.ok) throw new Error('Failed to update status');
                      await refreshCitations();
                    } catch (err) {
                      alert(err.message);
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
                  <CodeLink
                    codeId={citation.code_id}
                    className="font-semibold text-blue-700 hover:underline"
                    title={citation.code_description || citation.code_name}
                  >
                    {citation.code_name}
                  </CodeLink>
                  {citation.code_description ? ` — ${citation.code_description.length > 80 ? citation.code_description.slice(0, 80) + '...' : citation.code_description}` : ''}
                </p>
              </div>
              <div className="flex flex-col items-end justify-end min-w-[160px]">
                <p className="text-gray-500 text-xs">
                  Created: {citation.created_at ? new Date(citation.created_at).toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
                {citation.updated_at && (
                  <p className="text-gray-500 text-xs">
                    Updated: {new Date(citation.updated_at).toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
    </ul>
  );
}

export default CitationsList;
