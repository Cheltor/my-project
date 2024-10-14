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

  // Function to fetch comments
  const fetchComments = () => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/comments/contact/${contactId}`)
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

  if (loading) return <div>Loading comments...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold text-gray-700">Comments</h2>
      {/* Add new comment form and pass fetchComments as a callback */}
      <NewContactComment contactId={contactId} onCommentAdded={fetchComments} />
      {comments.length === 0 ? (
        <p>No comments available.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="bg-gray-100 p-4 rounded-lg shadow">
              <p className="text-gray-700">{comment.comment}</p>
              <p className="text-sm text-gray-500 mt-2">Created on {formatDate(comment.created_at)}</p>
              {comment.updated_at && (
                <p className="text-sm text-gray-500">Updated on {formatDate(comment.updated_at)}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
