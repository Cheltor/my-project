import React, { useState } from 'react';

const NewAddressComment = ({ addressId, onCommentAdded }) => {
  const [newComment, setNewComment] = useState(''); // State for new comment input
  const [submitting, setSubmitting] = useState(false); // State for form submission

  // Function to handle form submission
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!newComment.trim()) {
      return; // Prevent submission of empty comments
    }
  
    // Log the comment and address ID before submission
    console.log("Submitting comment:", newComment);
    console.log("Address ID:", addressId);
    console.log("User ID:", 1); // Hardcoded user ID for testing
  
    setSubmitting(true);
  
    fetch(`http://127.0.0.1:8000/addresses/${addressId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: newComment, user_id: 1 }), // Assuming user_id: 2 for testing
    })
      .then((response) => {
        console.log("Response status:", response.status); // Log the response status
        return response.json();
      })
      .then((newComment) => {
        console.log("Received response:", newComment); // Log the response data
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

export default NewAddressComment;
