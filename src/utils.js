export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return 'N/A';
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return 'N/A';
}; 

export const formatWebsite = (website) => {
  if (!website) return 'N/A';
  return website.replace(/(^\w+:|^)\/\//, '');
};

export const truncateEmail = (email) => {
  if (!email) return 'N/A';
  return email.split('@')[0];
};

export const roles = {
  0: 'Guest',
  1: 'ONS',
  2: 'OAS',
  3: 'Admin'
};

export const getRoleName = (role) => {
  return roles[role] || 'Unknown';
};

// Treat users as active unless explicitly marked inactive (active === false)
export const isUserActive = (user) => Boolean(user && user.active !== false);

export const filterActiveOnsUsers = (users) => {
  if (!Array.isArray(users)) return [];
  return users.filter((u) => isUserActive(u));
};

// Shared helpers to consistently render timestamps in Eastern Time
export const EASTERN_TIME_ZONE = 'America/New_York';

const normalizeDateInput = (value) => {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeLocaleArgs = (locales, options) => {
  let resolvedLocales = locales;
  let resolvedOptions = options;

  if (
    resolvedOptions === undefined &&
    resolvedLocales &&
    typeof resolvedLocales === 'object' &&
    !Array.isArray(resolvedLocales)
  ) {
    resolvedOptions = resolvedLocales;
    resolvedLocales = undefined;
  }

  return {
    locales: resolvedLocales,
    options: resolvedOptions || {}
  };
};

export const toEasternLocaleString = (value, locales, options) => {
  const date = normalizeDateInput(value);
  if (!date) return '';

  const { locales: resolvedLocales, options: resolvedOptions } = normalizeLocaleArgs(locales, options);

  return date.toLocaleString(resolvedLocales, {
    ...resolvedOptions,
    timeZone: EASTERN_TIME_ZONE
  });
};

export const toEasternLocaleTimeString = (value, locales, options) => {
  const date = normalizeDateInput(value);
  if (!date) return '';

  const { locales: resolvedLocales, options: resolvedOptions } = normalizeLocaleArgs(locales, options);

  return date.toLocaleTimeString(resolvedLocales, {
    ...resolvedOptions,
    timeZone: EASTERN_TIME_ZONE
  });
};

export const toEasternLocaleDateString = (value, locales, options) => {
  const date = normalizeDateInput(value);
  if (!date) return '';

  const { locales: resolvedLocales, options: resolvedOptions } = normalizeLocaleArgs(locales, options);

  return date.toLocaleDateString(resolvedLocales, {
    ...resolvedOptions,
    timeZone: EASTERN_TIME_ZONE
  });
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const describeDueStatus = (value, { hideWhenMissing = false } = {}) => {
  const date = normalizeDateInput(value);
  if (!date) {
    if (hideWhenMissing) return null;
    return { label: 'Not scheduled', tone: 'text-gray-500', status: 'unscheduled' };
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / DAY_IN_MS);

  if (diffMs < 0) {
    const daysPast = Math.abs(diffDays);
    return {
      label: daysPast ? `Past due ${daysPast}d` : 'Past due',
      tone: 'text-rose-600',
      status: 'overdue',
    };
  }

  if (diffDays === 0) {
    return {
      label: 'Due today',
      tone: 'text-amber-600',
      status: 'today',
    };
  }

  if (diffDays <= 2) {
    return {
      label: `Due in ${diffDays}d`,
      tone: 'text-amber-600',
      status: 'soon',
    };
  }

  if (diffDays <= 7) {
    return {
      label: `Upcoming ${toEasternLocaleDateString(date)}`,
      tone: 'text-indigo-600',
      status: 'upcoming',
    };
  }

  return {
    label: `Due ${toEasternLocaleDateString(date)}`,
    tone: 'text-gray-500',
    status: 'scheduled',
  };
};

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif', 'tif', 'tiff', 'svg']);

const extractFilename = (value) => {
  if (!value) return '';

  if (typeof value === 'string') {
    try {
      const base = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://example.com';
      const url = new URL(value, base);
      const lastSegment = url.pathname.split('/').pop() || '';
      return decodeURIComponent(lastSegment);
    } catch (e) {
      const parts = value.split('/');
      return decodeURIComponent(parts.pop() || value);
    }
  }

  if (typeof value === 'object') {
    if (value.filename) return value.filename;
    if (value.name) return value.name;
    if (value.url) return extractFilename(value.url);
  }

  return '';
};

const getNormalizedFilename = (attachment) => {
  const raw = extractFilename(attachment);
  return raw ? raw.toLowerCase() : '';
};

export const getAttachmentFilename = (attachment, fallbackLabel = '') => {
  const filename = extractFilename(attachment);
  if (filename) return filename;
  return fallbackLabel;
};

export const getAttachmentExtension = (attachment) => {
  const normalized = getNormalizedFilename(attachment);
  if (!normalized.includes('.')) return '';
  return normalized.split('.').pop() || '';
};

export const isImageAttachment = (attachment) => {
  if (!attachment) return false;

  const contentType = (attachment.content_type || '').toLowerCase();
  if (contentType.startsWith('image/')) return true;

  const extension = getAttachmentExtension(attachment);
  if (!extension) return false;

  return IMAGE_EXTENSIONS.has(extension);
};

const CONTENT_TYPE_LABELS = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'text/plain': 'TXT',
  'application/rtf': 'RTF'
};

export const getAttachmentDisplayLabel = (attachment) => {
  const extension = getAttachmentExtension(attachment);
  if (extension) return extension.toUpperCase();

  const contentType = (attachment?.content_type || '').toLowerCase();
  if (contentType) {
    if (CONTENT_TYPE_LABELS[contentType]) {
      return CONTENT_TYPE_LABELS[contentType];
    }

    const subtype = contentType.split('/').pop() || '';
    if (subtype && subtype.length <= 6) {
      return subtype.toUpperCase();
    }
  }

  return 'FILE';
};

export const appendGeoMetadata = async (formData, { fieldName = 'capture_metadata', timeoutMs = 6000 } = {}) => {
  if (!formData || typeof formData.append !== 'function') return null;
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  const startedAt = Date.now();
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          const { coords, timestamp } = position || {};
          const payload = {
            lat: coords?.latitude,
            lng: coords?.longitude,
            accuracy: coords?.accuracy,
            altitude: coords?.altitude,
            altitude_accuracy: coords?.altitudeAccuracy,
            heading: coords?.heading,
            speed: coords?.speed,
            captured_at: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
            requested_at: new Date(startedAt).toISOString(),
            source: 'browser_geolocation',
          };
          const filtered = Object.fromEntries(
            Object.entries(payload).filter(([, v]) => v !== null && v !== undefined),
          );
          formData.append(fieldName, JSON.stringify(filtered));
          resolve(filtered);
        } catch (err) {
          resolve(null);
        }
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
};
