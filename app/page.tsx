'use client'

import { useState, useEffect } from 'react'
import ChatInterfacePerplexity from '@/components/ChatInterfacePerplexity'
import Header from '@/components/Header'

/**
 * Main page with Perplexity-style UI
 * Minimalist, centered chat interface
 */
export default function Home() {
  // State to store CSRF token extracted from the page
  // SECURITY: The token is securely stored in httpOnly cookie on the server
  // We extract it here from the meta tag in the browser
  const [csrfToken, setCsrfToken] = useState<string>('')
  const [suggestedQuestion, setSuggestedQuestion] = useState<string>('')

  // Extract CSRF token from meta tag on client-side mount
  useEffect(() => {
    const tokenElement = document.querySelector('meta[name="csrf-token"]')
    const token = tokenElement?.getAttribute('content') || ''
    setCsrfToken(token)
  }, [])

  return (
    <div className="min-h-screen bg-black dark:bg-black flex flex-col">
      {/* Minimal Header */}
      <Header />

      {/* Main chat interface - Perplexity style */}
      <div className="flex-1">
        <ChatInterfacePerplexity
          suggestedQuestion={suggestedQuestion}
          onQuestionSent={() => setSuggestedQuestion('')}
          csrfToken={csrfToken}
        />
      </div>
    </div>
  )
}