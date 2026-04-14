# Improvement Backlog - AI Interactive Resume

This document lists the improvement tasks identified following the architectural and qualitative analysis of the project.

## 🎨 UI / UX
- [ ] **Implement Native Dark Mode**
  - Configure Tailwind CSS for dark mode (via `@media (prefers-color-scheme: dark)` or `.dark` class).
  - Define and apply dark mode color palette CSS variables in `globals.css`.
  - Ensure a smooth transition between light and dark modes.

- [ ] **Improve Accessibility (A11y)**
  - Add `aria-label` attributes to icon buttons (e.g., Send and Close buttons in `ChatPreview.tsx` and `JobMatcher.tsx`).
  - Check and fix the contrast ratio, particularly between `--color-secondary-fixed-dim` and the input background color.

- [ ] **Enhance Visual Feedback on Mobile**
  - Implement a more obvious loading/skeleton state before the Typing Effect appears.
  - Ensure the smooth scroll behavior and virtual keyboard focus work correctly on iOS/Android.

## 🔒 Security
- [ ] **Set up Content Security Policy (CSP)**
  - Define a strict CSP in the middleware (`middleware.ts`) or configuration (`next.config.ts`) to restrict the sources of scripts and styles.

- [ ] **Add Standard Security Headers**
  - Configure `X-Frame-Options: DENY` (clickjacking prevention).
  - Configure `X-Content-Type-Options: nosniff`.
  - Configure `Referrer-Policy: strict-origin-when-cross-origin`.

- [ ] **Check Job Matcher API Limits**
  - Ensure that very long strings (despite the 5000 character limit) are safely truncated or handled without causing blockages (ReDoS mitigation).
  - Check the Supabase key fallback to prevent unintended silent access if the key is missing.

## ⚡ Performance
- [ ] **Apply Code Splitting (Dynamic Imports)**
  - Isolate the `JobMatcher` component and import it asynchronously (`next/dynamic`) to reduce the initial JavaScript bundle size, since it's not displayed by default.

- [ ] **Optimize Media Assets (Open Graph)**
  - Replace the static `opengraph-image.png` (431 KB) with a compressed WebP format, or generate the OpenGraph dynamically with `@vercel/og` (`next/og`).

- [ ] **Implement API Caching Strategy**
  - Cache (via Next.js cache function / Redis) the 'basic' or frequent requests to the AI model (e.g., "what is your experience") to reduce response time and API consumption.

## 🔍 SEO
- [ ] **Enrich Indexable Static Content**
  - Search engines cannot index the AI chatbot's dynamic responses.
  - Expand the static descriptive text on the homepage (e.g., in the Hero or Experience Grid) with relevant keywords (e.g., "Product Designer", "AI Integration", "Paris").
  - Consider adding a visually hidden or neatly integrated "About Me" section that provides a comprehensive text-based summary for web crawlers.
