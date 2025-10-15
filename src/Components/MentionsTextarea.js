import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';

// A minimal mention-enabled textarea without external deps.
// Props: value, onChange(text), onMentionsChange(ids: number[]), placeholder
export default function MentionsTextarea({ value, onChange, onMentionsChange, placeholder, disabled, rows = 4, className }) {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [addedMessage, setAddedMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | empty | unauthorized | error | success
  const ref = useRef(null);
  

  // No background highlighter; keep textarea simple
  const apiUrl = process.env.REACT_APP_API_URL || '';

  // Fetch users by query when typing after '@'
  useEffect(() => {
    const q = query.trim();
    let ignore = false;
    async function run() {
      if (!q) { setOptions([]); return; }
      try {
        setStatus('loading');
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${apiUrl}/users/search?q=${encodeURIComponent(q)}`, { headers });
        if (res.status === 401) { if (!ignore) { setStatus('unauthorized'); setOptions([]); } return; }
        if (!res.ok) { if (!ignore) { setStatus('error'); setOptions([]); } return; }
        const data = await res.json();
        if (!ignore) {
          const list = Array.isArray(data) ? data : [];
          setOptions(list);
          setStatus(list.length > 0 ? 'success' : 'empty');
        }
      } catch { /* ignore */ }
    }
    const t = setTimeout(run, 150);
    return () => { ignore = true; clearTimeout(t); };
  }, [apiUrl, query, token]);

  // Update parent with ids
  useEffect(() => {
    if (onMentionsChange) onMentionsChange(selectedIds);
  }, [selectedIds, onMentionsChange]);

  // Reset selected mentions when input is cleared externally
  useEffect(() => {
    if (!value) {
      setSelectedIds([]);
      setSelectedUsers([]);
    }
  }, [value]);

  const measureCaret = () => {
    // No-op: kept for future positioning improvements
  };

  const handleChange = (e) => {
    let text = e.target.value;
    // Normalize common mistaken glyphs to ASCII '@'
    const normalized = text.replace(/[@\uFF20\u00A9]/g, (ch) => (ch === '\u00A9' ? '@' : ch === '\uFF20' ? '@' : ch));
    if (normalized !== text) {
      text = normalized;
      onChange(text);
    } else {
      onChange(text);
    }
    const upToCaret = text.slice(0, e.target.selectionStart);
    // match last @word segment
    const m = upToCaret.match(/(^|\s)@([A-Za-z0-9@._\- ]*)$/);
    if (m) {
      setQuery(m[2] || '');
      setOpen(true);
      setHighlightIndex(0);
      measureCaret();
    } else {
      setOpen(false);
      setQuery('');
    }
  };

  const choose = (opt) => {
    // Replace the active @query with @User.name
    const el = ref.current;
    if (!el) return;
    const pos = el.selectionStart;
    const upToCaret = value.slice(0, pos);
    const after = value.slice(pos);
    const m = upToCaret.match(/(^|\s)@([A-Za-z0-9@._\- ]*)$/);
    if (!m) {
      // Fallback: just insert a newline at the cursor
      const before = value.slice(0, pos);
      const newVal = `${before}\n${after}`;
      onChange(newVal);
      setSelectedIds((ids) => ids.includes(opt.id) ? ids : [...ids, opt.id]);
      setSelectedUsers((users) => users.some((u) => u.id === opt.id) ? users : [...users, { id: opt.id, name: opt.name, email: opt.email }]);
      setAddedMessage(`Added @${opt.name}`);
      setTimeout(() => setAddedMessage(''), 1200);
      setOpen(false);
      setQuery('');
      requestAnimationFrame(() => {
        const newPos = before.length + 1;
        el.focus();
        el.setSelectionRange(newPos, newPos);
      });
      return;
    }
    const startIdx = upToCaret.lastIndexOf('@');
    const beforeAt = value.slice(0, startIdx);
    // Replace the active @token with just a newline (remove the mention text from the textarea)
    const newVal = `${beforeAt}\n${after}`;
    onChange(newVal);
    setSelectedIds((ids) => ids.includes(opt.id) ? ids : [...ids, opt.id]);
  setSelectedUsers((users) => users.some((u) => u.id === opt.id) ? users : [...users, { id: opt.id, name: opt.name, email: opt.email }]);
  setAddedMessage(`Added @${opt.name}`);
  setTimeout(() => setAddedMessage(''), 1200);
    setOpen(false);
    setQuery('');
    requestAnimationFrame(() => {
      const newPos = beforeAt.length;
      el.focus();
      el.setSelectionRange(newPos, newPos);
    });
  };

  const onKeyDown = (e) => {
    if (!open || options.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex((i) => Math.min(i + 1, options.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choose(options[highlightIndex]); }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  // No background highlighter or scroll sync; kept simple

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={ref}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        onClick={measureCaret}
        onKeyUp={measureCaret}
        rows={rows}
        disabled={disabled}
        className={className}
        style={className ? undefined : { width: '100%' }}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, background: 'white', border: '1px solid #ccc', width: '100%', maxHeight: 220, overflowY: 'auto', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}>
          {query.trim().length === 0 && status === 'idle' && (
            <div style={{ padding: '8px 10px', color: '#6b7280' }}>Type a name to mention…</div>
          )}
          {status === 'loading' && (
            <div style={{ padding: '8px 10px', color: '#6b7280' }}>Searching…</div>
          )}
          {status === 'unauthorized' && (
            <div style={{ padding: '8px 10px', color: '#b45309', background: '#fffbeb' }}>Sign in to search users.</div>
          )}
          {status === 'error' && (
            <div style={{ padding: '8px 10px', color: '#b91c1c', background: '#fef2f2' }}>Couldn’t load users. Try again.</div>
          )}
          {status === 'empty' && (
            <div style={{ padding: '8px 10px', color: '#6b7280' }}>No users found.</div>
          )}
          {options.map((u, idx) => (
            <div
              key={u.id}
              onMouseDown={(e) => { e.preventDefault(); choose(u); }}
              style={{ padding: '6px 8px', cursor: 'pointer', background: idx === highlightIndex ? '#f0f0f0' : 'white' }}
            >
              <strong>@{u.name}</strong>{u.email ? ` — ${u.email}` : ''}
            </div>
          ))}
        </div>
      )}
      {selectedUsers.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {selectedUsers.map((u) => (
            <span key={u.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 12, fontSize: 12, background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
              @{u.name}
              <button
                type="button"
                aria-label={`Remove @${u.name}`}
                onClick={() => {
                  // Remove from chips
                  setSelectedUsers((prev) => prev.filter((x) => x.id !== u.id));
                  setSelectedIds((prev) => prev.filter((x) => x !== u.id));
                  // Remove all occurrences of @Name (word-boundary by whitespace or EOL)
                  try {
                    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const pattern = new RegExp(`(^|\\s)@${escapeRegExp(u.name)}(?=\\s|$)`, 'g');
                    const updated = (value || '').replace(pattern, (m, pre) => pre);
                    onChange(updated);
                  } catch (_) { /* ignore */ }
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: 8, background: '#e5e7eb', color: '#374151',
                  border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: 1
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {addedMessage && (
        <div style={{ marginTop: 4, fontSize: 12, color: '#065f46' }}>
          {addedMessage}
        </div>
      )}
    </div>
  );
}
