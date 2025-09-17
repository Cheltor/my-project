import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NewAddressComment from './NewAddressComment';
import FullScreenPhotoViewer from '../FullScreenPhotoViewer';

// Utility function to format the date
const formatDate = (dateString) => {
  const options = {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const AddressComments = ({ addressId, pageSize = 10, initialPage = 1 }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  const [page, setPage] = useState(initialPage);

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
        // Once comments are fetched, fetch photos for each comment
        const fetchPhotosPromises = data.map((comment) => {
          return fetch(`${process.env.REACT_APP_API_URL}/comments/${comment.id}/photos`)
            .then((response) => {
              if (!response.ok) {
                // If no photos are found, return an empty array
                return [];
              }
              return response.json();
            })
            .then((photos) => {
              // Attach the photos to the comment
              return { ...comment, photos };
            })
            .catch((error) => {
              console.error(`Error fetching photos for comment ${comment.id}:`, error);
              // Return the comment without photos in case of error
              return { ...comment, photos: [] };
            });
        });

        // Wait for all comments with their photos to be fetched
        Promise.all(fetchPhotosPromises)
          .then((commentsWithPhotos) => {
            setComments(commentsWithPhotos);
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
      setComments([newComment, ...comments]);
      setPage(1);
      return;
    }
    // Optionally fetch photos for the new comment
    fetch(`${process.env.REACT_APP_API_URL}/comments/${newComment.id}/photos`)
      .then((response) => {
        if (!response.ok) {
          // If no photos are found, return an empty array
          return [];
        }
        return response.json();
      })
      .then((photos) => {
        // Attach the photos to the new comment
    const newCommentWithPhotos = { ...newComment, photos };
    setComments([newCommentWithPhotos, ...comments]);
    setPage(1);
      })
      .catch((error) => {
        console.error(`Error fetching photos for new comment ${newComment.id}:`, error);
    setComments([newComment, ...comments]);
    setPage(1);
      });
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

      <ul className="space-y-4 mt-2">
        {currentSlice.length > 0 ? (
          currentSlice.map((comment) => (
            <li key={comment.id} className="bg-gray-100 p-4 rounded-lg shadow">
              <p className="text-gray-700 whitespace-pre-line">{comment.content}</p>
              <p className="text-sm text-gray-500 mt-2">Posted on {formatDate(comment.created_at)}</p>
              {comment.user && (
                <p className="text-sm text-gray-500">
                  By {comment.user.name ? comment.user.name : comment.user.email}
                  {comment.unit_id && (
                    <span> &middot; <Link to={`/address/${comment.address_id}/unit/${comment.unit_id}`} className="text-blue-500 hover:underline">Unit {comment.unit && comment.unit.number ? comment.unit.number : comment.unit_id}</Link></span>
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
                  <div className="flex space-x-2 mt-2">
                    {comment.photos
                      .filter((photo) => !photo.filename.endsWith('.docx'))
                      .map((photo, index) => (
                        <img
                          key={index}
                          src={photo.url}
                          alt={photo.filename || `Comment photo ${index}`}
                          className="w-24 h-24 object-cover rounded-md shadow cursor-pointer"
                          onClick={() => setSelectedPhotoUrl(photo.url)}
                        />
                      ))}
                  </div>
                </div>
              )}
              {/* Display .docx files if available */}
              {comment.photos &&
                comment.photos
                  .filter((photo) => photo.filename.endsWith('.docx'))
                  .map((doc, index) => (
                    <div key={index} className="mt-2">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {doc.filename}
                      </a>
                    </div>
                  ))}
              {/* Display PDF files if available */}
              {comment.photos &&
                comment.photos
                  .filter((photo) => photo.filename.endsWith('.pdf'))
                  .map((pdf, index) => (
                    <div key={index} className="mt-2">
                      <a
                        href={pdf.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {pdf.filename}
                      </a>
                    </div>
                  ))}
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
