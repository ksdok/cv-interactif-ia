# Plan: Add Standard Security Headers

## Goal
Harden the application against common web attacks like clickjacking and MIME-type sniffing.

## Steps
1. **Configure Headers in Next.js**:
   - Open `next.config.ts`.
   - Add a `headers` export block to apply global rules securely to all routes `/(.*)`.

2. **Define the Headers**:
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy` (Optional, but good practice to restrict camera/mic/geolocation if unused).

3. **Deploy & Verify**:
   - Run `npm run dev` or build.
   - Use browser dev tools to inspect the HTTP response headers of the document.
