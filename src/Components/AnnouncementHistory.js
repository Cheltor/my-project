import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { toEasternLocaleString } from '../utils';

export default function AnnouncementHistory() {
  const { user, token, logout } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/announcements', {}, { onUnauthorized: logout });
        if (!res.ok) throw new Error('Failed to load announcements');
        const data = await res.json();
        setAnnouncements(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [token, logout]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading update history...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="border-b border-gray-200 pb-5 mb-8">
        <h3 className="text-2xl font-semibold leading-6 text-gray-900">System Updates & Announcements</h3>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          A history of all platform updates and announcements.
        </p>
      </div>

      <div className="flow-root">
        <ul className="-mb-8">
          {announcements.map((announcement, eventIdx) => (
            <li key={announcement.id}>
              <div className="relative pb-8">
                {eventIdx !== announcements.length - 1 ? (
                  <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white">
                      <span className="text-white text-xs font-bold">{announcement.version ? 'V' : 'A'}</span>
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{announcement.title}</span>
                        {announcement.version && <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{announcement.version}</span>}
                      </p>
                      <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                          {announcement.content}
                      </div>
                    </div>
                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                      <time dateTime={announcement.created_at}>{toEasternLocaleString(announcement.created_at)}</time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {announcements.length === 0 && (
              <li className="text-gray-500 text-center py-10">No announcements found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
