import React, { useEffect, useMemo, useState } from 'react';

export default function Sir() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const periodLabel = useMemo(() => {
    if (startDate && endDate) return `Stats between ${startDate} and ${endDate}`;
    return 'Stats within the last 2 weeks';
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
      const url = `${process.env.REACT_APP_API_URL}/sir/stats${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load SIR stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setError(e.message || 'Failed to load SIR stats');
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
    <div className="col-span-12 sm:col-span-6 lg:col-span-3">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">{title}</div>
        <div className="mt-2 text-2xl font-semibold text-gray-900">{value ?? alt ?? '—'}</div>
      </div>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900 text-center">SIR Stats</h1>
        </div>
      </div>

      <div className="mt-6">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="start_date">Start date</label>
            <input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="end_date">End date</label>
            <input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Filter</button>
          </div>
        </form>
      </div>

      <div className="mt-6 text-center">
        <h2 className="text-lg font-medium text-gray-900">{periodLabel}</h2>
      </div>

      {error && (
        <div className="mt-4 text-center text-sm text-red-600">{error}</div>
      )}

      <div className="mt-6 grid grid-cols-12 gap-4">
        <Card title="Complaints Made" value={stats?.complaints_made} alt="No Complaints Made" />
        <Card title="Complaint Responses" value={stats?.complaint_responses} alt="No Complaint Responses" />
        <Card title="Warnings" value={stats?.warnings} alt="No Warnings" />
        <Card title="Violation Notices" value={stats?.violations} alt="No Violation Notices" />
        <Card title="Citations" value={stats?.citations} alt="No Citations" />

        <Card title="Single Family Inspection Requests" value={stats?.sf_inspections} alt="0" />
        <Card title="Single Family Inspections Performed" value={stats?.sf_inspection_updated} alt="0" />
        <Card title="Single Family Inspections Approved" value={stats?.sf_inspection_approved} alt="0" />

        <Card title="Multifamily Inspection Requests" value={stats?.mf_inspections} alt="0" />
        <Card title="Multifamily Inspections Performed" value={stats?.mf_inspection_updated} alt="0" />
        <Card title="Multifamily Inspections Approved" value={stats?.mf_inspection_approved} alt="0" />

        <Card title="Business License Inspection Requests" value={stats?.bl_inspections} alt="0" />
        <Card title="Business License Inspections Performed" value={stats?.bl_inspection_updated} alt="0" />
        <Card title="Business License Inspections Approved" value={stats?.bl_inspection_approved} alt="0" />

        <Card title="Permit Inspection Requests" value={stats?.permit_inspections} alt="0" />
        <Card title="Permit Inspections Performed" value={stats?.permit_inspection_updated} alt="0" />
        <Card title="Permit Inspections Approved" value={stats?.permit_inspection_approved} alt="0" />
      </div>

      {loading && (
        <div className="mt-4 text-center text-sm text-gray-500">Loading…</div>
      )}
    </div>
  );
}


