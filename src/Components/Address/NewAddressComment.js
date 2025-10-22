import React, { useState } from 'react';
import MentionsTextarea from '../MentionsTextarea';
import FileUploadInput from '../Common/FileUploadInput';
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
        try {
          // If the created comment has mentions, trigger a notification refresh
          if (created && Array.isArray(created.mentions) && created.mentions.length > 0) {
            window.dispatchEvent(new Event('notifications:refresh'));
          }
        } catch (_) { /* ignore */ }
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
      <div className="mt-2 space-y-3">
        <FileUploadInput
          id="address-attachments"
          name="attachments"
          files={files}
          onChange={setFiles}
          accept="image/*,application/pdf"
          disabled={submitting}
          label="Attachments"
          addFilesLabel={files.length > 0 ? 'Add files' : 'Choose files'}
          emptyStateLabel="No files selected"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 focus:outline-none focus:ring focus:ring-indigo-400"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Add Comment'}
        </button>
      </div>
    </form>
  );
};

export default NewAddressComment;
