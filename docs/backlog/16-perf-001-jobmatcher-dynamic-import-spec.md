# PERF-001 — JobMatcher Dynamic Import Spec

## Goal
Reduce initial client bundle cost by loading the `JobMatcher` modal only when it is actually needed.

## Why this ticket exists
Current state in the repo:
- `app/page.tsx` imports `JobMatcher` statically
- the modal is hidden by default and only opened after user interaction
- this makes `JobMatcher` a strong candidate for lazy loading

## Scope
In scope:
- convert the `JobMatcher` import in `app/page.tsx` to a dynamic import
- preserve the current modal behavior
- keep the rest of the page unchanged

Out of scope:
- redesigning the modal
- splitting multiple components at once
- bundle analysis tooling unless needed for verification

## Files to inspect first
- `app/page.tsx`
- `components/JobMatcher.tsx`
- `components/ExperienceGrid.tsx`

## Required changes

### 1. Replace the static import
Current state in `app/page.tsx`:
- `import JobMatcher from '@/components/JobMatcher'`

Replace with `next/dynamic` and load the modal lazily.
Preferred pattern:
- import `dynamic` from `next/dynamic`
- define `const JobMatcher = dynamic(() => import('@/components/JobMatcher'), { ssr: false })`

### 2. Keep behavior stable
The modal must still:
- open when `ExperienceGrid` triggers `onOpenJobMatcher`
- close with the existing `onClose` flow
- receive the same props interface

### 3. Optional loading fallback
A minimal loading placeholder is acceptable but not required.
If added, keep it visually unobtrusive.

## Acceptance criteria
- `JobMatcher` is no longer imported statically in `app/page.tsx`
- the modal still opens and closes correctly
- lint and build pass
- `next build` shows no regression or import error

## Verification
Run:
- `npm run lint`
- `npm run build`
- `npm run dev`

Then manually verify:
- load the homepage
- open the Job Matcher modal
- confirm it renders correctly on first open and subsequent opens

If feasible, compare the build output before and after to confirm the component is split into a separate client chunk.

## Handoff notes for the implementing LLM
- Keep this change tiny.
- Do not refactor surrounding state logic unless the dynamic import forces a small adjustment.
