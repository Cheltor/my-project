import React, { useState } from 'react';
import { useAuth } from '../../AuthContext'; // Import the useAuth hook from the AuthContext

const NewUnitComment = ({ unitId, addressId, onCommentAdded }) => {
  const [newComment, setNewComment] = useState(''); // State for new comment input
  const [submitting, setSubmitting] = useState(false); // State for form submission
  const { user } = useAuth(); // Get user data from context

  // Function to handle form submission
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!newComment.trim()) {
      return; // Prevent submission of empty comments
    }

    if (!user) {
      console.error('User is not authenticated.');
      return;
    }
    const userId = user.id; // Get the user ID from the user context

    setSubmitting(true);

    fetch(`${process.env.REACT_APP_API_URL}/comments/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: newComment, user_id: userId, unit_id: unitId, address_id: addressId }), // Include address_id
    })
      .then((response) => response.json())
      .then((newComment) => {
        onCommentAdded(newComment); // Notify parent component of the new comment
        setNewComment(''); // Clear the input field
        setSubmitting(false);
      })
      .catch((error) => {
        console.error('Error submitting comment:', error);
        setSubmitting(false);
      });
  };
  

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <textarea
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="Write a comment..."
        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-indigo-200"
        rows="4"
        disabled={submitting}
      ></textarea>
      <button
        type="submit"
        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 focus:outline-none focus:ring focus:ring-indigo-400"
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Add Comment'}
      </button>
    </form>
  );
};

export default NewUnitComment;
