# Plan: Set up Content Security Policy (CSP)

## Goal
Mitigate Cross-Site Scripting (XSS) attacks by implementing a strict Content Security Policy.

## Steps
1. **Define CSP Directives**:
   - `default-src 'self'`
   - `script-src 'self' 'unsafe-eval' 'unsafe-inline'` (Evaluate if Next.js requires these in dev vs prod. For production, aim for nonces if possible, or stricter `'self'`).
   - `style-src 'self' 'unsafe-inline'` (Often needed for Next.js/React).
   - `img-src 'self' data: https:`
   - `connect-src 'self' https://vitals.vercel-insights.com` (for analytics).

2. **Implementation Strategy**:
   - Add CSP headers in `next.config.ts` under the `headers()` function.
   - Alternatively, construct the CSP string in `middleware.ts` and set it on the response headers.

3. **Refinement**:
   - Test the application with the initial CSP. Check browser console for violations.
   - Adjust policies specifically for `@vercel/analytics` and `@vercel/speed-insights` as needed.

4. **Testing**:
   - Verify via `curl -I` or the browser network tab that `Content-Security-Policy` is correctly attached to responses.
