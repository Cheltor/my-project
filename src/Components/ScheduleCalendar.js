import React, { useEffect, useMemo, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  MapPinIcon,
  UserIcon,
  ClockIcon,
  ListBulletIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from '@heroicons/react/20/solid';
import { Menu, Transition, Dialog } from '@headlessui/react';

// Helper functions
const pad = (value) => String(value).padStart(2, '0');
const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfWeek = (date) => {
  const d = new Date(date);
  // Monday start
  const dayOfWeek = d.getDay(); // 0 (Sun) to 6 (Sat)
  const dist = (dayOfWeek + 6) % 7; // 0 (Mon) ... 6 (Sun)
  d.setDate(d.getDate() - dist);
  d.setHours(0,0,0,0);
  return d;
};
const addMonths = (date, amount) => startOfMonth(new Date(date.getFullYear(), date.getMonth() + amount, 1));
const addWeeks = (date, amount) => {
  const d = new Date(date);
  d.setDate(d.getDate() + amount * 7);
  return d;
};
const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const isSameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const getCalendarStart = (date) => {
  const first = startOfMonth(date);
  const weekday = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - weekday);
  return start;
};
const getCalendarEnd = (date) => {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const weekday = (last.getDay() + 6) % 7;
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - weekday));
  return end;
};

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const classNames = (...classes) => classes.filter(Boolean).join(' ');

// Color Helpers
const getTypeColor = (type, status) => {
  const t = (type || '').toLowerCase();
  const s = (status || '').toLowerCase();

  if (s.includes('complete') || s.includes('pass')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (s.includes('fail') || s.includes('violation')) return 'bg-rose-100 text-rose-800 border-rose-200';

  if (t.includes('complaint')) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-indigo-100 text-indigo-800 border-indigo-200';
};

const getDotColor = (type, status) => {
  const t = (type || '').toLowerCase();
  const s = (status || '').toLowerCase();

  if (s.includes('complete') || s.includes('pass')) return 'bg-emerald-500';
  if (s.includes('fail') || s.includes('violation')) return 'bg-rose-500';

  if (t.includes('complaint')) return 'bg-amber-500';
  return 'bg-indigo-500';
};


const ScheduleCalendar = () => {
  const [inspections, setInspections] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View State
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'list'
  const [currentDate, setCurrentDate] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));

  // Filters
  const [filterInspector, setFilterInspector] = useState('');
  const [filterType, setFilterType] = useState('All'); // 'All', 'Inspection', 'Complaint'

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${process.env.REACT_APP_API_URL}/inspections/`).then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to fetch inspections')))),
      fetch(`${process.env.REACT_APP_API_URL}/complaints/`).then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to fetch complaints')))),
    ])
      .then(([inspectionData, complaintData]) => {
        setInspections(Array.isArray(inspectionData) ? inspectionData : []);
        setComplaints(Array.isArray(complaintData) ? complaintData : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Unable to load scheduled items.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const rawEvents = useMemo(() => {
    const events = [];

    const processItem = (item, category) => {
      if (!item?.scheduled_datetime) return;
      const scheduled = new Date(item.scheduled_datetime);
      if (Number.isNaN(scheduled.getTime())) return;

      const displayType = item.source || category;

      const inspectorName = (
          item.inspector?.name ||
          item.assigned_to?.name ||
          item.inspector_name ||
          item.assigned_to_name ||
          item.assigned_inspector ||
          item.assigned_user?.name ||
          'Unassigned'
      );

      events.push({
        id: `${category.toLowerCase()}-${item.id}`,
        entityId: item.id,
        category: category, // 'Inspection' or 'Complaint'
        rawType: displayType,
        status: item.status || '',
        datetime: scheduled,
        dayKey: toDateKey(startOfDay(scheduled)),
        dateLabel: DATE_FORMATTER.format(scheduled),
        timeLabel: TIME_FORMATTER.format(scheduled),
        fullDateLabel: FULL_DATE_FORMATTER.format(scheduled),
        location: item.address?.combadd || item.address_label || '',
        inspectorName: inspectorName,
        href: category === 'Complaint' ? `/complaint/${item.id}` : `/inspection/${item.id}`,
        colorClass: getTypeColor(category, item.status),
        dotClass: getDotColor(category, item.status),
      });
    };

    inspections.forEach(i => processItem(i, 'Inspection'));
    complaints.forEach(c => processItem(c, 'Complaint'));

    return events.sort((a, b) => a.datetime - b.datetime);
  }, [inspections, complaints]);

  // Filtering
  const uniqueInspectors = useMemo(() => {
    const s = new Set();
    rawEvents.forEach(e => {
        if (e.inspectorName && e.inspectorName !== 'Unassigned') s.add(e.inspectorName);
    });
    return Array.from(s).sort();
  }, [rawEvents]);

  const filteredEvents = useMemo(() => {
    return rawEvents.filter(event => {
        if (filterType !== 'All' && event.category !== filterType) return false;
        if (filterInspector && event.inspectorName !== filterInspector) return false;
        return true;
    });
  }, [rawEvents, filterType, filterInspector]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach((event) => {
      const list = map.get(event.dayKey) || [];
      list.push(event);
      map.set(event.dayKey, list);
    });
    return map;
  }, [filteredEvents]);

  // View Navigation Helpers
  const handlePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => addWeeks(prev, -1));
    } else {
      setCurrentDate(prev => addMonths(prev, -1));
    }
  };

  const handleNext = () => {
     if (viewMode === 'week') {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => addMonths(prev, 1));
    }
  };

  const handleToday = () => {
    const now = startOfDay(new Date());
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // View Days Generation
  const calendarDays = useMemo(() => {
    if (viewMode === 'list') return []; // List view handles its own dates

    const days = [];
    let start, end;

    if (viewMode === 'week') {
      start = startOfWeek(currentDate);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    } else {
      start = getCalendarStart(currentDate);
      end = getCalendarEnd(currentDate);
    }

    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const dayCopy = new Date(cursor);
      const key = toDateKey(dayCopy);
      days.push({
        key,
        dateObj: new Date(dayCopy),
        isCurrentMonth: dayCopy.getMonth() === currentDate.getMonth(),
        isToday: isSameDay(dayCopy, new Date()),
        isSelected: isSameDay(dayCopy, selectedDate),
        events: eventsByDay.get(key) || [],
      });
    }
    return days;
  }, [currentDate, eventsByDay, selectedDate, viewMode]);

  const listViewEvents = useMemo(() => {
     // For list view, show all filtered events for the current month
     const start = startOfMonth(currentDate);
     const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
     end.setHours(23, 59, 59, 999);
     return filteredEvents.filter(e => e.datetime >= start && e.datetime <= end);
  }, [filteredEvents, currentDate]);

  // Event Handlers
  const handleEventClick = (event, e) => {
    e.stopPropagation(); // Prevent date selection
    setEditingEvent(event);
    // Convert to local datetime string for input
    const d = new Date(event.datetime);
    const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setRescheduleTime(isoLocal);
    setSaveMessage('');
    setIsEditModalOpen(true);
  };

  const saveReschedule = async () => {
    if (!editingEvent) return;
    setSavingSchedule(true);
    setSaveMessage('');
    try {
        const fd = new FormData();
        fd.append('scheduled_datetime', rescheduleTime);
        // Endpoint: /inspections/{id}/schedule
        // Note: Complaints also use the /inspections/ endpoint for scheduling updates in this system
        // (consistent with ComplaintDetail.js).
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${editingEvent.entityId}/schedule`, {
            method: 'PATCH',
            body: fd,
        });
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.detail || 'Failed to update schedule');
        }
        setSaveMessage('Saved successfully!');
        // Refresh data
        fetchData();
        // Close after short delay
        setTimeout(() => setIsEditModalOpen(false), 1000);
    } catch (e) {
        setSaveMessage(`Error: ${e.message}`);
    } finally {
        setSavingSchedule(false);
    }
  };

  const headerLabel = useMemo(() => {
      if (viewMode === 'week') {
          const start = startOfWeek(currentDate);
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          return `${DATE_FORMATTER.format(start)} - ${DATE_FORMATTER.format(end)}, ${start.getFullYear()}`;
      }
      return MONTH_FORMATTER.format(currentDate);
  }, [viewMode, currentDate]);


  if (loading && inspections.length === 0) {
      return (
        <div className="max-w-5xl mx-auto py-10 px-4">
          <p className="text-sm text-gray-500">Loading schedule...</p>
        </div>
      );
  }

  return (
    <div className="max-w-screen-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header & Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
           <p className="text-sm text-gray-500">Manage upcoming inspections and complaints.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
            {/* View Toggle */}
            <span className="isolate inline-flex rounded-md shadow-sm">
                <button
                    type="button"
                    onClick={() => setViewMode('month')}
                    className={classNames(
                        "relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-semibold ring-1 ring-inset focus:z-10",
                        viewMode === 'month' ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-gray-900 ring-gray-300 hover:bg-gray-50"
                    )}
                >
                    <Squares2X2Icon className="h-5 w-5 mr-1" />
                    Month
                </button>
                <button
                    type="button"
                    onClick={() => setViewMode('week')}
                    className={classNames(
                        "relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold ring-1 ring-inset focus:z-10",
                        viewMode === 'week' ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-gray-900 ring-gray-300 hover:bg-gray-50"
                    )}
                >
                    <TableCellsIcon className="h-5 w-5 mr-1" />
                    Week
                </button>
                <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={classNames(
                        "relative -ml-px inline-flex items-center rounded-r-md px-3 py-2 text-sm font-semibold ring-1 ring-inset focus:z-10",
                        viewMode === 'list' ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-gray-900 ring-gray-300 hover:bg-gray-50"
                    )}
                >
                    <ListBulletIcon className="h-5 w-5 mr-1" />
                    List
                </button>
            </span>

            {/* Filters */}
            <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="block rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
                <option value="All">All Types</option>
                <option value="Inspection">Inspections</option>
                <option value="Complaint">Complaints</option>
            </select>

            <select
                value={filterInspector}
                onChange={(e) => setFilterInspector(e.target.value)}
                className="block rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
                <option value="">All Inspectors</option>
                {uniqueInspectors.map(name => (
                    <option key={name} value={name}>{name}</option>
                ))}
            </select>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-t-lg border border-gray-200">
         <div className="flex items-center gap-2">
             <button onClick={handlePrevious} className="p-1 rounded-full hover:bg-gray-100 text-gray-600">
                 <ChevronLeftIcon className="h-5 w-5" />
             </button>
             <h2 className="text-lg font-semibold text-gray-900 min-w-[150px] text-center">{headerLabel}</h2>
             <button onClick={handleNext} className="p-1 rounded-full hover:bg-gray-100 text-gray-600">
                 <ChevronRightIcon className="h-5 w-5" />
             </button>
         </div>
         <button onClick={handleToday} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
             Today
         </button>
      </div>

      {/* Calendar Grid - Month View */}
      {viewMode === 'month' && (
        <div className="border border-t-0 border-gray-200 bg-gray-200 rounded-b-lg overflow-hidden">
            <div className="grid grid-cols-7 gap-px bg-gray-200 text-center text-xs font-semibold leading-6 text-gray-700 bg-gray-100">
                <div className="bg-white py-2">Mon</div>
                <div className="bg-white py-2">Tue</div>
                <div className="bg-white py-2">Wed</div>
                <div className="bg-white py-2">Thu</div>
                <div className="bg-white py-2">Fri</div>
                <div className="bg-white py-2">Sat</div>
                <div className="bg-white py-2">Sun</div>
            </div>
            <div className="grid grid-cols-7 grid-rows-5 gap-px bg-gray-200">
                {calendarDays.map((day) => (
                    <div
                        key={day.key}
                        onClick={() => setSelectedDate(day.dateObj)}
                        className={classNames(
                            "min-h-[120px] bg-white p-2 relative hover:bg-gray-50 cursor-pointer transition",
                            !day.isCurrentMonth ? "bg-gray-50 text-gray-400" : "text-gray-900",
                            day.isSelected ? "ring-2 ring-inset ring-indigo-600 z-10" : ""
                        )}
                    >
                        <time
                            dateTime={day.key}
                            className={classNames(
                                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                                day.isToday ? "bg-indigo-600 text-white" : ""
                            )}
                        >
                            {day.dateObj.getDate()}
                        </time>

                        <div className="mt-2 space-y-1">
                            {day.events.slice(0, 4).map(event => (
                                <button
                                    key={event.id}
                                    onClick={(e) => handleEventClick(event, e)}
                                    className={`w-full text-left text-[10px] truncate px-1.5 py-0.5 rounded border-l-2 ${event.colorClass}`}
                                >
                                    {event.timeLabel} {event.rawType}
                                </button>
                            ))}
                            {day.events.length > 4 && (
                                <div className="text-[10px] text-gray-500 pl-1">
                                    + {day.events.length - 4} more
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Calendar Grid - Week View */}
      {viewMode === 'week' && (
        <div className="border border-t-0 border-gray-200 bg-gray-200 rounded-b-lg overflow-hidden">
             <div className="grid grid-cols-7 gap-px bg-gray-200 text-center text-xs font-semibold leading-6 text-gray-700">
                 {calendarDays.map(day => (
                     <div key={`head-${day.key}`} className={classNames("bg-white py-2", day.isToday ? "text-indigo-600" : "")}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(day.dateObj.getDay() + 6) % 7]}
                        <span className={classNames("ml-1 rounded-full w-6 h-6 inline-flex items-center justify-center", day.isToday ? "bg-indigo-600 text-white" : "")}>
                             {day.dateObj.getDate()}
                        </span>
                     </div>
                 ))}
             </div>
             <div className="grid grid-cols-7 gap-px bg-gray-200 min-h-[500px]">
                 {calendarDays.map(day => (
                     <div key={day.key} className="bg-white p-2 space-y-2">
                         {day.events.map(event => (
                             <div
                                key={event.id}
                                onClick={(e) => handleEventClick(event, e)}
                                className={`p-2 rounded border text-xs cursor-pointer hover:shadow-md transition ${event.colorClass}`}
                             >
                                 <div className="font-semibold">{event.timeLabel}</div>
                                 <div className="truncate font-medium">{event.rawType}</div>
                                 <div className="truncate text-gray-500 mt-1">{event.location}</div>
                             </div>
                         ))}
                     </div>
                 ))}
             </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
          <div className="border border-t-0 border-gray-200 bg-white rounded-b-lg p-6">
              {listViewEvents.length === 0 ? (
                  <p className="text-center text-gray-500 py-10">No events scheduled for {MONTH_FORMATTER.format(currentDate)} matching filters.</p>
              ) : (
                  <div className="space-y-6">
                      {listViewEvents.reduce((acc, event) => {
                          const last = acc[acc.length - 1];
                          if (!last || last.dateKey !== event.dayKey) {
                              acc.push({ dateKey: event.dayKey, label: event.fullDateLabel, events: [event] });
                          } else {
                              last.events.push(event);
                          }
                          return acc;
                      }, []).map(group => (
                          <div key={group.dateKey}>
                              <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-3 sticky top-0 bg-white z-10">
                                  {group.label}
                              </h3>
                              <div className="space-y-3">
                                  {group.events.map(event => (
                                      <div key={event.id} className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${event.colorClass.split(' ')[0]} ${event.colorClass.split(' ')[1]}`}>
                                              {event.rawType.charAt(0)}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <div className="flex justify-between items-start">
                                                  <h4 className="text-sm font-semibold text-gray-900">
                                                      <Link to={event.href} className="hover:underline">{event.rawType} #{event.entityId}</Link>
                                                  </h4>
                                                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${event.colorClass}`}>
                                                      {event.status || 'Pending'}
                                                  </span>
                                              </div>
                                              <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                                                  <span className="flex items-center gap-1">
                                                      <ClockIcon className="h-4 w-4 text-gray-400" />
                                                      {event.timeLabel}
                                                  </span>
                                                  <span className="flex items-center gap-1">
                                                      <MapPinIcon className="h-4 w-4 text-gray-400" />
                                                      {event.location}
                                                  </span>
                                                  <span className="flex items-center gap-1">
                                                      <UserIcon className="h-4 w-4 text-gray-400" />
                                                      {event.inspectorName}
                                                  </span>
                                              </div>
                                          </div>
                                          <button
                                              onClick={(e) => handleEventClick(event, e)}
                                              className="p-1 text-gray-400 hover:text-indigo-600"
                                          >
                                              <span className="sr-only">Edit</span>
                                              <EllipsisHorizontalIcon className="h-5 w-5" />
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* Selected Day Details (Only for Month View, below the grid) */}
      {viewMode === 'month' && selectedDate && (
          <div className="mt-8 border-t border-gray-200 pt-8">
              <h3 className="text-lg font-semibold text-gray-900">
                  {FULL_DATE_FORMATTER.format(selectedDate)}
              </h3>
              <div className="mt-4">
                  {(() => {
                      const key = toDateKey(selectedDate);
                      const events = eventsByDay.get(key) || [];
                      if (events.length === 0) return <p className="text-gray-500">No events scheduled.</p>;
                      return (
                          <ul className="divide-y divide-gray-100">
                              {events.map(event => (
                                  <li key={event.id} className="flex gap-x-4 py-4">
                                      <div className={`h-10 w-10 flex-none rounded-full flex items-center justify-center text-sm font-semibold ${event.colorClass.split(' ')[0]} ${event.colorClass.split(' ')[1]}`}>
                                          {event.rawType.charAt(0)}
                                      </div>
                                      <div className="flex-auto">
                                          <div className="flex items-baseline justify-between gap-x-4">
                                               <p className="text-sm font-semibold leading-6 text-gray-900">
                                                   <Link to={event.href} className="hover:underline">{event.rawType}</Link>
                                               </p>
                                               <p className="flex-none text-xs text-gray-500">
                                                   <time datetime={event.datetime.toISOString()}>{event.timeLabel}</time>
                                               </p>
                                          </div>
                                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600">{event.location}</p>
                                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                              <span>{event.inspectorName}</span>
                                              <span className="text-gray-300">•</span>
                                              <button onClick={(e) => handleEventClick(event, e)} className="text-indigo-600 hover:text-indigo-500">
                                                  Reschedule
                                              </button>
                                          </div>
                                      </div>
                                  </li>
                              ))}
                          </ul>
                      );
                  })()}
              </div>
          </div>
      )}

      {/* Legend */}
      <div className="mt-10 border-t border-gray-200 pt-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Color Key</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-indigo-500"></span>
            <span className="text-sm text-gray-600">Inspection</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-sm text-gray-600">Complaint</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-sm text-gray-600">Completed / Passed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-rose-500"></span>
            <span className="text-sm text-gray-600">Violation / Failed</span>
          </div>
        </div>
      </div>

      {/* Edit/Reschedule Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4 sm:p-6" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl transition-all">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Reschedule Event
                  </h3>

                  {editingEvent && (
                      <div className="space-y-4">
                          <div className="text-sm text-gray-500 space-y-1">
                              <p><span className="font-semibold text-gray-700">Type:</span> {editingEvent.rawType}</p>
                              <p><span className="font-semibold text-gray-700">Location:</span> {editingEvent.location}</p>
                              <p><span className="font-semibold text-gray-700">Inspector:</span> {editingEvent.inspectorName}</p>
                          </div>

                          <div>
                              <label className="block text-sm font-medium text-gray-700">New Date & Time</label>
                              <input
                                  type="datetime-local"
                                  value={rescheduleTime}
                                  onChange={(e) => setRescheduleTime(e.target.value)}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                          </div>

                          {saveMessage && (
                              <div className={`text-sm ${saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                                  {saveMessage}
                              </div>
                          )}

                          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                              <button
                                  type="button"
                                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
                                  onClick={saveReschedule}
                                  disabled={savingSchedule}
                              >
                                  {savingSchedule ? 'Saving...' : 'Save Changes'}
                              </button>
                              <button
                                  type="button"
                                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                                  onClick={() => setIsEditModalOpen(false)}
                              >
                                  Cancel
                              </button>
                              <Link
                                to={editingEvent.href}
                                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                              >
                                View Details
                              </Link>
                          </div>
                      </div>
                  )}
            </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendar;
