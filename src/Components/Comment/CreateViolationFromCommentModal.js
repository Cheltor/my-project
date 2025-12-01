import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CodeSelect from '../CodeSelect';
import { useAuth } from '../../AuthContext';
import CodeDrawerLink from '../Codes/CodeDrawerLink';
import LoadingSpinner from '../Common/LoadingSpinner';
import {
  getAttachmentDisplayLabel,
  getAttachmentFilename,
  isImageAttachment,
  filterActiveOnsUsers,
} from '../../utils';

const DEADLINE_OPTIONS = [
  'Immediate',
  '1 day',
  '3 days',
  '7 days',
  '14 days',
  '30 days',
];

const VIOLATION_TYPE_OPTIONS = [
  { value: 'doorhanger', label: 'Doorhanger' },
  { value: 'Formal Notice', label: 'Formal Notice' },
];

const STEPS = [
  { key: 'comment', label: 'Review comment' },
  { key: 'codes', label: 'Select codes' },
  { key: 'details', label: 'Confirm details' },
];

const defaultNotes = (comment) => {
  if (!comment) return '';
  const content = comment.content || '';
  return content.trim();
};

export default function CreateViolationFromCommentModal({ comment, unitId, onClose, onCreated, initialData }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deadline, setDeadline] = useState(DEADLINE_OPTIONS[0]);
  const [violationType, setViolationType] = useState(VIOLATION_TYPE_OPTIONS[0].value);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [notes, setNotes] = useState(defaultNotes(comment));
  const [onsUsers, setOnsUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoCodeMap, setPhotoCodeMap] = useState({}); // filename -> [codeIds]
  const [photoError, setPhotoError] = useState('');
  const [photoTagIndex, setPhotoTagIndex] = useState(0);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [createdViolation, setCreatedViolation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [codesError, setCodesError] = useState('');

  const isAdmin = Number(user?.role) === 3;
  const currentStep = STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const commentPreview = useMemo(() => (comment?.content || '').trim(), [comment?.content]);
  const commentAttachments = useMemo(
    () => (Array.isArray(comment?.photos) ? comment.photos : []),
    [comment?.photos]
  );
  const selectedCodeSummaries = useMemo(() => {
    const options = Array.isArray(selectedCodes) ? selectedCodes : [];
    return options.map((opt, index) => {
      const codeId =
        typeof opt?.code?.id === 'number'
          ? opt.code.id
          : typeof opt?.value === 'number'
            ? opt.value
            : null;
      const name =
        opt?.code?.name ||
        opt?.label ||
        opt?.code?.description ||
        (codeId ? `Code #${codeId}` : `Code ${index + 1}`);
      return { id: codeId, name, option: opt };
    });
  }, [selectedCodes]);
  const selectedAssigneeLabel = useMemo(() => {
    if (!assigneeId) {
      if (comment?.user?.name || comment?.user?.email) {
        return `${comment.user.name || comment.user.email} (comment author)`;
      }
      if (comment?.user_id) {
        return `User #${comment.user_id} (comment author)`;
      }
      return 'Auto (system default)';
    }
    const match = onsUsers.find((onsUser) => String(onsUser.id) === String(assigneeId));
    if (match?.name) return match.name;
    if (match?.email) return match.email;
    if (user?.id && String(user.id) === String(assigneeId)) {
      return user.name || user.email || `User #${assigneeId}`;
    }
    return `User #${assigneeId}`;
  }, [
    assigneeId,
    onsUsers,
    user?.id,
    user?.name,
    user?.email,
    comment?.user?.name,
    comment?.user?.email,
    comment?.user_id,
  ]);

  useEffect(() => {
    let cancelled = false;
    const loadUsers = async () => {
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/users/ons/`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (cancelled) return;
        let normalized = filterActiveOnsUsers(data);
        const currentIsActive = user?.active !== false;
        if (
          currentIsActive &&
          user?.id &&
          !normalized.some((onsUser) => Number(onsUser.id) === Number(user.id))
        ) {
          normalized = [
            ...normalized,
            {
              id: user.id,
              name: user.name,
              email: user.email,
            },
          ];
        }
        if (!cancelled) {
          setOnsUsers(normalized);
        }
      } catch (err) {
        console.warn('Failed to load ONS users', err);
      }
    };

    if (isAdmin) {
      loadUsers();
    } else {
      setOnsUsers([]);
    }

    return () => {
      cancelled = true;
    };
  }, [isAdmin, user?.id, user?.name, user?.email]);

  useEffect(() => {
    if (!comment) return;
    setDeadline(DEADLINE_OPTIONS[0]);
    setViolationType(VIOLATION_TYPE_OPTIONS[0].value);
    setPhotoError('');

    // Pre-fill from initialData (AI evaluation) if available
    if (initialData) {
      const prefilledCodes = (initialData.potential_violations || [])
        .filter(v => v.code_id || v.code_citation)
        .map(v => ({
          label: v.code_citation ? `${v.code_citation} - ${v.description}` : v.description,
          value: v.code_id || v.code_citation,
          code: {
            id: v.code_id,
            name: v.code_citation,
            description: v.description
          }
        }));

      setSelectedCodes(prefilledCodes);

      // Construct notes from observation and recommendation
      let prefilledNotes = defaultNotes(comment);
      if (initialData.observation || initialData.recommendation) {
        prefilledNotes += '\n\n[AI Evaluation]\n';
        if (initialData.observation) prefilledNotes += `Observation: ${initialData.observation}\n`;
        if (initialData.recommendation) prefilledNotes += `Recommendation: ${initialData.recommendation}\n`;
      }
      setNotes(prefilledNotes);

      // If we have codes, jump to the codes step or details step?
      // Maybe stay on first step to let user review, but show the codes are selected.
      // Or jump to codes step if we want to be helpful.
      // Let's stay on step 0 so they see the comment context first.
    } else {
      setSelectedCodes([]);
      setNotes(defaultNotes(comment));
    }

    // Initialize selected photos with all available photos
    if (comment?.photos && Array.isArray(comment.photos)) {
      const allFilenames = comment.photos.map((p) => {
        if (typeof p === 'string') return p;
        return getAttachmentFilename(p, 'unknown');
      });
      setSelectedPhotos(allFilenames);
      setPhotoCodeMap((prev) => {
        const next = {};
        allFilenames.forEach((name) => { next[name] = prev[name] || []; });
        return next;
      });
      setPhotoTagIndex(0);
    } else {
      setSelectedPhotos([]);
      setPhotoCodeMap({});
      setPhotoTagIndex(0);
    }

    setError('');
    setStatusMessage('');
    setCreatedViolation(null);
    setSubmitting(false);
    setCurrentStepIndex(0);
    setCodesError('');
    setPhotoError('');
    const defaultAssigneeId = user?.id
      ? String(user.id)
      : comment?.user_id
        ? String(comment.user_id)
        : '';
    setAssigneeId(defaultAssigneeId);
  }, [comment, isAdmin, user?.id, user?.name, user?.email, initialData]);

  const photoCodeOptionsUnion = useMemo(() => {
    const map = new Map();
    Object.values(photoCodeMap || {}).forEach((opts) => {
      (opts || []).forEach((opt) => {
        const id =
          opt?.code?.id ??
          (typeof opt?.value === 'number' ? opt.value : typeof opt?.value === 'string' ? Number(opt.value) : null);
        if (typeof id === 'number' && !Number.isNaN(id) && !map.has(id)) {
          map.set(id, opt);
        }
      });
    });
    return Array.from(map.values());
  }, [photoCodeMap]);

  useEffect(() => {
    setSelectedCodes(photoCodeOptionsUnion);
  }, [photoCodeOptionsUnion]);

  const photoUnionIds = useMemo(() => {
    return (photoCodeOptionsUnion || [])
      .map((opt) => opt?.code?.id ?? (typeof opt?.value === 'number' ? opt.value : typeof opt?.value === 'string' ? Number(opt.value) : null))
      .filter((id) => typeof id === 'number' && !Number.isNaN(id));
  }, [photoCodeOptionsUnion]);

  const handlePhotoCodeChange = (filename, nextOpts) => {
    setPhotoCodeMap((prev) => ({ ...(prev || {}), [filename]: nextOpts || [] }));
  };

  const currentPhotoName = selectedPhotos[photoTagIndex] || null;
  const currentPhotoMeta = useMemo(() => {
    if (!currentPhotoName) return null;
    let match = null;
    commentAttachments.forEach((attachment, index) => {
      const fallbackName = `Attachment ${index + 1}`;
      const attachmentObj = attachment && typeof attachment === 'object' ? attachment : {};
      const url = attachmentObj.url || (typeof attachment === 'string' ? attachment : '') || '';
      const filename =
        typeof attachment === 'string'
          ? fallbackName
          : getAttachmentFilename(attachmentObj, fallbackName);
      if (filename === currentPhotoName) {
        const imageLike =
          typeof attachment === 'string'
            ? /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(attachment)
            : isImageAttachment(attachmentObj);
        match = {
          url,
          filename,
          isImage: imageLike,
          displayLabel:
            typeof attachment === 'string'
              ? (filename.split('.').pop() || 'FILE').toUpperCase()
              : getAttachmentDisplayLabel(attachmentObj),
        };
      }
    });
    return match;
  }, [commentAttachments, currentPhotoName]);

  useEffect(() => {
    setPhotoTagIndex((idx) => {
      if (selectedPhotos.length === 0) return 0;
      return Math.min(idx, selectedPhotos.length - 1);
    });
    if (selectedPhotos.length > 0) {
      setPhotoError('');
    }
  }, [selectedPhotos]);

  const goPrevPhoto = () => {
    setPhotoTagIndex((idx) => Math.max(0, idx - 1));
  };
  const goNextPhoto = () => {
    setPhotoTagIndex((idx) => Math.min(selectedPhotos.length - 1, idx + 1));
  };

  const allSelectedCodeIds = useMemo(() => {
    const ids = new Set();
    Object.values(photoCodeMap || {}).forEach((opts) => {
      (opts || []).forEach((opt) => {
        const id =
          opt?.code?.id ??
          (typeof opt?.value === 'number'
            ? opt.value
            : typeof opt?.value === 'string'
              ? Number(opt.value)
              : null);
        if (typeof id === 'number' && !Number.isNaN(id)) ids.add(id);
      });
    });
    return Array.from(ids);
  }, [photoCodeMap]);

  const attachmentsMessage = useMemo(() => {
    if (!comment || !Array.isArray(comment.photos) || comment.photos.length === 0) {
      return null;
    }
    const count = comment.photos.length;
    return count === 1
      ? 'This comment has 1 attachment. It will be copied to the violation.'
      : `This comment has ${count} attachments. They will be copied to the violation.`;
  }, [comment]);

  const handleBack = () => {
    if (submitting) return;
    setCodesError('');
    setError('');
    setCurrentStepIndex((index) => Math.max(0, index - 1));
  };

  const handleNext = () => {
    if (submitting) return;
    if (currentStep.key === 'codes') {
      if (!photoUnionIds || photoUnionIds.length === 0) {
        setCodesError('Select at least one code for the photos.');
        return;
      }
      setCodesError('');
    }
    if (commentAttachments.length > 0 && selectedPhotos.length === 0) {
      setPhotoError('Select at least one photo to include with the violation.');
      return;
    }
    setPhotoError('');
    setError('');
    setCurrentStepIndex((index) => Math.min(STEPS.length - 1, index + 1));
  };

  const handleTogglePhoto = (filename) => {
    setSelectedPhotos((prev) => {
      if (prev.includes(filename)) {
        const next = prev.filter((f) => f !== filename);
        setPhotoCodeMap((map) => {
          const copy = { ...(map || {}) };
          delete copy[filename];
          return copy;
        });
        return next;
      }
      setPhotoCodeMap((map) => ({
        ...(map || {}),
        [filename]: (map || {})[filename] || [],
      }));
      return [...prev, filename];
    });
  };

  useEffect(() => {
    if (selectedPhotos.length > 0) {
      setPhotoError('');
    }
  }, [selectedPhotos.length]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!comment || submitting) return;

    if (!isLastStep) {
      handleNext();
      return;
    }

    setSubmitting(true);
    setError('');
    setStatusMessage('');
    setCreatedViolation(null);

    const safeDeadline = DEADLINE_OPTIONS.includes(deadline) ? deadline : DEADLINE_OPTIONS[0];
    if (!DEADLINE_OPTIONS.includes(deadline)) {
      setDeadline(safeDeadline);
    }

    if (!photoUnionIds || photoUnionIds.length === 0) {
      setCodesError('Select at least one code for the photos.');
      setError('Select at least one violation code.');
      setSubmitting(false);
      setCurrentStepIndex(1);
      return;
    }
    if (commentAttachments.length > 0 && selectedPhotos.length === 0) {
      setPhotoError('Select at least one attachment to include.');
      setSubmitting(false);
      setCurrentStepIndex(0);
      return;
    }

    const codes = photoUnionIds;

    const resolvedNotes = notes && notes.trim().length > 0
      ? notes.trim()
      : (comment.content || '');

    let resolvedUserId;
    if (isAdmin) {
      resolvedUserId = assigneeId ? Number(assigneeId) : undefined;
    } else if (user?.id) {
      resolvedUserId = Number(user.id);
    } else if (comment.user_id) {
      resolvedUserId = Number(comment.user_id);
    }

    const payload = {
      deadline: safeDeadline,
      violation_type: violationType,
      codes,
      description: resolvedNotes,
      comment: resolvedNotes,
      unit_id: unitId ? Number(unitId) : undefined,
    };

    // If not all photos are selected, send keep_filenames
    if (comment?.photos && Array.isArray(comment.photos)) {
      const totalPhotos = comment.photos.length;
      if (selectedPhotos.length < totalPhotos) {
        payload.keep_filenames = selectedPhotos;
      }
    }

    if (typeof resolvedUserId === 'number' && !Number.isNaN(resolvedUserId)) {
      payload.user_id = resolvedUserId;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/comments/${comment.id}/violations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        let detail = 'Failed to create violation.';
        try {
          const errJson = await response.json();
          if (errJson?.detail) detail = errJson.detail;
        } catch (parseError) {
          // ignore secondary parse errors
        }
        throw new Error(detail);
      }

      const data = await response.json();
      // After creation, tag photos to codes based on filename (best-effort)
      if (data?.id && selectedPhotos.length > 0 && Object.values(photoCodeMap || {}).some((arr) => (arr || []).length > 0)) {
        try {
          const photosResp = await fetch(`${process.env.REACT_APP_API_URL}/violation/${data.id}/photos`);
          if (photosResp.ok) {
            const photos = await photosResp.json();
            const byName = {};
            (photos || []).forEach((p) => {
              if (p?.filename) byName[p.filename] = p;
            });
            const allowedIds = new Set(
              (selectedCodes || []).map((opt) => opt?.code?.id ?? (typeof opt?.value === 'number' ? opt.value : typeof opt?.value === 'string' ? Number(opt.value) : null)).filter((id) => typeof id === 'number' && !Number.isNaN(id))
            );
            for (const [filename, codeOpts] of Object.entries(photoCodeMap || {})) {
              const filtered = (codeOpts || [])
                .map((opt) => opt?.code?.id ?? (typeof opt?.value === 'number' ? opt.value : typeof opt?.value === 'string' ? Number(opt.value) : null))
                .filter((cid) => typeof cid === 'number' && !Number.isNaN(cid) && (allowedIds.size === 0 || allowedIds.has(cid)));
              if (!filtered.length) continue;
              const match = byName[filename];
              if (!match) continue;
              try {
                await fetch(`${process.env.REACT_APP_API_URL}/violation/${data.id}/photos/${match.id || match.attachment_id}/codes`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code_ids: filtered }),
                });
              } catch {
                // ignore per-photo failures; they can retag in detail view
              }
            }
          }
        } catch {
          // ignore mapping failures
        }
      }

      setCreatedViolation(data);
      setStatusMessage('Violation created from comment.');
      if (onCreated) onCreated(data);
      if (data?.id) {
        if (onClose) onClose();
        navigate(`/violation/${data.id}`);
        return;
      }
    } catch (err) {
      setError(err?.message || 'Failed to create violation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!comment) return null;

  const codeDescriptions = Array.isArray(selectedCodes)
    ? selectedCodes.map((opt) => {
      const raw = opt?.code?.description || opt?.label || 'Selected code';
      return raw.length > 80 ? `${raw.slice(0, 80)}...` : raw;
    })
    : [];

  const renderStepContent = () => {
    switch (currentStep.key) {
      case 'comment':
        return (
          <div className="space-y-4">
            <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Comment preview
              </div>
              <p className="whitespace-pre-line text-gray-800">
                {commentPreview || 'No comment text provided.'}
              </p>
              {attachmentsMessage && (
                <p className="mt-2 text-xs text-gray-500">{attachmentsMessage}</p>
              )}
              {comment?.user && (
                <p className="mt-2 text-xs text-gray-500">
                  Posted by {comment.user.name || comment.user.email || `User #${comment.user_id || ''}`}
                </p>
              )}
              {commentAttachments.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Attachments ({selectedPhotos.length}/{commentAttachments.length} selected)
                    </div>
                    {selectedPhotos.length < commentAttachments.length && (
                      <button
                        type="button"
                        onClick={() => {
                          const all = commentAttachments.map((p) =>
                            typeof p === 'string' ? p : getAttachmentFilename(p, 'unknown')
                          );
                          setSelectedPhotos(all);
                        }}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Select all
                      </button>
                    )}
                  </div>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {commentAttachments.map((attachment, index) => {
                      const fallbackName = `Attachment ${index + 1}`;
                      const attachmentObj =
                        attachment && typeof attachment === 'object' ? attachment : {};
                      const url =
                        attachmentObj.url ||
                        (typeof attachment === 'string' ? attachment : '') ||
                        '';
                      if (!url) return null;
                      const filename =
                        typeof attachment === 'string'
                          ? fallbackName
                          : getAttachmentFilename(attachmentObj, fallbackName);
                      const imageLike =
                        typeof attachment === 'string'
                          ? /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(attachment)
                          : isImageAttachment(attachmentObj);
                      const displayLabel =
                        typeof attachment === 'string'
                          ? (filename.split('.').pop() || 'FILE').toUpperCase()
                          : getAttachmentDisplayLabel(attachmentObj);

                      const isSelected = selectedPhotos.includes(filename);

                      return (
                        <div
                          key={url || index}
                          className={`relative flex flex-col gap-2 rounded border p-2 transition ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white opacity-75'
                            }`}
                        >
                          <div className="absolute right-2 top-2 z-10">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTogglePhoto(filename)}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </div>
                          {imageLike ? (
                            <div className="block overflow-hidden rounded border border-gray-200">
                              <img
                                src={url}
                                alt={filename}
                                className="h-28 w-full object-cover"
                                onClick={() => handleTogglePhoto(filename)}
                              />
                            </div>
                          ) : (
                            <div
                              className="flex h-28 flex-col items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-600"
                              onClick={() => handleTogglePhoto(filename)}
                            >
                              <span className="text-2xl font-semibold">{displayLabel}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-xs text-indigo-600 hover:underline"
                              title={filename}
                            >
                              {filename}
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {photoError && (
                    <p className="mt-2 text-xs text-red-600">{photoError}</p>
                  )}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Review the comment details, then continue to select the violation codes that apply.
            </p>
          </div>
        );
      case 'codes':
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Tag photos with violation codes</p>
                  <p className="text-xs text-gray-500">Assign codes per photo. Leave blank to omit the photo from the notice.</p>
                </div>
              </div>
              {selectedPhotos.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    {currentPhotoMeta ? (
                      <div className="space-y-3">
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                          {currentPhotoMeta.isImage && currentPhotoMeta.url ? (
                            <button
                              type="button"
                              onClick={() => setZoomPhotoUrl(currentPhotoMeta.url)}
                              className="group block w-full focus:outline-none"
                            >
                              <img
                                src={currentPhotoMeta.url}
                                alt={currentPhotoMeta.filename}
                                className="max-h-64 w-full object-contain bg-gray-900/5 transition group-hover:scale-[1.02]"
                              />
                              <p className="mt-1 text-[11px] text-indigo-600 underline opacity-80 group-hover:opacity-100">Click to zoom</p>
                            </button>
                          ) : (
                            <div className="flex h-40 items-center justify-center bg-gray-100 text-gray-500">
                              <span className="text-sm font-semibold">{currentPhotoMeta.displayLabel || 'FILE'}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500">Select which codes this photo should support. Leave empty to exclude it from the notice.</p>
                        <CodeSelect
                          onChange={(value) => handlePhotoCodeChange(currentPhotoMeta.filename, value || [])}
                          value={photoCodeMap[currentPhotoMeta.filename] || []}
                          isMulti={true}
                          isDisabled={submitting}
                          showDescription
                        />
                        {Array.isArray(allSelectedCodeIds) && allSelectedCodeIds.length > 0 && (
                          <div className="mt-2 space-y-1 text-xs">
                            <p className="font-semibold text-gray-700">All selected codes (across photos):</p>
                            <div className="flex flex-wrap gap-2">
                              {allSelectedCodeIds.map((cid) => (
                                <CodeDrawerLink
                                  key={cid}
                                  codeId={cid}
                                  className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200"
                                >
                                  View code {cid}
                                </CodeDrawerLink>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span className="font-semibold uppercase tracking-wide text-gray-500">
                            Tag photo {photoTagIndex + 1} of {selectedPhotos.length}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={goPrevPhoto}
                              disabled={photoTagIndex === 0}
                              className="rounded-full border border-gray-300 px-3 py-1 text-[11px] font-semibold text-gray-700 disabled:opacity-50"
                            >
                              Prev
                            </button>
                            <button
                              type="button"
                              onClick={goNextPhoto}
                              disabled={photoTagIndex >= selectedPhotos.length - 1}
                              className="rounded-full border border-gray-300 px-3 py-1 text-[11px] font-semibold text-gray-700 disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">Select a photo above to tag codes.</p>
                    )}
                  </div>
                </div>
              )}
              {codesError && (
                <div className="mt-2 text-xs text-red-600">
                  {codesError}
                </div>
              )}
            </div>
          </div>
        );
      case 'details':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Deadline</label>
                <select
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  disabled={submitting}
                >
                  {DEADLINE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Violation type</label>
                <select
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={violationType}
                  onChange={(event) => setViolationType(event.target.value)}
                  disabled={submitting}
                >
                  {VIOLATION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isAdmin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Assign to
                </label>
                <select
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  disabled={submitting}
                >
                  <option value="">Default to comment author or current user</option>
                  {assigneeId &&
                    !onsUsers.some((onsUser) => String(onsUser.id) === String(assigneeId)) && (
                      <option value={assigneeId}>
                        {user?.name || user?.email || `User #${assigneeId}`}
                      </option>
                    )}
                  {onsUsers.map((onsUser) => (
                    <option key={onsUser.id} value={onsUser.id}>
                      {onsUser.name || onsUser.email || `User #${onsUser.id}`}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Defaults to you. Clear the selection to fall back to the comment author or system default.
                </p>
              </div>
            )}

            <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <div className="font-semibold text-gray-800">Review</div>
              <ul className="mt-2 space-y-1">
                <li>
                  <span className="font-medium">Codes selected:</span>{' '}
                  {selectedCodeSummaries.length > 0 ? `${selectedCodeSummaries.length}` : '0'}
                  {selectedCodeSummaries.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-xs text-gray-600">
                      {selectedCodeSummaries.map(({ id, name }, index) => (
                        <li key={`${id ?? name}-${index}`}>
                          {id ? (
                            <CodeDrawerLink
                              codeId={id}
                              className="font-semibold text-indigo-600 underline-offset-2 hover:text-indigo-800 hover:underline"
                            >
                              {name}
                            </CodeDrawerLink>
                          ) : (
                            name
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
                <li>
                  <span className="font-medium">Deadline:</span> {deadline}
                </li>
                <li>
                  <span className="font-medium">Violation type:</span>{' '}
                  {VIOLATION_TYPE_OPTIONS.find((opt) => opt.value === violationType)?.label || violationType}
                </li>
                {commentPreview && (
                  <li>
                    <span className="font-medium">Comment excerpt:</span>{' '}
                    {commentPreview.length > 120 ? `${commentPreview.slice(0, 120)}…` : commentPreview}
                  </li>
                )}
                {Array.isArray(comment?.photos) && comment.photos.length > 0 && (
                  <li>
                    <span className="font-medium">Attachments:</span> {selectedPhotos.length} selected (of {comment.photos.length})
                  </li>
                )}
                {isAdmin && (
                  <li>
                    <span className="font-medium">Assign to:</span> {selectedAssigneeLabel}
                  </li>
                )}
                <li>
                  <span className="font-medium">Inspector notes:</span>
                  <textarea
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add or edit inspector notes"
                    disabled={submitting}
                  />
                </li>
              </ul>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/70 px-4 py-8 sm:py-12">
      {zoomPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={() => setZoomPhotoUrl('')}>
          <img
            src={zoomPhotoUrl}
            alt="Zoomed attachment"
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setZoomPhotoUrl('')}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-gray-700 shadow"
          >
            Close
          </button>
        </div>
      )}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create violation from comment</h2>
            <p className="text-sm text-gray-500">Step through the wizard to confirm the details before drafting the violation.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-transparent px-3 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            {STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isComplete = index < currentStepIndex;
              const baseClasses = 'flex items-center gap-2 rounded-full px-3 py-1.5 transition';
              const stateClasses = isActive
                ? 'bg-indigo-600 text-white'
                : isComplete
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-200 text-gray-600';
              return (
                <React.Fragment key={step.key}>
                  <div className={`${baseClasses} ${stateClasses}`}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[0.7rem]">
                      {index + 1}
                    </span>
                    <span>{step.label}</span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <span className="text-gray-400">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {renderStepContent()}

          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {statusMessage && createdViolation && (
            <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <div>{statusMessage}</div>
              <div className="mt-1">
                <Link
                  to={`/violation/${createdViolation.id}`}
                  className="font-semibold text-green-800 underline"
                  onClick={onClose}
                >
                  View violation #{createdViolation.id}
                </Link>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleBack}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              disabled={isFirstStep || submitting}
            >
              Back
            </button>
            <div className="ml-auto flex gap-2">
              {!isLastStep && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  disabled={
                    submitting ||
                    (currentStep.key === 'codes' && (
                      (!Array.isArray(selectedCodes) || selectedCodes.length === 0) ||
                      (selectedPhotos.length > 0 && photoTagIndex < selectedPhotos.length - 1)
                    ))
                  }
                >
                  Next
                </button>
              )}
              {isLastStep && (
                <button
                  type="submit"
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  disabled={submitting || (Array.isArray(selectedCodes) && selectedCodes.length === 0)}
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <LoadingSpinner />
                      Saving…
                    </span>
                  ) : (
                    'Create violation'
                  )}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-3 rounded border border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
