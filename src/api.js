// Lightweight API fetch wrapper that attaches the JWT from localStorage
// and calls an onUnauthorized callback (e.g. AuthContext.logout) when a 401 is received.
export async function apiFetch(input, init = {}, { onUnauthorized } = {}) {
  const API_BASE = process.env.REACT_APP_API_URL || '';
  const url = typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))
    ? input
    : `${API_BASE}${input}`;

  const token = (() => {
    try {
      return localStorage.getItem('token');
    } catch (e) {
      return null;
    }
  })();

  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const opts = { ...init, headers };

  let res;
  try {
    res = await fetch(url, opts);
  } catch (e) {
    // network error or aborted - propagate
    throw e;
  }

  if (res.status !== 401) return res;

  // Unauthorized — call provided handler (best-effort) to clear client auth state
  try {
    if (typeof onUnauthorized === 'function') {
      onUnauthorized();
    } else {
      try {
        localStorage.removeItem('token');
      } catch {}
      // redirect to login preserving location
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login?next=${next}`);
    }
  } catch (e) {
    // swallow errors — caller will see 401 response if needed
  }

  return res;
}

export default apiFetch;
