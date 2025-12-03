import React, { useState } from 'react';
import { useAuth } from '../../AuthContext';
import MentionsTextarea from '../MentionsTextarea';
import FileUploadInput from '../Common/FileUploadInput';
import LoadingSpinner from '../Common/LoadingSpinner';
import { appendGeoMetadata } from '../../utils';

const NewUnitComment = ({ unitId, addressId, onCommentAdded }) => {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const [mentionIds, setMentionIds] = useState([]);
  const [contactMentionIds, setContactMentionIds] = useState([]);
  const { user } = useAuth();

  const handleSubmit = async (event) => {
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

    let requestInit;
    if (hasFiles) {
      const formData = new FormData();
      formData.append('content', newComment);
      formData.append('user_id', userId);
      formData.append('address_id', addressId);
      if (mentionIds && mentionIds.length > 0) {
        formData.append('mentioned_user_ids', mentionIds.join(','));
      }
      if (contactMentionIds && contactMentionIds.length > 0) {
        formData.append('mentioned_contact_ids', contactMentionIds.join(','));
      }
      for (const f of files) formData.append('files', f);
      await appendGeoMetadata(formData);
      requestInit = { method: 'POST', body: formData };
    } else {
      requestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          user_id: userId,
          address_id: addressId,
          unit_id: unitId,
          mentioned_user_ids: mentionIds && mentionIds.length > 0 ? mentionIds : undefined,
          mentioned_contact_ids: contactMentionIds && contactMentionIds.length > 0 ? contactMentionIds : undefined,
        }),
      };
    }

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
        setMentionIds([]);
        setContactMentionIds([]);
        setSubmitting(false);
        try {
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
        onContactMentionsChange={setContactMentionIds}
        placeholder="Write a comment... Use @Name for users or %Name for contacts..."
        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-indigo-200"
        rows={4}
        disabled={submitting}
      />
      <div className="mt-2 space-y-3">
        <FileUploadInput
          id="unit-attachments"
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
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <LoadingSpinner />
              Submitting...
            </span>
          ) : (
            'Add Comment'
          )}
        </button>
      </div>
    </form>
  );
};

export default NewUnitComment;
