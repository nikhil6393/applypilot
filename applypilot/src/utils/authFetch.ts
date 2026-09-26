/**
 * Global authenticated fetch interceptor for ApplyPilot
 * Automatically attaches Authorization: Bearer <token> from localStorage to all /api/ requests.
 */

export function setupAuthFetchInterceptor(): void {
  if (typeof window === 'undefined' || !window.fetch) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input && typeof (input as any).url === 'string') {
      url = (input as any).url;
    }

    // Only attach bearer token to internal /api/ routes
    const isApiRequest = url.startsWith('/api/') || url.includes('/api/');
    if (isApiRequest) {
      try {
        const token = localStorage.getItem('applypilot_token');
        if (token) {
          const reqInit = init ? { ...init } : {};
          const headers = new Headers(reqInit.headers || (input instanceof Request ? input.headers : {}));

          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          reqInit.headers = headers;

          return originalFetch(input, reqInit);
        }
      } catch {
        // localStorage access or header error: fallback to original fetch
      }
    }

    return originalFetch(input, init);
  };
}
