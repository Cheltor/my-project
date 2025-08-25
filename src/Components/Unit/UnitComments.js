import React, { useState, useEffect } from 'react';
import NewUnitComment from './NewUnitComment';
import FullScreenPhotoViewer from '../FullScreenPhotoViewer';

// Utility function to format the date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const UnitComments = ({ unitId, addressId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);

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
        a.href = src;
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
    // Ensure unitId is always an integer for API calls
    const unitIdInt = Number(unitId);
    fetch(`${process.env.REACT_APP_API_URL}/comments/unit/${unitIdInt}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch comments');
        }
        return response.json();
      })
      .then((data) => {
        // For each comment, fetch photos
        const fetchPhotosPromises = data.map((comment) => {
          return fetch(`${process.env.REACT_APP_API_URL}/comments/${comment.id}/photos`)
            .then((response) => {
              if (!response.ok) return [];
              return response.json();
            })
            .then((photos) => ({ ...comment, photos }))
            .catch(() => ({ ...comment, photos: [] }));
        });
        Promise.all(fetchPhotosPromises)
          .then((commentsWithPhotos) => {
            setComments(commentsWithPhotos);
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
  }, [unitId]);

  const handleCommentAdded = (newComment) => {
    if (!newComment || typeof newComment.id === 'undefined' || newComment.id === null) {
      setComments([newComment, ...comments]);
      return;
    }
    fetch(`${process.env.REACT_APP_API_URL}/comments/${newComment.id}/photos`)
      .then((response) => {
        if (!response.ok) return [];
        return response.json();
      })
      .then((photos) => {
        const newCommentWithPhotos = { ...newComment, photos };
        setComments([newCommentWithPhotos, ...comments]);
      })
      .catch(() => {
        setComments([newComment, ...comments]);
      });
  };

  if (loading) {
    return <p>Loading comments...</p>;
  }

  if (error && comments.length === 0) {
    return <p>No comments available.</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Comments</h2>
      <NewUnitComment unitId={Number(unitId)} addressId={Number(addressId)} onCommentAdded={handleCommentAdded} />
      {selectedPhotoUrl && (
        <FullScreenPhotoViewer
          photoUrl={selectedPhotoUrl}
          onClose={() => setSelectedPhotoUrl(null)}
        />
      )}
      <ul className="space-y-4 mt-4">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <li key={comment.id} className="bg-gray-100 p-4 rounded-lg shadow">
              <p className="text-gray-700 whitespace-pre-line">{comment.content}</p>
              <p className="text-sm text-gray-500 mt-2">Posted on {formatDate(comment.created_at)}</p>
              {comment.user && (
                <p className="text-sm text-gray-500">
                  By {comment.user.name ? comment.user.name : comment.user.email}
                </p>
              )}
              {/* Display photos if available */}
              {comment.photos && comment.photos.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      className="text-indigo-600 hover:underline text-sm font-medium"
                      onClick={() => setSelectedPhotoUrl(comment.photos[0].url || comment.photos[0])}
                    >
                      View attachments ({comment.photos.length})
                    </button>
                    <button
                      type="button"
                      className="text-indigo-600 hover:underline text-sm font-medium"
                      onClick={() => downloadAttachments(comment.id)}
                    >
                      Download attachments ({comment.photos.length})
                    </button>
                  </div>
                  <div className="flex space-x-2 mt-2">
                    {comment.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo.url || photo}
                        alt={photo.filename || `Comment photo ${index}`}
                        className="w-24 h-24 object-cover rounded-md shadow cursor-pointer"
                        onClick={() => setSelectedPhotoUrl(photo.url || photo)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))
        ) : (
          <p>No comments available.</p>
        )}
      </ul>
    </div>
  );
};

export default UnitComments;
