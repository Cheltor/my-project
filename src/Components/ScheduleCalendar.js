import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  MapPinIcon,
  UserIcon,
} from '@heroicons/react/20/solid';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { classNames } from '../utils';

const pad = (value) => String(value).padStart(2, '0');
const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date, amount) => startOfMonth(new Date(date.getFullYear(), date.getMonth() + amount, 1));
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
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const ScheduleCalendar = () => {
  const [inspections, setInspections] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [calendarInitialized, setCalendarInitialized] = useState(true); // Default to today; do not auto-jump to the first event

  const handleGoToToday = () => {
    const now = new Date();
    const todayStart = startOfDay(now);
    setCurrentMonth(startOfMonth(todayStart));
    setSelectedDate(todayStart);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${process.env.REACT_APP_API_URL}/inspections/`).then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to fetch inspections')))),
      fetch(`${process.env.REACT_APP_API_URL}/complaints/`).then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to fetch complaints')))),
    ])
      .then(([inspectionData, complaintData]) => {
        if (cancelled) return;
        setInspections(Array.isArray(inspectionData) ? inspectionData : []);
        setComplaints(Array.isArray(complaintData) ? complaintData : []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Unable to load scheduled items.');
        setInspections([]);
        setComplaints([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const scheduledEvents = useMemo(() => {
    const events = [];

    inspections.forEach((inspection) => {
      if (!inspection?.scheduled_datetime) return;
      const scheduled = new Date(inspection.scheduled_datetime);
      if (Number.isNaN(scheduled.getTime())) return;

      events.push({
        id: `inspection-${inspection.id}`,
        entityId: inspection.id,
        entityType: 'inspection',
        type: inspection.source || 'Inspection',
        status: inspection.status || '',
        datetime: scheduled,
        dayKey: toDateKey(startOfDay(scheduled)),
        dateLabel: DATE_FORMATTER.format(scheduled),
        timeLabel: TIME_FORMATTER.format(scheduled),
        location: inspection.address?.combadd || inspection.address_label || '',
        inspectorName: (
          inspection.inspector?.name ||
          inspection.assigned_to?.name ||
          inspection.inspector_name ||
          inspection.assigned_to_name ||
          inspection.assigned_inspector ||
          inspection.assigned_user?.name ||
          ''
        ),
        href: `/inspection/${inspection.id}`,
      });
    });

    complaints.forEach((complaint) => {
      if (!complaint?.scheduled_datetime) return;
      const scheduled = new Date(complaint.scheduled_datetime);
      if (Number.isNaN(scheduled.getTime())) return;

      events.push({
        id: `complaint-${complaint.id}`,
        entityId: complaint.id,
        entityType: 'complaint',
        type: complaint.source || 'Complaint',
        status: complaint.status || '',
        datetime: scheduled,
        dayKey: toDateKey(startOfDay(scheduled)),
        dateLabel: DATE_FORMATTER.format(scheduled),
        timeLabel: TIME_FORMATTER.format(scheduled),
        location: complaint.address?.combadd || complaint.address_label || '',
        inspectorName: (
          complaint.inspector?.name ||
          complaint.assigned_to?.name ||
          complaint.inspector_name ||
          complaint.assigned_to_name ||
          complaint.assigned_inspector ||
          complaint.assigned_user?.name ||
          ''
        ),
        href: `/complaint/${complaint.id}`,
      });
    });

    return events.sort((a, b) => a.datetime - b.datetime);
  }, [inspections, complaints]);

  useEffect(() => {
    if (calendarInitialized) return;
    if (scheduledEvents.length === 0) return;
    const firstEvent = scheduledEvents[0].datetime;
    setCurrentMonth(startOfMonth(firstEvent));
    setSelectedDate(startOfDay(firstEvent));
    setCalendarInitialized(true);
  }, [calendarInitialized, scheduledEvents]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    scheduledEvents.forEach((event) => {
      const list = map.get(event.dayKey) || [];
      list.push(event);
      map.set(event.dayKey, list);
    });
    return map;
  }, [scheduledEvents]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const calendarDays = useMemo(() => {
    const days = [];
    const start = getCalendarStart(currentMonth);
    const end = getCalendarEnd(currentMonth);
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const dayCopy = new Date(cursor);
      const key = toDateKey(dayCopy);
      days.push({
        key,
        dateObj: new Date(dayCopy),
        isCurrentMonth: dayCopy.getMonth() === currentMonth.getMonth(),
        isToday: isSameDay(dayCopy, today),
        isSelected: selectedDate ? isSameDay(dayCopy, selectedDate) : false,
        hasEvents: eventsByDay.has(key),
      });
    }
    return days;
  }, [currentMonth, eventsByDay, selectedDate, today]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = toDateKey(selectedDate);
    const events = eventsByDay.get(key) || [];
    return [...events].sort((a, b) => a.datetime - b.datetime);
  }, [eventsByDay, selectedDate]);

  const selectedDateLabel = selectedDate ? DATE_FORMATTER.format(selectedDate) : '';
  const monthLabel = MONTH_FORMATTER.format(currentMonth);
  const loadingScheduled = loading && scheduledEvents.length === 0;

  if (loadingScheduled) {
    return (
      <div className="max-w-5xl mx-auto py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Schedule Calendar</h1>
        <p className="mt-4 text-sm text-gray-600">Loading scheduled items…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Schedule Calendar</h1>
        <p className="mt-4 text-sm text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Schedule Calendar</h1>
          <p className="text-base text-gray-600">
            View inspections and complaints with scheduled dates across the town.
          </p>
        </div>
      </header>

      <div className="mt-10 lg:grid lg:grid-cols-12 lg:gap-x-12">
        <div className="order-last lg:order-none lg:col-span-5 xl:col-span-5">
          <div className="flex items-center text-gray-900 text-base">
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              className="-m-1.5 flex flex-none items-center justify-center p-2 text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Previous month</span>
              <ChevronLeftIcon aria-hidden="true" className="h-6 w-6" />
            </button>
            <div className="flex-auto text-base font-semibold">{monthLabel}</div>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="-m-1.5 flex flex-none items-center justify-center p-2 text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Next month</span>
              <ChevronRightIcon aria-hidden="true" className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={handleGoToToday}
              className="ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Today
            </button>
          </div>
          <div className="mt-6 grid grid-cols-7 text-sm font-semibold leading-6 text-gray-500">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>
          <div className="isolate mt-2 grid grid-cols-7 gap-px rounded-lg bg-gray-200 text-base shadow ring-1 ring-gray-200">
            {calendarDays.map((day) => (
              <button
                key={day.key}
                type="button"
                onClick={() => {
                  const normalized = startOfDay(day.dateObj);
                  setSelectedDate(normalized);
                  if (day.dateObj.getMonth() !== currentMonth.getMonth()) {
                    setCurrentMonth(startOfMonth(day.dateObj));
                  }
                }}
                className={classNames(
                  'relative py-2 focus:z-10 first:rounded-tl-lg last:rounded-br-lg',
                  day.isCurrentMonth ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100',
                  day.isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-600 font-semibold' : '',
                  !day.isSelected && day.isToday ? 'font-semibold text-indigo-600' : '',
                )}
              >
                <time
                  dateTime={day.key}
                  className={classNames(
                    'mx-auto flex h-8 w-8 items-center justify-center rounded-full',
                    day.isSelected ? 'bg-indigo-600 text-white' : '',
                  )}
                >
                  {day.dateObj.getDate()}
                </time>
                {day.hasEvents && !day.isSelected ? (
                  <span className="absolute bottom-1.5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-indigo-500" />
                ) : null}
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500" />
            <span>Indicates days with scheduled items</span>
          </div>
        </div>

        <div className="lg:col-span-7 xl:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Items on {selectedDateLabel}</h2>
              <p className="text-base text-gray-600">
                {selectedEvents.length === 0
                  ? 'No inspections or complaints scheduled for this day.'
                  : `${selectedEvents.length} scheduled item${selectedEvents.length > 1 ? 's' : ''}.`}
              </p>
            </div>
          </div>

          <ol className="mt-6 divide-y divide-gray-100 text-base leading-7">
            {selectedEvents.length === 0 ? (
              <li className="py-8 text-base text-gray-500">Choose another day in the calendar to view scheduled work.</li>
            ) : (
              selectedEvents.map((event) => (
                <li key={event.id} className="relative flex gap-x-5 py-7 xl:static">
                  <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-indigo-50 text-base font-semibold text-indigo-600">
                    {event.type.charAt(0)}
                  </div>
                  <div className="flex-auto">
                    <h3 className="pr-10 text-base font-semibold text-gray-900 xl:pr-0">
                      <Link to={event.href} className="hover:underline">
                        {event.type}
                      </Link>
                    </h3>
                    <dl className="mt-2 flex flex-col gap-2 text-gray-500 xl:flex-row xl:items-center xl:gap-5">
                      <div className="flex items-center gap-x-2">
                        <dt className="sr-only">Date</dt>
                        <CalendarIcon aria-hidden="true" className="h-6 w-6 text-gray-400" />
                        <dd>{event.dateLabel} at {event.timeLabel}</dd>
                      </div>
                      <div className="flex items-center gap-x-2">
                        <dt className="sr-only">Location</dt>
                        <MapPinIcon aria-hidden="true" className="h-6 w-6 text-gray-400" />
                        <dd>{event.location || 'Location not set'}</dd>
                      </div>
                      <div className="flex items-center gap-x-2">
                        <dt className="sr-only">Inspector</dt>
                        <UserIcon aria-hidden="true" className="h-6 w-6 text-gray-400" />
                        <dd>{event.inspectorName || 'Unassigned'}</dd>
                      </div>
                    </dl>
                    {event.status ? (
                      <div className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700">
                        {event.status}
                      </div>
                    ) : null}
                  </div>
                  <Menu as="div" className="absolute right-0 top-6 xl:relative xl:right-auto xl:top-auto xl:self-center">
                    <MenuButton className="relative flex items-center rounded-full p-1 text-gray-500 hover:text-gray-600">
                      <span className="absolute -inset-2" />
                      <span className="sr-only">Open event options</span>
                      <EllipsisHorizontalIcon aria-hidden="true" className="h-6 w-6" />
                    </MenuButton>
                    <MenuItems
                      transition
                      className="absolute right-0 z-10 mt-2 w-36 origin-top-right rounded-md bg-white shadow-lg outline outline-1 outline-black/5 transition data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                    >
                      <div className="py-1">
                        <MenuItem>
                          {({ active }) => (
                            <Link
                              to={event.href}
                              className={classNames('block px-4 py-2 text-sm', active ? 'bg-gray-100 text-gray-900' : 'text-gray-700')}
                            >
                              View details
                            </Link>
                          )}
                        </MenuItem>
                      </div>
                    </MenuItems>
                  </Menu>
                </li>
              ))
            )}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendar;
