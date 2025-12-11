import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toEasternLocaleString } from '../../utils';

const UserActivityTimeline = ({ className = '' }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchActivity = useCallback(async (cursor = null) => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.REACT_APP_API_URL || '';
      let url = `${baseUrl}/dash/timeline?limit=20`;
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch timeline');
      const data = await response.json();

      setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setNextCursor(data.next_cursor);
      setHasMore(!!data.next_cursor);
    } catch (err) {
      setError(err.message || 'Unable to load timeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchActivity(nextCursor);
    }
  };

  const renderItem = (item) => {
    const user = item.user;
    const userName = user ? user.name || user.email : 'Unknown User';
    const getInitials = (name) => {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };
    const userInitials = getInitials(userName);

    return (
      <li key={`${item.type}-${item.id}`} className="relative pb-8">
        <div className="relative flex space-x-3">
          <div>
            <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
              <span className="text-xs font-medium leading-none text-white">{userInitials}</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
            <div>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-900">{userName}</span> {item.description}{' '}
                {item.entity_link && (
                  <Link to={item.entity_link} className="font-medium text-gray-900 hover:underline">
                    View
                  </Link>
                )}
              </p>
              {item.combadd && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Address: <Link to={`/address/${item.address_id}`} className="hover:underline">{item.combadd}</Link>
                </p>
              )}
            </div>
            <div className="whitespace-nowrap text-right text-sm text-gray-500">
              <time dateTime={item.created_at}>{toEasternLocaleString(item.created_at)}</time>
            </div>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className={`flow-root ${className}`}>
      <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">User Activity Timeline</h3>
      <ul className="-mb-8">
        {items.map((item, itemIdx) => (
          <div key={`${item.type}-${item.id}`}>
            {renderItem(item)}
            {itemIdx !== items.length - 1 && (
              <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
            )}
          </div>
        ))}
      </ul>

      {loading && (
        <div className="py-4 text-center text-sm text-gray-500">Loading...</div>
      )}

      {error && (
        <div className="py-4 text-center text-sm text-red-600">{error}</div>
      )}

      {!loading && hasMore && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Load More
          </button>
        </div>
      )}

      {!loading && !hasMore && items.length > 0 && (
        <div className="py-8 text-center text-sm text-gray-500">End of timeline</div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="py-8 text-center text-sm text-gray-500">No activity found.</div>
      )}
    </div>
  );
};

export default UserActivityTimeline;
