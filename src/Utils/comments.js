import { toEasternLocaleString } from '../utils';

export const formatCommentDate = (dateString, options = {}) => {
  if (!dateString) return '';
  return toEasternLocaleString(
    dateString,
    undefined,
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
      ...options,
    },
  );
};

export const downloadCommentAttachments = async (commentId) => {
  if (!commentId) return;
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/comments/${commentId}/photos?download=true`);
    if (!response.ok) {
      throw new Error('Failed to get signed download URLs');
    }

    const downloadPhotos = await response.json();
    (downloadPhotos || []).forEach((att, idx) => {
      const src = att?.url;
      if (!src) return;
      const name = att?.filename || `attachment-${idx + 1}`;
      const a = document.createElement('a');
      a.href = src;
      a.download = name;
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 0);
    });
  } catch (error) {
    console.error('Download failed:', error);
  }
};
