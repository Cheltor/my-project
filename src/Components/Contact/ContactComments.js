import React, { useEffect, useState } from 'react';
import NewContactComment from './NewContactComment';  // Assuming this is the component for adding a new comment

// Utility function to format the date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export default function ContactComments({ contactId }) {  // Accept contactId as a prop
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentCounts, setAttachmentCounts] = useState({}); // commentId -> number
  const [usersMap, setUsersMap] = useState({}); // userId -> email

  // Function to fetch comments
  const fetchComments = () => {
    setLoading(true);
    fetch(`${process.env.REACT_APP_API_URL}/comments/contact/${contactId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch comments');
        }
        return response.json();
      })
      .then((data) => {
        console.log('Fetched comments:', data);
        setComments(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchComments();  // Fetch comments on component load and when contactId changes
  }, [contactId]);

  // Fetch all users once to map user_id -> email
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${process.env.REACT_APP_API_URL}/users/`, { signal: controller.signal })
      .then((resp) => (resp.ok ? resp.json() : []))
      .then((users) => {
        const map = {};
        (users || []).forEach((u) => {
          map[u.id] = u.email || '';
        });
        setUsersMap(map);
      })
      .catch(() => {})
      .finally(() => {});
    return () => controller.abort();
  }, []);

  // After comments load, prefetch attachment counts to know when to show the button
  useEffect(() => {
    if (!comments || comments.length === 0) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        const promises = comments.map(async (c) => {
          // Skip if already counted
          if (attachmentCounts[c.id] != null) return;
          const resp = await fetch(`${process.env.REACT_APP_API_URL}/comments/contact/${c.id}/attachments/count`, {
            signal: controller.signal,
          });
          if (!resp.ok) throw new Error('Failed to fetch attachments');
          const data = await resp.json();
          const count = (data && typeof data.count === 'number') ? data.count : 0;
          setAttachmentCounts((prev) => ({ ...prev, [c.id]: count }));
        });
        await Promise.allSettled(promises);
      } catch (e) {
        // Ignore if aborted
      }
    };
    run();
    return () => controller.abort();
  }, [comments]);

  const openAttachments = (commentId) => {
    setSelectedCommentId(commentId);
    setShowModal(true);
    setAttachments([]);
    setAttachmentsLoading(true);
    fetch(`${process.env.REACT_APP_API_URL}/comments/contact/${commentId}/attachments`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch attachments');
        return response.json();
      })
      .then((data) => {
        setAttachments(data || []);
      })
      .catch((err) => {
        console.error('Error fetching attachments:', err);
        setAttachments([]);
      })
      .finally(() => setAttachmentsLoading(false));
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCommentId(null);
    setAttachments([]);
    setAttachmentsLoading(false);
  };

  if (loading) return <div>Loading comments...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold text-gray-700">Comments</h2>
      {/* Add new comment form and pass fetchComments as a callback */}
      <NewContactComment contactId={contactId} onCommentAdded={fetchComments} />
      {comments.length === 0 ? (
        <p className='pt-4'>No comments available.</p>
      ) : (
        <ul className="space-y-4 pt-4">
          {comments.map((comment) => (
            <li key={comment.id} className="bg-gray-100 p-4 rounded-lg shadow">
              <p className="text-gray-700">{comment.comment}</p>
              <div className="mt-2 flex items-start justify-between">
                <div className="text-sm text-gray-500">
                  <p>Created on {formatDate(comment.created_at)}</p>
                  {comment.updated_at && (
                    <p>Updated on {formatDate(comment.updated_at)}</p>
                  )}
                </div>
                <div className="text-xs text-gray-500 self-end">
                  {usersMap[comment.user_id] ? usersMap[comment.user_id] : 'Unknown user'}
                </div>
              </div>
              {attachmentCounts[comment.id] > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => openAttachments(comment.id)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    View attachments ({attachmentCounts[comment.id]})
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={closeModal} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 p-4">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-lg font-semibold">Attachments</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={closeModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {attachmentsLoading ? (
              <div className="py-8 text-center text-gray-500">Loading attachments…</div>
            ) : attachments.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No attachments found.</div>
            ) : (
              <div className="space-y-6">
                {attachments.map((att, idx) => {
                  const ct = (att.content_type || '').toLowerCase();
                  const isImage = ct.startsWith('image/');
                  const isPdf = ct === 'application/pdf' || (att.filename || '').toLowerCase().endsWith('.pdf');
                  return (
                    <div key={idx} className="border rounded-md overflow-hidden bg-white">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={att.filename}
                        className="block"
                      >
                        {isImage ? (
                          <img src={att.url} alt={att.filename} className="w-full h-auto max-h-[80vh] object-contain bg-black" />
                        ) : isPdf ? (
                          <embed src={att.url} type="application/pdf" className="w-full h-[80vh]" />
                        ) : (
                          <div className="p-6 h-40 flex items-center justify-center bg-gray-50">
                            <div className="text-center">
                              <div className="text-4xl">📄</div>
                              <div className="mt-2 text-xs text-gray-600 break-all">{att.filename}</div>
                            </div>
                          </div>
                        )}
                      </a>
                      <div className="px-3 py-2 text-xs text-gray-600 truncate" title={att.filename}>
                        {att.filename}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
