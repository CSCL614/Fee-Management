import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Cache for static lookup endpoints that don't change frequently
const lookupCache = new Map();
const inFlightRequests = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

const STATIC_LOOKUP_ROUTES = [
  '/audit/academic-years',
  '/students/courses',
  '/fees/categories',
  '/courses'
];

const isCacheable = (url) => {
  return STATIC_LOOKUP_ROUTES.some(route => url.startsWith(route) || url.includes(route));
};

// Request interceptor to add auth token and request timestamp
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.metadata = { startTime: performance.now() };

  // Clear lookup cache whenever a mutating operation occurs
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    lookupCache.clear();
  }

  return config;
});

// Response interceptor for token refresh and performance diagnostics
api.interceptors.response.use(
  (response) => {
    // Log network timing in development / debug mode
    if (import.meta.env.DEV && response.config.metadata?.startTime) {
      const elapsed = (performance.now() - response.config.metadata.startTime).toFixed(0);
      const serverTiming = response.headers['server-timing'] || '';
      const cleanUrl = response.config.url?.replace(API_BASE_URL, '') || '';
      if (Number(elapsed) > 200) {
        console.debug(`[API] GET ${cleanUrl} took ${elapsed}ms ${serverTiming ? `(${serverTiming})` : ''}`);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        if (data.success) {
          localStorage.setItem('accessToken', data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// High-performance deduplicated GET wrapper for idempotent requests
const originalGet = api.get.bind(api);
api.get = function (url, config = {}) {
  // If request has special responseType or bypass, call directly
  if (config.responseType || config.skipCache) {
    return originalGet(url, config);
  }

  const queryKey = url + (config.params ? JSON.stringify(config.params) : '');

  // 1. Check TTL cache for static lookup endpoints
  if (isCacheable(url) && !config.params) {
    const cached = lookupCache.get(url);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return Promise.resolve(cached.response);
    }
  }

  // 2. In-flight request deduplication for concurrent identical requests
  if (inFlightRequests.has(queryKey)) {
    return inFlightRequests.get(queryKey);
  }

  const promise = originalGet(url, config)
    .then((response) => {
      if (isCacheable(url) && !config.params && response?.data?.success) {
        lookupCache.set(url, { timestamp: Date.now(), response });
      }
      return response;
    })
    .finally(() => {
      inFlightRequests.delete(queryKey);
    });

  inFlightRequests.set(queryKey, promise);
  return promise;
};

export default api;
