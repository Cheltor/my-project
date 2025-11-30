import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NewUnitComment from './NewUnitComment';
import FullScreenPhotoViewer from '../FullScreenPhotoViewer';
import CreateViolationFromCommentModal from '../Comment/CreateViolationFromCommentModal';
import ImageEvaluationModal from '../Comment/ImageEvaluationModal';
import { toEasternLocaleString, getAttachmentFilename, isImageAttachment, getAttachmentDisplayLabel } from '../../utils';
import { useAuth } from '../../AuthContext';
import { useSettings } from '../../SettingsContext';

// Utility function to format the date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return toEasternLocaleString(dateString, undefined, options);
};

const UnitComments = ({ unitId, addressId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  const [violationComment, setViolationComment] = useState(null);

  // Evaluation state
  const [evaluatingImage, setEvaluatingImage] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [evaluationError, setEvaluationError] = useState('');
  const [violationDraftData, setViolationDraftData] = useState(null);

  // Clear error on close
  useEffect(() => {
    if (!showEvaluationModal) {
      setEvaluationError('');
    }
  }, [showEvaluationModal]);

  const { token } = useAuth() || {};
  const { imageAnalysisEnabled } = useSettings();

  const downloadAttachments = async (commentId) => {
    if (!commentId) return;
    try {
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/comments/${commentId}/photos?download=true`);
      if (!resp.ok) throw new Error('Failed to get signed download URLs');
      const downloadPhotos = await resp.json();
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
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  useEffect(() => {
    // Ensure unitId is always an integer for API calls
    const unitIdInt = Number(unitId);
    fetch(`${process.env.REACT_APP_API_URL}/comments/unit/${unitIdInt}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch comments');
        }
        return response.json();
      })
      .then((data) => {
        // For each comment, fetch photos and mentions
        const fetchExtrasPromises = data.map(async (comment) => {
          let photos = [];
          try {
            const resp = await fetch(`${process.env.REACT_APP_API_URL}/comments/${comment.id}/photos`);
            photos = resp.ok ? await resp.json() : [];
          } catch { photos = []; }

          let mentions = [];
          try {
            const mResp = await fetch(`${process.env.REACT_APP_API_URL}/comments/${comment.id}/mentions`);
            mentions = mResp.ok ? await mResp.json() : [];
          } catch { mentions = []; }

          return { ...comment, photos, mentions };
        });
        Promise.all(fetchExtrasPromises)
          .then((commentsWithExtras) => {
            setComments(commentsWithExtras);
            setLoading(false);
          })
          .catch((error) => {
            setError(error.message);
            setLoading(false);
          });
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [unitId]);

  const handleCommentAdded = (newComment) => {
    if (!newComment || typeof newComment.id === 'undefined' || newComment.id === null) {
      setComments([newComment, ...comments]);
      return;
    }
    (async () => {
      try {
        let photos = [];
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/comments/${newComment.id}/photos`);
          photos = response.ok ? await response.json() : [];
        } catch { photos = []; }

        let mentions = [];
        try {
          const mResp = await fetch(`${process.env.REACT_APP_API_URL}/comments/${newComment.id}/mentions`);
          mentions = mResp.ok ? await mResp.json() : [];
        } catch { mentions = []; }

        const newCommentWithExtras = { ...newComment, photos, mentions };
        setComments([newCommentWithExtras, ...comments]);
      } catch {
        setComments([newComment, ...comments]);
      }
    })();
  };

  const handleEvaluateImage = async (urls, comment) => {
    const urlList = Array.isArray(urls) ? urls : [urls];
    if (!urlList.length) return;

    setEvaluatingImage(urlList[0]);
    setEvaluationError('');
    setEvaluationResult(null);

    try {
      const formData = new FormData();

      await Promise.all(urlList.map(async (url, index) => {
        const imageResp = await fetch(url);
        if (!imageResp.ok) throw new Error(`Failed to fetch image data for ${url}`);
        const blob = await imageResp.blob();
        formData.append('files', blob, `image-${index}.jpg`);
      }));

      const evalResp = await fetch(`${process.env.REACT_APP_API_URL}/assistant/evaluate-image`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!evalResp.ok) {
        const errText = await evalResp.text();
        throw new Error(`Evaluation failed: ${errText}`);
      }

      const result = await evalResp.json();
      setEvaluationResult(result);
      setShowEvaluationModal(true);

      setViolationDraftData({
        comment,
        evaluation: result
      });

    } catch (err) {
      console.error('Image evaluation failed:', err);
      setEvaluationError(err.message || 'Failed to evaluate image');
      alert(`Evaluation failed: ${err.message}`);
    } finally {
      setEvaluatingImage(null);
    }
  };

  const handleDraftViolationFromEvaluation = (result) => {
    setShowEvaluationModal(false);
    if (violationDraftData?.comment) {
      setViolationComment(violationDraftData.comment);
    }
  };

  if (loading) {
    return <p>Loading comments...</p>;
  }

  if (error && comments.length === 0) {
    return <p>No comments available.</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <>
      <div className="border-b pb-4">
        <h2 className="text-2xl font-semibold text-gray-700">Comments</h2>
        <NewUnitComment unitId={Number(unitId)} addressId={Number(addressId)} onCommentAdded={handleCommentAdded} />
        {selectedPhotoUrl && (
          <FullScreenPhotoViewer
            photoUrl={selectedPhotoUrl}
            onClose={() => setSelectedPhotoUrl(null)}
          />
        )}
        <ul className="space-y-4 mt-4">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <li key={comment.id} className="relative rounded-lg bg-gray-100 p-4 shadow">
                <div className="absolute right-3 top-3 flex items-center gap-2">
                  {!comment.violation_id && (
                    <button
                      type="button"
                      onClick={() => setViolationComment(comment)}
                      className="inline-flex items-center rounded-full border border-transparent bg-white/80 px-3 py-1 text-xs font-medium text-indigo-600 shadow-sm transition hover:bg-indigo-100 hover:text-indigo-700"
                    >
                      Create violation
                    </button>
                  )}
                  {comment.violation_id && (
                    <Link
                      to={`/violation/${comment.violation_id}`}
                      className="inline-flex items-center rounded-full border border-transparent bg-white/80 px-3 py-1 text-xs font-medium text-green-700 shadow-sm transition hover:bg-green-100"
                    >
                      View #{comment.violation_id}
                    </Link>
                  )}
                </div>
                <p className="text-gray-700 whitespace-pre-line">{comment.content}</p>
                {Array.isArray(comment.mentions) && comment.mentions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {comment.mentions.map((u) => (
                      <span key={u.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                        @{u.name || u.email}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-2">Posted on {formatDate(comment.created_at)}</p>
                {comment.user && (
                  <p className="text-sm text-gray-500">
                    By {comment.user.name ? comment.user.name : comment.user.email}
                  </p>
                )}
                {/* Display photos if available */}
                {comment.photos && comment.photos.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        className="text-indigo-600 hover:underline text-sm font-medium"
                        onClick={() => setSelectedPhotoUrl(comment.photos[0].url || comment.photos[0])}
                      >
                        View attachments ({comment.photos.length})
                      </button>
                      <button
                        type="button"
                        className="text-indigo-600 hover:underline text-sm font-medium"
                        onClick={() => downloadAttachments(comment.id)}
                      >
                        Download attachments ({comment.photos.length})
                      </button>
                      {imageAnalysisEnabled && comment.photos.filter(p => isImageAttachment(p)).length > 1 && (
                        <button
                          type="button"
                          className="text-indigo-600 hover:underline text-sm font-medium ml-4"
                          onClick={() => {
                            const imageUrls = comment.photos
                              .filter(p => isImageAttachment(p))
                              .map(p => p?.url || p);
                            handleEvaluateImage(imageUrls, comment);
                          }}
                          disabled={!!evaluatingImage}
                        >
                          {evaluatingImage ? 'Evaluating...' : 'Evaluate All'}
                        </button>
                      )}
                    </div>
                    <div className="flex space-x-2 mt-2">
                      {comment.photos.map((attachment, index) => {
                        const url = attachment?.url || attachment;
                        const filename = getAttachmentFilename(attachment, `Attachment ${index + 1}`);
                        const isImage = isImageAttachment(attachment);
                        const extensionLabel = getAttachmentDisplayLabel(attachment);

                        return (
                          <div key={index} className="relative">
                            {isImage ? (
                              <div className="relative">
                                <img
                                  src={url}
                                  alt={filename}
                                  className="w-24 h-24 object-cover rounded-md shadow cursor-pointer"
                                  onClick={() => setSelectedPhotoUrl(url)}
                                />
                                {evaluatingImage === url && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                  </div>
                                )}
                                {imageAnalysisEnabled && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEvaluateImage(url, comment);
                                    }}
                                    disabled={!!evaluatingImage}
                                    className="absolute top-1 right-1 rounded-full bg-white/90 p-1 text-indigo-600 shadow-sm hover:bg-white hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    title="Evaluate with AI"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                                      <path d="M16.5 7.5h-9v9h9v-9z" />
                                      <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 019 3v.75h2.25V3a.75.75 0 011.5 0v.75H15V3a.75.75 0 011.5 0v.75h.75a3 3 0 013 3v.75H21A.75.75 0 0121 9h-.75v2.25H21a.75.75 0 010 1.5h-.75V15H21a.75.75 0 010 1.5h-.75v.75a3 3 0 01-3 3h-.75V21a.75.75 0 01-1.5 0v-.75H12.75V21a.75.75 0 01-1.5 0v-.75H9V21a.75.75 0 01-1.5 0v-.75h-.75a3 3 0 01-3-3v-.75H3A.75.75 0 013 15h.75v-2.25H3a.75.75 0 010-1.5h.75V9H3a.75.75 0 010-1.5h.75v-.75a3 3 0 013-3h.75V3a.75.75 0 01.75-.75zM6 6.75A.75.75 0 016.75 6h10.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V6.75z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="w-24 h-24 flex flex-col items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-600">
                                <span className="text-2xl">📄</span>
                                <span className="mt-1 text-[10px] font-semibold uppercase">{extensionLabel}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </li>
            ))
          ) : (
            <p>No comments available.</p>
          )}
        </ul>
      </div>
      {violationComment && (
        <CreateViolationFromCommentModal
          comment={violationComment}
          unitId={unitId}
          onClose={() => setViolationComment(null)}
          onCreated={(newViolation) => {
            if (newViolation?.id) {
              setComments((prev) =>
                prev.map((existing) =>
                  existing.id === violationComment.id
                    ? { ...existing, violation_id: newViolation.id }
                    : existing
                )
              );
              setViolationComment((prev) => (prev ? { ...prev, violation_id: newViolation.id } : prev));
            }
          }}
          initialData={violationDraftData?.comment?.id === violationComment?.id ? violationDraftData?.evaluation : null}
        />
      )}

      <ImageEvaluationModal
        isOpen={showEvaluationModal}
        onClose={() => setShowEvaluationModal(false)}
        evaluationResult={evaluationResult}
        onDraftViolation={handleDraftViolationFromEvaluation}
      />
    </>
  );
};

export default UnitComments;
