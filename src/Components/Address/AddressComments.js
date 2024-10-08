import React, { useState, useEffect } from 'react';

// Utility function to format the date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const AddressComments = ({ addressId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);  // For loading state
  const [error, setError] = useState(null);      // For error state

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/comments/address/${addressId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch comments');
        }
        return response.json();
      })
      .then((data) => {
        setComments(data);  // Set the fetched comments
        setLoading(false);   // Set loading to false once data is fetched
      })
      .catch((error) => {
        setError(error.message);  // Handle any errors
        setLoading(false);
      });
  }, [addressId]);

  if (loading) {
    return <p>Loading comments...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (comments.length === 0) {
    return <p>No comments available.</p>;
  }

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Comments</h2>
      <ul className="space-y-4 mt-4">
        {comments.map((comment) => (
          <li key={comment.id} className="bg-gray-100 p-4 rounded-lg shadow">
            <p className="text-gray-700 whitespace-pre-line">{comment.content}</p>
            <p className="text-sm text-gray-500 mt-2">Posted on {formatDate(comment.created_at)}</p>
            {comment.user && (
              <p className="text-sm text-gray-500">By {comment.user.email}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AddressComments;
