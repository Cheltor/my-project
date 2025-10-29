import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';

const CodeDetail = () => {
  const { id } = useParams();
  const [code, setCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const violationsPerPage = 10;

  const statusMapping = {
    0: 'Current',
    1: 'Resolved',
    2: 'Pending Trial',
    3: 'Dismissed',
  };

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/codes/${id}`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch code details');
        return response.json();
      })
      .then((data) => {
        setCode(data);
        setLoading(false);
        setCurrentPage(1);
      })
      .catch((err) => {
        setError(err.message || String(err));
        setLoading(false);
      });
  }, [id]);

  const violations = useMemo(() => (Array.isArray(code?.violations) ? code.violations : []), [code]);
  const maxPage = Math.max(1, Math.ceil(violations.length / violationsPerPage));

  useEffect(() => {
    if (currentPage > maxPage) setCurrentPage(maxPage);
  }, [currentPage, maxPage]);

  const paginatedViolations = useMemo(() => {
    const start = (currentPage - 1) * violationsPerPage;
    return violations.slice(start, start + violationsPerPage);
  }, [violations, currentPage]);

  if (loading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-50 px-4">
        <span className="text-sm font-medium text-slate-600">Loading…</span>
      </div>
    );

  if (error)
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-50 px-4">
        <div className="rounded-lg border border-rose-200 bg-white/80 px-6 py-5 text-sm text-rose-600 shadow-sm">Error: {error}</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <Link to="/codes" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
              <span aria-hidden>←</span>
              <span className="ml-2">Back to codes</span>
            </Link>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Code #{id}</h1>
            <p className="mt-1 text-sm text-slate-600">Details and associated violations for this code.</p>
          </div>
          <div>
            <Link
              to={`/code/${id}/edit`}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Edit
            </Link>
          </div>
        </div>

        {code ? (
          <div className="mt-8 grid gap-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-200/40">
              <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
                <h2 className="text-base font-semibold text-slate-900">Basic information</h2>
                <p className="mt-1 text-sm text-slate-600">Core fields for this code reference.</p>
              </div>
              <div className="px-6 py-5">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-slate-600">Chapter</dt>
                    <dd className="mt-1 text-sm text-slate-900">{code.chapter}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-600">Section</dt>
                    <dd className="mt-1 text-sm text-slate-900">{code.section}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-slate-600">Name</dt>
                    <dd className="mt-1 text-sm text-slate-900">{code.name}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-slate-600">Description</dt>
                    <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{code.description}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-600">Total violations</dt>
                    <dd className="mt-1 text-sm text-slate-900">{code.violation_count ?? 0}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-200/40">
              <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
                <h3 className="text-base font-semibold text-slate-900">Timestamps</h3>
              </div>
              <div className="px-6 py-4 text-sm text-slate-700">
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium text-slate-600">Created at</span>
                  <span className="text-slate-900">{new Date(code.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium text-slate-600">Updated at</span>
                  <span className="text-slate-900">{new Date(code.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-200/40">
              <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
                <h3 className="text-base font-semibold text-slate-900">Associated violations</h3>
                <p className="mt-1 text-sm text-slate-600">Violations that reference this code.</p>
              </div>
              <div className="px-6 py-4">
                {violations.length > 0 ? (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Violation</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedViolations.map((violation) => {
                            const createdDate = violation.created_at ? new Date(violation.created_at) : null;
                            const deadlineDate = violation.deadline_date ? new Date(violation.deadline_date) : null;
                            return (
                              <tr key={violation.id}>
                                <td className="px-4 py-3 text-sm text-indigo-600 font-medium">
                                  <Link to={`/violation/${violation.id}`} className="hover:text-indigo-800">
                                    {violation.violation_type || violation.description || `View violation ${violation.id}`}
                                  </Link>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {violation.address_id ? (
                                    <Link to={`/address/${violation.address_id}`} className="text-indigo-600 hover:text-indigo-800">
                                      {violation.combadd || 'View address'}
                                    </Link>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{statusMapping[violation.status] || 'Unknown'}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{createdDate ? createdDate.toLocaleDateString() : '—'}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{deadlineDate ? deadlineDate.toLocaleDateString() : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {violations.length > violationsPerPage && (
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:bg-gray-300"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-600">Page {currentPage} of {maxPage}</span>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((prev) => Math.min(maxPage, prev + 1))}
                          disabled={currentPage === maxPage}
                          className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:bg-gray-300"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-600">No violations currently reference this code.</p>
                )}
              </div>
            </section>
          </div>
        ) : (
          <p className="text-center text-gray-600">No details available for this code.</p>
        )}
      </div>
    </div>
  );
};

export default CodeDetail;
