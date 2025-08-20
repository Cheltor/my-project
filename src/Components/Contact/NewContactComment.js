import React, { useState } from 'react';
import { useAuth } from '../../AuthContext'; // Import the useAuth hook from the AuthContext

const NewContactComment = ({ contactId, onCommentAdded }) => {
  const [newComment, setNewComment] = useState(''); // State for new comment input
  const [submitting, setSubmitting] = useState(false); // State for form submission
  const [files, setFiles] = useState([]); // Selected files
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

    // Log the comment and contact ID before submission
    console.log("Submitting comment:", newComment);
    console.log("Contact ID:", contactId);
    console.log("User ID:", userId);

    setSubmitting(true);

    const formData = new FormData();
    formData.append('comment', newComment);
    formData.append('user_id', userId);
    // contact_id is in the path; backend doesn't need it in body
    for (const f of files) {
      formData.append('files', f);
    }

    fetch(`${process.env.REACT_APP_API_URL}/comments/${contactId}/contact/`, {
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        console.log("Response status:", response.status); // Log the response status
        return response.json();
      })
      .then((newComment) => {
        console.log("Received response:", newComment); // Log the response data
        onCommentAdded(newComment); // Notify parent component of the new comment
        setNewComment(''); // Clear the input field
        setFiles([]);
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
      <input
        type="file"
        multiple
        className="mt-2"
        disabled={submitting}
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />
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

export default NewContactComment;
