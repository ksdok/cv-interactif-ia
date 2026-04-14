# Plan: Check Job Matcher API Limits

## Goal
Prevent ReDoS (Regular Expression Denial of Service) and excessive cost overruns by fortifying the Job Matcher API endpoint.

## Steps
1. **Input Length Truncation**:
   - In `app/api/job-match/route.ts`, enforce a strict server-side substring operation before any Regex processing or LLM invocation (e.g., `const safeInput = payload.jobDescription.substring(0, 5000)`). The client already limits to 5000, but the server must not trust the client.

2. **Review Regex Filters**:
   - Check any custom regex patterns used to block keywords ("select", "update"). 
   - Refactor them to avoid catastrophic backtracking or replace them with simple string matching methods (`.includes`, `.indexOf`).

3. **Supabase Key Fallback Check**:
   - Review `lib/supabase.ts`.
   - Ensure that if `SUPABASE_SERVICE_ROLE_KEY` is missing in production, the app fails fast (throws an error) rather than silently using an anonymous key with insufficient privileges, which could cause opaque failures.

4. **Testing**:
   - Submit a payload directly via cURL with 100,000 characters to verify correct rejection/truncation.
