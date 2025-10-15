import React, { useState } from 'react';
import MentionsTextarea from '../MentionsTextarea';
import { useAuth } from '../../AuthContext'; // Import the useAuth hook from the AuthContext

const NewAddressComment = ({ addressId, onCommentAdded }) => {
  const [newComment, setNewComment] = useState(''); // State for new comment input
  const [mentionIds, setMentionIds] = useState([]);
  const [submitting, setSubmitting] = useState(false); // State for form submission
  const [files, setFiles] = useState([]);
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

    // Log the comment and address ID before submission
    console.log("Submitting comment:", newComment);
    console.log("Address ID:", addressId);
    console.log("User ID:", userId); // Hardcoded user ID for testing
  
    setSubmitting(true);
  
    const formData = new FormData();
    formData.append('content', newComment);
    if (mentionIds && mentionIds.length > 0) {
      formData.append('mentioned_user_ids', mentionIds.join(','));
    }
    formData.append('user_id', userId);
    // address_id is in the path
    for (const f of files) formData.append('files', f);

    fetch(`${process.env.REACT_APP_API_URL}/comments/${addressId}/address/`, {
      method: 'POST',
      body: formData,
    })
      .then(async (response) => {
        console.log('Response status:', response.status);
        if (!response.ok) {
          // Try to parse error details, fall back to text
          let detail = 'Request failed';
          try {
            const data = await response.json();
            detail = data?.detail || JSON.stringify(data);
          } catch (_) {
            try {
              detail = await response.text();
            } catch (_) {}
          }
          throw new Error(`${response.status} ${response.statusText} - ${detail}`);
        }
        return response.json();
      })
      .then((created) => {
        console.log('Received response:', created);
        if (!created || typeof created.id === 'undefined') {
          console.warn('Server did not return a valid comment with id; skipping add to list.');
        } else {
          onCommentAdded(created);
        }
        setNewComment('');
        setMentionIds([]);
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
      <MentionsTextarea
        value={newComment}
        onChange={setNewComment}
        onMentionsChange={setMentionIds}
        placeholder="Write a comment... Use @Name to mention users"
        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-indigo-200"
        rows={4}
        disabled={submitting}
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          id="address-attachments"
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          disabled={submitting}
          onChange={(e) => {
            const picked = Array.from(e.target.files || []);
            if (picked.length === 0) return;
            setFiles((prev) => {
              const merged = [...prev];
              for (const f of picked) {
                const dup = merged.find(
                  (m) => m.name === f.name && m.size === f.size && m.lastModified === f.lastModified
                );
                if (!dup) merged.push(f);
              }
              return merged;
            });
            // allow selecting the same file again in mobile/desktop flows
            e.target.value = null;
          }}
        />
        <label
          htmlFor="address-attachments"
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
          {files.length > 0 ? 'Add files' : 'Choose files'}
        </label>
        {files.length > 0 && (
          <>
            <span className="text-sm text-gray-700 whitespace-nowrap px-3 py-1.5 bg-gray-100 rounded-md">
              {files.length} file{files.length > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-gray-900 underline"
              onClick={() => setFiles([])}
              disabled={submitting}
            >
              Clear
            </button>
          </>
        )}

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

export default NewAddressComment;
