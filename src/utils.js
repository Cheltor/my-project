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

const STATUS_CANONICAL_MAP = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  'in progress': 'In Progress',
  'in-progress': 'In Progress',
  'under review': 'under review',
  'under-review': 'under review',
  completed: 'Completed',
  cancelled: 'Cancelled',
  canceled: 'Cancelled'
};

const FINAL_STATUS_SET = new Set(['Completed', 'Cancelled']);

export const canonicalInspectionStatus = (status) => {
  if (!status) return 'Pending';
  const normalized = status.toString().trim().toLowerCase();
  if (!normalized) return 'Pending';
  if (STATUS_CANONICAL_MAP[normalized]) {
    return STATUS_CANONICAL_MAP[normalized];
  }
  return status;
};

export const formatInspectionStatusLabel = (status) => {
  if (!status) return 'Pending';
  return status
    .toString()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const inferInspectionStatusSuggestion = ({ inspection, areas, potentialCount } = {}) => {
  const canonical = canonicalInspectionStatus(inspection?.status);

  if (FINAL_STATUS_SET.has(canonical)) {
    return null;
  }

  const hasPotentialViolations = typeof potentialCount === 'number' && potentialCount > 0;
  const hasAreas = Array.isArray(areas) && areas.length > 0;
  const hasScheduledDate = Boolean(inspection?.scheduled_datetime);

  if (hasPotentialViolations) {
    return {
      status: 'under review',
      reason: 'Potential violations have been flagged and need review.'
    };
  }

  if (hasAreas) {
    return {
      status: 'In Progress',
      reason: 'Areas have been added to this inspection.'
    };
  }

  if (hasScheduledDate) {
    return {
      status: 'Scheduled',
      reason: 'A schedule has been set for this inspection.'
    };
  }

  if (!canonical || canonical === 'Pending') {
    return {
      status: 'Pending',
      reason: 'No activity has been recorded for this inspection yet.'
    };
  }

  return null;
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
