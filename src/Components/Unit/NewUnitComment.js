import React, { useState } from 'react';
import { useAuth } from '../../AuthContext'; // Import the useAuth hook from the AuthContext

const NewUnitComment = ({ unitId, addressId, onCommentAdded }) => {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const { user } = useAuth();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      console.error('User is not authenticated.');
      return;
    }
    const userId = user.id;
    setSubmitting(true);
    const hasFiles = files.length > 0;

    const endpoint = hasFiles
      ? `${process.env.REACT_APP_API_URL}/comments/unit/${unitId}/`
      : `${process.env.REACT_APP_API_URL}/comments/`;

    const requestInit = hasFiles
      ? (() => {
          const formData = new FormData();
          formData.append('content', newComment);
          formData.append('user_id', userId);
          formData.append('address_id', addressId);
          for (const f of files) formData.append('files', f);
          return { method: 'POST', body: formData };
        })()
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: newComment,
            user_id: userId,
            address_id: addressId,
            unit_id: unitId,
          }),
        };

    fetch(endpoint, requestInit)
      .then(async (response) => {
        if (!response.ok) {
          let detail = 'Request failed';
          try {
            const data = await response.json();
            detail = data?.detail || JSON.stringify(data);
          } catch (_) {
            try { detail = await response.text(); } catch (_) {}
          }
          throw new Error(`${response.status} ${response.statusText} - ${detail}`);
        }
        return response.json();
      })
      .then((created) => {
        if (!created || typeof created.id === 'undefined') {
          console.warn('Server did not return a valid comment with id; skipping add to list.');
        } else {
          onCommentAdded(created);
        }
        setNewComment('');
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
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          id="unit-attachments"
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          disabled={submitting}
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />
        <label
          htmlFor="unit-attachments"
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

export default NewUnitComment;
