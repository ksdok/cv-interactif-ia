# Plan: Implement API Caching Strategy

## Goal
Reduce API costs (LLM token usage) and provide instant responses for frequently asked questions.

## Steps
1. **Identify Cacheable Queries**:
   - Short, repetitive queries like "What is your role?", "Summarize your experience", "Contact info".

2. **Implement Server-side Caching**:
   - Use Next.js `unstable_cache` or a simple in-memory Map structure in `app/api/chat/route.ts` tied to the exact user input string (normalized).
   - Normalize the input (lowercase, trim spaces, strip punctuation).

3. **Hash and Store**:
   - Create a hash of the normalized query string.
   - If a matching hash exists in the cache, return the cached AI response immediately.
   - If not, call the LLM, then store the result.

4. **Testing**:
   - Ask the same question twice in a row. 
   - Measure the API response time to ensure the second call is significantly faster (a few ms) compared to the first (seconds).
