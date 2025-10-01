import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

const formatDateTime = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const RecentComments = ({ limit = 10, className = '', startExpanded = false }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [allComments, setAllComments] = useState([]);
  const [visibleCount, setVisibleCount] = useState(limit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(Boolean(startExpanded));
  const [hasFetched, setHasFetched] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const addressCacheRef = useRef(new Map());
  const unitCacheRef = useRef(new Map());

  const applyFilters = useCallback((items) => {
    let result = items;
    if (mineOnly && user) {
      const myId = user.id;
      result = result.filter((c) => (c.user_id ?? (c.user && c.user.id)) === myId);
    }
    if (selectedUserId != null) {
      result = result.filter((c) => (c.user_id ?? (c.user && c.user.id)) === selectedUserId);
    }
    return result;
  }, [mineOnly, selectedUserId, user]);

  const enrichItems = useCallback(async (items) => {
    const addressCache = addressCacheRef.current;
    const unitCache = unitCacheRef.current;

    const missingAddressIds = Array.from(new Set(
      items
        .map((c) => c.address_id)
        .filter((id) => id && !addressCache.has(id))
    ));
    const missingUnitIds = Array.from(new Set(
      items
        .map((c) => c.unit_id)
        .filter((id) => id && !unitCache.has(id))
    ));

    await Promise.all([
      Promise.all(missingAddressIds.map(async (id) => {
        try {
          const resp = await fetch((process.env.REACT_APP_API_URL || '') + '/addresses/' + id);
          if (resp.ok) addressCache.set(id, await resp.json());
        } catch {
          // ignore individual failures
        }
      })),
      Promise.all(missingUnitIds.map(async (id) => {
        try {
          const resp = await fetch((process.env.REACT_APP_API_URL || '') + '/units/' + id);
          if (resp.ok) unitCache.set(id, await resp.json());
        } catch {
          // ignore individual failures
        }
      })),
    ]);

    return items.map((c) => ({
      ...c,
      address: addressCache.get(c.address_id) || null,
      unit: c.unit_id ? (unitCache.get(c.unit_id) || null) : null,
    }));
  }, []);

  useEffect(() => {
    if (startExpanded) setExpanded(true);
  }, [startExpanded]);

  useEffect(() => {
    if (!expanded || hasFetched) return;
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch((process.env.REACT_APP_API_URL || '') + '/comments/');
        if (!resp.ok) throw new Error('Failed to fetch comments');
        const data = await resp.json();
        if (!isMounted) return;

        const sorted = data.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setAllComments(sorted);

        const userMap = new Map();
        sorted.forEach((comment) => {
          const id = comment.user_id ?? (comment.user && comment.user.id);
          if (!id) return;
          const name = (comment.user && (comment.user.name || comment.user.email)) || 'User #' + id;
          if (!userMap.has(id)) userMap.set(id, name);
        });
        const options = Array.from(userMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
        setAvailableUsers(options);

        const filtered = applyFilters(sorted);
        const initial = filtered.slice(0, visibleCount);
        const enriched = await enrichItems(initial);
        if (!isMounted) return;
        setComments(enriched);
      } catch (e) {
        if (!isMounted) return;
        setError(e.message || 'Error loading recent comments');
      } finally {
        if (isMounted) {
          setHasFetched(true);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [expanded, hasFetched, visibleCount, mineOnly, selectedUserId, user, applyFilters, enrichItems]);

  useEffect(() => {
    if (!expanded || !hasFetched) return;
    let isMounted = true;

    const syncVisible = async () => {
      setLoading(true);
      try {
        const base = applyFilters(allComments);
        const slice = base.slice(0, visibleCount);
        const enriched = await enrichItems(slice);
        if (!isMounted) return;
        setComments(enriched);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    syncVisible();
    return () => {
      isMounted = false;
    };
  }, [expanded, hasFetched, allComments, visibleCount, mineOnly, selectedUserId, user, applyFilters, enrichItems]);

  useEffect(() => {
    setVisibleCount(limit);
  }, [mineOnly, selectedUserId, limit]);

  const filteredLength = applyFilters(allComments).length;
  const canLoadMore = filteredLength > comments.length;

  const handleLoadMore = (event) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    const prevY = window.scrollY;
    setVisibleCount((value) => value + limit);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: prevY, left: 0, behavior: 'auto' });
      });
    });
  };

  const handleUserFilterChange = (event) => {
    const value = event.target.value;
    setSelectedUserId(value === 'all' ? null : Number(value));
  };

  const content = useMemo(() => {
    if (loading) {
      return <div className="text-gray-500">Loading recent comments...</div>;
    }

    if (error) {
      return <div className="text-red-600">{error}</div>;
    }

    if (!comments.length) {
      return <div className="text-gray-500">No recent comments.</div>;
    }

    return (
      <>
        <ul role="list" className="divide-y divide-gray-200">
          {comments.map((comment) => {
            const contentPreview = comment.content && comment.content.length > 280
              ? comment.content.slice(0, 280) + '…'
              : comment.content;
            const commentUserName = (comment.user && (comment.user.name || comment.user.email)) || 'Unknown user';
            const unitLink = comment.unit_id ? '/address/' + comment.address_id + '/unit/' + comment.unit_id : null;
            const addressLink = '/address/' + comment.address_id;

            return (
              <li key={comment.id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-xs text-gray-600">
                      {comment.unit_id && comment.unit ? (
                        <>
                          <Link to={addressLink} className="text-indigo-700 hover:underline">
                            {comment.address && comment.address.combadd ? comment.address.combadd : 'Address #' + comment.address_id}
                          </Link>
                          <span className="mx-1">•</span>
                          <Link to={unitLink} className="text-indigo-700 hover:underline">
                            {'Unit ' + (comment.unit && comment.unit.number ? comment.unit.number : comment.unit_id)}
                          </Link>
                        </>
                      ) : (
                        <Link to={addressLink} className="text-indigo-700 hover:underline">
                          {comment.address && comment.address.combadd ? comment.address.combadd : 'Address #' + comment.address_id}
                        </Link>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 whitespace-pre-line">{contentPreview}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {commentUserName} • {formatDateTime(comment.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Link
                      to={comment.unit_id ? unitLink : addressLink}
                      className="inline-flex items-center rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 hover:bg-indigo-100"
                      title={comment.unit_id ? 'Go to unit' : 'Go to address'}
                    >
                      Open
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {canLoadMore && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              className="inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-200"
            >
              Load more
            </button>
          </div>
        )}
      </>
    );
  }, [comments, loading, error, canLoadMore, limit]);

  const containerClass = 'rounded-lg bg-white p-4 shadow ' + className;

  return (
    <div className={containerClass.trim()}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
        <h3 className="text-base font-semibold leading-6 text-gray-900">Recent comments</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {user && user.role === 3 && availableUsers.length > 0 && (
            <select
              value={selectedUserId === null ? 'all' : selectedUserId}
              onChange={handleUserFilterChange}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All users</option>
              {availableUsers.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          )}
          <label className="inline-flex items-center text-sm text-gray-700 select-none">
            <input
              type="checkbox"
              className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              checked={mineOnly}
              onChange={(event) => setMineOnly(event.target.checked)}
              disabled={!user}
            />
            My comments
          </label>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="text-sm font-medium text-indigo-700 hover:underline"
          >
            {expanded ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {expanded && content}
    </div>
  );
};

export default RecentComments;
