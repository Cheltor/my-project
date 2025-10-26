import React, { useState, useEffect } from 'react';
import MentionsTextarea from '../MentionsTextarea';
import FileUploadInput from '../Common/FileUploadInput';
import { useAuth } from '../../AuthContext'; // Import the useAuth hook from the AuthContext

const NewContactComment = ({ contactId, onCommentAdded, commentId, initialText }) => {
  const [newComment, setNewComment] = useState(''); // State for new comment input
  const [submitting, setSubmitting] = useState(false); // State for form submission
  const [mentionIds, setMentionIds] = useState([]);
  const [files, setFiles] = useState([]); // Selected files
  const { user, token } = useAuth(); // Get user data and token from context
  const [contactMentionIds, setContactMentionIds] = useState([]);

  useEffect(() => {
    // Initialize text when editing
    if (commentId && typeof initialText === 'string') {
      setNewComment(initialText);
    }
  }, [commentId, initialText]);

  // Function to handle form submission
  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = (newComment || '').trim();
    if (!trimmed) {
      return; // Prevent submission of empty comments
    }

    if (!user) {
      console.error('User is not authenticated.');
      return;
    }

    const userId = user.id; // Get the user ID from the user context

    setSubmitting(true);

    if (commentId) {
      // Editing existing contact comment
      const payload = { comment: trimmed, user_id: userId, contact_id: contactId };
      fetch(`${process.env.REACT_APP_API_URL}/comments/contact/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
        .then((response) => response.json())
        .then((updated) => {
          if (onCommentAdded) onCommentAdded(updated);
          setMentionIds([]);
          setSubmitting(false);
        })
        .catch((error) => {
          console.error('Error updating contact comment:', error);
          setSubmitting(false);
        });
      return;
    }

    // Creating a new comment with attachments
    const formData = new FormData();
    formData.append('comment', trimmed);
    formData.append('user_id', userId);
    if (mentionIds && mentionIds.length > 0) {
      formData.append('mentioned_user_ids', mentionIds.join(','));
    }
    if (contactMentionIds && contactMentionIds.length > 0) {
      formData.append('mentioned_contact_ids', contactMentionIds.join(','));
    }
    // contact_id is in the path; backend doesn't need it in body
    for (const f of files) {
      formData.append('files', f);
    }

    const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

    fetch(`${process.env.REACT_APP_API_URL}/comments/${contactId}/contact/`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    })
      .then((response) => response.json())
      .then((created) => {
        if (onCommentAdded) onCommentAdded(created);
        setNewComment(''); // Clear the input field
        setMentionIds([]);
        setFiles([]);
        setContactMentionIds([]);
        setSubmitting(false);
      })
      .catch((error) => {
        console.error('Error submitting comment:', error);
        setSubmitting(false);
      });
  };

  const isEditing = !!commentId;

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <MentionsTextarea
        value={newComment}
        onChange={setNewComment}
        onMentionsChange={setMentionIds}
        onContactMentionsChange={setContactMentionIds}
        placeholder={isEditing ? 'Edit your comment... Use @Name for users or %Name for contacts' : 'Write a comment... Use @Name for users or %Name for contacts'}
        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-indigo-200"
        rows={4}
        disabled={submitting}
      />

      {!isEditing && (
        <div className="mt-2 space-y-3">
          <FileUploadInput
            id="contact-attachments"
            name="attachments"
            files={files}
            onChange={setFiles}
            accept="image/*,application/pdf"
            disabled={submitting}
            label="Attachments"
            addFilesLabel={files.length > 0 ? 'Add files' : 'Choose files'}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 focus:outline-none focus:ring focus:ring-indigo-400"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Add Comment'}
          </button>
        </div>
      )}

      {isEditing && (
        <div className="mt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 focus:outline-none focus:ring focus:ring-indigo-400"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </form>
  );
};

export default NewContactComment;
