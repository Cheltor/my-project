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
      />

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          id="contact-attachments"
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          disabled={submitting}
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />
        <label
          htmlFor="contact-attachments"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border shadow-sm text-sm font-medium transition-colors cursor-pointer ${submitting ? 'pointer-events-none opacity-60 bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500'}`}
          aria-disabled={submitting}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path d="M21.44 11.05L12 20.5a6 6 0 1 1-8.49-8.49l9.9-9.9a4.5 4.5 0 1 1 6.36 6.36L9.88 19.36a3 3 0 1 1-4.24-4.24l8.49-8.49" />
          </svg>
          {files.length > 0 ? 'Change files' : 'Choose files'}
        </label>

        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 focus:outline-none focus:ring focus:ring-indigo-400"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Add Comment'}
        </button>
      </div>

      {files.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-2">
            {files.map((f, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs border border-indigo-200">
                <span className="truncate max-w-[12rem]" title={f.name}>{f.name}</span>
              </span>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 text-xs text-gray-600 hover:text-gray-900 underline"
            onClick={() => setFiles([])}
            disabled={submitting}
          >
            Clear selection
          </button>
        </div>
      )}
    </form>
  );
};

export default NewContactComment;
