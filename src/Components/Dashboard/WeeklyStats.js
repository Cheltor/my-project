import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/20/solid';

import { useAuth } from "../../AuthContext";

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const WeeklyStats = React.memo(() => {
  const [stats, setStats] = useState([
    { name: 'Comments', thisWeek: 0, lastWeek: 0, change: 'N/A', changeType: '' },
    { name: 'Inspections Completed', thisWeek: 0, lastWeek: 0, change: 'N/A', changeType: '' },
    { name: 'Violations Found', thisWeek: 0, lastWeek: 0, change: 'N/A', changeType: '' },
  ]);

  const { user } = useAuth();
  const isAdmin = user?.role === 3;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculateChange = useCallback((thisWeek, lastWeek) => {
    if (lastWeek === 0) return 'N/A';
    return Math.abs(((thisWeek - lastWeek) / lastWeek) * 100).toFixed(2) + '%';
  }, []);

  const getChangeType = useCallback((thisWeek, lastWeek) => {
    if (lastWeek === 0) return '';
    return thisWeek > lastWeek ? 'increase' : thisWeek < lastWeek ? 'decrease' : '';
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Use Sunday as the start of the work week; change to 'sat' to start on Saturday
        const baseUrl = process.env.REACT_APP_API_URL || '';
        const endpoint = isAdmin
          ? baseUrl + '/counts?role=1&start_day=sun'
          : baseUrl + '/counts/' + user.id + '?start_day=sun';

        const response = await fetch(endpoint);
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
            name: 'Inspections Completed',
            thisWeek: data.inspections_this_workweek_count,
            lastWeek: data.inspections_last_workweek_count,
            change: calculateChange(data.inspections_this_workweek_count, data.inspections_last_workweek_count),
            changeType: getChangeType(data.inspections_this_workweek_count, data.inspections_last_workweek_count),
          },
          {
            name: 'Violations Found',
            thisWeek: data.violations_this_workweek_count,
            lastWeek: data.violations_last_workweek_count,
            change: calculateChange(data.violations_this_workweek_count, data.violations_last_workweek_count),
            changeType: getChangeType(data.violations_this_workweek_count, data.violations_last_workweek_count),
          },
        ];

        setStats(updatedStats);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isAdmin, calculateChange, getChangeType]);

  const labels = useMemo(() => ({
    headingLabel: isAdmin ? 'This Week (ONS team totals)' : 'This Week',
    comparisonLabel: isAdmin ? 'team last week' : 'last week'
  }), [isAdmin]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mt-3">{labels.headingLabel}</h3>
      <dl className="grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:grid-cols-3 md:divide-x md:divide-y-0">
        {stats.map((stat) => (
          <div key={stat.name} className="px-4 py-5 sm:p-6">
            <dt className="text-base font-normal text-gray-900">{stat.name}</dt>
            <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div className="flex items-baseline text-2xl font-semibold text-indigo-600">
                {stat.thisWeek}
                <span className="ml-2 text-sm font-medium text-gray-500">from {stat.lastWeek} {labels.comparisonLabel}</span>
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
});

WeeklyStats.displayName = 'WeeklyStats';

export default WeeklyStats;
