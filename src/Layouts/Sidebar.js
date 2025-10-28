import React, { useState, useEffect, useRef, useCallback } from 'react';
import useVisibilityAwareInterval from '../Hooks/useVisibilityAwareInterval';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from '@headlessui/react';
import {
  Bars3Icon,
  CalendarIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  BuildingOffice2Icon,
  HomeIcon,
  UsersIcon,
  XMarkIcon,
  ArrowLeftIcon,
  BellIcon,
  MapIcon,
} from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Import Link, useNavigate, and useLocation
import Logout from '../Components/Logout'; // Import the Logout component
import { useAuth } from '../AuthContext'; // Import useAuth hook
import { apiFetch } from '../api';
import { toEasternLocaleString } from '../utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, current: false },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon, current: false },
  { name: 'Map', href: '/map', icon: MapIcon, current: false, roles: ['Admin'] },
  { name: 'Contacts', href: '/contacts', icon: UsersIcon, current: false },
  { name: 'Violations', href: '/violations', icon: BuildingOffice2Icon, current: false },
  { name: 'Citations', href: '/citations', icon: CalendarIcon, current: false },
  { name: 'Complaints', href: '/complaints', icon: DocumentDuplicateIcon, current: false },
  { name: 'Inspections', href: '/inspections', icon: ChartPieIcon, current: false },
  { name: 'Permits', href: '/permits', icon: BuildingOffice2Icon, current: false },
  { name: 'Licenses', href: '/licenses', icon: BuildingOffice2Icon, current: false },
  { name: 'Codes', href: '/codes', icon: BuildingOffice2Icon, current: false },
  { name: 'Businesses', href: '/businesses', icon: BuildingOffice2Icon, current: false },
  { name: 'SIR', href: '/sir', icon: BuildingOffice2Icon, current: false },
  { name: 'Users', href: '/users', icon: UsersIcon, current: false, roles: ['Admin'] },
  { name: 'Rooms', href: '/rooms', icon: DocumentDuplicateIcon, current: false, roles: ['Admin'] },
  { name: 'Helpful Links', href: '/Helpful', icon: DocumentDuplicateIcon, current: false },
  { name: 'New Address', href: '/new-address', icon: BuildingOffice2Icon, current: false, roles: ['Admin'] },
  { name: 'Vacancy Statuses', href: '/vacancy-statuses', icon: BuildingOffice2Icon, current: false },
  { name: 'Admin Dashboard', href: '/admin', icon: Cog6ToothIcon, current: false, roles: ['Admin'] },
  { name: 'Admin Code Sync', href: '/admin/code-sync', icon: Cog6ToothIcon, current: false, roles: ['Admin'] },
  { name: 'Admin Chat', href: '/admin-chat', icon: Cog6ToothIcon, current: false, roles: ['Admin'] },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Sidebar({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // State for search input
  const [filteredAddresses, setFilteredAddresses] = useState([]); // State for filtered addresses
  const [loading, setLoading] = useState(false); // Loading state for API call
  const [error, setError] = useState(null); // Error state for API call
  const [showDropdown, setShowDropdown] = useState(false); // State to show/hide dropdown
  const [activeIndex, setActiveIndex] = useState(-1); // Track active/focused dropdown item
  const [notifications, setNotifications] = useState([]); // Notifications for the current user
  const [notificationsLoading, setNotificationsLoading] = useState(false); // Loading state for notifications
  const [notificationsError, setNotificationsError] = useState(null); // Error state for notifications
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false); // Toggle notifications dropdown
  const notificationsRef = useRef(null); // Anchor element for notifications dropdown

  const navigate = useNavigate(); // To navigate programmatically
  const location = useLocation(); // Track current location to refresh notifications on navigation
  const { user, token, logout } = useAuth(); // Get user data, token and logout from context
  const hasFetchedNotificationsRef = useRef(false); // Track if we've already performed the initial fetch

  const fetchNotifications = useCallback(
    async ({ showSpinner = false, signal } = {}) => {
      if (!token) {
        setNotifications([]);
        setNotificationsError(null);
        if (showSpinner) {
          setNotificationsLoading(false);
        }
        return;
      }

      if (showSpinner) {
        setNotificationsLoading(true);
      }

      try {
        const userIdParam = user?.id ? `?user_id=${encodeURIComponent(user.id)}` : '';
        const response = await apiFetch(`/notifications${userIdParam}`, { signal }, { onUnauthorized: logout });
        if (!response || !response.ok) {
          throw new Error('Unable to load notifications');
        }

        const data = await response.json();
        setNotifications(Array.isArray(data) ? data : []);
        setNotificationsError(null);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        setNotificationsError(err.message || 'Unable to load notifications');
        setNotifications([]);
      } finally {
        if (showSpinner) {
          setNotificationsLoading(false);
        }
      }
    },
    [token, user]
  );

  // Search addresses via API when query changes (debounced)
  useEffect(() => {
    const q = (searchQuery || '').trim();
    if (q.length < 2) {
      setFilteredAddresses([]);
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/addresses/search?query=${encodeURIComponent(q)}&limit=10`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error('Failed to search addresses');
        const data = await res.json();
        setFilteredAddresses(Array.isArray(data) ? data : []);
        setShowDropdown((data || []).length > 0);
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError(e.message || 'Search failed');
          setFilteredAddresses([]);
          setShowDropdown(false);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!token) {
      setShowNotificationsDropdown(false);
      setNotifications([]);
      setNotificationsError(null);
      setNotificationsLoading(false);
      hasFetchedNotificationsRef.current = false;
      return;
    }

    const controller = new AbortController();

    fetchNotifications({ showSpinner: true, signal: controller.signal }).finally(() => {
      hasFetchedNotificationsRef.current = true;
    });

    return () => {
      controller.abort();
    };
  }, [token, fetchNotifications]);

  // Poll notifications while the tab is visible. Don't run immediately here because
  // the initial fetch is handled in the effect above. Poll interval: 60s.
  useVisibilityAwareInterval(() => {
    if (!token) return;
    // Only poll after we've done the initial fetch once
    if (!hasFetchedNotificationsRef.current) return;
    fetchNotifications({ showSpinner: false });
  }, 60_000, { immediate: false });

  // When the visibility changes to visible, do an immediate refresh (only after initial fetch)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && token && hasFetchedNotificationsRef.current) {
        fetchNotifications({ showSpinner: false });
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (!token || !hasFetchedNotificationsRef.current) {
      return;
    }
    fetchNotifications({ showSpinner: false });
  }, [location.pathname, token, fetchNotifications]);

  // Listen for app-wide notifications refresh events (e.g., after posting a comment that mentions someone)
  useEffect(() => {
    const handler = () => {
      if (!token) return;
      fetchNotifications({ showSpinner: false });
    };
    window.addEventListener('notifications:refresh', handler);
    return () => window.removeEventListener('notifications:refresh', handler);
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (!showNotificationsDropdown) {
      return;
    }

    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotificationsDropdown(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowNotificationsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showNotificationsDropdown]);

  // Handle search query change (debounced effect will fetch)
  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    setActiveIndex(-1);
  };

  // Handle dropdown selection
  const handleDropdownSelect = (address) => {
    setSearchQuery(''); // Clear the search bar
    setFilteredAddresses([]); // Clear filtered results
    setShowDropdown(false); // Hide dropdown
    navigate(`/address/${address.id}`); // Navigate to the address details page
  };

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      // Move selection down
      setActiveIndex((prevIndex) =>
        prevIndex === filteredAddresses.length - 1 ? 0 : prevIndex + 1
      );
    } else if (event.key === 'ArrowUp') {
      // Move selection up
      setActiveIndex((prevIndex) =>
        prevIndex <= 0 ? filteredAddresses.length - 1 : prevIndex - 1
      );
    } else if (event.key === 'Enter') {
      // Select the active item
      if (activeIndex >= 0 && filteredAddresses[activeIndex]) {
        handleDropdownSelect(filteredAddresses[activeIndex]);
      }
    } else if (event.key === 'Tab' && filteredAddresses.length > 0) {
      // Prevent default tab behavior
      event.preventDefault();
      setActiveIndex(0); // Set active index to first item
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const recentNotifications = [...notifications]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const formatNotificationTimestamp = (timestamp) => {
    if (!timestamp) {
      return '';
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return toEasternLocaleString(date);
  };

  const handleNotificationsToggle = () => {
    setShowNotificationsDropdown((prev) => {
      const next = !prev;
      if (next && token) {
        fetchNotifications({ showSpinner: notifications.length === 0 });
      }
      return next;
    });
    setShowDropdown(false);
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' }, { onUnauthorized: logout });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      // Close the dropdown after successful action
      setShowNotificationsDropdown(false);
    } catch (e) {
      // silently ignore
    } finally {
      // Ensure dropdown closes even if the request errors
      setShowNotificationsDropdown(false);
    }
  };

  const roleMapping = {
    0: 'Guest',
    1: 'ONS',
    2: 'OAS',
    3: 'Admin'
  };

  return (
    <>
      <div>
        <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear"
          />
          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out"
            >
              <TransitionChild>
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button type="button" onClick={() => setSidebarOpen(false)} className="-m-2.5 p-2.5">
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon aria-hidden="true" className="h-6 w-6 text-white" />
                  </button>
                </div>
              </TransitionChild>
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4 ring-1 ring-white/10">
                <div className="flex h-16 shrink-0 items-center">
                  <Link to="/">
                    <h1 className="text-white text-2xl font-bold">CodeSoft</h1>
                  </Link>
                </div>
                {user && (
                  <div className="text-gray-400 text-sm">
    {user.email}
    {/* Show the role using the roleMapping object */}
    <span> ({roleMapping[user.role]})</span>                  </div>
                )}
                <nav className="flex flex-1 flex-col">
                  <ul className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul className="-mx-2 space-y-1">
                      {navigation
                        .filter(item => item.roles ? item.roles.includes(roleMapping[user.role]) : true)  // Handle undefined roles
                        .map((item) => (
                          <li key={item.name}>
                            <Link
                              to={item.href}
                              onClick={() => setSidebarOpen(false)} // Close sidebar on click
                              className={classNames(
                                item.current
                                  ? 'bg-gray-800 text-white'
                                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                                'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                              )}
                            >
                              <item.icon aria-hidden="true" className="h-6 w-6 shrink-0" />
                              {item.name}
                            </Link>
                          </li>
                        ))}

                      </ul>
                    </li>
                    <li className="mt-auto">
                      <div
                        className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white"
                        onClick={() => setSidebarOpen(false)} // Close sidebar on click
                      >
                        <Cog6ToothIcon aria-hidden="true" className="h-6 w-6 shrink-0" />
                        <Logout />
                      </div>
                    </li>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <Link to="/">
                <h1 className="text-white text-2xl font-bold">CodeSoft</h1>
              </Link>
            </div>
            {user && (
                  <div className="text-gray-400 text-sm">
    {user.email}
    {/* Show the role using the roleMapping object */}
    <span> ({roleMapping[user.role]})</span>                  </div>
                )}
            <nav className="flex flex-1 flex-col">
              <ul className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul className="-mx-2 space-y-1">
                  {navigation
  .filter(item => item.roles ? item.roles.includes(roleMapping[user.role]) : true)  // Handle undefined roles
  .map((item) => (
    <li key={item.name}>
      <Link
        to={item.href}
        onClick={() => setSidebarOpen(false)} // Close sidebar on click
        className={classNames(
          item.current
            ? 'bg-gray-800 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white',
          'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
        )}
      >
        <item.icon aria-hidden="true" className="h-6 w-6 shrink-0" />
        {item.name}
      </Link>
    </li>
  ))}

                  </ul>
                </li>
                <li className="mt-auto">
                  <div
                    className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-800 hover:text-white"
                    onClick={() => setSidebarOpen(false)} // Close sidebar on click
                  >
                    <Cog6ToothIcon aria-hidden="true" className="h-6 w-6 shrink-0" />
                    <Logout />
                  </div>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="lg:pl-72">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button type="button" onClick={() => setSidebarOpen(true)} className="-m-2.5 p-2.5 text-gray-700 lg:hidden">
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon aria-hidden="true" className="h-6 w-6" />
            </button>
            <div aria-hidden="true" className="h-6 w-px bg-gray-900/10 lg:hidden" />
            <div className="relative w-full"> {/* Relative wrapper */}
              <form
                action="#"
                method="GET"
                className="relative flex w-full"
                onSubmit={(e) => e.preventDefault()}
              >
                <label htmlFor="search-field" className="sr-only">
                  Search
                </label>
                <MagnifyingGlassIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400"
                />
                <input
                  id="search-field"
                  name="search"
                  type="search"
                  placeholder="Search by address or owner..."
                  className="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                  value={searchQuery}
                  onChange={handleSearchChange} // Update search query on input change
                  onFocus={() => setShowDropdown(filteredAddresses.length > 0)}
                  onKeyDown={handleKeyDown} // Handle keyboard events for dropdown
                  autoComplete="off" // Disable browser's autocomplete
                />
              </form>
              

              {/* Dropdown Search Results */}
              {showDropdown && (
                <div className="absolute w-full bg-white shadow-md rounded-md z-50 mt-1">
                  <ul className="dropdown-list max-h-60 overflow-auto">
          {filteredAddresses.map((address, index) => (
                      <li
                        key={address.id}
                        onMouseDown={() => handleDropdownSelect(address)}
                        className={`cursor-pointer p-2 hover:bg-gray-200 ${
                          index === activeIndex ? 'bg-gray-200' : ''
                        }`}
                      >
            {address.property_name ? address.property_name + ' - ' : ''}
            {address.combadd}
            {address.aka ? ` (AKA: ${address.aka})` : ''}
            {address.ownername ? ` - ${address.ownername}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Back Button moved to right side */}
              <button
                type="button"
                onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
                className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-1" aria-hidden="true" />
                Back
              </button>
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={handleNotificationsToggle}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                  aria-label="Open notifications"
                  aria-haspopup="true"
                  aria-expanded={showNotificationsDropdown}
                >
                  <BellIcon className="h-5 w-5" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotificationsDropdown && (
                  <div className="absolute right-0 z-50 mt-3 w-80 max-h-96 overflow-y-auto rounded-lg bg-white shadow-lg ring-1 ring-black/5">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    </div>
                    {notificationsLoading ? (
                      <p className="p-4 text-sm text-gray-500">Loading notifications...</p>
                    ) : notificationsError ? (
                      <p className="p-4 text-sm text-red-500">{notificationsError}</p>
                    ) : recentNotifications.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500">No notifications yet.</p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {recentNotifications.map((notification) => (
                          <li
                            key={notification.id}
                            className="p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={async () => {
                              try {
                                // Mark as read
                                await apiFetch(`/notifications/${notification.id}/read`, { method: 'PATCH' }, { onUnauthorized: logout });
                                // Optimistically update UI
                                setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
                                // Navigate using origin_url_path if provided; else fall back
                                if (notification.origin_url_path) {
                                  navigate(notification.origin_url_path);
                                  setShowNotificationsDropdown(false);
                                } else if (notification.inspection_id) {
                                  navigate(`/inspection/${notification.inspection_id}`);
                                  setShowNotificationsDropdown(false);
                                }
                              } catch (e) {
                                // ignore errors for marking read
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title || 'Notification'}
                                </p>
                                {notification.origin_label && (
                                  <p className="mt-0.5 text-xs text-gray-500">{notification.origin_label}</p>
                                )}
                                {notification.body && (
                                  <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                                    {notification.body}
                                  </p>
                                )}
                                <p className="mt-2 text-xs text-gray-400">
                                  {formatNotificationTimestamp(notification.created_at) || 'Just now'}
                                </p>
                              </div>
                              {!notification.read && (
                                <span className="mt-1 inline-flex shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">
                                  New
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Mark all as read
                      </button>
                      {notifications.length > 5 && (
                        <button
                          type="button"
                          onClick={() => { setShowNotificationsDropdown(false); navigate('/notifications'); }}
                          className="text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                          View all
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNotificationsDropdown(false)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main content area */}
          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
