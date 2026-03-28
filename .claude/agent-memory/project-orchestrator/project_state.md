---
name: project_state
description: Current project status, pending changes, architectural baseline, and known technical debt
type: project
---

As of 2026-03-27, the project is stable and feature-complete. Deployed at https://cv-interactif-ia.vercel.app/

**Why:** Personal interactive CV for Kim-san DOK. Recruiters interact with an AI assistant ("Nicky") via chat.
**How to apply:** Treat all changes as potentially impacting the professional impression the site makes — quality and UX matter more than velocity.

## Pending Uncommitted Changes (as of 2026-03-27)
- `lib/LanguageContext.tsx` — Hydration fix: language initialization moved to useEffect (starts 'fr', then reads localStorage + browser language). This is correct SSR hygiene and safe to commit.
- `lib/translations.ts` — Translation updates (content changes to UI strings).
- `SECURITY_AUDIT.md` — Security audit report (2025-11-20). Documents strong posture; 3 medium/low recommendations outstanding (CSP headers, false-positive validation relaxation, Supabase key fallback warning). Safe to commit as documentation.
- `rollback_content_cleanup.sql` — SQL rollback script for the November 2025 RAG document content cleanup (removed "Agent:" prefix lines, kept "Utilisateur:" responses). This is a utility/ops script, NOT application code. Should be stored but arguably belongs in a /scripts or /docs folder, not the project root.
- `.gitignore` — Added `.claude/settings.local.json`, `CLAUDE.md`, `.mcp.json`, `nul` to ignored files.
- `.claude/settings.local.json` — Local Claude Code configuration (correctly gitignored).

## Known Technical Debt / Open Recommendations
1. CSP headers not yet implemented (medium priority per security audit).
2. Job-match input validation regex may produce false positives on legitimate job descriptions (low priority).
3. Supabase service role key fallback to anon key could mask misconfiguration silently (low priority).
4. `rollback_content_cleanup.sql` sits in project root — should be moved to a `/scripts` folder for cleanliness.
5. Components `ChatSidebar.tsx`, `SideMenu.tsx`, `ChatInterfacePerplexity.tsx` exist but are not documented in CLAUDE.md — their role is unclear and may be experimental/unused.

## RAG Data Note
- RAG documents were cleaned in November 2025 (removed Agent conversational prompts, kept only user answers).
- A rollback script exists in case the cleaned content needs reverting.
- Top-10 document retrieval is the current setting (reduced from higher count for relevance).

## Architecture Baseline
- App Router (Next.js), no pages/ directory.
- CSRF: Double Submit Cookie via middleware.ts.
- Rate limiting: in-memory, IP-based, 200/day for job-match.
- Embeddings: OpenAI text-embedding-3-small.
- LLM: Claude Haiku 4.5 (Anthropic).
- Vector DB: Supabase with match_documents RPC.
