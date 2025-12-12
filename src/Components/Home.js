/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import Welcome from './Dashboard/Welcome';
import WeeklyStats from './Dashboard/WeeklyStats';
import RecentComments from './Dashboard/RecentComments';
import AdminRecentActivity from './Dashboard/AdminRecentActivity';
import OasOverview from './Dashboard/OasOverview';
import OnsWeekSchedule from './Dashboard/OnsWeekSchedule';
import NewComplaint from './Inspection/NewComplaint';
import NewViolationForm from './Inspection/NewViolationForm';
import NewMFLicense from './Inspection/NewMFLicense';
import NewSFLicense from './Inspection/NewSFLicense';
import NewBuildingPermit from './Inspection/NewBuildingPermit';
import NewBusinessLicense from './Inspection/NewBusinessLicense';
import { useAuth } from '../AuthContext';
import ReviewLaterComments from './Dashboard/ReviewLaterComments';
import UserActivityTimeline from './Dashboard/UserActivityTimeline';
import { toEasternLocaleString, describeDueStatus } from '../utils';

export default function Example() {
  const { user } = useAuth();
  const apiBase = process.env.REACT_APP_API_URL || '';
  const [showNewComplaint, setShowNewComplaint] = useState(false); // State to toggle NewComplaint form
  const [showNewMFLicense, setShowNewMFLicense] = useState(false); // State to toggle NewMFLicense form
  const [showNewSFLicense, setShowNewSFLicense] = useState(false); // State to toggle NewSFLicense form
  const [showNewBuildingPermit, setShowNewBuildingPermit] = useState(false); // State to toggle NewBuildingPermit form
  const [showNewBusinessLicense, setShowNewBusinessLicense] = useState(false); // State to toggle NewBusinessLicense form
  const [showNewViolationForm, setShowNewViolationForm] = useState(false); // State to toggle NewViolationForm
  const [showAdminWidgets, setShowAdminWidgets] = useState(false); // Admin widgets toggle
  const [emailTestStatus, setEmailTestStatus] = useState(null);
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false); // Collapse the quick action buttons when not needed
  const [onsSummary, setOnsSummary] = useState(null);
  const [onsLoading, setOnsLoading] = useState(false);
  const [onsError, setOnsError] = useState(null);
  const [onsReloadVersion, setOnsReloadVersion] = useState(0);
  const [onsCardsExpanded, setOnsCardsExpanded] = useState(false);
  const [oasSummary, setOasSummary] = useState(null);
  const [oasLoading, setOasLoading] = useState(false);
  const [oasError, setOasError] = useState(null);
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);

  const closeAllForms = useCallback(() => {
    setShowNewComplaint(false);
    setShowNewMFLicense(false);
    setShowNewSFLicense(false);
    setShowNewBuildingPermit(false);
    setShowNewBusinessLicense(false);
    setShowNewViolationForm(false);
  }, []);

  const toggleNewComplaint = useCallback(() => {
    setShowNewComplaint(prev => !prev);
    setShowNewMFLicense(false);
    setShowNewSFLicense(false);
    setShowNewBuildingPermit(false);
    setShowNewBusinessLicense(false);
    setShowNewViolationForm(false);
  }, []);

  const toggleNewMFLicense = useCallback(() => {
    setShowNewMFLicense(prev => !prev);
    setShowNewComplaint(false);
    setShowNewSFLicense(false);
    setShowNewBuildingPermit(false);
    setShowNewBusinessLicense(false);
    setShowNewViolationForm(false);
  }, []);

  const toggleNewSFLicense = useCallback(() => {
    setShowNewSFLicense(prev => !prev);
    setShowNewComplaint(false);
    setShowNewMFLicense(false);
    setShowNewBuildingPermit(false);
    setShowNewBusinessLicense(false);
    setShowNewViolationForm(false);
  }, []);

  const toggleNewBuildingPermit = useCallback(() => {
    setShowNewBuildingPermit(prev => !prev);
    setShowNewComplaint(false);
    setShowNewMFLicense(false);
    setShowNewSFLicense(false);
    setShowNewBusinessLicense(false);
    setShowNewViolationForm(false);
  }, []);

  const toggleNewBusinessLicense = useCallback(() => {
    setShowNewBusinessLicense(prev => !prev);
    setShowNewComplaint(false);
    setShowNewMFLicense(false);
    setShowNewSFLicense(false);
    setShowNewBuildingPermit(false);
    setShowNewViolationForm(false);
  }, []);

  const toggleNewViolationForm = useCallback(() => {
    setShowNewViolationForm(prev => !prev);
    setShowNewComplaint(false);
    setShowNewMFLicense(false);
    setShowNewSFLicense(false);
    setShowNewBuildingPermit(false);
    setShowNewBusinessLicense(false);
  }, []);

  const toggleAdminWidgets = useCallback(() => {
    setShowAdminWidgets((prev) => !prev);
  }, []);

  const toggleQuickActions = useCallback(() => {
    setShowQuickActions((prev) => {
      if (prev) {
        closeAllForms();
      }
      return !prev;
    });
  }, [closeAllForms]);
  
  const toggleOnsCards = useCallback(() => {
    setOnsCardsExpanded((prev) => !prev);
  }, []);

  const sendTestEmail = useCallback(async () => {
    setEmailTestLoading(true);
    setEmailTestStatus(null);
    try {
      const res = await fetch(`${apiBase}/notifications/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
        },
        body: JSON.stringify({
          subject: 'Admin test notification email',
          body: 'This is a test email triggered from the Admin dashboard.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Failed to send test email');
      setEmailTestStatus(`Sent (email_sent=${data.email_sent ? 'true' : 'false'}, id=${data.notification_id})`);
    } catch (e) {
      setEmailTestStatus(`Error: ${e.message}`);
    } finally {
      setEmailTestLoading(false);
    }
  }, [apiBase]);

  const isOns = user?.role === 1;
  const isOas = user?.role === 2;
  const isAdmin = user?.role === 3;
  const showOnsSection = isOns;
  const showOasSection = isOas;

  const normalizeComplaintStatus = useCallback((status) => {
    if (!status) return 'Pending';
    const value = String(status).toLowerCase();
    if (value === 'unsatisfactory' || value === 'violation found' || value === 'violation') return 'Violation Found';
    if (value === 'satisfactory' || value === 'no violation found' || value === 'no violation') return 'No Violation Found';
    if (value === 'pending' || value === 'unknown' || value === 'open') return 'Pending';
    return status;
  }, []);

  const isToday = useCallback((iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }, []);

  useEffect(() => {
    if (!user || !isOns) return;
    let cancelled = false;

    const load = async () => {
      setOnsLoading(true);
      setOnsError(null);
      try {
        const [inspectionsRes, complaintsRes, violationsRes] = await Promise.all([
          fetch(`${apiBase}/dash/inspections/${user.id}`),
          fetch(`${apiBase}/complaints/`),
          fetch(`${apiBase}/dash/violations/${user.id}`),
        ]);

        if (!inspectionsRes.ok) throw new Error('Failed to load inspections');
        if (!complaintsRes.ok) throw new Error('Failed to load complaints');
        if (!violationsRes.ok) throw new Error('Failed to load violations');

        const [inspections, complaints, violations] = await Promise.all([
          inspectionsRes.json(),
          complaintsRes.json(),
          violationsRes.json(),
        ]);

        if (cancelled) return;

        const sortedInspections = [...inspections].sort((a, b) => {
          const aDate = a?.scheduled_datetime ? new Date(a.scheduled_datetime).getTime() : Infinity;
          const bDate = b?.scheduled_datetime ? new Date(b.scheduled_datetime).getTime() : Infinity;
          return aDate - bDate;
        });

        const pendingComplaints = complaints
          .filter((complaint) => normalizeComplaintStatus(complaint.status) === 'Pending')
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        const activeViolations = [...violations].sort((a, b) => {
          const da = a?.deadline_date ? new Date(a.deadline_date).getTime() : Infinity;
          const db = b?.deadline_date ? new Date(b.deadline_date).getTime() : Infinity;
          return da - db;
        });

        setOnsSummary({
          inspections: sortedInspections.slice(0, 5),
          allInspections: sortedInspections,
          inspectionsCount: sortedInspections.length,
          inspectionsToday: sortedInspections.filter((item) => isToday(item.scheduled_datetime)).length,
          complaints: pendingComplaints.slice(0, 5),
          complaintsCount: pendingComplaints.length,
          violations: activeViolations.slice(0, 5),
          violationsCount: activeViolations.length,
        });
      } catch (error) {
        if (!cancelled) setOnsError(error.message || 'Failed to load ONS data');
      } finally {
        if (!cancelled) setOnsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, isOns, apiBase, onsReloadVersion]);

  const triggerOnsRefresh = () => setOnsReloadVersion((prev) => prev + 1);

  useEffect(() => {
    if (!user || !isOas) return;
    let cancelled = false;

    const load = async () => {
      setOasLoading(true);
      setOasError(null);
      try {
        const res = await fetch(`${apiBase}/dash/oas/overview`);
        if (!res.ok) throw new Error('Failed to load OAS data');
        const payload = await res.json();
        if (cancelled) return;

        const pendingComplaints = (payload.pending_complaints || [])
          .map((complaint) => ({
            ...complaint,
            normalizedStatus: normalizeComplaintStatus(complaint.status),
          }))
          .filter((complaint) => complaint.normalizedStatus === 'Pending');

        const licenseMap = new Map();
        const upsertLicense = (license, needsPayment = false, needsSending = false) => {
          const existing = licenseMap.get(license.id) || {
            ...license,
            needsPayment: false,
            needsSending: false,
          };
          licenseMap.set(license.id, {
            ...existing,
            ...license,
            needsPayment: existing.needsPayment || needsPayment,
            needsSending: existing.needsSending || needsSending,
          });
        };

        (payload.licenses_not_paid || []).forEach((license) => upsertLicense(license, true, false));
        (payload.licenses_not_sent || []).forEach((license) => upsertLicense(license, false, true));

        const licenseEntries = Array.from(licenseMap.values());

        setOasSummary({
          pendingComplaints: pendingComplaints.slice(0, 5),
          pendingComplaintsCount: pendingComplaints.length,
          licensesNeedingAction: licenseEntries.length,
          needsPayment: licenseEntries.filter((item) => item.needsPayment).length,
          needsSending: licenseEntries.filter((item) => item.needsSending).length,
          raw: payload,
        });
      } catch (error) {
        if (!cancelled) setOasError(error.message || 'Failed to load OAS data');
      } finally {
        if (!cancelled) setOasLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, isOas, apiBase]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    let cancelled = false;

    const load = async () => {
      setAdminLoading(true);
      setAdminError(null);
      try {
        const res = await fetch(`${apiBase}/dash/reporting`);
        if (!res.ok) throw new Error('Failed to load reporting metrics');
        const payload = await res.json();
        if (cancelled) return;
        setAdminSummary(payload);
      } catch (error) {
        if (!cancelled) setAdminError(error.message || 'Failed to load reporting metrics');
      } finally {
        if (!cancelled) setAdminLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, apiBase]);

  const quickActionButtons = useMemo(() => {
    const actions = [
      {
        id: 'violation',
        label: showNewViolationForm ? 'Hide Violation Form' : 'New Violation Form',
        state: showNewViolationForm,
        toggle: toggleNewViolationForm,
        color: 'bg-red-700',
        roles: [1, 3],
      },
      {
        id: 'complaint',
        label: showNewComplaint ? 'Hide Complaint Form' : 'New Complaint Form',
        state: showNewComplaint,
        toggle: toggleNewComplaint,
        color: 'bg-indigo-700',
        roles: [1, 2, 3],
      },
      {
        id: 'mf-license',
        label: showNewMFLicense ? 'Hide Multifamily License Form' : 'New Multifamily License Application',
        state: showNewMFLicense,
        toggle: toggleNewMFLicense,
        color: 'bg-emerald-700',
        roles: [1, 2, 3],
      },
      {
        id: 'sf-license',
        label: showNewSFLicense ? 'Hide Single Family License Form' : 'New Single Family License Application',
        state: showNewSFLicense,
        toggle: toggleNewSFLicense,
        color: 'bg-teal-700',
        roles: [1, 2, 3],
      },
      {
        id: 'building-permit',
        label: showNewBuildingPermit ? 'Hide Building Permit Form' : 'New Building Permit Application',
        state: showNewBuildingPermit,
        toggle: toggleNewBuildingPermit,
        color: 'bg-violet-700',
        roles: [1, 3],
      },
      {
        id: 'business-license',
        label: showNewBusinessLicense ? 'Hide Business License Form' : 'New Business License Application',
        state: showNewBusinessLicense,
        toggle: toggleNewBusinessLicense,
        color: 'bg-orange-700',
        roles: [1, 2, 3],
      },
    ];

    if (!user) return [];
    return actions.filter((action) => action.roles.includes(user.role));
  }, [
    user,
    showNewViolationForm,
    showNewComplaint,
    showNewMFLicense,
    showNewSFLicense,
    showNewBuildingPermit,
    showNewBusinessLicense,
    toggleNewViolationForm,
    toggleNewComplaint,
    toggleNewMFLicense,
    toggleNewSFLicense,
    toggleNewBuildingPermit,
    toggleNewBusinessLicense,
  ]);

  const formatDateTime = (iso) => toEasternLocaleString(iso) || 'Unscheduled';

  const onsHighlights = useMemo(() => {
    if (!onsSummary) return [];
    return [
      {
        label: 'Pending Inspections',
        value: onsSummary.inspectionsCount,
        helper: onsSummary.inspectionsToday ? `${onsSummary.inspectionsToday} scheduled today` : 'No inspections today',
        tone: 'indigo',
      },
      {
        label: 'Pending Complaints',
        value: onsSummary.complaintsCount,
        helper: onsSummary.complaintsCount ? 'Awaiting follow-up' : 'All clear',
        tone: 'amber',
      },
      {
        label: 'Active Violations',
        value: onsSummary.violationsCount,
        helper: onsSummary.violationsCount ? 'Needs action' : 'None assigned',
        tone: 'rose',
      },
    ];
  }, [onsSummary]);

  const onsCounts = useMemo(() => {
    if (!onsSummary) return { inspections: 0, complaints: 0, violations: 0 };
    return {
      inspections: onsSummary.inspectionsCount ?? onsSummary.inspections?.length ?? 0,
      complaints: onsSummary.complaintsCount ?? onsSummary.complaints?.length ?? 0,
      violations: onsSummary.violationsCount ?? onsSummary.violations?.length ?? 0,
    };
  }, [onsSummary]);

  const oasHighlights = useMemo(() => {
    if (!oasSummary) return [];
    return [
      {
        label: 'Pending Complaints',
        value: oasSummary.pendingComplaintsCount,
        tone: 'indigo',
      },
      {
        label: 'Licenses Needing Action',
        value: oasSummary.licensesNeedingAction,
        helper: `${oasSummary.needsPayment} payment · ${oasSummary.needsSending} delivery`,
        tone: 'emerald',
      },
    ];
  }, [oasSummary]);

  const adminHighlights = useMemo(() => {
    if (!adminSummary) return [];
    const avgAge = adminSummary?.aging?.average_age ?? '—';
    const totalOpen = adminSummary?.aging?.total_open ?? '—';
    const complianceRate = (() => {
      const counts = adminSummary?.compliance?.counts;
      const total = adminSummary?.compliance?.total_licenses || 0;
      if (!counts || !total) return '0%';
      const valid = counts.Valid || 0;
      return `${Math.round((valid / total) * 100)}%`;
    })();

    return [
      {
        label: 'Average Case Age',
        value: typeof avgAge === 'number' ? `${avgAge} days` : avgAge,
        helper: 'Open enforcement cases',
        tone: 'indigo',
      },
      {
        label: 'Open Cases',
        value: totalOpen,
        helper: 'Across ONS team',
        tone: 'amber',
      },
      {
        label: 'Compliance Rate',
        value: complianceRate,
        helper: 'Valid vs total rentals',
        tone: 'emerald',
      },
    ];
  }, [adminSummary]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <Welcome />
      {(isOns || isOas || isAdmin) && (
        <>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={toggleQuickActions}
              className="inline-flex items-center rounded-xl border border-transparent bg-gradient-to-r from-indigo-600 to-purple-700 px-5 py-2 text-sm font-semibold text-white shadow-lg transition transform hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
            >
              {showQuickActions ? 'Hide Quick Actions' : 'Show Quick Actions'}
            </button>
          </div>

          {showQuickActions && quickActionButtons.length > 0 && (
            <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-5 shadow">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {quickActionButtons.map((button) => (
                  <button
                    key={button.id}
                    type="button"
                    onClick={button.toggle}
                    className={`relative flex items-center rounded-xl border border-transparent px-6 py-4 text-left text-sm font-semibold text-white shadow-lg transition hover:-translate-y-[2px] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ${button.color}`}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showNewViolationForm && (
            <NewViolationForm isOpen={showNewViolationForm} onClose={() => setShowNewViolationForm(false)} />
          )}
          {showNewComplaint && (
            <NewComplaint isOpen={showNewComplaint} onClose={() => setShowNewComplaint(false)} />
          )}
          {showNewMFLicense && (
            <NewMFLicense isOpen={showNewMFLicense} onClose={() => setShowNewMFLicense(false)} renderAsModal />
          )}
          {showNewSFLicense && (
            <NewSFLicense isOpen={showNewSFLicense} onClose={() => setShowNewSFLicense(false)} renderAsModal />
          )}
          {showNewBuildingPermit && (
            <NewBuildingPermit isOpen={showNewBuildingPermit} onClose={() => setShowNewBuildingPermit(false)} renderAsModal />
          )}
          {showNewBusinessLicense && (
            <NewBusinessLicense isOpen={showNewBusinessLicense} onClose={() => setShowNewBusinessLicense(false)} renderAsModal />
          )}
        </>
      )}

      {showOnsSection && (
        <SectionShell
          title="ONS Overview"
          description={isOns ? 'Everything assigned to you today' : 'What ONS inspectors are watching'}
        >
          <SectionState loading={onsLoading} error={onsError} hasData={!!onsSummary}>
            {onsSummary && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {onsHighlights.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                  ))}
                </div>

                {isOns && (
                  <div className="mt-6">
                    <WeeklyStats />
                  </div>
                )}

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <MiniListCard
                    title="Upcoming Inspections"
                    items={onsSummary.inspections}
                    emptyLabel="No pending inspections"
                    footerLink="/inspections"
                    footerLabel="View all inspections"
                    collapsible
                    isOpen={onsCardsExpanded}
                    onToggle={toggleOnsCards}
                    count={onsCounts.inspections}
                    renderItem={(inspection) => {
                      const dueMeta = describeDueStatus(inspection.scheduled_datetime);
                      return (
                        <div className="flex flex-col gap-1">
                          <Link to={`/inspection/${inspection.id}`} className="font-semibold text-indigo-700">
                            {inspection.source || 'Inspection'}
                          </Link>
                          <span className="text-sm text-gray-500">
                            {inspection.scheduled_datetime ? formatDateTime(inspection.scheduled_datetime) : 'Not yet scheduled'}
                          </span>
                          {inspection.address?.id ? (
                            <Link to={`/address/${inspection.address.id}`} className="text-sm text-indigo-600 hover:text-indigo-500">
                              {inspection.address.combadd || 'View address'}
                            </Link>
                          ) : (
                            inspection.address?.combadd && <span className="text-sm text-gray-600">{inspection.address.combadd}</span>
                          )}
                          {dueMeta && <span className={`text-xs font-semibold ${dueMeta.tone}`}>{dueMeta.label}</span>}
                        </div>
                      );
                    }}
                  />
                  <MiniListCard
                    title="Pending Complaints"
                    items={onsSummary.complaints}
                    emptyLabel="No pending complaints"
                    footerLink="/complaints"
                    footerLabel="Review complaints"
                    collapsible
                    isOpen={onsCardsExpanded}
                    onToggle={toggleOnsCards}
                    count={onsCounts.complaints}
                    renderItem={(complaint) => (
                      <div className="flex flex-col gap-1">
                        <Link to={`/complaint/${complaint.id}`} className="font-semibold text-indigo-700">
                          Complaint #{complaint.id}
                        </Link>
                        <span className="text-sm text-gray-500">Filed {formatDateTime(complaint.created_at)}</span>
                        {complaint.address?.id ? (
                          <Link to={`/address/${complaint.address.id}`} className="text-sm text-indigo-600 hover:text-indigo-500">
                            {complaint.address.combadd || 'View address'}
                          </Link>
                        ) : (
                          complaint.address?.combadd && <span className="text-sm text-gray-600">{complaint.address.combadd}</span>
                        )}
                      </div>
                    )}
                  />
                  <MiniListCard
                    title="Active Violations"
                    items={onsSummary.violations}
                    emptyLabel="No active violations"
                    footerLink="/violations"
                    footerLabel="View violations"
                    collapsible
                    isOpen={onsCardsExpanded}
                    onToggle={toggleOnsCards}
                    count={onsCounts.violations}
                    renderItem={(violation) => {
                      const dueMeta = describeDueStatus(violation.deadline_date, { hideWhenMissing: true });
                      return (
                        <div className="flex flex-col gap-1">
                          <Link to={`/violation/${violation.id}`} className="font-semibold text-indigo-700">
                            {violation.violation_type || 'Violation'}
                          </Link>
                          {violation.combadd && violation.address_id ? (
                            <Link to={`/address/${violation.address_id}`} className="text-sm text-indigo-600 hover:text-indigo-500">
                              {violation.combadd}
                            </Link>
                          ) : (
                            violation.combadd && <span className="text-sm text-gray-600">{violation.combadd}</span>
                          )}
                          {dueMeta && <span className={`text-xs font-semibold ${dueMeta.tone}`}>{dueMeta.label}</span>}
                        </div>
                      );
                    }}
                  />
                </div>

                {isOns && (
                  <div className="mt-6">
                    <OnsWeekSchedule
                      inspections={onsSummary.allInspections || []}
                      onScheduleSuccess={triggerOnsRefresh}
                    />
                  </div>
                )}

                {isOns && (
                  <>
                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <RecentComments limit={8} />
                      <ReviewLaterComments limit={6} />
                    </div>
                  </>
                )}
              </>
            )}
          </SectionState>
        </SectionShell>
      )}

      {showOasSection && (
        <SectionShell
          title="OAS Overview"
          description={isOas ? 'Stay ahead of pending complaints and licenses' : 'What OAS staff are monitoring'}
        >
          <SectionState loading={oasLoading} error={oasError} hasData={!!oasSummary}>
            {oasSummary && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {oasHighlights.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                  ))}
                </div>
                <div className="mt-6">
                  <OasOverview prefetchedData={oasSummary.raw} hideViolations />
                </div>
              </>
            )}
          </SectionState>
        </SectionShell>
      )}

      {isAdmin && (
        <SectionShell title="Administration" description="Case aging, compliance, and communications">
          <SectionState loading={adminLoading} error={adminError} hasData={!!adminSummary}>
            {adminSummary && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {adminHighlights.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                  ))}
                </div>
                <div className="mt-6">
                  <WeeklyStats />
                </div>
                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <RecentComments limit={8} />
                  <ReviewLaterComments limit={6} />
                </div>
                <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Admin tools</h3>
                    <p className="text-sm text-gray-600">Send yourself a test notification to confirm email delivery.</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={sendTestEmail}
                      disabled={emailTestLoading}
                      className="inline-flex items-center rounded-lg border border-transparent bg-gradient-to-r from-sky-700 to-blue-800 px-5 py-2 text-sm font-semibold text-white shadow-lg transition transform hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {emailTestLoading ? 'Sending…' : 'Send Test Email'}
                    </button>
                    {emailTestStatus && <span className="text-sm text-gray-700">{emailTestStatus}</span>}
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={toggleAdminWidgets}
                    className="inline-flex items-center rounded-lg border border-transparent bg-gradient-to-r from-amber-700 to-orange-800 px-5 py-2 text-sm font-semibold text-white shadow-lg transition transform hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                  >
                    {showAdminWidgets ? 'Hide Admin Activity' : 'Show Admin Activity'}
                  </button>
                </div>
                {showAdminWidgets && (
                  <div className="mt-6">
                    <AdminRecentActivity limit={5} />
                  </div>
                )}
                <div className="mt-8">
                  <UserActivityTimeline />
                </div>
              </>
            )}
          </SectionState>
        </SectionShell>
      )}
    </div>
  );
}

const toneStyles = {
  indigo: 'from-indigo-500 to-indigo-600 text-indigo-700',
  amber: 'from-amber-400 to-amber-500 text-amber-700',
  emerald: 'from-emerald-400 to-emerald-500 text-emerald-700',
  rose: 'from-rose-400 to-rose-500 text-rose-700',
};

const StatCard = ({ label, value, helper, tone = 'indigo' }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <p className="text-sm font-medium text-gray-500">{label}</p>
    <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
    <p className={`mt-1 text-sm font-medium ${toneStyles[tone] || toneStyles.indigo}`}>{helper}</p>
  </div>
);

const SectionShell = ({ title, description, children }) => (
  <section className="mt-10">
    <div className="mb-4">
      <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
    </div>
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 shadow-inner">
      {children}
    </div>
  </section>
);

const SectionState = ({ loading, error, hasData, children }) => {
  if (loading) {
    return <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">Loading…</div>;
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!hasData) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">No data available.</div>;
  }
  return children;
};

const MiniListCard = ({
  title,
  count,
  items,
  emptyLabel,
  footerLink,
  footerLabel,
  renderItem,
  collapsible = false,
  isOpen = true,
  onToggle = () => { },
}) => (
  <div className="flex h-full flex-col rounded-2xl border border-white/70 bg-white p-4 shadow-sm">
    {collapsible ? (
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left text-base font-semibold text-gray-900"
      >
        <span className="flex items-center gap-2">
          {title}
          {typeof count !== 'undefined' && (
            <span className="text-sm font-semibold text-indigo-600">{count}</span>
          )}
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
    ) : (
      <div className="flex items-center justify-between text-base font-semibold text-gray-900">
        <span>{title}</span>
        {typeof count !== 'undefined' && (
          <span className="text-sm font-semibold text-indigo-600">{count}</span>
        )}
      </div>
    )}
    {(!collapsible || isOpen) ? (
      <>
        <div className="mt-3 space-y-3">
          {items && items.length > 0 ? (
            items.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 text-sm text-gray-800">
                {renderItem(item)}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">{emptyLabel}</p>
          )}
        </div>
        {footerLink && (
          <div className="mt-auto pt-4">
            <Link to={footerLink} className="text-sm font-semibold text-indigo-700 hover:text-indigo-500">
              {footerLabel}
            </Link>
          </div>
        )}
      </>
    ) : (
      <p className="mt-2 text-xs text-gray-500">Click to show details</p>
    )}
  </div>
);
