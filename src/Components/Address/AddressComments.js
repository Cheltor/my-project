import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import NewAddressComment from './NewAddressComment';
import FullScreenPhotoViewer from '../FullScreenPhotoViewer';
import CreateViolationFromCommentModal from '../Comment/CreateViolationFromCommentModal';
import {
  getAttachmentFilename,
  isImageAttachment,
  getAttachmentDisplayLabel
} from '../../utils';
import useEntityComments from '../../Hooks/useEntityComments';
import { formatCommentDate, downloadCommentAttachments } from '../../Utils/comments';

const formatAddressDate = (dateString) => formatCommentDate(dateString);

const AddressComments = ({ addressId, pageSize = 10, initialPage = 1 }) => {
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  const [editingPage, setEditingPage] = useState(false);
  const [pageInputVal, setPageInputVal] = useState('');
  const [pageError, setPageError] = useState('');
  const [violationComment, setViolationComment] = useState(null);

  const {
    comments,
    loading,
    error,
    refresh,
    page,
    setPage,
    total,
    setComments,
  } = useEntityComments('address', addressId, {
    pageSize,
    initialPage,
  });

  useEffect(() => {
    setPageInputVal(String(page));
  }, [page]);

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

  const startEditPage = () => {
    setPageInputVal(String(page));
    setPageError('');
    setEditingPage(true);
  };

  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;

  const applyPageInput = useCallback(() => {
    const n = parseInt(pageInputVal, 10);
    const totalPagesLocal = total > 0 ? Math.ceil(total / pageSize) : 1;
    if (Number.isNaN(n) || n < 1 || n > totalPagesLocal) {
      setPageError(`Enter a number between 1 and ${totalPagesLocal}`);
      return;
    }
    setPage(n);
    setEditingPage(false);
  }, [pageInputVal, pageSize, setPage, total]);

  useEffect(() => {
    const totalPagesLocal = total > 0 ? Math.ceil(total / pageSize) : 1;
    if (page > totalPagesLocal) {
      setPage(totalPagesLocal);
    } else if (page < 1) {
      setPage(1);
    }
  }, [page, pageSize, setPage, total]);

  const handleCommentAdded = () => {
    setPage(1);
    setEditingPage(false);
    setPageInputVal('1');
    refresh();
  };

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = total === 0 ? 0 : Math.min(total, startIdx + Math.max(comments.length - 1, 0));

  if (loading) {
    return <p>Loading comments...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <>
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
              Showing <span className="font-medium">{startIdx}-{endIdx}</span> of <span className="font-medium">{total}</span>
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
        {comments.length > 0 ? (
          comments.map((comment) => (
            <li key={comment.id} className="relative rounded-lg bg-gray-100 p-4 shadow">
              <div className="absolute right-3 top-3 flex items-center gap-2">
                {!comment.violation_id && (
                  <button
                    type="button"
                    onClick={() => setViolationComment(comment)}
                    className="inline-flex items-center rounded-full border border-transparent bg-white/80 px-3 py-1 text-xs font-medium text-indigo-600 shadow-sm transition hover:bg-indigo-100 hover:text-indigo-700"
                  >
                    Create violation
                  </button>
                )}
                {comment.violation_id && (
                  <Link
                    to={`/violation/${comment.violation_id}`}
                    className="inline-flex items-center rounded-full border border-transparent bg-white/80 px-3 py-1 text-xs font-medium text-green-700 shadow-sm transition hover:bg-green-100"
                  >
                    View #{comment.violation_id}
                  </Link>
                )}
              </div>
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
              <p className="text-sm text-gray-500 mt-2">Posted on {formatAddressDate(comment.created_at)}</p>
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
                        {`Unit ${resolveUnitNumber(comment)}`}
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
                      onClick={() => downloadCommentAttachments(comment.id)}
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
      {violationComment && (
        <CreateViolationFromCommentModal
          comment={violationComment}
          onClose={() => setViolationComment(null)}
          onCreated={(newViolation) => {
            const currentId = violationComment?.id;
            refresh();
            if (newViolation?.id && currentId) {
              setComments((prev) =>
                prev.map((existing) =>
                  existing.id === currentId
                    ? { ...existing, violation_id: newViolation.id }
                    : existing
                )
              );
              setViolationComment((prev) => (prev ? { ...prev, violation_id: newViolation.id } : prev));
            }
          }}
        />
      )}
    </>
  );
};

export default AddressComments;
