/*
  API route: POST /api/job-match

  Purpose:
  - Analyzes how well a user's CV matches a job description
  - Uses RAG to retrieve relevant CV snippets
  - Uses OpenAI to perform semantic matching and analysis

  High-level flow:
  1. Validate input (job description length, format)
  2. Check rate limit (200 analyses per day per IP)
  3. Retrieve user's CV from vector database (RAG search)
  4. Call OpenAI API to analyze match between CV and job
  5. Parse response and return structured results
*/

import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/rag'
import { getClientIP, checkRateLimit, getRateLimitHeaders, getRetryAfterSeconds } from '@/lib/rateLimit'
import { verifyCSRFToken, getCSRFTokenFromRequest, CSRF_COOKIE_CONFIG } from '@/lib/csrf'
import { cookies } from 'next/headers'
import { generateJobMatchResponse } from '@/lib/modelProviders'

// Input validation constraints
const VALIDATION = {
  MIN_LENGTH: 100,
  MAX_LENGTH: 5000,
} as const

interface MatchAnalysis {
  overallMatch: number
  skillsMatch: number
  experienceMatch: number
  analysis: string
  strengths: string[]
  improvements: string[]
}

/**
 * Validate job description content for common injection patterns
 * Returns true if content is valid, false if potentially malicious
 */
function validateJobDescriptionContent(text: string): boolean {
  // Check for HTML/XML tags
  if (/<[^>]+>/g.test(text)) {
    console.warn('Job description contains HTML/XML tags')
    return false
  }

  // Check for SQL injection patterns
  const sqlPatterns = /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bexec\b|\bscript\b)/gi
  if (sqlPatterns.test(text)) {
    console.warn('Job description contains potential SQL injection patterns')
    return false
  }

  // Check for command injection patterns
  if (/[;&|`$(){}[\]<>]/g.test(text)) {
    // These characters are common in job descriptions, so we only warn if there's a pattern
    // This is a simple heuristic - in production, use a proper parser
    const suspiciousPattern = /([;&|`$].*?){3,}/g
    if (suspiciousPattern.test(text)) {
      console.warn('Job description contains suspicious command patterns')
      return false
    }
  }

  return true
}

export async function POST(req: Request) {
  console.log('POST /api/job-match - handler start')
  try {
    // SECURITY: Check rate limit to prevent API abuse
    // Limits: 200 analyses per day per IP address
    console.log('Checking rate limit...')
    const clientIP = getClientIP(req)
    const rateLimit = checkRateLimit(clientIP)

    if (!rateLimit.allowed) {
      console.warn('Rate limit exceeded:', { clientIP, resetTime: rateLimit.resetTime })
      const retryAfterSeconds = getRetryAfterSeconds()
      return NextResponse.json(
        {
          error: 'Rate limit exceeded: 200 analyses per day maximum',
          retryAfter: retryAfterSeconds,
          resetTime: rateLimit.resetTime,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
            ...getRateLimitHeaders(rateLimit),
          },
        }
      )
    }
    console.log(`Rate limit OK: ${rateLimit.remaining} analyses remaining today`)

    // SECURITY: Verify CSRF token
    console.log('Verifying CSRF token...')
    const csrfTokenFromHeader = getCSRFTokenFromRequest(req)
    const cookieStore = await cookies()
    const csrfTokenFromCookie = cookieStore.get(CSRF_COOKIE_CONFIG.name)?.value

    if (!verifyCSRFToken(csrfTokenFromHeader, csrfTokenFromCookie)) {
      console.warn('CSRF token verification failed')
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      )
    }
    console.log('CSRF token verified successfully')

    // Parse request body
    console.log('Reading request body...')
    const { jobDescription } = await req.json()

    // Validate input
    if (!jobDescription || typeof jobDescription !== 'string') {
      console.warn('Invalid input: jobDescription is missing or not a string')
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      )
    }

    const trimmedJob = jobDescription.trim()
    if (trimmedJob.length < VALIDATION.MIN_LENGTH) {
      console.warn(`Job description too short: ${trimmedJob.length}/${VALIDATION.MIN_LENGTH}`)
      return NextResponse.json(
        { error: `Job description must be at least ${VALIDATION.MIN_LENGTH} characters` },
        { status: 400 }
      )
    }

    if (trimmedJob.length > VALIDATION.MAX_LENGTH) {
      console.warn(`Job description too long: ${trimmedJob.length}/${VALIDATION.MAX_LENGTH}`)
      return NextResponse.json(
        { error: `Job description must be less than ${VALIDATION.MAX_LENGTH} characters` },
        { status: 400 }
      )
    }

    // SECURITY: Validate content for injection patterns
    console.log('Validating job description content...')
    if (!validateJobDescriptionContent(trimmedJob)) {
      console.warn('Job description failed content validation')
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      )
    }

    // Retrieve user's CV from RAG database
    console.log('Retrieving CV from RAG database...')
    const cvSnippets = await searchDocuments('', 30) // Retrieve top 30 relevant CV snippets

    if (!cvSnippets || cvSnippets.length === 0) {
      console.warn('No CV data found in database')
      return NextResponse.json(
        { error: 'No CV data found. Please try again later.' },
        { status: 500 }
      )
    }

    // Build CV context from retrieved snippets
    console.log(`Retrieved ${cvSnippets.length} CV snippets`)
    let cvContext = 'USER CV INFORMATION:\n'
    interface CVDocument {
      content?: string
    }
    cvSnippets.forEach((doc: CVDocument, index: number) => {
      cvContext += `\n[${index + 1}] ${doc.content || ''}`
    })

    // Call OpenAI to analyze the match
    console.log('Calling OpenAI to analyze job match...')

    const analysisPrompt = `You are a professional career guidance expert. Analyze the match between the candidate's CV and the job description.

${cvContext}

---

JOB DESCRIPTION TO ANALYZE:
${trimmedJob}

---

Provide a detailed analysis in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "overallMatch": <number 0-100>,
  "skillsMatch": <number 0-100>,
  "experienceMatch": <number 0-100>,
  "analysis": "<summary of 2-3 sentences about the match>",
  "strengths": [
    "<strength: what the candidate does well for this role>",
    "<another strength>"
  ],
  "improvements": [
    "<area for development>",
    "<another area>"
  ]
}

Be honest and specific. Consider:
- Alignment of technical skills
- Match of experience level
- Industry experience
- Required certifications or tools
- Soft skills adequacy`

    // Call the configured AI provider (with automatic fallback).
    // To change provider or model: edit lib/modelConfig.ts → ACTIVE_PROVIDER_JOB_MATCH
    console.log('Calling generateJobMatchResponse...')
    const textContent = await generateJobMatchResponse(analysisPrompt)
    if (!textContent) {
      throw new Error('Empty response from AI provider')
    }

    console.log('Parsing OpenAI response...')
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from OpenAI response')
    }

    const analysisData = JSON.parse(jsonMatch[0]) as MatchAnalysis

    // Validate response structure
    if (
      typeof analysisData.overallMatch !== 'number' ||
      typeof analysisData.skillsMatch !== 'number' ||
      typeof analysisData.experienceMatch !== 'number' ||
      typeof analysisData.analysis !== 'string' ||
      !Array.isArray(analysisData.strengths) ||
      !Array.isArray(analysisData.improvements)
    ) {
      throw new Error('Invalid response structure from OpenAI')
    }

    // Clamp percentages to 0-100
    const result: MatchAnalysis = {
      overallMatch: Math.max(0, Math.min(100, analysisData.overallMatch)),
      skillsMatch: Math.max(0, Math.min(100, analysisData.skillsMatch)),
      experienceMatch: Math.max(0, Math.min(100, analysisData.experienceMatch)),
      analysis: analysisData.analysis,
      strengths: Array.isArray(analysisData.strengths) ? analysisData.strengths.slice(0, 5) : [],
      improvements: Array.isArray(analysisData.improvements) ? analysisData.improvements.slice(0, 5) : [],
    }

    console.log('Match analysis completed:', {
      overallMatch: result.overallMatch,
      skillsMatch: result.skillsMatch,
      experienceMatch: result.experienceMatch,
    })

    return NextResponse.json(result, {
      status: 200,
      headers: getRateLimitHeaders(rateLimit),
    })
  } catch (error) {
    console.error('API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // SECURITY: Return generic error messages to prevent information leakage
    // Log full error server-side for debugging
    console.error('Full error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Return generic error message to client
    return NextResponse.json(
      {
        error: 'Failed to analyze job match. Please try again.',
      },
      { status: 500 }
    )
  }
}
