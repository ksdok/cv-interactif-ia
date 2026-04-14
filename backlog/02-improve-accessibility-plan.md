# Plan: Improve Accessibility (A11y)

## Goal
Ensure the interactive resume is accessible to users relying on screen readers and keyboard navigation.

## Steps
1. **Add `aria-label` to Icon Buttons**:
   - Locate all `<button>` elements that only contain `<svg>` icons (e.g., the send button in `ChatPreview.tsx`, close buttons in `JobMatcher.tsx`).
   - Add descriptive `aria-label` attributes to these buttons (e.g., `aria-label="Send message"`).

2. **Keyboard Navigation Check**:
   - Ensure all interactive elements (`button`, `input`, `a`) have a visible focus state.
   - Standardize focus ring classes (e.g., `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`).

3. **Contrast Ratio Auditing**:
   - Review the `--color-secondary-fixed-dim` against its background in `globals.css` and everywhere it is used in inputs.
   - Adjust the hex value if contrast falls below WCAG AA requirements (4.5:1 for normal text).

4. **Testing**:
   - Use automated tools like Lighthouse to verify accessibility score improvements.
