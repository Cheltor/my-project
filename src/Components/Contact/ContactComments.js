import React, { useCallback, useEffect, useMemo, useState } from 'react';
import NewContactComment from './NewContactComment';  // Assuming this is the component for adding a new comment
import { toEasternLocaleString } from '../../utils';

// Utility function to format the date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return toEasternLocaleString(dateString, undefined, options);
};

export default function ContactComments({ contactId, contact }) {  // Accept contactId and optional contact context
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentCounts, setAttachmentCounts] = useState({}); // key -> number
  const [usersMap, setUsersMap] = useState({}); // userId -> email

  const attachmentKey = (item) => (item ? `${item.type}:${item.id}` : '');
  const contactAddresses = useMemo(() => Array.isArray(contact?.addresses) ? contact.addresses : [], [contact?.addresses]);
  // contactAddressesKey removed (unused) — keep contactAddresses memo only
  const contactMeta = useMemo(() => ({
    name: (contact?.name || '').trim(),
    email: (contact?.email || '').trim(),
    phone: (contact?.phone || '').trim(),
  }), [contact?.name, contact?.email, contact?.phone]);
  // contactMetaKey removed (unused)

  const collectMentionedFromAddresses = async ({ baseUrl, addresses, contactId, contactMeta }) => {
    const results = new Map();
    if (!Array.isArray(addresses) || addresses.length === 0) return [];
    const numericContactId = Number(contactId);
    const stringContactId = String(contactId);
    const nameTokens = new Set();
    const emailToken = (contactMeta?.email || '').toLowerCase();
    const normalizedName = (contactMeta?.name || '').trim().toLowerCase();
    if (normalizedName) {
      const spaced = normalizedName.replace(/\s+/g, ' ');
      const compact = normalizedName.replace(/\s+/g, '');
      nameTokens.add(normalizedName);
      nameTokens.add(spaced);
      if (compact) {
        nameTokens.add(compact);
      }
    }
    if (emailToken) {
      nameTokens.add(emailToken);
    }
    const phoneDigits = (contactMeta?.phone || '').replace(/\D/g, '');
    if (phoneDigits) {
      nameTokens.add(phoneDigits);
    }

    const mentionRegex = /%([A-Za-z0-9@._\- ]+)/g;

    const limitedAddresses = addresses.slice(0, 10);

    for (const addr of limitedAddresses) {
      const addressId = addr?.id;
      if (!addressId) continue;
      try {
        const resp = await fetch(`${baseUrl}/comments/address/${addressId}`);
        if (!resp.ok) continue;
        const addressComments = await resp.json();
        const list = Array.isArray(addressComments)
          ? addressComments
          : Array.isArray(addressComments?.results)
            ? addressComments.results
            : [];
        for (const comment of list) {
          if (!comment || results.has(comment.id)) continue;
          const contactMentions = Array.isArray(comment.contact_mentions) ? comment.contact_mentions : [];
          let matches = contactMentions.some(
            (cm) =>
              (Number(cm.id) === numericContactId && !Number.isNaN(numericContactId)) ||
              String(cm.id) === stringContactId
          );

          if (!matches) {
            const tokens = [];
            const contentString = String(comment.content || '');
            mentionRegex.lastIndex = 0;
            let match;
            while ((match = mentionRegex.exec(contentString)) !== null) {
              const token = match[1]?.trim().toLowerCase();
              if (token) tokens.push(token);
            }
            if (tokens.length > 0) {
              matches = tokens.some((token) => nameTokens.has(token));
            }
          }

          if (!matches) continue;

          results.set(comment.id, {
            id: comment.id,
            type: 'linked',
            text: comment.content,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            user_id: comment.user_id,
            mentions: Array.isArray(comment.mentions) ? comment.mentions : [],
            contact_mentions: contactMentions,
            address_id: comment.address_id,
            combadd: comment.combadd || addr?.combadd || addr?.full_address || '',
            unit_id: comment.unit_id,
            raw: comment,
          });
        }
      } catch {
        // ignore individual address failures
      }
    }

    return Array.from(results.values());
  };

  // Function to fetch comments
  const fetchComments = useCallback(async () => {
    setLoading(true);
    const baseUrl = process.env.REACT_APP_API_URL;
    try {
      const [contactResp, mentionedResp] = await Promise.all([
        fetch(`${baseUrl}/comments/contact/${contactId}`),
        fetch(`${baseUrl}/comments/contact/${contactId}/mentioned`),
      ]);

      if (!contactResp.ok) {
        throw new Error('Failed to fetch comments');
      }

      const contactData = await contactResp.json();
      let mentionedData = [];
      if (mentionedResp.ok) {
        try {
          const payload = await mentionedResp.json();
          mentionedData = Array.isArray(payload) ? payload : [];
        } catch {
          mentionedData = [];
        }
      }

      const contactItems = (await Promise.all((contactData || []).map(async (c) => {
        try {
          const resp = await fetch(`${baseUrl}/comments/${c.id}/mentions`);
          const mentions = resp.ok ? await resp.json() : [];
          return {
            id: c.id,
            type: 'contact',
            text: c.comment,
            created_at: c.created_at,
            updated_at: c.updated_at,
            user_id: c.user_id,
            mentions,
            contact_mentions: Array.isArray(c.contact_mentions) ? c.contact_mentions : [],
            raw: c,
          };
        } catch {
          return {
            id: c.id,
            type: 'contact',
            text: c.comment,
            created_at: c.created_at,
            updated_at: c.updated_at,
            user_id: c.user_id,
            mentions: [],
            contact_mentions: Array.isArray(c.contact_mentions) ? c.contact_mentions : [],
            raw: c,
          };
        }
      }))).filter(Boolean);

      const contactIds = new Set(contactItems.map((item) => item.id));

      let mentionItems = (mentionedData || []).map((c) => ({
        id: c.id,
        type: 'linked',
        text: c.content,
        created_at: c.created_at,
        updated_at: c.updated_at,
        user_id: c.user_id,
        mentions: Array.isArray(c.mentions) ? c.mentions : [],
        contact_mentions: Array.isArray(c.contact_mentions) ? c.contact_mentions : [],
        address_id: c.address_id,
        combadd: c.combadd,
        unit_id: c.unit_id,
        raw: c,
      }));

      if (mentionItems.length === 0 && contactAddresses.length > 0) {
        try {
          const fallbackMentioned = await collectMentionedFromAddresses({
            baseUrl,
            addresses: contactAddresses,
            contactId,
            contactMeta,
          });
          if (fallbackMentioned.length > 0) {
            mentionItems = fallbackMentioned;
          }
        } catch {
          // ignore fallback failures
        }
      }

      const filteredMentionItems = mentionItems.filter((item) => !contactIds.has(item.id));

      const combined = [...contactItems, ...filteredMentionItems].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
      setComments(combined);
      setAttachmentCounts({});
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load comments');
      setLoading(false);
    }
  }, [contactId, contactAddresses, contactMeta]);

  useEffect(() => {
    fetchComments();  // Fetch comments on component load and when identifiers change
  }, [fetchComments]);

  // Fetch all users once to map user_id -> email
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${process.env.REACT_APP_API_URL}/users/`, { signal: controller.signal })
      .then((resp) => (resp.ok ? resp.json() : []))
      .then((users) => {
        const map = {};
        (users || []).forEach((u) => {
          map[u.id] = u.email || '';
        });
        setUsersMap(map);
      })
      .catch(() => {})
      .finally(() => {});
    return () => controller.abort();
  }, []);

  // After comments load, prefetch attachment counts to know when to show the button
  useEffect(() => {
    if (!comments || comments.length === 0) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        const promises = comments.map(async (c) => {
          const key = attachmentKey(c);
          if (!key) return;
          if (attachmentCounts[key] != null) return;
          const baseUrl = process.env.REACT_APP_API_URL;
          try {
            if (c.type === 'contact') {
              const resp = await fetch(`${baseUrl}/comments/contact/${c.id}/attachments/count`, {
                signal: controller.signal,
              });
              if (!resp.ok) throw new Error('Failed to fetch attachments');
              const data = await resp.json();
              const count = (data && typeof data.count === 'number') ? data.count : 0;
              setAttachmentCounts((prev) => ({ ...prev, [key]: count }));
            } else {
              const resp = await fetch(`${baseUrl}/comments/${c.id}/photos`, {
                signal: controller.signal,
              });
              if (!resp.ok) throw new Error('Failed to fetch attachments');
              const data = await resp.json();
              const count = Array.isArray(data) ? data.length : 0;
              setAttachmentCounts((prev) => ({ ...prev, [key]: count }));
            }
          } catch {
            setAttachmentCounts((prev) => ({ ...prev, [key]: 0 }));
          }
        });
        await Promise.allSettled(promises);
      } catch (e) {
        // Ignore if aborted
      }
    };
    run();
    return () => controller.abort();
  }, [attachmentCounts, comments]);

  const openAttachments = (comment) => {
    setShowModal(true);
    setAttachments([]);
    setAttachmentsLoading(true);
    const baseUrl = process.env.REACT_APP_API_URL;
    const url = comment.type === 'contact'
      ? `${baseUrl}/comments/contact/${comment.id}/attachments`
      : `${baseUrl}/comments/${comment.id}/photos`;
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch attachments');
        return response.json();
      })
      .then((data) => {
        setAttachments(data || []);
      })
      .catch((err) => {
        console.error('Error fetching attachments:', err);
        setAttachments([]);
      })
      .finally(() => setAttachmentsLoading(false));
  };

  const closeModal = () => {
    setShowModal(false);
    setAttachments([]);
    setAttachmentsLoading(false);
  };

  if (loading) return <div>Loading comments...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold text-gray-700">Comments</h2>
      {/* Add new comment form and pass fetchComments as a callback */}
      <NewContactComment contactId={contactId} onCommentAdded={fetchComments} />
      {comments.length === 0 ? (
        <p className='pt-4'>No comments available.</p>
      ) : (
        <ul className="space-y-4 pt-4">
          {comments.map((comment) => {
            const key = attachmentKey(comment);
            const attachmentCount = attachmentCounts[key] || 0;
            const typeLabel = comment.type === 'contact' ? 'Contact Comment' : 'Mentioned Comment';
            const addressHint = comment.type === 'linked'
              ? (comment.combadd
                ? `Address: ${comment.combadd}`
                : (comment.address_id ? `Address ID: ${comment.address_id}` : ''))
              : '';
            return (
              <li key={key} className="bg-gray-100 p-4 rounded-lg shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{typeLabel}</p>
                    {addressHint && (
                      <p className="text-xs text-gray-500 mt-1">{addressHint}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {usersMap[comment.user_id] ? usersMap[comment.user_id] : 'Unknown user'}
                  </div>
                </div>

                <p className="text-gray-700 mt-2 whitespace-pre-line">{comment.text}</p>

                {Array.isArray(comment.mentions) && comment.mentions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {comment.mentions.map((u) => (
                      <span key={`user-${u.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                        @{u.name || u.email || `user-${u.id}`}
                      </span>
                    ))}
                  </div>
                )}

                {Array.isArray(comment.contact_mentions) && comment.contact_mentions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {comment.contact_mentions.map((c) => (
                      <span key={`contact-${c.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                        %{c.name || c.email || `contact-${c.id}`}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-start justify-between">
                  <div className="text-sm text-gray-500">
                    <p>Created on {formatDate(comment.created_at)}</p>
                    {comment.updated_at && (
                      <p>Updated on {formatDate(comment.updated_at)}</p>
                    )}
                  </div>
                </div>

                {attachmentCount > 0 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => openAttachments(comment)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      View attachments ({attachmentCount})
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={closeModal} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 p-4">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-lg font-semibold">Attachments</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={closeModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {attachmentsLoading ? (
              <div className="py-8 text-center text-gray-500">Loading attachments…</div>
            ) : attachments.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No attachments found.</div>
            ) : (
              <div className="space-y-6">
                {attachments.map((att, idx) => {
                  const ct = (att.content_type || '').toLowerCase();
                  const isImage = ct.startsWith('image/');
                  const isPdf = ct === 'application/pdf' || (att.filename || '').toLowerCase().endsWith('.pdf');
                  return (
                    <div key={idx} className="border rounded-md overflow-hidden bg-white">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={att.filename}
                        className="block"
                      >
                        {isImage ? (
                          <img src={att.url} alt={att.filename} className="w-full h-auto max-h-[80vh] object-contain bg-black" />
                        ) : isPdf ? (
                          <embed src={att.url} type="application/pdf" className="w-full h-[80vh]" />
                        ) : (
                          <div className="p-6 h-40 flex items-center justify-center bg-gray-50">
                            <div className="text-center">
                              <div className="text-4xl">📄</div>
                              <div className="mt-2 text-xs text-gray-600 break-all">{att.filename}</div>
                            </div>
                          </div>
                        )}
                      </a>
                      <div className="px-3 py-2 text-xs text-gray-600 truncate" title={att.filename}>
                        {att.filename}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
