import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { toEasternLocaleString } from '../../utils';

const formatDateTime = (iso) => toEasternLocaleString(iso) || iso;

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

  // We no longer fetch address/unit details per item; rely on comment.combadd and unit_id
  const mentionsCacheRef = useRef(new Map()); // commentId -> [User]

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
    const mentionsCache = mentionsCacheRef.current;

    // Fetch mentions only when not already present from API and not cached
    await Promise.all(
      items
        .filter((c) => !Array.isArray(c.mentions))
        .map((c) => c.id)
        .filter((id) => id && !mentionsCache.has(id))
        .map(async (id) => {
          try {
            const resp = await fetch((process.env.REACT_APP_API_URL || '') + `/comments/${id}/mentions`);
            if (resp.ok) {
              const users = await resp.json();
              mentionsCache.set(id, Array.isArray(users) ? users : []);
            } else {
              mentionsCache.set(id, []);
            }
          } catch {
            mentionsCache.set(id, []);
          }
        })
    );

    return items.map((c) => ({
      ...c,
      // Use mentions from API if present, otherwise from cache
      mentions: Array.isArray(c.mentions) ? c.mentions : (mentionsCache.get(c.id) || []),
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

  const handleLoadMore = useCallback((event) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    const prevY = window.scrollY;
    setVisibleCount((value) => value + limit);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: prevY, left: 0, behavior: 'auto' });
      });
    });
  }, [limit]);

  const handleUserFilterChange = (event) => {
    const value = event.target.value;
    setSelectedUserId(value === 'all' ? null : Number(value));
  };

  const resolveUnitNumber = useCallback((comment) => {
    if (!comment || !comment.unit) return comment?.unit_id;
    const raw =
      comment.unit.number
      ?? comment.unit.unit_number
      ?? comment.unit.unitNumber
      ?? comment.unit.label
      ?? comment.unit.name;
    if (raw == null) return comment.unit_id;
    const trimmed = String(raw).trim();
    return trimmed ? trimmed : comment.unit_id;
  }, []);

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
  <ul className="divide-y divide-gray-200">
          {comments.map((comment) => {
            const contentPreview = comment.content && comment.content.length > 280
              ? comment.content.slice(0, 280) + '…'
              : comment.content;
            const commentUserName = (comment.user && (comment.user.name || comment.user.email)) || 'Unknown user';
            const unitLink = comment.unit_id ? '/address/' + comment.address_id + '/unit/' + comment.unit_id : null;
            const addressLink = '/address/' + comment.address_id;
            const addressLabel = comment.combadd
              || (comment.address && comment.address.combadd)
              || ('Address #' + comment.address_id);
            const unitNumber = resolveUnitNumber(comment);

            return (
              <li key={comment.id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-xs text-gray-600">
                      {comment.unit_id ? (
                        <>
                          <Link to={addressLink} className="text-indigo-700 hover:underline">
                            {addressLabel}
                          </Link>
                          <span className="mx-1">•</span>
                          <Link to={unitLink} className="text-indigo-700 hover:underline">
                            {'Unit ' + unitNumber}
                          </Link>
                        </>
                      ) : (
                        <Link to={addressLink} className="text-indigo-700 hover:underline">
                          {addressLabel}
                        </Link>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 whitespace-pre-line">{contentPreview}</p>
                    {Array.isArray(comment.mentions) && comment.mentions.length > 0 && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className="text-[11px] uppercase tracking-wide text-gray-500">Mentions:</span>
                        {comment.mentions.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10"
                            title={m.email}
                          >
                            @{m.name || m.email || `user-${m.id}`}
                          </span>
                        ))}
                      </div>
                    )}
                    {Array.isArray(comment.contact_mentions) && comment.contact_mentions.length > 0 && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className="text-[11px] uppercase tracking-wide text-gray-500">Contact mentions:</span>
                        {comment.contact_mentions.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-700/10"
                            title={c.email || c.phone || ''}
                          >
                            %{c.name || c.email || `contact-${c.id}`}
                          </span>
                        ))}
                      </div>
                    )}
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
  }, [comments, loading, error, canLoadMore, resolveUnitNumber, handleLoadMore]);

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
