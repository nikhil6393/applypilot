/**
 * Global authenticated fetch interceptor for ApplyPilot
 * Automatically attaches Authorization: Bearer <token> from localStorage to all /api/ requests.
 */
export function setupAuthFetchInterceptor() {
    if (typeof window === 'undefined' || !window.fetch)
        return;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
        let url = '';
        if (typeof input === 'string') {
            url = input;
        }
        else if (input instanceof URL) {
            url = input.toString();
        }
        else if (input && typeof input.url === 'string') {
            url = input.url;
        }
        // Only attach bearer token and timeout to internal /api/ routes
        const isApiRequest = url.startsWith('/api/') || url.includes('/api/');
        if (isApiRequest) {
            try {
                const token = localStorage.getItem('applypilot_token');
                const reqInit = init ? { ...init } : {};
                const headers = new Headers(reqInit.headers || (input instanceof Request ? input.headers : {}));
                if (token && !headers.has('Authorization')) {
                    headers.set('Authorization', `Bearer ${token}`);
                }
                reqInit.headers = headers;

                // Provide a default 30s timeout signal if caller didn't provide one
                if (!reqInit.signal && typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
                    reqInit.signal = AbortSignal.timeout(30000);
                }

                const response = await originalFetch(input, reqInit);

                // Auto-detect expired/revoked sessions on protected endpoints
                if (response.status === 401 && token) {
                    try {
                        localStorage.removeItem('applypilot_token');
                        localStorage.removeItem('applypilot_user');
                        window.dispatchEvent(new CustomEvent('applypilot:auth-expired', {
                            detail: { url, status: 401 }
                        }));
                    } catch {}
                }

                return response;
            }
            catch (fetchErr) {
                // If network is down or request timed out
                if (fetchErr.name === 'TimeoutError') {
                    console.warn(`[Network] Request to ${url} timed out after 30s.`);
                }
                throw fetchErr;
            }
        }
        return originalFetch(input, init);
    };
}
