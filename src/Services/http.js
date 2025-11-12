import { apiFetch } from '../api';

function collectMessages(value) {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectMessages(item));
  }
  if (typeof value === 'object') {
    return Object.values(value).flatMap((item) => collectMessages(item));
  }
  return [];
}

function resolveErrorMessage(body, fallback) {
  if (!body) return fallback;
  if (typeof body === 'string') {
    return body.trim() || fallback;
  }
  if (typeof body === 'object') {
    for (const key of ['detail', 'message', 'error']) {
      if (body[key]) {
        const message = collectMessages(body[key]).join(', ');
        if (message.trim()) return message;
      }
    }
    const combined = collectMessages(body).join(', ');
    if (combined.trim()) return combined;
  }
  return fallback;
}

export async function fetchJson(input, init = {}, extras) {
  const response = await apiFetch(input, init, extras);
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (!response.ok) {
    let parsedBody;
    let fallback = `Request failed with status ${response.status}`;

    if (isJson) {
      try {
        parsedBody = await response.json();
      } catch (err) {
        const error = new Error(fallback);
        error.status = response.status;
        error.response = response;
        error.cause = err;
        throw error;
      }
    } else {
      try {
        const text = await response.text();
        parsedBody = text;
        if (text.trim()) {
          fallback = text.trim();
        }
      } catch (err) {
        const error = new Error(fallback);
        error.status = response.status;
        error.response = response;
        error.cause = err;
        throw error;
      }
    }

    const message = resolveErrorMessage(parsedBody, fallback);
    const error = new Error(message);
    error.status = response.status;
    error.response = response;
    if (parsedBody !== undefined) {
      error.body = parsedBody;
    }
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  if (!isJson) {
    return response.text();
  }

  try {
    return await response.json();
  } catch (err) {
    const error = new Error('Failed to parse server response');
    error.status = response.status;
    error.response = response;
    error.cause = err;
    throw error;
  }
}

export default fetchJson;
