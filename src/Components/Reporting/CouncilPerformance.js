import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api';

export default function CouncilPerformance({ defaultRange = 12 }) {
  // Default to last 12 months if no range provided via props (though props aren't fully wired yet for range control)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const periodLabel = useMemo(() => {
    if (startDate && endDate) return `Stats between ${startDate} and ${endDate}`;
    return 'Stats within the selected period';
  }, [startDate, endDate]);

  const fetchStats = async (opts = {}) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      const s = opts.startDate ?? startDate;
      const e = opts.endDate ?? endDate;
      if (s) params.append('start_date', s);
      if (e) params.append('end_date', e);

      // Use apiFetch wrapper if available or standard fetch
      const res = await apiFetch(`/sir/stats?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load Council Performance stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setError(e.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchStats({ startDate, endDate });
  };

  const Card = ({ title, value, alt }) => (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value ?? alt ?? '—'}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="start_date">Start date</label>
            <input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="end_date">End date</label>
            <input
              id="end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleSubmit}
          className="w-full sm:w-auto rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Update Report
        </button>
      </div>

      <div className="text-center">
        <h2 className="text-lg font-medium text-gray-900">{periodLabel}</h2>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 text-center">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading performance data...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="col-span-full text-sm font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Enforcement Activity</div>
          <Card title="Complaints Made" value={stats?.complaints_made} alt="0" />
          <Card title="Complaint Responses" value={stats?.complaint_responses} alt="0" />
          <Card title="Warnings Issued" value={stats?.warnings} alt="0" />
          <Card title="Violations" value={stats?.violations} alt="0" />
          <Card title="Citations" value={stats?.citations} alt="0" />

          <div className="col-span-full text-sm font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-2">Single Family Rentals</div>
          <Card title="Requests" value={stats?.sf_inspections} alt="0" />
          <Card title="Performed" value={stats?.sf_inspection_updated} alt="0" />
          <Card title="Approved" value={stats?.sf_inspection_approved} alt="0" />

          <div className="col-span-full text-sm font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-2">Multifamily Rentals</div>
          <Card title="Requests" value={stats?.mf_inspections} alt="0" />
          <Card title="Performed" value={stats?.mf_inspection_updated} alt="0" />
          <Card title="Approved" value={stats?.mf_inspection_approved} alt="0" />

          <div className="col-span-full text-sm font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-2">Business Licenses</div>
          <Card title="Requests" value={stats?.bl_inspections} alt="0" />
          <Card title="Performed" value={stats?.bl_inspection_updated} alt="0" />
          <Card title="Approved" value={stats?.bl_inspection_approved} alt="0" />

          <div className="col-span-full text-sm font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-2">Permits</div>
          <Card title="Requests" value={stats?.permit_inspections} alt="0" />
          <Card title="Performed" value={stats?.permit_inspection_updated} alt="0" />
          <Card title="Approved" value={stats?.permit_inspection_approved} alt="0" />
        </div>
      )}
    </div>
  );
}
