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
    list.push('http://localhost:3001');
    list.push('http://127.0.0.1:3001');
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
  return isLocalhost ? 'http://localhost:3001' : 'https://cybersave-nine.vercel.app';
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

// ponytail: track recently failed candidate hosts to skip them on subsequent requests for 30 seconds
const failedCandidateCooldownMs = 30000;
const failedCandidateHosts = new Map<string, number>();

function isHostAvailable(host: string): boolean {
  const failedAt = failedCandidateHosts.get(host);
  if (!failedAt) return true;
  if (Date.now() - failedAt > failedCandidateCooldownMs) {
    failedCandidateHosts.delete(host);
    return true;
  }
  return false;
}

function markHostFailed(host: string) {
  failedCandidateHosts.set(host, Date.now());
}

function markHostSuccess(host: string) {
  failedCandidateHosts.delete(host);
}

// ponytail: in-memory SWR cache for GET JSON responses (instant navigation & 0ms screen re-renders)
interface CacheEntry<T = any> {
  data: T;
  time: number;
}
const apiJsonCache = new Map<string, CacheEntry>();

export function invalidateApiCache(pattern?: string | RegExp) {
  if (!pattern) {
    apiJsonCache.clear();
    return;
  }
  for (const key of apiJsonCache.keys()) {
    if (typeof pattern === 'string' && key.includes(pattern)) {
      apiJsonCache.delete(key);
    } else if (pattern instanceof RegExp && pattern.test(key)) {
      apiJsonCache.delete(key);
    }
  }
}

const inFlightGetRequests = new Map<string, Promise<Response>>();

async function doApiFetch(cleanPath: string, options: RequestInit = {}): Promise<Response> {
  const candidates = getCandidateBackendUrls();
  const method = (options.method || 'GET').toUpperCase();
  
  // Try current activeBaseUrl first, followed by alive candidates
  const orderedCandidates = [
    activeBaseUrl,
    ...candidates.filter(c => c !== activeBaseUrl)
  ].filter(c => isHostAvailable(c) || c === activeBaseUrl);

  let lastError: any = null;

  for (let idx = 0; idx < orderedCandidates.length; idx++) {
    const base = orderedCandidates[idx];
    // Safety check: Never try to call localhost if user is browsing the live Vercel site
    if (!isLocalhost && (base.includes('localhost') || base.includes('127.0.0.1'))) {
      continue;
    }

    try {
      const url = `${base}${cleanPath}`;
      const controller = new AbortController();
      // ponytail: use adaptive fast timeout for fallback candidate discovery (1500ms max for alternates)
      const timeoutMs = options.method && options.method !== 'GET' 
        ? 35000 
        : (idx === 0 ? 6000 : 1500);
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const reqHeaders = new Headers(options.headers || {});
      const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('adminToken') || localStorage.getItem('token')) : null;
      if (token && !reqHeaders.has('Authorization')) {
        reqHeaders.set('Authorization', `Bearer ${token}`);
      }
      if (!reqHeaders.has('Cache-Control') && (!options.method || options.method === 'GET')) {
        reqHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        reqHeaders.set('Pragma', 'no-cache');
      }

      const res = await fetch(url, {
        ...options,
        headers: reqHeaders,
        signal: options.signal || controller.signal
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      // CRITICAL: If server returned text/html for an API endpoint (e.g. <!doctype html> from an SPA rewrite fallback), it is NOT a valid API!
      if (contentType.includes('text/html')) {
        markHostFailed(base);
        continue;
      }

      // If backend candidate returns 404, this specific host does not have this route.
      if (res.status === 404) {
        continue;
      }

      // If response received (success or other valid API response), mark healthy and return
      if (res.ok) {
        markHostSuccess(base);
        if (activeBaseUrl !== base) {
          setApiBaseUrl(base);
        }
        return res;
      } else if (res.status < 500) {
        markHostSuccess(base);
        return res;
      }
    } catch (err) {
      lastError = err;
      markHostFailed(base);
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
 * Fast & robust fetch with intelligent caching, HTML rejection, in-flight deduplication, and sub-second candidate switching
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const method = (options.method || 'GET').toUpperCase();

  // ponytail: automatically bust related SWR cache on mutation requests (POST/PUT/PATCH/DELETE)
  if (method !== 'GET') {
    const resourcePrefix = cleanPath.split('?')[0].replace(/\/[0-9a-fA-F]{24}$/, '');
    invalidateApiCache(resourcePrefix);
  }

  // Deduplicate concurrent in-flight GET requests
  if (method === 'GET' && !options.signal) {
    const existing = inFlightGetRequests.get(cleanPath);
    if (existing) {
      try {
        const res = await existing;
        return res.clone();
      } catch (_) {
        // Fall through on cached promise error
      }
    }

    const fetchPromise = doApiFetch(cleanPath, options);
    inFlightGetRequests.set(cleanPath, fetchPromise);
    try {
      const res = await fetchPromise;
      return res.clone();
    } finally {
      inFlightGetRequests.delete(cleanPath);
    }
  }

  return doApiFetch(cleanPath, options);
}

/**
 * Robust JSON getter with SWR caching (Stale-While-Revalidate)
 * Returns instantly cached data if fresh (< ttlMs), with background revalidation.
 */
export async function apiGetJson<T = any>(
  path: string, 
  options: RequestInit & { ttlMs?: number; bypassCache?: boolean } = {}
): Promise<T> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const ttlMs = options.ttlMs ?? 15000; // 15-second default TTL
  const now = Date.now();

  if (!options.bypassCache) {
    const cached = apiJsonCache.get(cleanPath);
    if (cached) {
      const age = now - cached.time;
      if (age < ttlMs) {
        // Fresh hit: if halfway through TTL, refresh in background silently
        if (age > ttlMs / 2) {
          apiGetJson<T>(cleanPath, { ...options, bypassCache: true }).catch(() => {});
        }
        return cached.data as T;
      }
    }
  }

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await apiFetch(cleanPath, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('Received HTML instead of JSON (SPA rewrite fallback)');
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  apiJsonCache.set(cleanPath, { data, time: Date.now() });
  return data as T;
}
