import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function CodeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const authToken = token || user?.token;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    chapter: '',
    section: '',
    name: '',
    description: '',
  });

  useEffect(() => {
    const fetchCode = async () => {
      setLoading(true);
      setError('');
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/codes/${id}`);
        if (!resp.ok) throw new Error('Failed to fetch code');
        const data = await resp.json();
        setForm({
          chapter: data?.chapter ?? '',
          section: data?.section ?? '',
          name: data?.name ?? '',
          description: data?.description ?? '',
        });
      } catch (e) {
        setError(e.message || 'Failed to load code');
      } finally {
        setLoading(false);
      }
    };
    fetchCode();
  }, [id]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const canSave = form.name.trim() && form.description.trim() && !saving;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const body = JSON.stringify({
        chapter: form.chapter,
        section: form.section,
        name: form.name,
        description: form.description,
      });

      let resp = await fetch(`${process.env.REACT_APP_API_URL}/codes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body,
      });

      // If PATCH isn't allowed on the server, gracefully fall back to PUT
      if (resp.status === 405) {
        resp = await fetch(`${process.env.REACT_APP_API_URL}/codes/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body,
        });
      }

      if (!resp.ok) {
        let msg = 'Failed to save changes';
        try {
          const j = await resp.json();
          if (j?.detail) msg = j.detail;
        } catch {}
        throw new Error(msg);
      }
      setMessage('Saved');
      // Navigate back to detail after a short delay
      setTimeout(() => navigate(`/code/${id}`), 300);
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading…</div>;
  if (error && !saving && !message && !form.name) {
    return <div className="max-w-2xl mx-auto p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Edit Code</h1>
        <button
          type="button"
          onClick={() => navigate(`/code/${id}`)}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
            <input
              type="text"
              name="chapter"
              value={form.chapter}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <input
              type="text"
              name="section"
              value={form.section}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-600">*</span></label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-600">*</span></label>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-indigo-500"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {message && <span className="text-sm text-green-600">{message}</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </div>
  );
}
