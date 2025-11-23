import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { toEasternLocaleString } from '../utils';
import FileUploadInput from './Common/FileUploadInput';
import AlertModal from './Common/AlertModal';

const EXCLUDED_KEYS = new Set([
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
  'user',
  'photos',
  'attachments',
  'history',
]);

const LONG_TEXT_FIELDS = new Set(['content', 'internal_notes', 'admin_notes', 'follow_up_notes']);

const formatLabel = (key) =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const deriveFields = (comment) => {
  if (!comment) return [];
  const fields = [];
  for (const [key, value] of Object.entries(comment)) {
    if (EXCLUDED_KEYS.has(key)) continue;
    if (value === null) {
      fields.push({ key, type: 'string' });
      continue;
    }
    const valueType = typeof value;
    if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
      fields.push({ key, type: valueType });
    }
  }

  const orderHint = [
    'content',
    'visibility',
    'is_internal',
    'is_flagged',
    'requires_follow_up',
    'follow_up_at',
    'follow_up_user_id',
    'address_id',
    'unit_id',
    'violation_id',
    'contact_id',
    'inspection_id',
    'complaint_id',
    'business_id',
    'permit_id',
    'license_id',
    'user_id',
  ];

  const orderMap = new Map(orderHint.map((field, index) => [field, index]));
  fields.sort((a, b) => {
    const aRank = orderMap.has(a.key) ? orderMap.get(a.key) : orderHint.length + a.key.charCodeAt(0);
    const bRank = orderMap.has(b.key) ? orderMap.get(b.key) : orderHint.length + b.key.charCodeAt(0);
    if (aRank === bRank) {
      return a.key.localeCompare(b.key);
    }
    return aRank - bRank;
  });

  return fields;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return toEasternLocaleString(date);
};

const AdminCommentEditor = () => {
  const { commentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [comment, setComment] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fileQueue, setFileQueue] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
  });

  const apiBase = process.env.REACT_APP_API_URL;

  const loadComment = useCallback(async () => {
    if (!commentId) return;
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch(`${apiBase}/comments/${commentId}`);
      if (!response.ok) {
        throw new Error('Failed to load comment details.');
      }
      const data = await response.json();
      setComment(data);
      const derived = deriveFields(data);
      setFields(derived);
      const initialValues = {};
      derived.forEach(({ key, type }) => {
        const value = data[key];
        if (type === 'boolean') {
          initialValues[key] = Boolean(value);
        } else if (type === 'number') {
          initialValues[key] = value ?? '';
        } else {
          initialValues[key] = value ?? '';
        }
      });
      setFormValues(initialValues);
    } catch (err) {
      setError(err.message || 'Unable to load comment details.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, commentId]);

  useEffect(() => {
    loadComment();
  }, [loadComment]);

  const handleValueChange = (key, type, value) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: type === 'number' && value === '' ? '' : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!comment) return;
    setSaving(true);
    setError('');
    setStatus('');
    setUploadStatus('');
    try {
      const payload = {};
      fields.forEach(({ key, type }) => {
        const originalValue = comment[key];
        let nextValue = formValues[key];
        if (type === 'number') {
          nextValue = nextValue === '' || nextValue === null ? null : Number(nextValue);
        } else if (type === 'boolean') {
          nextValue = Boolean(nextValue);
        } else if (typeof nextValue === 'string') {
          nextValue = nextValue.trim().length ? nextValue : null;
        } else if (typeof nextValue === 'undefined') {
          nextValue = null;
        }
        const normalizedOriginal =
          originalValue === null || typeof originalValue === 'undefined'
            ? null
            : type === 'number'
            ? Number(originalValue)
            : type === 'boolean'
            ? Boolean(originalValue)
            : String(originalValue);
        const normalizedNext =
          nextValue === null
            ? null
            : type === 'number'
            ? Number(nextValue)
            : type === 'boolean'
            ? Boolean(nextValue)
            : String(nextValue);
        const changed = normalizedOriginal !== normalizedNext;
        if (changed) {
          payload[key] = nextValue;
        }
      });

      if (Object.keys(payload).length === 0) {
        setStatus('No changes detected.');
        return;
      }

      const response = await fetch(`${apiBase}/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Failed to update the comment.');
      }
      const updated = await response.json();
      setComment(updated);
      const derived = deriveFields(updated);
      setFields(derived);
      const nextValues = {};
      derived.forEach(({ key, type }) => {
        const value = updated[key];
        if (type === 'boolean') {
          nextValues[key] = Boolean(value);
        } else if (type === 'number') {
          nextValues[key] = value ?? '';
        } else {
          nextValues[key] = value ?? '';
        }
      });
      setFormValues(nextValues);
      setStatus('Comment updated successfully.');
    } catch (err) {
      setError(err.message || 'Unable to update the comment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setAlertModal({
      isOpen: true,
      title: 'Delete Comment',
      message: 'Delete this comment? This action cannot be undone.',
      type: 'warning',
      onConfirm: async () => {
        setAlertModal((prev) => ({ ...prev, isOpen: false }));
        setDeleting(true);
        setError('');
        setStatus('');
        setUploadStatus('');
        try {
          const response = await fetch(`${apiBase}/comments/${commentId}`, {
            method: 'DELETE',
          });
          if (!response.ok) {
            throw new Error('Failed to delete the comment.');
          }
          setStatus('Comment deleted.');
          setTimeout(() => {
            navigate('/admin?resource=comments');
          }, 600);
        } catch (err) {
          setError(err.message || 'Unable to delete the comment.');
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const handleUpload = async () => {
    if (!fileQueue.length) return;
    setUploading(true);
    setUploadStatus('');
    setError('');
    try {
      const formData = new FormData();
      fileQueue.forEach((file) => formData.append('files', file));
      const response = await fetch(`${apiBase}/comments/${commentId}/photos`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to upload attachments.');
      }
      setUploadStatus('Attachments uploaded successfully.');
      setFileQueue([]);
      await loadComment();
    } catch (err) {
      setError(err.message || 'Unable to upload attachments.');
    } finally {
      setUploading(false);
    }
  };

  const attachmentList = useMemo(() => {
    const photos = (comment && (comment.photos || comment.attachments)) || [];
    if (!Array.isArray(photos)) return [];
    return photos;
  }, [comment]);

  if (!user || user.role !== 3) {
    return (
      <div className="max-w-3xl mx-auto mt-10 bg-white shadow rounded-lg p-8">
        <h1 className="text-2xl font-semibold text-gray-800">Admin access required</h1>
        <p className="mt-4 text-gray-600">You must be an administrator to edit comments.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Edit Comment</h1>
          <p className="text-sm text-gray-600 mt-1">Adjust comment content, relationships, and metadata.</p>
        </div>
        <Link
          to="/admin?resource=comments"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          &larr; Back to admin dashboard
        </Link>
      </div>

      {loading ? (
        <div className="mt-8 rounded-md bg-white shadow p-6 text-gray-600">Loading comment...</div>
      ) : error ? (
        <div className="mt-6 rounded-md bg-red-50 p-4 text-red-700">{error}</div>
      ) : comment ? (
        <>
          <div className="mt-6 rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-medium text-gray-900">Comment overview</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Comment ID</dt>
                <dd className="mt-1 text-sm text-gray-900">#{comment.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Author</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {comment.user?.name || comment.user?.email || `User #${comment.user_id || '—'}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDateTime(comment.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last updated</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDateTime(comment.updated_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Target</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {[
                    comment.address_id ? `Address #${comment.address_id}` : null,
                    comment.unit_id ? `Unit #${comment.unit_id}` : null,
                    comment.violation_id ? `Violation #${comment.violation_id}` : null,
                    comment.contact_id ? `Contact #${comment.contact_id}` : null,
                    comment.inspection_id ? `Inspection #${comment.inspection_id}` : null,
                    comment.complaint_id ? `Complaint #${comment.complaint_id}` : null,
                    comment.business_id ? `Business #${comment.business_id}` : null,
                    comment.permit_id ? `Permit #${comment.permit_id}` : null,
                    comment.license_id ? `License #${comment.license_id}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </dd>
              </div>
              {comment.commentable_type && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Commentable type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{comment.commentable_type}</dd>
                </div>
              )}
            </dl>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {status && (
            <div className="rounded-md bg-green-50 p-4 text-green-700">{status}</div>
          )}
          {uploadStatus && !status && (
            <div className="rounded-md bg-indigo-50 p-4 text-indigo-700">{uploadStatus}</div>
          )}

          <div className="rounded-lg bg-white shadow divide-y divide-gray-200">
            {fields.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No editable fields available for this comment.</div>
            ) : (
              fields.map(({ key, type }) => {
                const value = formValues[key];
                const label = formatLabel(key);
                return (
                  <div key={key} className="p-6">
                    <label className="block text-sm font-medium text-gray-700" htmlFor={`field-${key}`}>
                      {label}
                    </label>
                    {type === 'boolean' ? (
                      <div className="mt-2 flex items-center">
                        <input
                          id={`field-${key}`}
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(event) => handleValueChange(key, type, event.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">Enable {label.toLowerCase()}</span>
                      </div>
                    ) : type === 'number' ? (
                      <input
                        id={`field-${key}`}
                        type="number"
                        value={value === null ? '' : value}
                        onChange={(event) => handleValueChange(key, type, event.target.value)}
                        className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    ) : LONG_TEXT_FIELDS.has(key) || (typeof value === 'string' && value && value.length > 120) ? (
                      <textarea
                        id={`field-${key}`}
                        value={value ?? ''}
                        onChange={(event) => handleValueChange(key, type, event.target.value)}
                        rows={6}
                        className="mt-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <input
                        id={`field-${key}`}
                        type="text"
                        value={value ?? ''}
                        onChange={(event) => handleValueChange(key, type, event.target.value)}
                        className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    )}
                    <p className="mt-1 text-xs text-gray-400">Field key: {key}</p>
                  </div>
                );
              })
            )}
          </div>

          {attachmentList.length > 0 && (
            <div className="rounded-lg bg-white shadow p-6">
              <h2 className="text-lg font-medium text-gray-900">Existing Attachments</h2>
              <ul className="mt-4 space-y-2">
                {attachmentList.map((file, index) => (
                  <li key={file.id || file.url || index} className="text-sm text-indigo-600 truncate">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {file.filename || file.url || `Attachment ${index + 1}`}
                    </a>
                    {file.filesize && (
                      <span className="ml-2 text-xs text-gray-500">{Math.round(file.filesize / 1024)} KB</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-medium text-gray-900">Upload Attachments</h2>
            <p className="mt-1 text-sm text-gray-500">Attach additional documents or images to this comment.</p>
            <div className="mt-4 flex flex-col gap-3">
              <FileUploadInput
                id="admin-comment-files"
                name="attachments"
                files={fileQueue}
                onChange={setFileQueue}
                accept="image/*,application/pdf"
                disabled={uploading}
                label=""
                addFilesLabel={fileQueue.length > 0 ? 'Add more files' : 'Choose files'}
                emptyStateLabel="No files selected"
              />
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || fileQueue.length === 0}
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              {fileQueue.length > 0 && (
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-700"
                  onClick={() => setFileQueue([])}
                  disabled={uploading}
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={loadComment}
                disabled={loading}
                className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete comment'}
            </button>
          </div>
        </form>
        </>
      ) : null}
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onConfirm={alertModal.onConfirm}
        onCancel={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AdminCommentEditor;
