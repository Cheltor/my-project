import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import CouncilPerformance from './Reporting/CouncilPerformance';

export default function ReportingDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('aging');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only fetch the aging/compliance metrics if those tabs are active
    if (activeTab === 'aging' || activeTab === 'compliance') {
      fetchMetrics();
    }
  }, [activeTab]);

  const fetchMetrics = async () => {
    // Avoid re-fetching if we already have data (unless we want to support refresh)
    if (metrics) return;

    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/dash/reporting');
      if (!res.ok) throw new Error('Failed to load reporting metrics');
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 3 && user.role !== 2)) {
    // Allow Admins (3) and OAS (2) - assuming OAS might need this? Or just Admin?
    // Sticking to Admin for now based on other dashboards, but maybe OAS needs it too.
    // Let's restrict to Admin (3) for safety, similar to AdminDashboard.
    if (user?.role !== 3) {
      return (
        <div className="p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-800">Access Denied</h1>
          <p className="mt-2 text-gray-600">You do not have permission to view this dashboard.</p>
        </div>
      );
    }
  }

  const tabs = [
    { id: 'aging', label: 'Case Aging' },
    { id: 'compliance', label: 'Rental Compliance' },
    { id: 'performance', label: 'Council Performance' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporting & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Key metrics for code enforcement, licensing, and council reporting.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'performance' ? (
          <CouncilPerformance />
        ) : (
          <>
            {loading && !metrics && <div className="text-center py-12 text-gray-500">Loading metrics...</div>}
            {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            {!loading && metrics && (
              <div className="space-y-8">
                {activeTab === 'aging' && (
                  <div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                      <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                        <dt className="truncate text-sm font-medium text-gray-500">Average Case Age</dt>
                        <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                          {metrics.aging.average_age} <span className="text-sm font-normal text-gray-500">days</span>
                        </dd>
                      </div>
                      <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                        <dt className="truncate text-sm font-medium text-gray-500">Total Open Cases</dt>
                        <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                          {metrics.aging.total_open}
                        </dd>
                      </div>
                      <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                        <dt className="truncate text-sm font-medium text-gray-500">Avg Time to Close</dt>
                        <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                          {metrics.closure?.average_time_to_close ?? '—'} <span className="text-sm font-normal text-gray-500">days</span>
                        </dd>
                        <p className="mt-1 text-sm text-gray-500">Based on {metrics.closure?.total_closed_with_data ?? 0} closed cases</p>
                      </div>
                    </div>

                    <div className="mt-8 rounded-lg bg-white p-6 shadow">
                      <h3 className="text-base font-semibold leading-6 text-gray-900 mb-6">Case Age Distribution</h3>
                      {/* Simple CSS Bar Chart */}
                      <div className="space-y-4">
                        {Object.entries(metrics.aging.buckets).map(([label, count]) => {
                          const percentage = metrics.aging.total_open > 0
                            ? Math.round((count / metrics.aging.total_open) * 100)
                            : 0;
                          return (
                            <div key={label}>
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700">{label}</span>
                                <span className="text-gray-500">{count} cases ({percentage}%)</span>
                              </div>
                              <div className="mt-1 w-full rounded-full bg-gray-200 h-4 overflow-hidden">
                                <div
                                  className={`h-4 rounded-full ${label.includes('90+') ? 'bg-red-500' :
                                    label.includes('60-90') ? 'bg-orange-500' :
                                      label.includes('30-60') ? 'bg-yellow-500' :
                                        'bg-green-500'
                                    }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'compliance' && (
                  <div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                      <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                        <dt className="truncate text-sm font-medium text-gray-500">Compliance Rate</dt>
                        <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                          {metrics.compliance.total_licenses > 0
                            ? Math.round((metrics.compliance.counts.Valid / metrics.compliance.total_licenses) * 100)
                            : 0}%
                        </dd>
                        <p className="mt-1 text-sm text-gray-500">Valid licenses / Total</p>
                      </div>
                      <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                        <dt className="truncate text-sm font-medium text-gray-500">Total Licenses</dt>
                        <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                          {metrics.compliance.total_licenses}
                        </dd>
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg bg-white p-6 shadow border-l-4 border-green-500">
                        <div className="text-sm font-medium text-gray-500">Valid</div>
                        <div className="mt-2 text-3xl font-bold text-gray-900">{metrics.compliance.counts.Valid}</div>
                      </div>
                      <div className="rounded-lg bg-white p-6 shadow border-l-4 border-yellow-500">
                        <div className="text-sm font-medium text-gray-500">Unpaid</div>
                        <div className="mt-2 text-3xl font-bold text-gray-900">{metrics.compliance.counts.Unpaid}</div>
                      </div>
                      <div className="rounded-lg bg-white p-6 shadow border-l-4 border-orange-500">
                        <div className="text-sm font-medium text-gray-500">Expired</div>
                        <div className="mt-2 text-3xl font-bold text-gray-900">{metrics.compliance.counts.Expired}</div>
                      </div>
                      <div className="rounded-lg bg-white p-6 shadow border-l-4 border-red-600">
                        <div className="text-sm font-medium text-gray-500">Revoked</div>
                        <div className="mt-2 text-3xl font-bold text-gray-900">{metrics.compliance.counts.Revoked}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
