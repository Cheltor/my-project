import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { describeDueStatus, toEasternLocaleDateString, toEasternLocaleTimeString } from '../../utils';

const pad = (value) => String(value).padStart(2, '0');
const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};
const startOfWeek = (value) => {
  const date = startOfDay(value);
  const day = date.getDay();
  const offset = (day + 6) % 7; // make Monday the first day
  date.setDate(date.getDate() - offset);
  return date;
};
const addDays = (value, amount) => {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};
const toDateKey = (value) => `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const toTimeInputValue = (value) => {
  if (!value) return '09:00';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '09:00';
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${hours}:${minutes}`;
};

const formatWeekLabel = (start) => {
  const end = addDays(start, 4);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = toEasternLocaleDateString(start, undefined, { month: 'short', day: 'numeric' }) || '';
  const endLabel = toEasternLocaleDateString(end, undefined, { month: 'short', day: 'numeric' }) || '';
  const yearLabel = sameYear ? start.getFullYear() : `${start.getFullYear()} / ${end.getFullYear()}`;
  return `${startLabel} – ${endLabel}, ${yearLabel}`.trim();
};

const OnsWeekSchedule = ({ inspections = [], onScheduleSuccess = () => {} }) => {
  const apiBase = process.env.REACT_APP_API_URL || '';
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const today = useMemo(() => startOfDay(new Date()), []);
  const weekEnd = useMemo(() => addDays(weekAnchor, 4), [weekAnchor]);
  const rangeLabel = useMemo(() => formatWeekLabel(weekAnchor), [weekAnchor]);

  const [dragSource, setDragSource] = useState(null);
  const [activeDropKey, setActiveDropKey] = useState(null);
  const [pendingSchedule, setPendingSchedule] = useState(null);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  const unscheduledInspections = useMemo(
    () => (Array.isArray(inspections) ? inspections.filter((inspection) => !inspection?.scheduled_datetime) : []),
    [inspections]
  );

  const scheduledEvents = useMemo(() => {
    if (!Array.isArray(inspections)) return [];
    return inspections
      .filter((inspection) => inspection?.scheduled_datetime)
      .map((inspection) => {
        const scheduled = new Date(inspection.scheduled_datetime);
        if (Number.isNaN(scheduled.getTime())) return null;
        const dateKey = toDateKey(startOfDay(scheduled));
        const addressLabel =
          inspection.address?.combadd || inspection.combadd || inspection.address_label || '';
        const addressId = inspection.address?.id || inspection.address_id;
        return {
          key: `inspection-${inspection.id}`,
          id: inspection.id,
          title: inspection.source || 'Inspection',
          datetime: scheduled,
          dateKey,
          timeLabel: toEasternLocaleTimeString(scheduled, undefined, { hour: 'numeric', minute: '2-digit' }) || '',
          status: inspection.status || '',
          addressLabel,
          addressId,
          href: `/inspection/${inspection.id}`,
          dueMeta: describeDueStatus(inspection.scheduled_datetime, { hideWhenMissing: true }),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.datetime - b.datetime);
  }, [inspections]);

  const eventsForCurrentWeek = useMemo(() => {
    const endExclusive = addDays(weekEnd, 1);
    return scheduledEvents.filter((event) => event.datetime >= weekAnchor && event.datetime < endExclusive);
  }, [scheduledEvents, weekAnchor, weekEnd]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    eventsForCurrentWeek.forEach((event) => {
      const list = map.get(event.dateKey) || [];
      list.push(event);
      map.set(event.dateKey, list);
    });
    return map;
  }, [eventsForCurrentWeek]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }).map((_, index) => {
      const date = addDays(weekAnchor, index);
      return {
        key: toDateKey(date),
        weekday: WEEKDAY_LABELS[index],
        label: toEasternLocaleDateString(date, undefined, { month: 'short', day: 'numeric' }) || '',
        date,
      };
    });
  }, [weekAnchor]);

  const shiftWeek = (offset) => {
    setWeekAnchor((current) => addDays(current, offset * 7));
  };

  const resetToCurrentWeek = () => {
    setWeekAnchor(startOfWeek(new Date()));
  };

  const handleDragStart = (event, inspectionId, type) => {
    const id = String(inspectionId);
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
    setDragSource({ type, id });
  };

  const handleDragEnd = () => {
    setDragSource(null);
    setActiveDropKey(null);
  };

  const handleDragOver = (event) => {
    if (!dragSource) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (dayKey) => {
    if (!dragSource) return;
    setActiveDropKey(dayKey);
  };

  const handleDragLeave = (dayKey) => {
    if (activeDropKey === dayKey) {
      setActiveDropKey(null);
    }
  };

  const handleDrop = (event, day) => {
    event.preventDefault();
    setActiveDropKey(null);
    const source = dragSource;
    if (!source) return;
    const droppedId = event.dataTransfer.getData('text/plain') || source.id;
    if (!droppedId) return;
    const inspection = (Array.isArray(inspections) ? inspections : []).find(
      (item) => String(item?.id) === droppedId
    );
    if (!inspection) return;
    setPendingSchedule({ inspection, day: new Date(day.getTime()) });
    const defaultTime = source.type === 'scheduled' ? toTimeInputValue(inspection.scheduled_datetime) : '09:00';
    setScheduleTime(defaultTime);
    setScheduleError('');
    setDragSource(null);
  };

  const closeScheduleModal = () => {
    setPendingSchedule(null);
    setScheduleTime('09:00');
    setScheduleError('');
    setDragSource(null);
  };

  const scheduleInspection = async () => {
    if (!pendingSchedule) return;
    const { inspection, day } = pendingSchedule;
    const datePart = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
    const payload = `${datePart}T${scheduleTime}`;
    const fd = new FormData();
    fd.append('scheduled_datetime', payload);

    setSavingSchedule(true);
    setScheduleError('');

    try {
      const resp = await fetch(`${apiBase}/inspections/${inspection.id}/schedule`, {
        method: 'PATCH',
        body: fd,
      });
      if (!resp.ok) {
        let message = 'Failed to schedule inspection';
        try {
          const data = await resp.json();
          if (data?.detail) message = data.detail;
        } catch (err) {
          // ignore parse errors
        }
        throw new Error(message);
      }

      closeScheduleModal();
      if (typeof onScheduleSuccess === 'function') {
        onScheduleSuccess();
      }
    } catch (error) {
      setScheduleError(error.message || 'Failed to schedule inspection');
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Your scheduled week</h3>
          <p className="text-sm text-gray-600">Monday through Friday, focused on inspections assigned to you. Drag cards between days to reschedule.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{rangeLabel}</span>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              className="p-2 transition hover:text-indigo-600"
              aria-label="Previous week"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={resetToCurrentWeek}
              className="border-l border-r border-gray-200 px-3 text-sm font-semibold hover:text-indigo-600"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              className="p-2 transition hover:text-indigo-600"
              aria-label="Next week"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {unscheduledInspections.length > 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Unscheduled inspections</h4>
                    <p className="text-xs text-gray-600">Drag a card onto a weekday column to schedule</p>
            </div>
            <span className="text-xs font-medium text-gray-500">{unscheduledInspections.length} ready to schedule</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {unscheduledInspections.map((inspection) => (
              <div
                key={inspection.id}
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(event) => handleDragStart(event, inspection.id, 'unscheduled')}
                onDragEnd={handleDragEnd}
                className={`rounded-xl border-2 border-dashed bg-white p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  dragSource?.id === String(inspection.id) && dragSource?.type === 'unscheduled'
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-200'
                }`}
              >
                <p className="font-semibold text-gray-900">{inspection.source || 'Inspection'}</p>
                <p className="mt-1 text-xs text-gray-500">Drag to a weekday to schedule</p>
                {inspection.address?.combadd && (
                  <p className="mt-1 text-xs text-gray-600">{inspection.address.combadd}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">ID #{inspection.id}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {weekDays.map((day) => {
          const events = eventsByDay.get(day.key) || [];
          const isPast = today > day.date;
          const isActiveDrop = activeDropKey === day.key;
          return (
            <div
              key={day.key}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(day.key)}
              onDragLeave={() => handleDragLeave(day.key)}
              onDrop={(event) => handleDrop(event, day.date)}
              className={`rounded-xl border bg-gray-50/60 p-3 transition ${
                isActiveDrop ? 'border-indigo-400 ring-2 ring-indigo-300' : 'border-gray-100'
              } ${dragSource ? 'min-h-[220px]' : ''}`}
            >
              <div className="flex items-baseline justify-between border-b border-gray-200 pb-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{day.weekday}</p>
                  <p className="text-sm font-semibold text-gray-900">{day.label}</p>
                </div>
                {isPast && <span className="text-xs text-gray-400">Past</span>}
              </div>

              <div className="mt-3 space-y-3">
                {events.length === 0 ? (
                  <p className="text-xs text-gray-400">No scheduled work</p>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.key}
                      className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
                      draggable
                      onDragStart={(dragEvent) => handleDragStart(dragEvent, event.id, 'scheduled')}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900">{event.timeLabel || 'All day'}</span>
                        {event.status && <span className="text-[11px] text-gray-500">{event.status}</span>}
                      </div>
                      <Link to={event.href} className="mt-1 block text-indigo-700 hover:text-indigo-500">
                        {event.title}
                      </Link>
                      {event.addressLabel && (
                        event.addressId ? (
                          <Link
                            to={`/address/${event.addressId}`}
                            className="text-xs text-indigo-600 hover:text-indigo-500"
                          >
                            {event.addressLabel}
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-600">{event.addressLabel}</span>
                        )
                      )}
                      {event.dueMeta && (
                        <div className={`mt-1 text-xs font-semibold ${event.dueMeta.tone}`}>
                          {event.dueMeta.label}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {eventsForCurrentWeek.length === 0 && unscheduledInspections.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">
          No inspections need attention this week. Use the controls above to explore other weeks.
        </p>
      )}

      {pendingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-semibold text-gray-900">Set a time</h4>
            <p className="mt-1 text-sm text-gray-600">
              {pendingSchedule.inspection.source || 'Inspection'} on{' '}
              {toEasternLocaleDateString(pendingSchedule.day, undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <label className="mt-4 block text-sm font-medium text-gray-700">
              Time of day
              <input
                type="time"
                value={scheduleTime}
                onChange={(event) => setScheduleTime(event.target.value)}
                className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </label>
            {scheduleError && <p className="mt-2 text-sm text-rose-600">{scheduleError}</p>}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeScheduleModal}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                disabled={savingSchedule}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={scheduleInspection}
                disabled={savingSchedule || !scheduleTime}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingSchedule ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-90"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Saving…
                  </span>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnsWeekSchedule;
