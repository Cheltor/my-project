/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toEasternLocaleDateString } from '../../utils';

// Helpers resembling Citations.js
// Status helpers to accept numeric, numeric strings, or human labels
const STATUS_LABELS = {
  0: 'Unpaid',
  1: 'Paid',
  2: 'Pending Trial',
  3: 'Dismissed',
};

function coerceStatusValue(raw) {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'number') return raw;
  const s = String(raw).trim().toLowerCase();
  if (['0','1','2','3'].includes(s)) return parseInt(s, 10);
  if (s === 'unpaid') return 0;
  if (s === 'paid') return 1;
  if (s === 'pending' || s === 'pending trial' || s === 'pending_trial') return 2;
  if (s === 'dismissed') return 3;
  return undefined;
}

function normalizeStatus(citation) {
  // Try common fields
  const candidates = [citation.status, citation.status_id, citation.status_code, citation.statusValue];
  for (const c of candidates) {
    const code = coerceStatusValue(c);
    if (code !== undefined) return { code, label: STATUS_LABELS[code] };
  }
  // Try label fields
  const labelFields = [citation.status_label, citation.status_name, citation.statusText];
  for (const lf of labelFields) {
    if (!lf) continue;
    const code = coerceStatusValue(lf);
    if (code !== undefined) return { code, label: STATUS_LABELS[code] };
    // If label not mappable but present, use as-is
    return { code: undefined, label: String(lf) };
  }
  return { code: undefined, label: '—' };
}

function statusBadgeClass(code) {
  switch (code) {
    case 0: return 'bg-red-100 text-red-800 border border-red-200';
    case 1: return 'bg-green-100 text-green-800 border border-green-200';
    case 2: return 'bg-yellow-100 text-yellow-900 border border-yellow-200';
    case 3: return 'bg-gray-200 text-gray-700 border border-gray-300';
    default: return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
}

function getIsPastDue(citation) {
  if (!citation.deadline) return false;
  const { code } = normalizeStatus(citation);
  const deadline = new Date(citation.deadline);
  const now = new Date();
  // Consider paid or dismissed as not past due hints
  const resolved = code === 1 || code === 3;
  return (!resolved && deadline < now);
}

const AddressCitations = ({ addressId }) => {
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState(null); // 'unpaid' | 'pastdue' | null
  const [sortDirection, setSortDirection] = useState('desc');
  const [, setEnriching] = useState(false);

  useEffect(() => {
    // Fetch citations for the specific address
    fetch(`${process.env.REACT_APP_API_URL}/citations/address/${addressId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch citations');
        }
        return response.json();
      })
      .then((data) => {
        setCitations(data || []);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [addressId]);

  // Enrich citations with missing status by fetching individual citation details
  useEffect(() => {
    if (!citations || citations.length === 0) return;
    const missing = citations.filter(c => c.status === undefined || c.status === null);
    if (missing.length === 0) return;
    let cancelled = false;
    async function enrich() {
      try {
        setEnriching(true);
        const results = await Promise.all(missing.map(c => (
          fetch(`${process.env.REACT_APP_API_URL}/citations/${c.id}`)
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null)
        )));
        if (cancelled) return;
        const byId = new Map();
        for (const r of results) if (r && r.id) byId.set(r.id, r);
        if (byId.size > 0) {
          setCitations(prev => prev.map(c => (byId.has(c.id) ? { ...c, ...byId.get(c.id) } : c)));
        }
      } finally {
        if (!cancelled) setEnriching(false);
      }
    }
    enrich();
    return () => { cancelled = true; };
  }, [citations]);

  function createdAtMillis(c) {
    const d = c?.created_at ? new Date(c.created_at) : null;
    if (d && !isNaN(d)) return d.getTime();
    const u = c?.updated_at ? new Date(c.updated_at) : null;
    if (u && !isNaN(u)) return u.getTime();
    return 0;
  }

  function sortCitations(list) {
    const sorted = [...list];
    // Default: newest first
    if (!sortBy) {
      sorted.sort((a, b) => createdAtMillis(b) - createdAtMillis(a));
      return sorted;
    }
    if (sortBy === 'unpaid') {
      sorted.sort((a, b) => {
        const aCode = normalizeStatus(a).code;
        const bCode = normalizeStatus(b).code;
        const aUnpaid = aCode === 0 ? 1 : 0;
        const bUnpaid = bCode === 0 ? 1 : 0;
        if (aUnpaid !== bUnpaid) return sortDirection === 'asc' ? aUnpaid - bUnpaid : bUnpaid - aUnpaid;
        // Secondary: newest first
        return createdAtMillis(b) - createdAtMillis(a);
      });
    } else if (sortBy === 'pastdue') {
      sorted.sort((a, b) => {
        const aPastDue = getIsPastDue(a) ? 1 : 0;
        const bPastDue = getIsPastDue(b) ? 1 : 0;
        if (aPastDue !== bPastDue) return sortDirection === 'asc' ? aPastDue - bPastDue : bPastDue - aPastDue;
        // Secondary: newest first
        return createdAtMillis(b) - createdAtMillis(a);
      });
    }
    return sorted;
  }

  if (loading) return <div className="mt-2 text-sm text-gray-600">Loading citations…</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!citations || citations.length === 0) return <div className="text-sm text-gray-600">No citations available.</div>;

  const sorted = sortCitations(citations);

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900">Citations</h2>
      <div className="mt-4 overflow-x-auto rounded-lg shadow-md bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Citation ID</th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => {
                  if (sortBy === 'pastdue') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  else { setSortBy('pastdue'); setSortDirection('desc'); }
                }}
                title="Sort by deadline status"
              >
                Deadline
                <span className="ml-1 text-xs align-middle">{sortBy === 'pastdue' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => {
                  if (sortBy === 'unpaid') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  else { setSortBy('unpaid'); setSortDirection('desc'); }
                }}
                title="Sort by unpaid first"
              >
                Status
                <span className="ml-1 text-xs align-middle">{sortBy === 'unpaid' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map((citation) => (
              <tr key={citation.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link to={`/citation/${citation.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {citation.citationid ? citation.citationid : 'Missing'}
                  </Link>
                </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-2">
                  {(() => {
                    if (!citation.deadline) return 'N/A';
                    const deadline = new Date(citation.deadline);
                    const now = new Date();
                    const diffMs = deadline - now;
                    const diffDays = diffMs / (1000 * 60 * 60 * 24);
                    let deadlineStatus = '';
                    let badgeClass = '';
          // Remove deadline hints for Paid (1) and Dismissed (3)
          const normalized = normalizeStatus(citation);
          if (normalized.code === 1 || normalized.code === 3) {
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
                        {toEasternLocaleDateString(deadline)}
                        {deadlineStatus && (
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold align-middle ${badgeClass}`}>
                            {deadlineStatus}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {(() => {
                    const { code, label } = normalizeStatus(citation);
                    return (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(code)}`}>
                        {label}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AddressCitations;
