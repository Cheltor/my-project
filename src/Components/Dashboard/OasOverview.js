import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toEasternLocaleDateString, toEasternLocaleString } from '../../utils';

const LICENSE_TYPE_LABELS = {
  0: 'Business License',
  1: 'Business License',
  2: 'Single Family License',
  3: 'Multifamily License',
};

const normalizeComplaintStatus = (status) => {
  if (!status) return 'Pending';
  const value = String(status).toLowerCase();
  if (value === 'unsatisfactory' || value === 'violation found' || value === 'violation') return 'Violation Found';
  if (value === 'satisfactory' || value === 'no violation found' || value === 'no violation') return 'No Violation Found';
  if (value === 'pending' || value === 'open' || value === 'unknown') return 'Pending';
  if (value === 'completed' || value === 'closed' || value === 'resolved') return 'Closed';
  return status;
};

const formatViolationType = (value) => {
  if (!value) return 'Violation';
  return String(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDate = (iso, { withTime = false } = {}) => {
  if (!iso) return '--';
  if (withTime) {
    const formatted = toEasternLocaleString(iso);
    return formatted || '--';
  }
  const formattedDate = toEasternLocaleDateString(iso);
  return formattedDate || '--';
};

const statusPillClass = (label) => {
  if (label === 'Violation Found') return 'bg-red-100 text-red-800';
  if (label === 'No Violation Found') return 'bg-green-100 text-green-800';
  if (label === 'Closed') return 'bg-gray-100 text-gray-700';
  return 'bg-yellow-100 text-yellow-800';
};

const PAGE_LIMIT = 10;

const TableSection = ({ title, description, viewAllHref, columns, rows, emptyMessage, footnote, topStat }) => (
  <div className="rounded-lg bg-white shadow">
    <div className="flex flex-col gap-1 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      {topStat && (
        <div className="mt-2 sm:mt-0">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
            <span className="mr-2 text-xs text-gray-500">{topStat.label}</span>
            <span className="text-sm font-semibold">{topStat.value}</span>
          </span>
        </div>
      )}
    </div>

    {rows.length === 0 ? (
      <>
        <p className="px-4 py-6 text-sm text-gray-500">{emptyMessage}</p>
        {footnote && (
          <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
            {footnote}
          </div>
        )}
        {viewAllHref && (
          <div className="px-4 py-3">
            <Link
              to={viewAllHref}
              className="block w-full text-center rounded-md border border-indigo-600 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            >
              View all
            </Link>
          </div>
        )}
      </>
    ) : (
      <>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.header}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={`${row.key}-${column.header}`} className="px-4 py-3 text-sm text-gray-700">
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {footnote && (
          <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
            {footnote}
          </div>
        )}
        {viewAllHref && (
          <div className="px-4 py-3">
            <Link
              to={viewAllHref}
              className="block w-full text-center rounded-md border border-indigo-600 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            >
              View all
            </Link>
          </div>
        )}
      </>
    )}
  </div>
);

const fetchOasOverview = async () => {
  const baseUrl = process.env.REACT_APP_API_URL || '';
  const response = await fetch(`${baseUrl}/dash/oas/overview`);
  if (!response.ok) {
    throw new Error('Failed to load OAS overview data');
  }
  return response.json();
};

const mapComplaintRows = (complaints = []) =>
  complaints.map((complaint) => ({
    key: `complaint-${complaint.id}`,
    id: complaint.id,
    status: normalizeComplaintStatus(complaint.status),
    statusRaw: complaint.status,
    source: complaint.source || 'Complaint',
    address: complaint.address,
    createdAt: complaint.created_at,
  }));

const mapViolationRows = (violations = []) =>
  violations.map((violation) => ({
    key: `violation-${violation.id}`,
    id: violation.id,
    violationType: formatViolationType(violation.violation_type),
    combadd: violation.combadd,
    addressId: violation.address_id,
    deadline: violation.deadline_date,
    updatedAt: violation.updated_at,
  }));

const createLicenseRow = (license) => ({
  key: `license-${license.id}`,
  id: license.id,
  inspectionId: license.inspection_id,
  licenseType: LICENSE_TYPE_LABELS[license.license_type] || 'License',
  licenseNumber: license.license_number,
  combadd: license.combadd,
  addressId: license.address_id,
  sent: license.sent,
  paid: license.paid,
  createdAt: license.created_at,
  needsPayment: false,
  needsSending: false,
});

const combineLicenseRows = (notPaid = [], notSent = []) => {
  const map = new Map();

  const ensureEntry = (license) => {
    if (!map.has(license.id)) {
      map.set(license.id, createLicenseRow(license));
    } else {
      const entry = map.get(license.id);
      entry.licenseType = LICENSE_TYPE_LABELS[license.license_type] || entry.licenseType;
      entry.licenseNumber = license.license_number ?? entry.licenseNumber;
      entry.combadd = entry.combadd || license.combadd;
      entry.addressId = entry.addressId || license.address_id;
      entry.sent = license.sent;
      entry.paid = license.paid;
      entry.createdAt = entry.createdAt || license.created_at;
    }
    return map.get(license.id);
  };

  notPaid.forEach((license) => {
    const entry = ensureEntry(license);
    entry.needsPayment = true;
  });

  notSent.forEach((license) => {
    const entry = ensureEntry(license);
    entry.needsSending = true;
  });

  return Array.from(map.values())
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, PAGE_LIMIT);
};

const OasOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const payload = await fetchOasOverview();
        if (!cancelled) {
          setData(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load OAS overview');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(() => {
    if (!data) return [];

    const pendingComplaints = mapComplaintRows(data.pending_complaints || []).filter(
      (row) => row.status === 'Pending'
    );

    const violationRows = mapViolationRows(data.active_violations || []);

    const licenseRows = combineLicenseRows(data.licenses_not_paid || [], data.licenses_not_sent || []);

    return [
      {
        key: 'complaints',
        title: 'Pending Complaints',
        description: 'Complaints awaiting resolution or follow-up.',
        viewAll: '/complaints',
        empty: 'There are no pending complaints.',
        rows: pendingComplaints,
        columns: [
          {
            header: 'Complaint',
            render: (row) => (
              <Link to={`/complaint/${row.id}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                {row.source}
              </Link>
            ),
          },
          {
            header: 'Status',
            render: (row) => (
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClass(row.status)}`}>
                {row.status}
              </span>
            ),
          },
          {
            header: 'Address',
            render: (row) =>
              row.address ? (
                <Link to={`/address/${row.address.id}`} className="text-indigo-600 hover:text-indigo-500">
                  {row.address.combadd}
                </Link>
              ) : (
                <span className="text-gray-500">No address</span>
              ),
          },
          {
            header: 'Created',
            render: (row) => <span>{formatDate(row.createdAt)}</span>,
          },
        ],
      },
      {
        key: 'violations',
        title: 'Current Violations',
        description: 'Active violations across all properties.',
        viewAll: '/violations',
        empty: 'There are no active violations.',
        rows: violationRows,
  topStat: { label: 'Total', value: (data.active_violations_count ?? (data.active_violations || []).length) },
        columns: [
          {
            header: 'Violation',
            render: (row) => (
              <Link to={`/violation/${row.id}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                {row.violationType}
              </Link>
            ),
          },
          {
            header: 'Address',
            render: (row) =>
              row.addressId ? (
                <Link to={`/address/${row.addressId}`} className="text-indigo-600 hover:text-indigo-500">
                  {row.combadd || 'Address'}
                </Link>
              ) : (
                <span className="text-gray-500">No address</span>
              ),
          },
          {
            header: 'Deadline',
            render: (row) => <span>{formatDate(row.deadline, { withTime: true })}</span>,
          },
          {
            header: 'Updated',
            render: (row) => <span>{formatDate(row.updatedAt, { withTime: true })}</span>,
          },
        ],
      },
      {
        key: 'licenses',
        title: 'Licenses Needing Action',
        description: 'Licenses awaiting payment and/or delivery.',
        viewAll: '/licenses',
        empty: 'No licenses require follow-up.',
        rows: licenseRows,
        topStat: { label: 'Needs action', value: (data.licenses_needing_action_count ?? licenseRows.length) },
        columns: [
          {
            header: 'License',
            render: (row) => (
              <Link to={`/license/${row.id}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                {row.licenseType}
              </Link>
            ),
          },
          {
            header: 'Address',
            render: (row) =>
              row.addressId ? (
                <Link to={`/address/${row.addressId}`} className="text-indigo-600 hover:text-indigo-500">
                  {row.combadd || 'Address'}
                </Link>
              ) : (
                <span className="text-gray-500">No address</span>
              ),
          },
          {
            header: 'Status',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    row.needsPayment ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}
                >
                  {row.needsPayment ? 'Payment Due' : 'Paid'}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    row.needsSending ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}
                >
                  {row.needsSending ? 'Not Sent' : 'Sent'}
                </span>
              </div>
            ),
          },
          {
            header: 'Created',
            render: (row) => <span>{formatDate(row.createdAt)}</span>,
          },
        ],
      },
    ];
  }, [data]);

  if (loading) {
    return <div className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow">Loading OAS overview...</div>;
  }

  if (error) {
    return <div className="rounded-lg bg-white p-6 text-sm text-red-600 shadow">{error}</div>;
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {sections.map((section) => (
          <TableSection
            key={section.key}
            title={section.title}
            description={section.description}
            viewAllHref={section.viewAll}
            columns={section.columns}
            rows={section.rows}
            emptyMessage={section.empty}
            footnote={section.footnote}
            topStat={section.topStat}
          />
        ))}
      </div>
    </div>
  );
};

export default OasOverview;




