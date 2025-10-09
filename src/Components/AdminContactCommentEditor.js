import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import NewContactComment from './Contact/NewContactComment';

const AdminContactCommentEditor = () => {
  const { commentId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      fetch(`${process.env.REACT_APP_API_URL}/comments/contact/by-id/${commentId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Comment not found.' : 'Failed to load comment.');
        }
        const payload = await res.json();
        if (!payload || typeof payload !== 'object') {
          throw new Error('Unexpected comment response format.');
        }
        return payload;
      }),
      fetch(`${process.env.REACT_APP_API_URL}/users/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to load users.');
        }
        const payload = await res.json();
        if (!Array.isArray(payload)) {
          throw new Error('Unexpected users response format.');
        }
        return payload;
      }),
    ])
      .then(([commentData, usersData]) => {
        setComment(commentData);
        setUsers(usersData);
        setSelectedUserId(commentData.user_id || null);
      })
      .catch((err) => {
        console.error('AdminContactCommentEditor fetch error:', err);
        setError(err.message || 'Failed to load data.');
      })
      .finally(() => setLoading(false));
  }, [commentId, token]);

  const handleUpdated = (updated) => {
    // After successful save, go back to previous page
    navigate(-1);
  };

  const handleSaveAuthor = () => {
    if (!selectedUserId) {
      setError('Please select a user.');
      return;
    }
    const payload = {
      comment: comment.comment,
      user_id: selectedUserId,
      contact_id: comment.contact_id,
    };
    fetch(`${process.env.REACT_APP_API_URL}/comments/contact/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update author.');
        return res.json();
      })
      .then((updated) => {
        setComment(updated);
      })
      .catch((err) => setError(err.message));
  };

  if (!user || user.role !== 3) {
    return (
      <div className="max-w-3xl mx-auto mt-10 bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-semibold text-gray-800">Admin access required</h1>
        <p className="mt-3 text-gray-600">You must be an administrator to edit contact comments.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-6 bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Edit Contact Comment</h1>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      {loading && (
        <div className="mt-6 text-gray-500">Loading comment...</div>
      )}

      {error && (
        <div className="mt-6 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && comment && (
        <>
          <div className="mt-6">
            <label htmlFor="authorId" className="block text-sm font-medium text-gray-700">Author (select user)</label>
            <select
              id="authorId"
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(Number(e.target.value) || null)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select a user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.email || u.name}</option>
              ))}
            </select>
            <div className="mt-2">
              <button
                type="button"
                onClick={handleSaveAuthor}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Save Author
              </button>
            </div>
          </div>

          <div className="mt-6">
            <NewContactComment
              contactId={comment.contact_id}
              commentId={comment.id}
              initialText={comment.comment}
              onCommentAdded={handleUpdated}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default AdminContactCommentEditor;
