'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import TypingEffect from './TypingEffect'
import LinkifiedText from './LinkifiedText'
import JobMatcher from './JobMatcher'
import { useLanguage } from '@/lib/LanguageContext'
import { getTranslation } from '@/lib/translations'

interface Message {
  role: 'user' | 'assistant'
  content: string
  isTyping?: boolean
}

interface ChatInterfacePerplexityProps {
  suggestedQuestion: string
  onQuestionSent: () => void
  csrfToken: string
}

export default function ChatInterfacePerplexity({
  suggestedQuestion,
  onQuestionSent,
  csrfToken
}: ChatInterfacePerplexityProps) {
  const { language } = useLanguage()
  const t = useCallback((key: string) => getTranslation(language, key), [language])

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isTokenReady, setIsTokenReady] = useState(false)

  // Refs for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const lastSuggestedRef = useRef('')

  // Track when CSRF token is ready for sending messages
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
    scrollToBottom()
  }, [messages])

  // Handle suggested questions
  useEffect(() => {
    if (suggestedQuestion && suggestedQuestion !== lastSuggestedRef.current) {
      lastSuggestedRef.current = suggestedQuestion
      setInput(suggestedQuestion)
      onQuestionSent()
    }
  }, [suggestedQuestion, onQuestionSent])

  // Send message handler
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setHasStarted(true)
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    // Scroll to top on mobile after sending
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          messages: [
            ...messages,
            { role: 'user', content: userMessage },
          ].map((m) => ({ role: m.role, content: m.content })),
        }),
      })

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
          content: t('chat.errorMessage'),
        },
      ])
    } finally {
      setIsLoading(false)
      lastSuggestedRef.current = ''
    }
  }

  // Handle Job Matcher modal and menu
  const [showJobMatcher, setShowJobMatcher] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  if (hasStarted && messages.length > 0) {
    // Chat view - Messages scrollable, input scrolls with them
    return (
      <div className="fixed inset-0 bg-black dark:bg-black w-full overflow-hidden flex flex-col pt-16 animate-in fade-in duration-1000">
        {/* Messages + Input container - scrollable together */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto w-full px-4 sm:px-6 lg:px-8 py-6"
        >
          <div className="mx-auto max-w-2xl space-y-6 pb-24 sm:pb-20">
            {/* Title and Description at Top */}
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-white mb-2 sm:mb-3">
                CV Interactif
              </h1>
              <p className="text-sm sm:text-base lg:text-base whitespace-pre-wrap mb-4 sm:mb-6 leading-relaxed text-slate-300">
                {t('about.description')}
              </p>
            </div>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[85%] rounded-lg px-4 py-3 text-sm sm:text-base ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 dark:bg-slate-800 text-slate-100'
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
                <div className="bg-slate-800 dark:bg-slate-700 rounded-lg px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-700 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 bg-black/80 backdrop-blur-md pb-8 sm:pb-4">
          <form onSubmit={sendMessage} className="mx-auto max-w-2xl">
            <div className="relative">
              {/* Input field with rounded style */}
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('chat.placeholder')}
                  className="w-full px-6 py-4 bg-slate-800 text-white placeholder-slate-400 rounded-full border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base pr-14"
                  disabled={isLoading}
                />

                {/* Send Button - Inside right side of input */}
                <button
                  type="submit"
                  disabled={!isTokenReady || isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-400 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title={!isTokenReady ? t('chat.loadingToken') : ''}
                >
                  {isLoading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Initial view - Centered input
  return (
    <div className="fixed inset-0 bg-black dark:bg-black flex flex-col justify-center items-center px-4 sm:px-6 overflow-hidden pt-16 transition-all duration-1000">
      {/* Logo/Title */}
      <div className="mb-6 sm:mb-8 text-center max-w-2xl px-2 sm:px-4 slide-up-fade-in flex-shrink-0">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-white mb-2 sm:mb-3">
          CV Interactif<br/>via un Chatbot IA
        </h1>
        <p className="text-sm sm:text-base lg:text-base whitespace-pre-wrap mb-4 sm:mb-6 leading-relaxed text-slate-300">
          {t('about.description')}
        </p>
      </div>

      {/* Centered Input Box - Rounded Minimalist Style */}
      <form onSubmit={sendMessage} className="w-full max-w-xl slide-up-fade-in delay-1 relative flex-shrink-0 px-4 sm:px-0">
        <div className="relative">
          {/* Input field with rounded style */}
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.placeholder')}
              className="w-full px-6 py-4 bg-slate-800 text-white placeholder-slate-400 rounded-full border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base pr-14"
              disabled={isLoading}
              autoFocus
            />

            {/* Send Button - Inside right side of input */}
            <button
              type="submit"
              disabled={!isTokenReady || isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-400 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={!isTokenReady ? t('chat.loadingToken') : ''}
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
