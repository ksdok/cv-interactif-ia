# Job Matcher Feature - Complete Documentation

## Overview

Job Matcher is an AI-powered feature that analyzes how well your CV aligns with specific job descriptions. Users can paste any job description and receive instant feedback with match percentages and detailed analysis across three dimensions: overall fit, skills alignment, and relevant experience.

---

## 📖 User Guide

### What is Job Matcher?

Job Matcher analyzes your CV against job descriptions to provide:
- **Overall Match (%)** - Your overall fit for the position
- **Skills Match (%)** - Technical skill alignment
- **Experience Match (%)** - Relevance of your background
- **Analysis** - 2-3 sentence summary of your fit
- **Strengths** - What you do well for this job
- **Improvements** - Areas to develop or emphasize

### Where to Find It

The "Match Job Description" button appears in the **About section** (left sidebar) with:
- Black background with white text
- Hover state transitions to slate-900 with scale effect
- Clear positioning above the email contact button

### How to Use Job Matcher

#### Step 1: Open the Modal
Click the "Match Job Description" button in the About section. A modal window opens with a form.

#### Step 2: Paste the Job Description
Paste the complete job description text into the text area:
- **Minimum:** 100 characters
- **Maximum:** 10,000 characters
- **Include:** Full job posting (title, requirements, responsibilities, benefits)

#### Step 3: Click "Analyze Match"
Click the analyze button. The system processes your CV against the job posting in 2-3 seconds.

#### Step 4: Review Your Results

**Match Percentages:**
- Overall Match: Combined score of skills + experience
- Skills Match: Required skills alignment
- Experience Match: Background relevance

**Understanding the Scores:**
- **80-100%** - Excellent fit. Highly aligned with strong skills match.
- **60-79%** - Good fit. Meet main requirements, may need to emphasize aspects.
- **40-59%** - Moderate fit. Foundational qualifications with some gaps.
- **0-39%** - Limited fit. Major gaps between profile and position.

**Actionable Feedback:**
- **Strengths** - Highlight these in your cover letter and interviews
- **Improvements** - Focus areas for professional development

### Tips for Best Results

1. **Use complete job descriptions** - Paste the entire posting, not just the title
2. **Include all relevant sections** - Requirements, responsibilities, qualifications
3. **Analyze multiple positions** - Identify patterns across similar roles
4. **Follow improvement suggestions** - Use them to guide your development
5. **Update your CV regularly** - Re-analyze positions to track your progress

### Rate Limits & Constraints

- **Limit:** 200 analyses per day per IP address
- **Reset:** Midnight UTC daily
- **Max length:** 10,000 characters per job description
- **Results:** Not saved automatically (re-analyze to reference)

### Troubleshooting

| Problem | Solution |
|---------|----------|
| Button doesn't show | Reload page, check browser console |
| Modal won't open | Clear cache, try incognito mode |
| "Job description too short" | Paste complete posting with all sections |
| "Job description too long" | Remove extra whitespace/formatting, shorten to <10,000 chars |
| "Rate limit exceeded" | Limit resets at midnight UTC tomorrow |
| "No CV data found" | Refresh page and try again |
| Inaccurate results | Try with different job posting or check formatting |

---

## 👨‍💻 Developer Documentation

### Architecture & Files

#### Frontend Component: `components/JobMatcher.tsx`
- **Type:** Client component with modal UI
- **Props:** `{ isOpen: boolean, onClose: () => void }`
- **Features:**
  - Modal dialog for job description input
  - Form validation (100-10,000 character range)
  - Loading state with spinner
  - Results display with match percentages
  - Dark mode support
  - CSRF token security

**Key Functions:**
- `handleAnalyze()` - Validates input and calls API
- Extracts CSRF token from meta tag
- Handles errors with user-friendly messages

#### Backend API: `app/api/job-match/route.ts`
- **Method:** POST
- **Security:** Rate limiting (200/day), input validation
- **Flow:**
  1. Extract client IP for rate limiting
  2. Check rate limit (return 429 if exceeded)
  3. Validate job description length/format
  4. Retrieve CV context via RAG system
  5. Call Claude API with CV + job description
  6. Parse and validate response
  7. Return analysis results

**Endpoint Response Format:**
```json
{
  "overallMatch": 85,
  "skillsMatch": 88,
  "experienceMatch": 82,
  "analysis": "Strong match with excellent technical alignment...",
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Area 1", "Area 2"]
}
```

### Integration Points

#### Integrated into AboutSection
The JobMatcher component is imported and rendered in `components/AboutSection.tsx`:
```tsx
import JobMatcher from './JobMatcher'

// Inside the component:
<JobMatcher isOpen={isOpen} onClose={handleClose} />
```

#### Uses Existing Systems
- **RAG System** (`lib/rag.ts`) - Retrieves top 10 relevant CV sections
- **Rate Limiting** (`lib/rateLimit.ts`) - Enforces 200 requests/day limit
- **Claude API** - Uses existing Anthropic configuration
- **CSRF Protection** - Validates tokens on every request

### Security Features

1. **Input Validation**
   - Length validation (100-10,000 chars)
   - Type checking for request format
   - Sanitization of job description text

2. **Rate Limiting**
   - 200 analyses per day per IP
   - Tracked in database per user
   - Returns 429 status when exceeded

3. **CSRF Protection**
   - Token extraction from meta tag
   - Included in API request headers
   - Server-side validation

4. **Error Handling**
   - Invalid JSON responses caught
   - Missing API keys return 500
   - Invalid structures detected
   - SyntaxErrors return 400

### CSS Animations

**Button Animation** (`app/globals.css` lines 87-103):
```css
@keyframes buttonBreath {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.5);
  }
  50% {
    box-shadow: 0 0 0 15px rgba(250, 204, 21, 0);
  }
}

.button-highlight-pulse {
  animation: buttonBreath 2.5s ease-out infinite;
}

.button-highlight-pulse:hover,
.button-highlight-pulse:focus {
  animation: none;
}
```

### Performance Characteristics

- **RAG retrieval:** <500ms (top 10 results)
- **Claude API call:** <1500ms
- **Total response time:** ~2 seconds typical
- **Modal render:** Instant (client-side)
- **Network latency:** Varies by location

### Testing Locally

1. **Prerequisites**
   ```bash
   npm install
   npm run dev
   ```

2. **Test Steps**
   - Navigate to http://localhost:3000
   - Scroll to About section
   - Click "Match Job Description" button
   - Paste sample job description
   - Click "Analyze Match"
   - Review results

3. **Sample Job Description**
   ```
   Senior Full-Stack Developer

   Required:
   - 5+ years web development
   - Expert React/Next.js
   - TypeScript proficiency
   - Node.js and PostgreSQL
   - AWS or cloud deployment

   Nice to have:
   - Leadership experience
   - GraphQL knowledge
   - DevOps skills

   Responsibilities:
   - Build scalable applications
   - Mentor junior developers
   - Optimize performance
   ```

### API Costs

Per job match analysis:
- RAG embedding/search: ~$0.00002 (OpenAI)
- Claude API call: ~$0.0003
- **Total:** ~$0.0003 per analysis (~$0.30 per 1000 analyses)

**Monthly estimate (200 requests/day × 30 days):**
- Per user: ~$1.80
- Per 10 users: ~$18

### Future Enhancements

**Potential Improvements:**
1. Save match history to database
2. Export results as PDF
3. Compare multiple job descriptions
4. Generate interview prep questions
5. Create learning paths for skill gaps
6. Analytics dashboard for usage patterns
7. Redis caching for common job descriptions
8. Batch processing for multiple jobs

---

## 📋 API Endpoint Reference

### POST `/api/job-match`

**Request:**
```json
{
  "jobDescription": "Senior React Developer, 5+ years experience..."
}
```

**Success Response (200):**
```json
{
  "overallMatch": 85,
  "skillsMatch": 90,
  "experienceMatch": 80,
  "analysis": "Your React and Next.js expertise strongly align...",
  "strengths": [
    "Expert-level React skills",
    "Full-stack experience",
    "AI/ML background"
  ],
  "improvements": [
    "Emphasize leadership",
    "Highlight AWS certifications",
    "Add scale metrics"
  ]
}
```

**Rate Limited Response (429):**
```json
{
  "error": "Rate limit exceeded: 200 analyses per day maximum",
  "retryAfter": 86400,
  "resetTime": "2025-11-12T00:00:00.000Z"
}
```

**Response Headers:**
```
x-ratelimit-limit: 200
x-ratelimit-remaining: 150
x-ratelimit-reset: 2025-11-11T00:00:00.000Z
```

---

## 🔍 Deployment Notes

### Environment Variables Required
- `ANTHROPIC_API_KEY` - Claude API key
- `OPENAI_API_KEY` - For RAG embeddings
- `NEXT_PUBLIC_SUPABASE_URL` - Vector database
- `SUPABASE_SERVICE_ROLE_KEY` - Database access

### Vercel Deployment
Set all environment variables in Vercel project settings. The feature integrates with existing deployment without additional configuration.

### Database Requirements
- Supabase with pgvector extension
- CV vectors embedded and stored
- `searchDocuments()` function available in RAG system

---

**Last Updated:** November 2025
**Status:** Production Ready
**Build:** ✅ Passing
**Security:** 🛡️ Protected
