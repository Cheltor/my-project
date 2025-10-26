import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NewAddressComment from './NewAddressComment';
import FullScreenPhotoViewer from '../FullScreenPhotoViewer';
import {
  toEasternLocaleString,
  getAttachmentFilename,
  isImageAttachment,
  getAttachmentDisplayLabel
} from '../../utils';

// Utility function to format the date
const formatDate = (dateString) => {
  if (!dateString) return '';
  // Display Eastern time using a 12-hour clock with a short timezone suffix
  return toEasternLocaleString(dateString, undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  });
};

const AddressComments = ({ addressId, pageSize = 10, initialPage = 1 }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  const [page, setPage] = useState(initialPage);
  const [editingPage, setEditingPage] = useState(false);
  const [pageInputVal, setPageInputVal] = useState('');
  const [pageError, setPageError] = useState('');

  const startEditPage = () => { setPageInputVal(String(page)); setPageError(''); setEditingPage(true); };
  const applyPageInput = () => {
    const n = parseInt(pageInputVal, 10);
    const totalPages = Math.max(1, Math.ceil((comments?.length || 0) / pageSize));
    if (Number.isNaN(n) || n < 1 || n > totalPages) {
      setPageError(`Enter a number between 1 and ${totalPages}`);
      return;
    }
    setPage(n);
    setEditingPage(false);
  };

  const downloadAttachments = async (commentId) => {
    if (!commentId) return;
    try {
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/comments/${commentId}/photos?download=true`);
      if (!resp.ok) throw new Error('Failed to get signed download URLs');
      const downloadPhotos = await resp.json();
      (downloadPhotos || []).forEach((att, idx) => {
        const src = att?.url;
        if (!src) return;
        const name = att?.filename || `attachment-${idx + 1}`;
        const a = document.createElement('a');
        a.href = src; // already signed with content_disposition
        a.download = name;
        a.target = '_blank';
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 0);
      });
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  useEffect(() => {
    // Fetch comments for the address
    fetch(`${process.env.REACT_APP_API_URL}/comments/address/${addressId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch comments');
        }
        return response.json();
      })
      .then((data) => {
        // For each comment, fetch photos and unit details (if unit not provided)
        const fetchExtrasPromises = data.map(async (comment) => {
          // Photos
          let photos = [];
          try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/comments/${comment.id}/photos`);
            if (response.ok) {
              photos = await response.json();
            }
          } catch (error) {
            console.error(`Error fetching photos for comment ${comment.id}:`, error);
          }

          // Unit details (if missing but unit_id present)
          let unit = comment.unit;
          if (!unit && comment.unit_id) {
            try {
              const uResp = await fetch(`${process.env.REACT_APP_API_URL}/units/${comment.unit_id}`);
              if (uResp.ok) {
                unit = await uResp.json();
              }
            } catch (e) {
              console.error(`Error fetching unit for comment ${comment.id}:`, e);
            }
          }

          // Mentions (users)
          let mentions = [];
          try {
            const mResp = await fetch(`${process.env.REACT_APP_API_URL}/comments/${comment.id}/mentions`);
            if (mResp.ok) {
              mentions = await mResp.json();
            }
          } catch (e) {
            console.error(`Error fetching mentions for comment ${comment.id}:`, e);
          }

          return {
            ...comment,
            photos,
            unit,
            mentions,
            contact_mentions: Array.isArray(comment.contact_mentions) ? comment.contact_mentions : [],
          };
        });

        // Wait for all comments with their extras to be fetched
        Promise.all(fetchExtrasPromises)
          .then((commentsWithExtras) => {
            setComments(commentsWithExtras);
            setPage(initialPage);
            setLoading(false);
          })
          .catch((error) => {
            setError(error.message);
            setLoading(false);
          });
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [addressId, initialPage]);

  // Adjust page if comments or pageSize change
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((comments?.length || 0) / pageSize));
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [comments, page, pageSize]);

  const handleCommentAdded = (newComment) => {
    if (!newComment || typeof newComment.id === 'undefined' || newComment.id === null) {
      // Just prepend the comment without photos
      const normalized = {
        ...newComment,
        contact_mentions: Array.isArray(newComment?.contact_mentions) ? newComment.contact_mentions : [],
      };
      setComments([normalized, ...comments]);
      setPage(1);
      return;
    }
    // Fetch photos (and unit if needed) for the new comment
    (async () => {
      try {
        let photos = [];
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/comments/${newComment.id}/photos`);
          if (response.ok) {
            photos = await response.json();
          }
        } catch (e) {
          console.error(`Error fetching photos for new comment ${newComment.id}:`, e);
        }

        let unit = newComment.unit;
        if (!unit && newComment.unit_id) {
          try {
            const uResp = await fetch(`${process.env.REACT_APP_API_URL}/units/${newComment.unit_id}`);
            if (uResp.ok) {
              unit = await uResp.json();
            }
          } catch (e) {
            console.error(`Error fetching unit for new comment ${newComment.id}:`, e);
          }
        }

        // Mentions for the new comment (so chips show up immediately)
        let mentions = [];
        try {
          const mResp = await fetch(`${process.env.REACT_APP_API_URL}/comments/${newComment.id}/mentions`);
          if (mResp.ok) {
            mentions = await mResp.json();
          }
        } catch (e) {
          console.error(`Error fetching mentions for new comment ${newComment.id}:`, e);
        }

        const newCommentWithExtras = {
          ...newComment,
          photos,
          unit,
          mentions,
          contact_mentions: Array.isArray(newComment.contact_mentions) ? newComment.contact_mentions : [],
        };
        setComments([newCommentWithExtras, ...comments]);
        setPage(1);
      } catch (error) {
        console.error(`Error enriching new comment ${newComment.id}:`, error);
        const fallback = {
          ...newComment,
          contact_mentions: Array.isArray(newComment.contact_mentions) ? newComment.contact_mentions : [],
        };
        setComments([fallback, ...comments]);
        setPage(1);
      }
    })();
  };

  const total = comments.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(total, startIdx + pageSize);
  const currentSlice = comments.slice(startIdx, endIdx);

  if (loading) {
    return <p>Loading comments...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Comments</h2>
      <NewAddressComment addressId={addressId} onCommentAdded={handleCommentAdded} />
      {selectedPhotoUrl && (
        <FullScreenPhotoViewer
          photoUrl={selectedPhotoUrl}
          onClose={() => setSelectedPhotoUrl(null)}
        />
      )}
      {/* Pagination header */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <div>
          {total > 0 ? (
            <span>
              Showing <span className="font-medium">{startIdx + 1}-{endIdx}</span> of <span className="font-medium">{total}</span>
            </span>
          ) : (
            <span>0 results</span>
          )}
        </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              {editingPage ? (
                <span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageInputVal}
                    onChange={(e) => { setPageInputVal(e.target.value); setPageError(''); }}
                    onBlur={applyPageInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyPageInput();
                      if (e.key === 'Escape') setEditingPage(false);
                    }}
                    className={`w-20 px-2 py-1 border rounded ${pageError ? 'border-red-500' : ''}`}
                    autoFocus
                  />
                  {pageError && <div className="text-xs text-red-600 mt-1">{pageError}</div>}
                </span>
              ) : (
                <button onClick={startEditPage} className="underline">Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span></button>
              )}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
      </div>

      <ul className="space-y-4 mt-2">
        {currentSlice.length > 0 ? (
          currentSlice.map((comment) => (
            <li key={comment.id} className="bg-gray-100 p-4 rounded-lg shadow">
              <p className="text-gray-700 whitespace-pre-line">{comment.content}</p>
              {Array.isArray(comment.mentions) && comment.mentions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {comment.mentions.map((u) => (
                    <span key={u.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                      @{u.name || u.email}
                    </span>
                  ))}
                </div>
              )}
              {Array.isArray(comment.contact_mentions) && comment.contact_mentions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {comment.contact_mentions.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      %{c.name || c.email || `contact-${c.id}`}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2">Posted on {formatDate(comment.created_at)}</p>
              {comment.user && (
                <p className="text-sm text-gray-500">
                  By {comment.user.name ? comment.user.name : comment.user.email}
                  {comment.unit_id && (
                    <span>
                      {' '}&middot;{' '}
                      <Link
                        to={`/address/${comment.address_id}/unit/${comment.unit_id}`}
                        className="text-blue-500 hover:underline"
                      >
                        {`Unit${comment.unit && comment.unit.number ? ` ${comment.unit.number}` : ''}`}
                      </Link>
                    </span>
                  )}
                </p>
              )}
              {comment.photos && comment.photos.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-600">
                      Attachment{comment.photos.length > 1 ? 's' : ''}:
                    </h3>
                    <button
                      type="button"
                      className="text-indigo-600 hover:underline text-sm font-medium"
                      onClick={() => downloadAttachments(comment.id)}
                    >
                      Download attachments ({comment.photos.length})
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {comment.photos.map((attachment, index) => {
                      const url = attachment?.url;
                      if (!url) return null;

                      const filename = getAttachmentFilename(attachment, `Attachment ${index + 1}`);
                      const isImage = isImageAttachment(attachment);
                      const extensionLabel = getAttachmentDisplayLabel(attachment);

                      return (
                        <div key={url || index} className="flex flex-col gap-2">
                          {isImage ? (
                            <button
                              type="button"
                              onClick={() => setSelectedPhotoUrl(url)}
                              className="block w-full"
                            >
                              <img
                                src={url}
                                alt={filename}
                                className="w-full h-24 object-cover rounded-md shadow"
                              />
                            </button>
                          ) : (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block w-full"
                            >
                              <div className="w-full h-24 flex flex-col items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
                                <span className="text-3xl">📄</span>
                                <span className="mt-1 text-xs font-semibold uppercase">{extensionLabel}</span>
                              </div>
                            </a>
                          )}
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline text-xs break-all"
                            title={filename}
                          >
                            {filename}
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </li>
          ))
        ) : (
          <p>No comments available.</p>
        )}
      </ul>

      {/* Pagination footer (duplicate controls for convenience) */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div>
            <span>
              Showing <span className="font-medium">{startIdx + 1}-{endIdx}</span> of <span className="font-medium">{total}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressComments;
