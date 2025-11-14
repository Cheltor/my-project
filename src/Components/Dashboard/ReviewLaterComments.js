import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { toEasternLocaleString } from '../../utils';

const formatDateTime = (value) => {
  if (!value) {
    return '';
  }
  return toEasternLocaleString(value, undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) || value;
};

const ReviewLaterComments = ({ limit = 6, className = '' }) => {
  const { token, user } = useAuth() || {};
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingIds, setUpdatingIds] = useState({});
  const apiBase = process.env.REACT_APP_API_URL;
  const canLoad = useMemo(() => Boolean(apiBase && token && user?.id), [apiBase, token, user?.id]);

  const fetchComments = useCallback(async () => {
    if (!canLoad) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${apiBase}/comments/review-later?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!resp.ok) {
        let message = 'Unable to load comments to review.';
        try {
          const data = await resp.json();
          message = data?.detail || message;
        } catch {
          try {
            message = await resp.text();
          } catch {
            // ignore fallbacks
          }
        }
        throw new Error(message);
      }
      const data = await resp.json();
      const filtered = Array.isArray(data)
        ? data.filter((comment) => Number(comment.user_id) === Number(user.id))
        : [];
      setComments(filtered);
    } catch (err) {
      setComments([]);
      setError(err.message || 'Unable to load comments to review.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, canLoad, limit, token, user?.id]);

  useEffect(() => {
    if (!canLoad) {
      return;
    }
    fetchComments();
  }, [canLoad, fetchComments, refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const handleMarkReviewed = useCallback(
    async (commentId) => {
      if (!canLoad || !user?.id) {
        setError('Sign in to update review status.');
        return;
      }
      const target = comments.find((comment) => comment.id === commentId);
      if (!target || Number(target.user_id) !== Number(user.id)) {
        return;
      }
      setError('');
      setUpdatingIds((prev) => ({ ...prev, [commentId]: true }));
      try {
        const resp = await fetch(`${apiBase}/comments/${commentId}/review`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ review_later: false }),
        });
        if (!resp.ok) {
          let message = 'Unable to update comment.';
          try {
            const data = await resp.json();
            message = data?.detail || message;
          } catch {
            try {
              message = await resp.text();
            } catch {
              // ignore fallbacks
            }
          }
          throw new Error(message);
        }
        setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      } catch (err) {
        setError(err.message || 'Unable to update comment.');
      } finally {
        setUpdatingIds((prev) => {
          const next = { ...prev };
          delete next[commentId];
          return next;
        });
      }
    },
    [apiBase, canLoad, comments, token, user?.id]
  );

  const renderContent = () => {
    if (!apiBase) {
      return <p className="text-sm text-red-600">API URL is not configured.</p>;
    }
    if (!token || !user?.id) {
      return <p className="text-sm text-gray-600">Sign in to view comments flagged for later review.</p>;
    }
    if (loading) {
      return <p className="text-sm text-gray-600">Loading flagged comments...</p>;
    }
    if (error) {
      return (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      );
    }
    if (comments.length === 0) {
      return <p className="text-sm text-gray-600">You're all caught up. No comments are waiting for review.</p>;
    }
    return (
      <ul className="mt-4 space-y-3">
        {comments.map((comment) => {
          const isUpdating = Boolean(updatingIds[comment.id]);
          const locationLabel = comment.combadd || (comment.address_id ? `Address #${comment.address_id}` : 'Unknown address');
          const unitLabel = comment.unit_id ? `Unit ${comment.unit?.number || comment.unit_id}` : null;
          const targetLink = comment.unit_id
            ? `/address/${comment.address_id}/unit/${comment.unit_id}`
            : `/address/${comment.address_id}`;
          const preview =
            comment.content && comment.content.length > 220
              ? `${comment.content.slice(0, 217)}...`
              : comment.content || 'No comment text provided.';
          const author =
            comment.user?.name || comment.user?.email || (comment.user_id ? `User #${comment.user_id}` : 'Unknown user');
          return (
            <li key={comment.id} className="rounded border border-gray-200 bg-gray-50 px-3 py-3 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {locationLabel}
                    {unitLabel ? (
                      <span className="ml-2 text-xs font-medium text-gray-600">{unitLabel}</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{preview}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Flagged by {author} - {formatDateTime(comment.updated_at || comment.created_at)}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Link
                    to={`${targetLink}${targetLink.includes('?') ? '&' : '?'}open=comments`}
                    className="inline-flex items-center rounded-md bg-white px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleMarkReviewed(comment.id)}
                    disabled={isUpdating}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    {isUpdating ? 'Saving...' : 'Mark reviewed'}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const containerClass = `rounded-lg bg-white p-4 shadow ${className}`.trim();

  return (
    <div className={containerClass}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Comments to review later</h3>
          <p className="text-sm text-gray-500">Track comments that were flagged for a second look.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="mt-3">{renderContent()}</div>
    </div>
  );
};

export default ReviewLaterComments;






