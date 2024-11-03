import React, { useState, useEffect } from "react";
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/20/solid';

import { useAuth } from "../../AuthContext";

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function WeeklyStats() {
  const [stats, setStats] = useState([
    { name: 'Comments', thisWeek: 0, lastWeek: 0, change: 'N/A', changeType: '' },
    { name: 'Inspections', thisWeek: 0, lastWeek: 0, change: 'N/A', changeType: '' },
    { name: 'Violations', thisWeek: 0, lastWeek: 0, change: 'N/A', changeType: '' },
  ]);

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = user.id; 
        const response = await fetch(`${process.env.REACT_APP_API_URL}/counts/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch weekly stats");

        const data = await response.json();
        
        const updatedStats = [
          {
            name: 'Comments',
            thisWeek: data.comments_this_workweek_count,
            lastWeek: data.comments_last_workweek_count,
            change: calculateChange(data.comments_this_workweek_count, data.comments_last_workweek_count),
            changeType: getChangeType(data.comments_this_workweek_count, data.comments_last_workweek_count),
          },
          {
            name: 'Inspections',
            thisWeek: data.inspections_this_workweek_count,
            lastWeek: data.inspections_last_workweek_count,
            change: calculateChange(data.inspections_this_workweek_count, data.inspections_last_workweek_count),
            changeType: getChangeType(data.inspections_this_workweek_count, data.inspections_last_workweek_count),
          },
          {
            name: 'Violations',
            thisWeek: data.violations_this_workweek_count,
            lastWeek: data.violations_last_workweek_count,
            change: calculateChange(data.violations_this_workweek_count, data.violations_last_workweek_count),
            changeType: getChangeType(data.violations_this_workweek_count, data.violations_last_workweek_count),
          },
        ];

        setStats(updatedStats);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateChange = (thisWeek, lastWeek) => {
    if (lastWeek === 0) return 'N/A';
    return `${Math.abs(((thisWeek - lastWeek) / lastWeek) * 100).toFixed(2)}%`;
  };

  const getChangeType = (thisWeek, lastWeek) => {
    if (lastWeek === 0) return '';
    return thisWeek > lastWeek ? 'increase' : thisWeek < lastWeek ? 'decrease' : '';
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mt-3">This Week</h3>
      <dl className="grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:grid-cols-3 md:divide-x md:divide-y-0">
        {stats.map((stat) => (
          <div key={stat.name} className="px-4 py-5 sm:p-6">
            <dt className="text-base font-normal text-gray-900">{stat.name}</dt>
            <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div className="flex items-baseline text-2xl font-semibold text-indigo-600">
                {stat.thisWeek}
                <span className="ml-2 text-sm font-medium text-gray-500">from {stat.lastWeek}</span>
              </div>

              {stat.changeType && (
                <div
                  className={classNames(
                    stat.changeType === 'increase' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                    'inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0',
                  )}
                >
                  {stat.changeType === 'increase' ? (
                    <ArrowUpIcon
                      aria-hidden="true"
                      className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-green-500"
                    />
                  ) : (
                    <ArrowDownIcon
                      aria-hidden="true"
                      className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-red-500"
                    />
                  )}
                  <span className="sr-only"> {stat.changeType === 'increase' ? 'Increased' : 'Decreased'} by </span>
                  {stat.change}
                </div>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
