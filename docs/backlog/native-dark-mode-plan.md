# Plan: Implement Native Dark Mode

## Goal
Add robust native dark mode support to the application to improve the user's visual experience in low-light environments.

## Steps
1. **Update Tailwind Configuration**:
   - Verify `tailwind.config.ts` (or `@theme` in Tailwind CSS 4) is configured to handle the `dark` variant or media queries.
   - We will use the `class` strategy for manual toggling or rely on native `@media (prefers-color-scheme: dark)`.

2. **Define Dark Theme Variables**:
   - In `app/globals.css`, add a `@media (prefers-color-scheme: dark)` or `.dark` block.
   - Redefine all `--color-*` surface and text variables for the dark theme. Ensure the dark theme looks professional. Let's aim for deep slate/gray backgrounds rather than pure black.

3. **Verify and Adjust Components**:
   - Check components like `JobMatcher.tsx`, `ChatPreview.tsx`, and overall page layouts to ensure no hardcoded colors break the dark mode aesthetic.

4. **Testing**:
   - Toggle system theme settings to verify the UI updates correctly.
   - Verify text contrast ratios manually.
