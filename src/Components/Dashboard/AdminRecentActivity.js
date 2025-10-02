import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const LICENSE_TYPE_LABELS = {
  0: 'Business License',
  1: 'Business License',
  2: 'Single Family License',
  3: 'Multifamily License',
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch (err) {
    return iso;
  }
};

const formatDate = (iso) => {
  if (!iso) return null;
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return null;
  return value.toLocaleDateString();
};

const AdminRecentActivity = ({ limit = 5, className = '' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = process.env.REACT_APP_API_URL || '';
        const response = await fetch(baseUrl + '/dash/recent?limit=' + limit);
        if (!response.ok) throw new Error('Failed to fetch recent activity');
        const payload = await response.json();
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load recent activity');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  const sections = useMemo(() => {
    if (!data) return [];
    return [
      {
        key: 'inspections',
        title: 'Inspections',
        viewAll: '/inspections',
        items: Array.isArray(data.inspections) ? data.inspections : [],
        empty: 'No recent inspections.',
        itemToRow: (item) => ({
          key: item.id,
          href: '/inspection/' + item.id,
          primary: item.source || 'Inspection',
          secondary: item.address?.combadd || 'No address assigned',
          meta: formatDateTime(item.created_at),
        }),
      },
      {
        key: 'licenses',
        title: 'Licenses',
        viewAll: '/licenses',
        items: Array.isArray(data.licenses) ? data.licenses : [],
        empty: 'No recent licenses.',
        itemToRow: (item) => {
          const label = LICENSE_TYPE_LABELS[item.license_type] || 'License';
          const metaParts = [];
          if (item.license_number) metaParts.push('#' + item.license_number);
          const issued = formatDate(item.date_issued);
          if (issued) metaParts.push('Issued ' + issued);
          metaParts.push(formatDateTime(item.created_at));
          return {
            key: item.id,
            href: '/license/' + item.id,
            primary: label,
            secondary: item.combadd || 'No address assigned',
            meta: metaParts.filter(Boolean).join(' • '),
          };
        },
      },
      {
        key: 'violations',
        title: 'Violations',
        viewAll: '/violations',
        items: Array.isArray(data.violations) ? data.violations : [],
        empty: 'No recent violations.',
        itemToRow: (item) => {
          const metaParts = [];
          if (item.deadline_date) {
            try {
              metaParts.push('Due ' + new Date(item.deadline_date).toLocaleDateString());
            } catch (err) {
              metaParts.push('Due ' + item.deadline_date);
            }
          }
          metaParts.push(formatDateTime(item.created_at));
          return {
            key: item.id,
            href: '/violation/' + item.id,
            primary: item.violation_type || 'Violation',
            secondary: item.combadd || (item.address_id ? 'Address #' + item.address_id : 'No address assigned'),
            meta: metaParts.filter(Boolean).join(' • '),
          };
        },
      },
      {
        key: 'permits',
        title: 'Permits',
        viewAll: '/permits',
        items: Array.isArray(data.permits) ? data.permits : [],
        empty: 'No recent permits.',
        itemToRow: (item) => {
          const metaParts = [];
          if (item.permit_number) metaParts.push('#' + item.permit_number);
          const issued = formatDate(item.date_issued);
          if (issued) metaParts.push('Issued ' + issued);
          metaParts.push(formatDateTime(item.created_at));
          return {
            key: item.id,
            href: '/permit/' + item.id,
            primary: item.permit_type || 'Permit',
            secondary: item.combadd || 'No address assigned',
            meta: metaParts.filter(Boolean).join(' • '),
          };
        },
      },
      {
        key: 'complaints',
        title: 'Complaints',
        viewAll: '/complaints',
        items: Array.isArray(data.complaints) ? data.complaints : [],
        empty: 'No recent complaints.',
        itemToRow: (item) => {
          const summary = item.description ? item.description.trim() : '';
          const truncated = summary.length > 80 ? summary.slice(0, 77) + '…' : summary;
          const status = item.status ? item.status : null;
          const metaParts = [];
          if (status) metaParts.push(status);
          metaParts.push(formatDateTime(item.created_at));
          return {
            key: item.id,
            href: '/complaint/' + item.id,
            primary: truncated || 'Complaint',
            secondary: item.address?.combadd || 'No address assigned',
            meta: metaParts.filter(Boolean).join(' • '),
          };
        },
      },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className={className}>
        <div className='rounded-lg bg-white p-4 shadow text-sm text-gray-500'>Loading recent activity…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className='rounded-lg bg-white p-4 shadow text-sm text-red-600'>{error}</div>
      </div>
    );
  }

  if (!sections.length) {
    return null;
  }

  return (
    <div className={className}>
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {sections.map((section) => (
          <div key={section.key} className='rounded-lg bg-white p-4 shadow'>
            <div className='mb-2 flex items-center justify-between'>
              <h3 className='text-sm font-semibold text-gray-900'>{section.title}</h3>
              <Link to={section.viewAll} className='text-xs font-medium text-indigo-700 hover:underline'>
                View all
              </Link>
            </div>
            {section.items.length === 0 ? (
              <p className='text-sm text-gray-500'>{section.empty}</p>
            ) : (
              <ul className='divide-y divide-gray-200'>
                {section.items.map((item) => {
                  const row = section.itemToRow(item);
                  return (
                    <li key={section.key + '-' + row.key} className='py-3'>
                      <Link to={row.href} className='block'>
                        <p className='text-sm font-medium text-gray-900'>{row.primary}</p>
                        {row.secondary && (
                          <p className='text-sm text-gray-600'>{row.secondary}</p>
                        )}
                        {row.meta && (
                          <p className='mt-1 text-xs text-gray-500'>{row.meta}</p>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRecentActivity;
