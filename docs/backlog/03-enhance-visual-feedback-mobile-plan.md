# Plan: Enhance Visual Feedback on Mobile

## Goal
Improve the user experience on mobile devices during chat interactions, specifically addressing network latency and keyboard behaviors.

## Steps
1. **Add Skeleton/Loading States**:
   - In `ChatPreview.tsx`, while waiting for the API response, instead of just a basic animated dots UI, implement a smooth, localized skeleton loader that resembles an incoming message bubble.

2. **Refine Mobile Input Handling**:
   - Ensure `inputRef.current?.blur()` reliably dismisses the keyboard on mobile Safari/Chrome.
   - Implement `scrollIntoView` correctly so that the chat remains completely visible and doesn't get hidden behind the virtual keyboard.

3. **Adjust Touch Targets**:
   - Verify that all tap targets (buttons, links) are at least 44x44 pixels to meet mobile accessibility standards.

4. **Testing**:
   - Test on a physical mobile device or a sophisticated emulator (iOS/Android Safari/Chrome) to verify keyboard pop-up behavior.
