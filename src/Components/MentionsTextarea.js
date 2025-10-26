import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';

const TRIGGER_REGEX = /(^|\s)([@%])([A-Za-z0-9@._\- ]*)$/;

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeMentionGlyphs = (text) =>
  text.replace(/[@%\uFF20\u00A9\uFE6B]/g, (ch) => {
    if (ch === '\uFF20' || ch === '\u00A9' || ch === '\uFE6B') return '@';
    return ch;
  });

const idlePromptCopy = {
  '@': 'Type a name or email to mention a user...',
  '%': 'Type a name, email, or phone to add a contact...',
};

const loadingCopy = {
  '@': 'Searching users...',
  '%': 'Searching contacts...',
};

const emptyCopy = {
  '@': 'No users found.',
  '%': 'No contacts found.',
};

const errorCopy = {
  '@': 'Could not load users. Try again.',
  '%': 'Could not load contacts. Try again.',
};

// MentionsTextarea supports @user and %contact mentions without external deps.
// Props: value, onChange(text), onMentionsChange(userIds), onContactMentionsChange(contactIds), placeholder, disabled, rows, className
export default function MentionsTextarea({
  value,
  onChange,
  onMentionsChange,
  onContactMentionsChange,
  placeholder,
  disabled,
  rows = 4,
  className,
}) {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [activeTrigger, setActiveTrigger] = useState(null); // '@' | '%' | null
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | loading | empty | unauthorized | error | success
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [addedMessage, setAddedMessage] = useState('');
  const ref = useRef(null);

  const apiUrl = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    if (!open) {
      setOptions([]);
      setStatus('idle');
      return;
    }
    if (!activeTrigger) {
      setOptions([]);
      setStatus('idle');
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) {
      setOptions([]);
      setStatus('idle');
      return;
    }
    let ignore = false;
    const loadOptions = async () => {
      try {
        setStatus('loading');
        const headers = { Accept: 'application/json' };
        let url = '';
        if (activeTrigger === '@') {
          if (token) headers.Authorization = `Bearer ${token}`;
          url = `${apiUrl}/users/search?q=${encodeURIComponent(trimmed)}`;
        } else {
          url = `${apiUrl}/contacts/search?query=${encodeURIComponent(trimmed)}&limit=8`;
        }
        const res = await fetch(url, { headers });
        if (!res.ok) {
          if (res.status === 401 && activeTrigger === '@') {
            if (!ignore) {
              setStatus('unauthorized');
              setOptions([]);
            }
            return;
          }
          if (!ignore) {
            setStatus('error');
            setOptions([]);
          }
          return;
        }
        const data = await res.json();
        if (ignore) return;
        const list = Array.isArray(data) ? data : [];
        const mapped = list.map((item) => ({
          id: item.id,
          name: item.name || item.email || item.phone || (activeTrigger === '@' ? `user-${item.id}` : `contact-${item.id}`),
          email: item.email || '',
          phone: item.phone || '',
          trigger: activeTrigger,
        }));
        setOptions(mapped);
        setStatus(mapped.length > 0 ? 'success' : 'empty');
      } catch {
        if (!ignore) {
          setStatus('error');
          setOptions([]);
        }
      }
    };
    const timeout = setTimeout(loadOptions, 150);
    return () => {
      ignore = true;
      clearTimeout(timeout);
    };
  }, [apiUrl, token, query, open, activeTrigger]);

  useEffect(() => {
    if (typeof onMentionsChange === 'function') {
      onMentionsChange(selectedUserIds);
    }
  }, [selectedUserIds, onMentionsChange]);

  useEffect(() => {
    if (typeof onContactMentionsChange === 'function') {
      onContactMentionsChange(selectedContactIds);
    }
  }, [selectedContactIds, onContactMentionsChange]);

  useEffect(() => {
    if (!value) {
      setSelectedUserIds([]);
      setSelectedUsers([]);
      setSelectedContactIds([]);
      setSelectedContacts([]);
    }
  }, [value]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [options.length]);

  const clearAddedMessage = () => setTimeout(() => setAddedMessage(''), 1200);

  const closeMenu = () => {
    setOpen(false);
    setActiveTrigger(null);
    setQuery('');
    setStatus('idle');
  };

  const handleChange = (e) => {
    let text = e.target.value;
    const normalized = normalizeMentionGlyphs(text);
    if (normalized !== text) {
      text = normalized;
    }
    onChange(text);
    const upToCaret = text.slice(0, e.target.selectionStart);
    const match = upToCaret.match(TRIGGER_REGEX);
    if (match) {
      setActiveTrigger(match[2]);
      setQuery(match[3] || '');
      setOpen(true);
      setStatus('idle');
      return;
    }
    setActiveTrigger(null);
    setQuery('');
    setOpen(false);
    setStatus('idle');
  };

  const removeMentionToken = (text, symbol, label) => {
    try {
      const pattern = new RegExp(`(^|\\s)${symbol}${escapeRegExp(label)}(?=\\s|$)`, 'g');
      return (text || '').replace(pattern, (match, pre) => pre);
    } catch {
      return text;
    }
  };

  const choose = (option) => {
    const el = ref.current;
    if (!el) return;
    const trigger = option.trigger || activeTrigger || '@';
    const symbol = trigger === '%' ? '%' : '@';
    const caretPos = el.selectionStart;
    const upToCaret = value.slice(0, caretPos);
    const after = value.slice(caretPos);
    const match = upToCaret.match(TRIGGER_REGEX);
    let beforeToken = upToCaret;
    if (match) {
      const start = upToCaret.lastIndexOf(match[2]);
      beforeToken = value.slice(0, start);
    }
    const updatedValue = `${beforeToken}\n${after}`;
    onChange(updatedValue);
    if (symbol === '@') {
      setSelectedUserIds((ids) => (ids.includes(option.id) ? ids : [...ids, option.id]));
      setSelectedUsers((list) =>
        list.some((item) => item.id === option.id)
          ? list
          : [...list, { id: option.id, name: option.name, email: option.email }],
      );
    } else {
      setSelectedContactIds((ids) => (ids.includes(option.id) ? ids : [...ids, option.id]));
      setSelectedContacts((list) =>
        list.some((item) => item.id === option.id)
          ? list
          : [...list, { id: option.id, name: option.name, email: option.email, phone: option.phone }],
      );
    }
    setAddedMessage(`Added ${symbol}${option.name}`);
    clearAddedMessage();
    closeMenu();
    requestAnimationFrame(() => {
      const newPos = beforeToken.length;
      el.focus();
      el.setSelectionRange(newPos, newPos);
    });
  };

  const onKeyDown = (e) => {
    if (!open || options.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((index) => Math.max(index - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      choose(options[highlightIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
    }
  };

  const renderStatus = () => {
    if (!open) return null;
    if (status === 'loading') return loadingCopy[activeTrigger] || loadingCopy['@'];
    if (status === 'unauthorized') return 'Sign in to search users.';
    if (status === 'error') return errorCopy[activeTrigger] || errorCopy['@'];
    if (status === 'empty') return emptyCopy[activeTrigger] || emptyCopy['@'];
    if (status === 'idle' && !query.trim()) return idlePromptCopy[activeTrigger] || idlePromptCopy['@'];
    return null;
  };

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={ref}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onBlur={closeMenu}
        rows={rows}
        disabled={disabled}
        className={className}
        style={className ? undefined : { width: '100%' }}
      />
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 1000,
            background: 'white',
            border: '1px solid #d1d5db',
            width: '100%',
            maxHeight: 240,
            overflowY: 'auto',
            boxShadow: '0 10px 20px rgba(30, 41, 59, 0.15)',
            borderRadius: 8,
            marginTop: 4,
          }}
        >
          {renderStatus() && (
            <div style={{ padding: '8px 10px', color: '#6b7280', fontSize: 13 }}>
              {renderStatus()}
            </div>
          )}
          {status === 'success' &&
            options.map((option, idx) => (
              <div
                key={`${option.trigger}-${option.id}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
                style={{
                  padding: '6px 10px',
                  cursor: 'pointer',
                  background: idx === highlightIndex ? '#eef2ff' : 'white',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>
                  {option.trigger === '%' ? `%${option.name}` : `@${option.name}`}
                </div>
                {(option.email || option.phone) && (
                  <div style={{ fontSize: 11, color: '#4b5563' }}>
                    {option.email || option.phone}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
      {(selectedUsers.length > 0 || selectedContacts.length > 0) && (
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {selectedUsers.map((user) => (
            <span
              key={`user-${user.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 12,
                background: '#eef2ff',
                color: '#4338ca',
                border: '1px solid #c7d2fe',
              }}
            >
              @{user.name}
              <button
                type='button'
                aria-label={`Remove @${user.name}`}
                onClick={() => {
                  setSelectedUsers((prev) => prev.filter((item) => item.id !== user.id));
                  setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
                  onChange((prev) => removeMentionToken(prev, '@', user.name));
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                x
              </button>
            </span>
          ))}
          {selectedContacts.map((contact) => (
            <span
              key={`contact-${contact.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 12,
                background: '#ecfccb',
                color: '#3f6212',
                border: '1px solid #bbf7d0',
              }}
            >
              %{contact.name}
              <button
                type='button'
                aria-label={`Remove %${contact.name}`}
                onClick={() => {
                  setSelectedContacts((prev) => prev.filter((item) => item.id !== contact.id));
                  setSelectedContactIds((prev) => prev.filter((id) => id !== contact.id));
                  onChange((prev) => removeMentionToken(prev, '%', contact.name));
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: '#dcfce7',
                  color: '#14532d',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                x
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
