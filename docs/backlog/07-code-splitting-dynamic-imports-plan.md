# Plan: Apply Code Splitting (Dynamic Imports)

## Goal
Decrease the initial load time and Main Thread blocking by splitting heavy, non-critical UI components.

## Steps
1. **Target Identification**:
   - The `JobMatcher` modal is hidden on initial load but currently included in the main bundle.

2. **Implement `next/dynamic`**:
   - In `app/page.tsx`, replace the standard import of `JobMatcher`:
     `import JobMatcher from '@/components/JobMatcher'` 
   - With a dynamic import:
     `const JobMatcher = dynamic(() => import('@/components/JobMatcher'), { ssr: false })`
     *(Setting `ssr: false` is appropriate since it's an interactive modal, meaning it will only render on the client side).*

3. **Add a Loading Fallback**:
   - Optional: Add a `loading: () => <p>Loading...</p>` state to the dynamic import to handle slow network fetching when the user triggers the modal.

4. **Testing**:
   - Build the application and analyze the `next build` output to confirm that `JobMatcher` is generated as a separate chunk.
