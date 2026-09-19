/**
 * Centralized API & WebSocket Configuration for Cybersave Admin Portal
 * Implements intelligent multi-tier backend discovery with SPA HTML-rejection safety:
 * 1. Primary Live Backend: https://cybersave-nine.vercel.app
 * 2. Localhost Dev Backend: http://localhost:3000 (when on localhost)
 * 3. Render Backend Fallback: https://cybersave-6tfo.onrender.com
 */

const isLocalhost = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0');

export function getCandidateBackendUrls(): string[] {
  const rawEnv = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, '');
  // Ignore localhost in VITE_BACKEND_URL when user is visiting a remote production URL
  const envUrl = !isLocalhost && rawEnv?.includes('localhost') ? null : rawEnv;
  const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cybersave_active_backend') : null;
  const list: string[] = [];

  // 1. Localhost endpoints if in local dev mode (Top priority for local testing)
  if (isLocalhost) {
    list.push('http://localhost:3000');
    list.push('http://127.0.0.1:3000');
  }

  // 2. Valid cached backend
  if (cached && (isLocalhost || (!cached.includes('localhost') && !cached.includes('cybersave-frontend.vercel.app')))) {
    list.push(cached);
  }

  // 3. Production env URL if provided and not localhost on production
  if (envUrl) {
    list.push(envUrl);
  }

  // 4. Primary live production backend
  list.push('https://cybersave-nine.vercel.app');

  // 5. Render backend fallback
  list.push('https://cybersave-6tfo.onrender.com');

  // Deduplicate and filter empty
  return Array.from(new Set(list.filter(Boolean)));
}

let activeBaseUrl: string = (() => {
  const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cybersave_active_backend') : null;
  if (cached && (isLocalhost || (!cached.includes('localhost') && !cached.includes('cybersave-frontend.vercel.app')))) {
    return cached;
  }
  const rawEnv = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, '');
  const envUrl = !isLocalhost && rawEnv?.includes('localhost') ? null : rawEnv;
  if (envUrl) {
    return envUrl;
  }
  return isLocalhost ? 'http://localhost:3000' : 'https://cybersave-nine.vercel.app';
})();

export function getApiBaseUrl(): string {
  return activeBaseUrl;
}

export function setApiBaseUrl(url: string) {
  const clean = url.replace(/\/+$/, '');
  // Never cache static frontend origin as backend
  if (!clean.includes('cybersave-frontend.vercel.app')) {
    activeBaseUrl = clean;
    try {
      sessionStorage.setItem('cybersave_active_backend', activeBaseUrl);
    } catch (_) {}
  }
}

export function getSocketUrl(): string {
  // If in remote production, use the live backend domain
  if (!isLocalhost && (activeBaseUrl.includes('cybersave-frontend.vercel.app') || activeBaseUrl.includes('localhost'))) {
    return 'https://cybersave-nine.vercel.app';
  }
  return getApiBaseUrl();
}

/**
 * Fast & robust fetch with intelligent caching, HTML rejection, and sub-second candidate switching
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const candidates = getCandidateBackendUrls();
  
  // Try current activeBaseUrl first
  const orderedCandidates = [
    activeBaseUrl,
    ...candidates.filter(c => c !== activeBaseUrl)
  ];

  let lastError: any = null;

  for (const base of orderedCandidates) {
    // Safety check: Never try to call localhost if user is browsing the live Vercel site
    if (!isLocalhost && (base.includes('localhost') || base.includes('127.0.0.1'))) {
      continue;
    }

    try {
      const url = `${base}${cleanPath}`;
      const controller = new AbortController();
      const timeoutMs = options.method && options.method !== 'GET' ? 12000 : 5000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        ...options,
        signal: options.signal || controller.signal
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      // CRITICAL: If server returned text/html for an API endpoint (e.g. <!doctype html> from an SPA rewrite fallback), it is NOT a valid API!
      if (contentType.includes('text/html')) {
        continue;
      }

      // If response received (success or 4xx client error with valid API format), server is alive
      if (res.ok || res.status < 500) {
        if (activeBaseUrl !== base) {
          setApiBaseUrl(base);
        }
        return res;
      }
    } catch (err) {
      lastError = err;
    }
  }

  // If all absolute candidates fail, try relative path ONLY if it does not return text/html
  try {
    const res = await fetch(cleanPath, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && (res.ok || res.status < 500)) {
      return res;
    }
  } catch (err) {
    // ignore
  }

  throw lastError || new Error(`Failed to fetch ${cleanPath} from all backend candidates`);
}

/**
 * Robust JSON getter
 */
export async function apiGetJson<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await apiFetch(path, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('Received HTML instead of JSON (SPA rewrite fallback)');
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}
