import { useCallback, useEffect, useMemo, useState } from 'react';

const DEFAULT_PAGE_SIZE = 10;

const normalizeEntityId = (id) => {
  const numeric = Number(id);
  if (Number.isNaN(numeric)) {
    return id;
  }
  return numeric;
};

const collectMentionedFromAddresses = async ({
  baseUrl,
  addresses,
  contactId,
  contactMeta,
  signal,
}) => {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return [];
  }

  const results = new Map();
  const mentionRegex = /%([A-Za-z0-9@._\- ]+)/g;
  const numericContactId = Number(contactId);
  const stringContactId = String(contactId);

  const nameTokens = new Set();
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

  const emailToken = (contactMeta?.email || '').toLowerCase();
  if (emailToken) {
    nameTokens.add(emailToken);
  }

  const phoneDigits = (contactMeta?.phone || '').replace(/\D/g, '');
  if (phoneDigits) {
    nameTokens.add(phoneDigits);
  }

  const limitedAddresses = addresses.slice(0, 10);

  for (const addr of limitedAddresses) {
    const addressId = addr?.id;
    if (!addressId) continue;

    try {
      const resp = await fetch(`${baseUrl}/comments/address/${addressId}`, { signal });
      if (!resp.ok) continue;
      const payload = await resp.json();
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.results)
          ? payload.results
          : [];

      for (const comment of list) {
        if (!comment || results.has(comment.id)) continue;

        const contactMentions = Array.isArray(comment.contact_mentions) ? comment.contact_mentions : [];
        let matches = contactMentions.some(
          (cm) =>
            (!Number.isNaN(numericContactId) && Number(cm.id) === numericContactId) ||
            String(cm.id) === stringContactId,
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
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw error;
      }
      // ignore individual address failures
    }
  }

  return Array.from(results.values());
};

const useEntityComments = (entityType, entityId, options = {}) => {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    initialPage = 1,
    contactAddresses,
    contactMeta,
  } = options;

  const normalizedId = useMemo(() => normalizeEntityId(entityId), [entityId]);

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(0);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    setPage(initialPage);
  }, [entityType, normalizedId, initialPage]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const baseUrl = process.env.REACT_APP_API_URL;

    if (!baseUrl) {
      setError('API URL is not configured');
      setComments([]);
      setLoading(false);
      return undefined;
    }

    let active = true;

    const loadContactComments = async () => {
      const [contactResp, mentionedResp] = await Promise.all([
        fetch(`${baseUrl}/comments/contact/${normalizedId}`, { signal }),
        fetch(`${baseUrl}/comments/contact/${normalizedId}/mentioned`, { signal }).catch(() => null),
      ]);

      if (!contactResp.ok) {
        throw new Error('Failed to fetch comments');
      }

      const contactData = await contactResp.json();

      let mentionedData = [];
      if (mentionedResp && mentionedResp.ok) {
        try {
          const payload = await mentionedResp.json();
          mentionedData = Array.isArray(payload) ? payload : [];
        } catch {
          mentionedData = [];
        }
      }

      const contactItems = (await Promise.all((contactData || []).map(async (c) => {
        try {
          const resp = await fetch(`${baseUrl}/comments/${c.id}/mentions`, { signal });
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
        } catch (error) {
          if (error?.name === 'AbortError') throw error;
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

      if (mentionItems.length === 0 && Array.isArray(contactAddresses) && contactAddresses.length > 0) {
        try {
          const fallbackMentioned = await collectMentionedFromAddresses({
            baseUrl,
            addresses: contactAddresses,
            contactId: normalizedId,
            contactMeta,
            signal,
          });
          if (fallbackMentioned.length > 0) {
            mentionItems = fallbackMentioned;
          }
        } catch (error) {
          if (error?.name === 'AbortError') throw error;
        }
      }

      const filteredMentionItems = mentionItems.filter((item) => !contactIds.has(item.id));

      const combined = [...contactItems, ...filteredMentionItems].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );

      return { comments: combined, total: combined.length };
    };

    const loadAddressComments = async () => {
      const targetPage = page < 1 ? 1 : page;
      const params = new URLSearchParams({
        page: String(targetPage),
        page_size: String(pageSize),
      });

      const response = await fetch(`${baseUrl}/comments/address/${normalizedId}?${params.toString()}`, { signal });
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const payload = await response.json();

      let rawComments;
      let totalCount;

      if (Array.isArray(payload)) {
        totalCount = payload.length;
        const start = (targetPage - 1) * pageSize;
        rawComments = payload.slice(start, start + pageSize);
      } else {
        rawComments = Array.isArray(payload?.results) ? payload.results : [];
        totalCount = typeof payload?.total === 'number' ? payload.total : rawComments.length;
      }

      const enriched = await Promise.all(
        rawComments.map(async (comment) => {
          let photos = [];
          try {
            const photoResp = await fetch(`${baseUrl}/comments/${comment.id}/photos`, { signal });
            if (photoResp.ok) {
              photos = await photoResp.json();
            }
          } catch (error) {
            if (error?.name === 'AbortError') throw error;
            photos = [];
          }

          let unit = comment.unit;
          if (!unit && comment.unit_id) {
            try {
              const unitResp = await fetch(`${baseUrl}/units/${comment.unit_id}`, { signal });
              if (unitResp.ok) {
                unit = await unitResp.json();
              }
            } catch (error) {
              if (error?.name === 'AbortError') throw error;
              unit = comment.unit;
            }
          }

          let mentions = [];
          try {
            const mentionsResp = await fetch(`${baseUrl}/comments/${comment.id}/mentions`, { signal });
            if (mentionsResp.ok) {
              mentions = await mentionsResp.json();
            }
          } catch (error) {
            if (error?.name === 'AbortError') throw error;
            mentions = [];
          }

          return {
            ...comment,
            photos,
            unit,
            mentions,
            contact_mentions: Array.isArray(comment.contact_mentions) ? comment.contact_mentions : [],
          };
        }),
      );

      return { comments: enriched, total: totalCount };
    };

    const loadUnitComments = async () => {
      const response = await fetch(`${baseUrl}/comments/unit/${normalizedId}`, { signal });
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const payload = await response.json();

      const enriched = await Promise.all(
        (payload || []).map(async (comment) => {
          let photos = [];
          try {
            const photoResp = await fetch(`${baseUrl}/comments/${comment.id}/photos`, { signal });
            photos = photoResp.ok ? await photoResp.json() : [];
          } catch (error) {
            if (error?.name === 'AbortError') throw error;
            photos = [];
          }

          let mentions = [];
          try {
            const mentionsResp = await fetch(`${baseUrl}/comments/${comment.id}/mentions`, { signal });
            mentions = mentionsResp.ok ? await mentionsResp.json() : [];
          } catch (error) {
            if (error?.name === 'AbortError') throw error;
            mentions = [];
          }

          return { ...comment, photos, mentions };
        }),
      );

      return { comments: enriched, total: enriched.length };
    };

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        let result;
        if (entityType === 'contact') {
          result = await loadContactComments();
        } else if (entityType === 'address') {
          result = await loadAddressComments();
        } else if (entityType === 'unit') {
          result = await loadUnitComments();
        } else {
          throw new Error('Unsupported entity type');
        }

        if (!active || signal.aborted) {
          return;
        }

        setComments(result.comments || []);
        setTotal(typeof result.total === 'number' ? result.total : (result.comments || []).length);
      } catch (err) {
        if (!active || signal.aborted) {
          return;
        }
        setComments([]);
        setTotal(0);
        setError(err.message || 'Failed to load comments');
      } finally {
        if (active && !signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [entityType, normalizedId, page, pageSize, contactAddresses, contactMeta, refreshIndex]);

  const refresh = useCallback(() => {
    setRefreshIndex((index) => index + 1);
  }, []);

  return {
    comments,
    loading,
    error,
    refresh,
    page,
    setPage,
    total,
    setComments,
  };
};

export default useEntityComments;
