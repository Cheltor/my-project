import React, { useState } from 'react';
import MentionsTextarea from '../MentionsTextarea';
import FileUploadInput from '../Common/FileUploadInput';
import LoadingSpinner from '../Common/LoadingSpinner';
import { useAuth } from '../../AuthContext';
import { useOffline } from '../../OfflineContext';
import { appendGeoMetadata } from '../../utils';

const NewAddressComment = ({ addressId, onCommentAdded }) => {
  const [newComment, setNewComment] = useState('');
  const [mentionIds, setMentionIds] = useState([]);
  const [contactMentionIds, setContactMentionIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const { user } = useAuth();
  const { isOnline, queueAction } = useOffline();
  const [offlineNotice, setOfflineNotice] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!newComment.trim()) return;

    if (!user) {
      console.error('User is not authenticated.');
      return;
    }

    const userId = user.id;

    if (!isOnline) {
      // Offline submission
      if (files.length > 0) {
        alert('File attachments are not supported in offline mode. Please remove attachments or try again when online.');
        return;
      }

      const action = {
        type: 'ADD_COMMENT',
        payload: {
          addressId,
          content: newComment,
          user_id: userId,
          mentioned_user_ids: mentionIds.join(','),
          mentioned_contact_ids: contactMentionIds.join(','),
        }
      };

      queueAction(action);

      // Optimistic update
      const tempComment = {
        id: `temp-${Date.now()}`,
        content: newComment,
        user_id: userId,
        user: user,
        created_at: new Date().toISOString(),
        mentions: [], // Mentions won't be resolved offline easily without more logic, skipping for now
        contact_mentions: [],
        isOffline: true, // Flag for UI
      };

      onCommentAdded(tempComment);
      setNewComment('');
      setMentionIds([]);
      setContactMentionIds([]);
      setOfflineNotice('Comment saved offline. It will sync when you are back online.');
      setTimeout(() => setOfflineNotice(''), 5000);
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append('content', newComment);
    if (mentionIds && mentionIds.length > 0) {
      formData.append('mentioned_user_ids', mentionIds.join(','));
    }
    formData.append('user_id', userId);
    if (contactMentionIds && contactMentionIds.length > 0) {
      formData.append('mentioned_contact_ids', contactMentionIds.join(','));
    }
    // address_id is in the path
    for (const f of files) formData.append('files', f);
    await appendGeoMetadata(formData);

    fetch(`${process.env.REACT_APP_API_URL}/comments/${addressId}/address/`, {
      method: 'POST',
      body: formData,
    })
      .then(async (response) => {
        if (!response.ok) {
          let detail = 'Request failed';
          try {
            const data = await response.json();
            detail = data?.detail || JSON.stringify(data);
          } catch (_) {
            try {
              detail = await response.text();
            } catch (_) { }
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
        setMentionIds([]);
        setFiles([]);
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
        placeholder={isOnline ? "Write a comment... Use @Name for users or %Name for contacts..." : "You are offline. Comments will be saved and synced later..."}
        className={`w-full p-2 border rounded-lg focus:outline-none focus:ring focus:ring-indigo-200 ${!isOnline ? 'border-amber-300 bg-amber-50' : 'border-gray-300'}`}
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
          disabled={submitting || !isOnline}
          label="Attachments"
          addFilesLabel={files.length > 0 ? 'Add files' : 'Choose files'}
          emptyStateLabel={!isOnline ? "Attachments unavailable offline" : "No files selected"}
        />
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className={`px-4 py-2 text-white rounded focus:outline-none focus:ring focus:ring-indigo-400 ${!isOnline ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
            disabled={submitting}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <LoadingSpinner />
                Submitting...
              </span>
            ) : (
              isOnline ? 'Add Comment' : 'Save Offline'
            )}
          </button>
          {offlineNotice && <span className="text-sm text-amber-700 font-medium">{offlineNotice}</span>}
        </div>
      </div>
    </form>
  );
};

export default NewAddressComment;
