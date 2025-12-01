import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  UsersIcon,
  ClockIcon,
  InboxStackIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { filterActiveOnsUsers, getRoleName, toEasternLocaleString } from '../utils';

const CLOSED_INSPECTION_KEYWORDS = ['complete', 'completed', 'closed', 'no violation', 'pass', 'resolved', 'satisfied'];
const CLOSED_COMPLAINT_STATUSES = new Set(['no violation found', 'closed', 'resolved', 'satisfied', 'satisfactory']);
const VIOLATION_STATUS_LABELS = { 0: 'current', 1: 'resolved', 2: 'pending trial', 3: 'dismissed' };
const SOON_WINDOW_DAYS = 7;

const normalizeText = (value) => (value ? String(value).toLowerCase() : '');

const normalizeComplaintStatus = (value) => {
  const normalized = normalizeText(value);
  if (normalized === 'unsatisfactory' || normalized === 'violation found' || normalized === 'violation') return 'violation found';
  if (normalized === 'satisfactory' || normalized === 'no violation found' || normalized === 'no violation') return 'no violation found';
  if (normalized === 'pending' || normalized === 'unknown') return 'pending';
  return normalized;
};

const normalizeViolationStatus = (value) => {
  if (typeof value === 'number' && VIOLATION_STATUS_LABELS[value] !== undefined) {
    return VIOLATION_STATUS_LABELS[value];
  }
  const normalized = normalizeText(value);
  if (!normalized) return 'current';
  if (normalized.includes('resolve')) return 'resolved';
  if (normalized.includes('dismiss')) return 'dismissed';
  if (normalized.includes('trial')) return 'pending trial';
  return normalized;
};

const isInspectionOpen = (inspection) => {
  const status = normalizeText(inspection?.status);
  if (!status) return true;
  return !CLOSED_INSPECTION_KEYWORDS.some((keyword) => status.includes(keyword));
};

const getScheduledDate = (inspection) => {
  const raw =
    inspection?.scheduled_datetime ||
    inspection?.scheduled_for ||
    inspection?.scheduled_date ||
    inspection?.scheduled_at;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isComplaintOpen = (complaint) => {
  const status = normalizeComplaintStatus(complaint?.status);
  if (!status) return true;
  return !CLOSED_COMPLAINT_STATUSES.has(status);
};

const isViolationOpen = (violation) => {
  const status = normalizeViolationStatus(violation?.status);
  return status !== 'resolved' && status !== 'dismissed';
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isOverdue = (date) => {
  if (!date) return false;
  return date.getTime() < Date.now();
};

const isDueSoon = (date) => {
  if (!date) return false;
  const diffDays = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= SOON_WINDOW_DAYS;
};

const resolveUserId = (entity) => {
  if (!entity) return null;
  if (entity.inspector_id) return entity.inspector_id;
  if (entity.user_id) return entity.user_id;
  if (entity.assigned_user_id) return entity.assigned_user_id;
  if (entity.inspector?.id) return entity.inspector.id;
  if (entity.user?.id) return entity.user.id;
  return null;
};

const buildWorkloadMetrics = (staff, inspections, complaints, violations) => {
  const staffMap = new Map();
  (Array.isArray(staff) ? staff : []).forEach((member) => {
    if (!member || member.id == null) return;
    staffMap.set(member.id, {
      id: member.id,
      name: member.name || member.email || `User #${member.id}`,
      email: member.email,
      role: getRoleName(member.role),
      openInspections: 0,
      dueSoon: 0,
      openComplaints: 0,
      openViolations: 0,
      overdueViolations: 0,
    });
  });

  const totals = {
    openInspections: 0,
    openComplaints: 0,
    openViolations: 0,
    overdueViolations: 0,
    dueSoon: 0,
  };

  const unassigned = { inspections: 0, complaints: 0, violations: 0 };

  (Array.isArray(inspections) ? inspections : []).forEach((inspection) => {
    if (!isInspectionOpen(inspection)) return;
    totals.openInspections += 1;
    const assigneeId = resolveUserId(inspection);
    const scheduledDate = getScheduledDate(inspection);
    if (!assigneeId || !staffMap.has(assigneeId)) {
      unassigned.inspections += 1;
      return;
    }
    const target = staffMap.get(assigneeId);
    target.openInspections += 1;
    if (isDueSoon(scheduledDate)) {
      target.dueSoon += 1;
      totals.dueSoon += 1;
    }
  });

  (Array.isArray(complaints) ? complaints : []).forEach((complaint) => {
    if (!isComplaintOpen(complaint)) return;
    totals.openComplaints += 1;
    const assigneeId = resolveUserId(complaint);
    if (!assigneeId || !staffMap.has(assigneeId)) {
      unassigned.complaints += 1;
      return;
    }
    staffMap.get(assigneeId).openComplaints += 1;
  });

  (Array.isArray(violations) ? violations : []).forEach((violation) => {
    if (!isViolationOpen(violation)) return;
    totals.openViolations += 1;
    const assigneeId = resolveUserId(violation);
    const deadline = parseDate(violation.deadline_date || violation.deadline);
    const overdue = isOverdue(deadline);
    const dueSoon = !overdue && isDueSoon(deadline);
    if (overdue) {
      totals.overdueViolations += 1;
    } else if (dueSoon) {
      totals.dueSoon += 1;
    }
    if (!assigneeId || !staffMap.has(assigneeId)) {
      unassigned.violations += 1;
      return;
    }
    const target = staffMap.get(assigneeId);
    target.openViolations += 1;
    if (overdue) target.overdueViolations += 1;
    if (dueSoon) target.dueSoon += 1;
  });

  const staffLoads = Array.from(staffMap.values()).map((entry) => {
    const loadScore =
      entry.openInspections * 1.5 +
      entry.openViolations * 1.25 +
      entry.overdueViolations * 0.75 +
      entry.openComplaints +
      entry.dueSoon * 0.5;
    return { ...entry, loadScore: Math.round(loadScore * 100) / 100 };
  });

  staffLoads.sort((a, b) => {
    if (b.loadScore !== a.loadScore) return b.loadScore - a.loadScore;
    return b.openViolations - a.openViolations;
  });

  const averageLoad = staffLoads.length
    ? staffLoads.reduce((sum, entry) => sum + entry.loadScore, 0) / staffLoads.length
    : 0;
  const maxLoad = staffLoads.reduce((max, entry) => Math.max(max, entry.loadScore), 0);

  return {
    staffLoads,
    totals,
    unassigned,
    averageLoad: Math.round(averageLoad * 100) / 100,
    maxLoad: maxLoad || 1,
  };
};

const buildUnassignedItems = (activeStaff, inspections, complaints, violations) => {
  const activeIds = new Set((activeStaff || []).map((s) => s.id));
  const items = [];

  const pushItem = (entry) => items.push({ ...entry, key: `${entry.type}-${entry.id}` });

  (Array.isArray(inspections) ? inspections : []).forEach((inspection) => {
    if (!isInspectionOpen(inspection)) return;
    const assigneeId = resolveUserId(inspection);
    if (assigneeId && activeIds.has(assigneeId)) return;
    pushItem({
      type: 'inspection',
      id: inspection.id,
      label: inspection?.address?.combadd || inspection?.combadd || 'Inspection',
      scheduledDate: getScheduledDate(inspection),
      status: inspection?.status || '',
    });
  });

  (Array.isArray(complaints) ? complaints : []).forEach((complaint) => {
    if (!isComplaintOpen(complaint)) return;
    const assigneeId = resolveUserId(complaint);
    if (assigneeId && activeIds.has(assigneeId)) return;
    pushItem({
      type: 'complaint',
      id: complaint.id,
      label: complaint?.address?.combadd || complaint?.combadd || 'Complaint',
      scheduledDate: complaint?.scheduled_datetime ? new Date(complaint.scheduled_datetime) : null,
      status: complaint?.status || '',
    });
  });

  (Array.isArray(violations) ? violations : []).forEach((violation) => {
    if (!isViolationOpen(violation)) return;
    const assigneeId = resolveUserId(violation);
    if (assigneeId && activeIds.has(assigneeId)) return;
    const deadline = parseDate(violation.deadline_date || violation.deadline);
    pushItem({
      type: 'violation',
      id: violation.id,
      label: violation.combadd || violation.address?.combadd || 'Violation',
      deadline,
      status: violation.status,
    });
  });

  return items.sort((a, b) => {
    const aUrgent = a.deadline ? (isOverdue(a.deadline) ? -2 : isDueSoon(a.deadline) ? -1 : 0) : 0;
    const bUrgent = b.deadline ? (isOverdue(b.deadline) ? -2 : isDueSoon(b.deadline) ? -1 : 0) : 0;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    return (b.scheduledDate || b.deadline || 0) - (a.scheduledDate || a.deadline || 0);
  });
};

const StatCard = ({ title, value, subtext, icon: Icon, tone = 'primary' }) => {
  const toneMap = {
    primary: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    warning: 'bg-amber-50 text-amber-700 ring-amber-200',
    danger: 'bg-rose-50 text-rose-700 ring-rose-200',
    neutral: 'bg-slate-50 text-slate-700 ring-slate-200',
  };
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
        </div>
      </div>
    </div>
  );
};

export default function StaffWorkloadDashboard() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [staffLoads, setStaffLoads] = useState([]);
  const [totals, setTotals] = useState({
    openInspections: 0,
    openComplaints: 0,
    openViolations: 0,
    overdueViolations: 0,
    dueSoon: 0,
  });
  const [unassigned, setUnassigned] = useState({ inspections: 0, complaints: 0, violations: 0 });
  const [averageLoad, setAverageLoad] = useState(0);
  const [maxLoad, setMaxLoad] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeStaff, setActiveStaff] = useState([]);
  const [unassignedItems, setUnassignedItems] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState({});
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [unassignedFilter, setUnassignedFilter] = useState('all');

  const loadData = useCallback(
    async ({ silent = false, signal } = {}) => {
      if (!user || user.role !== 3) return;
      const internalController = signal ? null : new AbortController();
      const activeSignal = signal || internalController.signal;
      if (!silent) setLoading(true);
      setRefreshing(true);
      setError('');
      try {
        const requests = [
          apiFetch('/users/ons/', { signal: activeSignal }, { onUnauthorized: logout }),
          apiFetch('/inspections/', { signal: activeSignal }, { onUnauthorized: logout }),
          apiFetch('/complaints/', { signal: activeSignal }, { onUnauthorized: logout }),
          apiFetch('/violations/?status=current&limit=500', { signal: activeSignal }, { onUnauthorized: logout }),
        ];

        const [staffRes, inspectionsRes, complaintsRes, violationsRes] = await Promise.all(requests);
        const parseJson = async (res, label) => {
          if (!res || !res.ok) {
            throw new Error(`Unable to load ${label}`);
          }
          return res.json();
        };

        const [staff, inspections, complaints, violations] = await Promise.all([
          parseJson(staffRes, 'staff'),
          parseJson(inspectionsRes, 'inspections'),
          parseJson(complaintsRes, 'complaints'),
          parseJson(violationsRes, 'violations'),
        ]);

        const activeStaff = filterActiveOnsUsers(staff);
        const metrics = buildWorkloadMetrics(activeStaff, inspections, complaints, violations);
        setStaffLoads(metrics.staffLoads);
        setTotals(metrics.totals);
        setUnassigned(metrics.unassigned);
        setAverageLoad(metrics.averageLoad);
        setMaxLoad(metrics.maxLoad);
        setLastUpdated(new Date());
        setActiveStaff(activeStaff);
        setUnassignedItems(buildUnassignedItems(activeStaff, inspections, complaints, violations));
      } catch (err) {
        if (activeSignal.aborted) return;
        setError(err.message || 'Failed to load workload data');
      } finally {
        if (activeSignal.aborted) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [logout, user]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData({ signal: controller.signal });
    return () => controller.abort();
  }, [loadData]);

  const overloaded = useMemo(
    () => staffLoads.filter((entry) => entry.loadScore > averageLoad * 1.25 && entry.loadScore > averageLoad + 1),
    [staffLoads, averageLoad]
  );

  const underutilized = useMemo(
    () => staffLoads.filter((entry) => entry.loadScore < Math.max(averageLoad * 0.75, averageLoad - 1)),
    [staffLoads, averageLoad]
  );

  const unassignedTotal = unassigned.inspections + unassigned.complaints + unassigned.violations;
  const staffOptions = activeStaff.map((s) => ({
    value: s.id,
    label: s.name || s.email || `User #${s.id}`,
  }));
  const filteredUnassignedItems =
    unassignedFilter === 'all'
      ? unassignedItems
      : unassignedItems.filter((item) => item.type === unassignedFilter);

  const handleAssign = async (item) => {
    const targetId = selectedAssignees[item.key];
    if (!targetId) {
      setAssignError('Choose an inspector before assigning.');
      return;
    }
    setAssigning(true);
    setAssignError('');
    try {
      const fd = new FormData();
      let url = '';
      if (item.type === 'violation') {
        fd.append('user_id', targetId);
        url = `/violation/${item.id}/assignee`;
      } else {
        fd.append('inspector_id', targetId);
        url = `/inspections/${item.id}/assignee`;
      }
      const res = await apiFetch(url, { method: 'PATCH', body: fd }, { onUnauthorized: logout });
      if (!res || !res.ok) {
        throw new Error('Failed to assign item');
      }
      setUnassignedItems((prev) => prev.filter((u) => u.key !== item.key));
      setSelectedAssignees((prev) => {
        const next = { ...prev };
        delete next[item.key];
        return next;
      });
      // Light refresh to sync counts
      loadData({ silent: true });
    } catch (err) {
      setAssignError(err.message || 'Unable to assign item');
    } finally {
      setAssigning(false);
    }
  };

  if (!user) return null;
  if (user.role !== 3) {
    return (
      <div className="rounded-xl bg-white p-6 shadow">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Admin access required</h1>
            <p className="text-sm text-gray-600">You need administrator permissions to view the workload dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Admin only</p>
          <h1 className="text-2xl font-bold text-gray-900">Staff Workload Balancing</h1>
          <p className="mt-1 text-sm text-gray-600">
            Live view of ONS workload across inspections, complaints, and violations so you can rebalance quickly.
          </p>
          {lastUpdated && (
            <p className="mt-1 text-xs text-gray-500">Updated {toEasternLocaleString(lastUpdated, 'en-US')}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5" />
            <div className="space-y-1">
              <p className="font-medium">Something went wrong</p>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => loadData()}
                className="text-indigo-700 underline decoration-indigo-400 decoration-2 underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((key) => (
            <div key={key} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active inspectors"
              value={staffLoads.length}
              subtext="ONS users with active assignments"
              icon={UsersIcon}
            />
            <StatCard
              title="Open inspections"
              value={totals.openInspections}
              subtext={`${totals.dueSoon} scheduled soon`}
              icon={ClockIcon}
              tone="neutral"
            />
            <StatCard
              title="Open violations"
              value={totals.openViolations}
              subtext={`${totals.overdueViolations} overdue deadlines`}
              icon={InboxStackIcon}
              tone={totals.overdueViolations > 0 ? 'warning' : 'neutral'}
            />
            <StatCard
              title="Unassigned items"
              value={unassignedTotal}
              subtext={`${unassigned.inspections} inspections | ${unassigned.complaints} complaints | ${unassigned.violations} violations`}
              icon={SparklesIcon}
              tone={unassignedTotal > 0 ? 'danger' : 'primary'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Load by staff member</p>
                  <p className="text-xs text-gray-500">
                    Load score weights inspections (1.5x) and open violations (1.25x), plus overdue and due-soon risk.
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  Avg load <span className="font-semibold text-gray-800">{averageLoad}</span>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Staff</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Inspections</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Complaints</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Violations</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Load</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {staffLoads.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">
                          No active ONS staff found.
                        </td>
                      </tr>
                    )}
                    {staffLoads.map((entry) => {
                      const loadPercent = Math.min(100, Math.round((entry.loadScore / maxLoad) * 100));
                      const aboveAvg = entry.loadScore > averageLoad * 1.1 && entry.loadScore > averageLoad + 0.5;
                      const belowAvg = entry.loadScore < Math.max(averageLoad * 0.85, averageLoad - 0.5);
                      return (
                        <tr key={entry.id} className="align-middle">
                          <td className="px-3 py-3">
                            <div className="font-semibold text-gray-900">{entry.name}</div>
                            <div className="text-xs text-gray-500">{entry.email}</div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-gray-900">{entry.openInspections}</div>
                            <div className="text-xs text-gray-500">
                              {entry.dueSoon} due soon
                            </div>
                          </td>
                          <td className="px-3 py-3 text-gray-900">{entry.openComplaints}</td>
                          <td className="px-3 py-3">
                            <div className="text-gray-900">{entry.openViolations}</div>
                            <div className="text-xs text-rose-600">
                              {entry.overdueViolations} overdue
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-28 rounded-full bg-gray-100">
                                <div
                                  className={`h-2 rounded-full ${aboveAvg ? 'bg-amber-500' : belowAvg ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                  style={{ width: `${loadPercent}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-gray-900">{entry.loadScore}</span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {aboveAvg ? 'Heavy load' : belowAvg ? 'Room for assignments' : 'Balanced'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-indigo-600" />
                <p className="text-sm font-semibold text-gray-900">Balancing cues</p>
              </div>
                <div className="mt-3 space-y-3 text-sm text-gray-700">
                  {overloaded.length === 0 && underutilized.length === 0 && (
                    <p className="text-gray-500">Workload is evenly distributed.</p>
                  )}
                  {overloaded.map((entry) => (
                    <div key={`heavy-${entry.id}`} className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-100">
                      <p className="font-semibold text-amber-800">{entry.name} is above average</p>
                      <p className="text-sm text-amber-700">
                        Load {entry.loadScore} vs avg {averageLoad}. Consider shifting a due-soon task to a lighter teammate.
                      </p>
                    </div>
                  ))}
                  {underutilized.map((entry) => (
                    <div key={`light-${entry.id}`} className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-100">
                      <p className="font-semibold text-emerald-800">{entry.name} can take more</p>
                      <p className="text-sm text-emerald-700">
                        Load {entry.loadScore}. Great candidate for unassigned items or follow-ups.
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <InboxStackIcon className="h-5 w-5 text-rose-600" />
                  <p className="text-sm font-semibold text-gray-900">Unassigned queue</p>
                </div>
                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Inspections</span>
                    <span className="font-semibold text-gray-900">{unassigned.inspections}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Complaints</span>
                    <span className="font-semibold text-gray-900">{unassigned.complaints}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Violations</span>
                    <span className="font-semibold text-gray-900">{unassigned.violations}</span>
                  </div>
                  {unassignedTotal === 0 ? (
                    <p className="text-xs text-emerald-600">All active items are assigned.</p>
                  ) : (
                    <>
                      <p className="text-xs text-rose-600">
                        Assign these first to spread the load; prioritise staff in green cards.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAssignModal(true)}
                        className="mt-2 w-full rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-rose-500"
                      >
                        Assign unassigned
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10">
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">Unassigned</p>
                <h3 className="text-lg font-bold text-gray-900">Assign open items</h3>
                <p className="text-xs text-gray-500">Select an inspector for each item. Only active inspectors are shown.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowAssignModal(false); setAssignError(''); }}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Close
              </button>
            </div>
            {assignError && (
              <div className="mx-6 mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {assignError}
              </div>
            )}
            <div className="flex items-center justify-between px-6 pt-4 text-sm text-gray-700">
              <span>
                Showing {filteredUnassignedItems.length} of {unassignedItems.length} unassigned items
              </span>
              <select
                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={unassignedFilter}
                onChange={(e) => setUnassignedFilter(e.target.value)}
              >
                <option value="all">All types</option>
                <option value="inspection">Inspections</option>
                <option value="complaint">Complaints</option>
                <option value="violation">Violations</option>
              </select>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-3">
              {filteredUnassignedItems.length === 0 ? (
                <p className="text-sm text-gray-600">Nothing to assign.</p>
              ) : (
                <div className="space-y-3">
                  {filteredUnassignedItems.map((item) => {
                    const isViolation = item.type === 'violation';
                    const urgency = isViolation && item.deadline
                      ? isOverdue(item.deadline)
                        ? 'Overdue'
                        : isDueSoon(item.deadline)
                          ? 'Due soon'
                          : ''
                      : '';
                    return (
                      <div key={item.key} className="rounded-lg border border-gray-200 px-3 py-3 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {item.type.charAt(0).toUpperCase() + item.type.slice(1)} #{item.id}
                            </p>
                            <p className="text-xs text-gray-600">{item.label}</p>
                            {urgency && (
                              <p className="text-xs font-semibold text-rose-600">{urgency}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              value={selectedAssignees[item.key] || ''}
                              onChange={(e) =>
                                setSelectedAssignees((prev) => ({ ...prev, [item.key]: e.target.value }))
                              }
                            >
                              <option value="">Select inspector</option>
                              {staffOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleAssign(item)}
                              disabled={assigning}
                              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                            >
                              {assigning ? 'Assigning...' : 'Assign'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-6 py-3">
              <button
                type="button"
                onClick={() => { setShowAssignModal(false); setAssignError(''); }}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
