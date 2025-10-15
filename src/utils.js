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
