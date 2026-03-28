'use client'

import { useState, useRef, useEffect } from 'react'
import TypingEffect from './TypingEffect'
import LinkifiedText from './LinkifiedText'

interface Message {
  role: 'user' | 'assistant'
  content: string
  isTyping?: boolean
}

interface ChatPreviewProps {
  isExpanded?: boolean
  onExpand?: () => void
  csrfToken: string
}

const INITIAL_AI_MESSAGE = "Hello, I'm Nicky, Kim-san's digital twin. I'm here to help you navigate through years of experience in product design and creative engineering.\n\nWhat would you like to know first?"


export default function ChatPreview({
  isExpanded = false,
  onExpand,
  csrfToken
}: ChatPreviewProps) {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: INITIAL_AI_MESSAGE }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expanded, setExpanded] = useState(isExpanded)
  const [isTokenReady, setIsTokenReady] = useState(false)

  // Build the messages array for the API, starting from the first user message.
  // The initial assistant greeting must not be sent to Anthropic (it requires user-first).
  const buildApiMessages = (history: Message[], newUserContent: string) => {
    const firstUserIdx = history.findIndex((m) => m.role === 'user')
    const conversationHistory = firstUserIdx >= 0 ? history.slice(firstUserIdx) : []
    return [...conversationHistory, { role: 'user', content: newUserContent }].map((m) => ({
      role: m.role,
      content: m.content,
    }))
  }

  // Refs for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Track when CSRF token is ready
  useEffect(() => {
    setIsTokenReady(!!csrfToken)
  }, [csrfToken])

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    if (expanded) scrollToBottom()
  }, [messages, expanded])

  // Handle expansion when user clicks
  const handleExpand = () => {
    setExpanded(true)
    onExpand?.()
  }

  // Core send logic — no event needed, safe to call from button onClick or onKeyDown
  const doSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    handleExpand()
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          messages: buildApiMessages(messages, userMessage),
        }),
      })

      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`Server error: ${response.status}`)
      }
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response, isTyping: true },
      ])
    } catch (error) {
      console.error('Error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Failed to get response. Please try again.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      doSend()
    }
  }

  if (expanded) {
    // Expanded full chat view
    return (
      <section className="w-full bg-surface py-16 px-8">
        <div className="max-w-3xl mx-auto">
          {/* Chat messages container */}
          <div
            ref={messagesContainerRef}
            className="max-h-[500px] overflow-y-auto mb-8 space-y-6"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-6 py-4 text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-on-primary-fixed'
                      : 'bg-surface-container-low text-on-surface'
                  }`}
                >
                  {message.role === 'assistant' && message.isTyping ? (
                    <TypingEffect
                      text={message.content}
                      onUpdate={scrollToBottom}
                      onComplete={() => {
                        setMessages(prev => prev.map((msg, idx) =>
                          idx === index ? { ...msg, isTyping: false } : msg
                        ))
                      }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">
                      <LinkifiedText text={message.content} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-surface-container-low rounded-2xl px-6 py-4">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-secondary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-secondary rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-secondary rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <div className="relative group chat-shadow-focus transition-all duration-300">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Nicky about Kim-san's experience..."
              className="w-full h-20 pl-8 pr-24 bg-surface-container-lowest text-on-surface placeholder-secondary-fixed-dim rounded-full border-none focus:outline-none focus:ring-0 text-xl transition-all duration-200 ease-in-out"
              disabled={isLoading}
              enterKeyHint="send"
            />

            {/* Send button */}
            <button
              type="button"
              onClick={doSend}
              disabled={!isTokenReady || isLoading || !input.trim()}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isTokenReady ? 'Loading...' : ''}
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </section>
    )
  }

  // Collapsed view - initial state (from mockup)
  return (
    <section className="w-full px-8 mb-32">
      <div className="max-w-3xl mx-auto bg-surface-container-low rounded-lg p-12 transition-all duration-500 hover:shadow-sm">
        {/* AI response section with avatar */}
        <div className="mb-12 space-y-6">
          <div className="flex items-start gap-4">
            {/* Avatar icon */}
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-on-primary-container" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
              </svg>
            </div>
            {/* AI message */}
            <div className="space-y-4">
              <p className="text-on-surface text-lg leading-relaxed opacity-70">
                Hello, I&apos;m Nicky, Kim-san&apos;s digital twin. I&apos;m here to help you navigate through years of experience in product design and creative engineering.
              </p>
              <p className="text-on-surface text-lg leading-relaxed opacity-70">
                What would you like to know first?
              </p>
            </div>
          </div>
        </div>

        {/* Input field */}
        <div className="relative group chat-shadow-focus transition-all duration-300 mb-8">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Nicky about Kim-san's experience..."
            className="w-full h-20 pl-8 pr-24 bg-surface-container-lowest text-on-surface placeholder-secondary-fixed-dim rounded-full border-none focus:outline-none focus:ring-0 text-xl transition-all duration-200 ease-in-out"
            disabled={isLoading}
            enterKeyHint="send"
          />

          {/* Send button */}
          <button
            type="button"
            onClick={doSend}
            disabled={!isTokenReady || isLoading || !input.trim()}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isTokenReady ? 'Loading...' : ''}
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
          </button>
        </div>

      </div>
    </section>
  )
}
