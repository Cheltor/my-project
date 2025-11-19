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

export default function CreateViolationFromCommentModal({ comment, unitId, onClose, onCreated }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deadline, setDeadline] = useState(DEADLINE_OPTIONS[0]);
  const [violationType, setViolationType] = useState(VIOLATION_TYPE_OPTIONS[0].value);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [notes, setNotes] = useState(defaultNotes(comment));
  const [onsUsers, setOnsUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');
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
    if (!Array.isArray(selectedCodes)) return [];
    return selectedCodes.map((opt, index) => {
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
      return { id: codeId, name };
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
        let normalized = Array.isArray(data) ? data : [];
        if (user?.id && !normalized.some((onsUser) => Number(onsUser.id) === Number(user.id))) {
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
    setSelectedCodes([]);
    setNotes(defaultNotes(comment));
    setError('');
    setStatusMessage('');
    setCreatedViolation(null);
    setSubmitting(false);
    setCurrentStepIndex(0);
    setCodesError('');
    const defaultAssigneeId = user?.id
      ? String(user.id)
      : comment?.user_id
        ? String(comment.user_id)
        : '';
    setAssigneeId(defaultAssigneeId);
  }, [comment, isAdmin, user?.id, user?.name, user?.email]);

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
      if (!Array.isArray(selectedCodes) || selectedCodes.length === 0) {
        setCodesError('Select at least one violation code before continuing.');
        return;
      }
      setCodesError('');
    }
    setError('');
    setCurrentStepIndex((index) => Math.min(STEPS.length - 1, index + 1));
  };

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

    if (!Array.isArray(selectedCodes) || selectedCodes.length === 0) {
      setError('Select at least one violation code.');
      setSubmitting(false);
      return;
    }

    const codes = selectedCodes
      .map((opt) => {
        if (opt?.code?.id) return opt.code.id;
        if (typeof opt?.value === 'number') return opt.value;
        if (typeof opt?.value === 'string') return Number(opt.value);
        return null;
      })
      .filter((value) => typeof value === 'number' && !Number.isNaN(value));

    if (codes.length === 0) {
      setError('Select at least one violation code.');
      setSubmitting(false);
      return;
    }

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
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Attachments
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

                      return (
                        <div key={url || index} className="flex flex-col gap-2">
                          {imageLike ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block overflow-hidden rounded border border-gray-200"
                            >
                              <img
                                src={url}
                                alt={filename}
                                className="h-28 w-full object-cover transition hover:scale-105"
                              />
                            </a>
                          ) : (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-28 flex-col items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-600 transition hover:bg-gray-100"
                            >
                              <span className="text-2xl font-semibold">{displayLabel}</span>
                              <span className="mt-1 text-xs">Open</span>
                            </a>
                          )}
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
                      );
                    })}
                  </div>
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
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Violation codes <span className="text-red-600">*</span>
              </label>
              <CodeSelect
                onChange={(value) => setSelectedCodes(value || [])}
                value={selectedCodes}
                isMulti={true}
                isDisabled={submitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                Select one or more codes to include in the violation notice.
              </p>
              {codeDescriptions.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-gray-600">
                  {codeDescriptions.map((description, index) => (
                    <li key={description + index}>{description}</li>
                  ))}
                </ul>
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
                    <span className="font-medium">Attachments:</span> {comment.photos.length} (will be copied)
                  </li>
                )}
                {isAdmin && (
                  <li>
                    <span className="font-medium">Assign to:</span> {selectedAssigneeLabel}
                  </li>
                )}
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
                  disabled={submitting || (currentStep.key === 'codes' && (!Array.isArray(selectedCodes) || selectedCodes.length === 0))}
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
