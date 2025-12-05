import React, { useEffect, useState, Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { MegaphoneIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function AnnouncementModal() {
  const { user, token, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!token || !user) return;

    // Fetch unread announcements
    const fetchUnread = async () => {
      try {
        const res = await apiFetch('/announcements/unread', {}, { onUnauthorized: logout });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setAnnouncements(data);
            setOpen(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch announcements', err);
      }
    };

    fetchUnread();
  }, [token, user, logout]);

  const handleDismiss = async () => {
    if (announcements.length === 0) {
        setOpen(false);
        return;
    }

    const current = announcements[currentIndex];

    // Mark as read in background
    try {
      await apiFetch(`/announcements/${current.id}/read`, { method: 'POST' }, { onUnauthorized: logout });
    } catch (e) {
      console.error('Failed to mark announcement as read', e);
    }

    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setOpen(false);
    }
  };

  const handleDismissAll = async () => {
      // Mark all displayed announcements as read
      // We do this by iterating. In a real app with many, we might want a bulk endpoint.
      for (const ann of announcements) {
          try {
             await apiFetch(`/announcements/${ann.id}/read`, { method: 'POST' }, { onUnauthorized: logout });
          } catch(e) {}
      }
      setOpen(false);
  };

  if (!announcements.length) return null;

  const current = announcements[currentIndex];

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => { /* Prevent closing by clicking outside to force acknowledgment? Or allow? User said "Modal option". Usually modals can be closed. */ setOpen(false); }}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={() => setOpen(false)}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                    <MegaphoneIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <DialogTitle as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      {current.title}
                      {current.version && <span className="ml-2 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{current.version}</span>}
                    </DialogTitle>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 whitespace-pre-wrap">
                        {current.content}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                    onClick={handleDismiss}
                  >
                    {currentIndex < announcements.length - 1 ? 'Next' : 'Got it'}
                  </button>
                  {announcements.length > 1 && (
                      <button
                        type="button"
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                        onClick={handleDismissAll}
                      >
                        Dismiss All
                      </button>
                  )}
                </div>
                <div className="mt-2 text-xs text-center text-gray-400">
                    Announcement {currentIndex + 1} of {announcements.length}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
