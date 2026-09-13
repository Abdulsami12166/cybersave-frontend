/**
 * Centralized API & WebSocket Configuration for Cybersave Admin Portal
 * Implements intelligent multi-tier backend discovery and fallback:
 * 1. If running on localhost / dev -> connects to local admin backend (http://localhost:3001, http://localhost:3000)
 * 2. If configured via VITE_BACKEND_URL -> uses configured environment variable
 * 3. Fallback to production Render URL (https://cybersave-6tfo.onrender.com)
 */

const isLocalhost = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0');

export function getCandidateBackendUrls(): string[] {
  const envUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, '');
  const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cybersave_active_backend') : null;
  const list: string[] = [];

  if (cached) {
    list.push(cached);
  }

  if (isLocalhost) {
    list.push('http://localhost:3001');
    list.push('http://localhost:3000');
    if (envUrl) list.push(envUrl);
    list.push('http://127.0.0.1:3001');
  } else {
    if (typeof window !== 'undefined' && window.location?.origin) {
      list.push(window.location.origin);
    }
    if (envUrl) list.push(envUrl);
    list.push('https://cybersave-6tfo.onrender.com');
  }

  // Deduplicate and filter empty
  return Array.from(new Set(list.filter(Boolean)));
}

let activeBaseUrl: string = getCandidateBackendUrls()[0] || (isLocalhost ? 'http://localhost:3001' : 'https://cybersave-6tfo.onrender.com');

export function getApiBaseUrl(): string {
  return activeBaseUrl;
}

export function setApiBaseUrl(url: string) {
  activeBaseUrl = url.replace(/\/+$/, '');
  try {
    sessionStorage.setItem('cybersave_active_backend', activeBaseUrl);
  } catch (_) {}
}

export function getSocketUrl(): string {
  return getApiBaseUrl();
}

/**
 * Fast & robust fetch with intelligent caching & reduced timeout
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
    try {
      const url = `${base}${cleanPath}`;
      const controller = new AbortController();
      // Reduced timeout: 4s for GET is plenty, prevents 16-24s probe delays
      const timeoutMs = options.method && options.method !== 'GET' ? 8000 : 4000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        ...options,
        signal: options.signal || controller.signal
      });
      clearTimeout(timeoutId);

      // If response received (success or 4xx client error), server is alive
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

  // If all absolute candidates fail, try relative path
  try {
    return await fetch(cleanPath, options);
  } catch (err) {
    throw lastError || err;
  }
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
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}
