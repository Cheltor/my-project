import React, { useState, useEffect } from 'react';
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

const AddressComments = ({ addressId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);

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
  }, [addressId]);

  const handleCommentAdded = (newComment) => {
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
      })
      .catch((error) => {
        console.error(`Error fetching photos for new comment ${newComment.id}:`, error);
        setComments([newComment, ...comments]);
      });
  };

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
              {comment.photos && comment.photos.length > 0 && (
                <div className="mt-2">
                  <h3 className="text-sm font-semibold text-gray-600">
                    Attachment{comment.photos.length > 1 ? 's' : ''}:
                  </h3>
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
    </div>
  );
};

export default AddressComments;
