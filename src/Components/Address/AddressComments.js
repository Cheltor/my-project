import React, { useState, useEffect } from 'react';
import NewAddressComment from './NewAddressComment'; // Import the new component

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

  // Function to add a new comment to the list
  const handleCommentAdded = (newComment) => {
    setComments([newComment, ...comments]); // Add the new comment to the top of the list
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

      {/* Form to add a new comment */}
      <NewAddressComment addressId={addressId} onCommentAdded={handleCommentAdded} />

      {/* List of existing comments */}
      <ul className="space-y-4 mt-4">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <li key={comment.id} className="bg-gray-100 p-4 rounded-lg shadow">
              <p className="text-gray-700 whitespace-pre-line">{comment.content}</p>
              <p className="text-sm text-gray-500 mt-2">Posted on {formatDate(comment.created_at)}</p>
              {comment.user && (
                <p className="text-sm text-gray-500">By {comment.user.email}</p>
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

export default AddressComments;
