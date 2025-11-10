'use client'

import { useState, useRef, useEffect } from 'react'
import TypingEffect from './TypingEffect'

interface Message {
  role: 'user' | 'assistant'
  content: string
  isTyping?: boolean
}

interface ChatInterfaceProps {
  suggestedQuestion: string
  onQuestionSent: () => void
  csrfToken: string  // CSRF token for protecting POST requests
}

export default function ChatInterface({ suggestedQuestion, onQuestionSent, csrfToken }: ChatInterfaceProps) {
  // Chat messages state
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Bonjour ! Je suis l'assistant IA qui représente Kim-San. Posez-moi des questions sur son parcours, ses compétences, ou comment ce site a été créé !",
    },
  ])
  const [input, setInput] = useState('') // Input field text
  const [isLoading, setIsLoading] = useState(false) // Loading indicator during API call

  // Refs to manage automatic scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Ref to avoid infinite loops in useEffect for suggested questions
  const lastSuggestedRef = useRef('')

  // Function to automatically scroll to the bottom of the chat
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  // Scroll to bottom on each new message
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle suggested questions clicked from the "About" section
  useEffect(() => {
    if (suggestedQuestion && suggestedQuestion !== lastSuggestedRef.current) {
      lastSuggestedRef.current = suggestedQuestion
      setInput(suggestedQuestion) // Fill the input field with the question
      onQuestionSent() // Notify parent to reset the suggested question
    }
  }, [suggestedQuestion, onQuestionSent])

  // Function to send a message to the API
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('') // Clear the input field
    lastSuggestedRef.current = '' // Reset the last suggested question to allow reuse
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    // On mobile, scroll the entire page up after sending
    // Use setTimeout to ensure the DOM is updated
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)

    try {
      // Call the Claude API through the Next.js backend
      // SECURITY: Include CSRF token in request header to prevent forged requests
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,  // CSRF token for protection
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

      // Add the assistant's response with typing effect enabled
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response, isTyping: true },
      ])
    } catch (error) {
      console.error('Error:', error)
      // Display an error message if something goes wrong
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-[500px] sm:h-[600px]">
      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            } ${
              // Slide-in animation: from right for user, from left for assistant
              message.role === 'user' ? 'message-slide-in-right' : 'message-slide-in-left'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-[15px] ${
                message.role === 'user'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
              }`}
            >
              {/* Use typing effect only for new assistant messages */}
              {message.role === 'assistant' && message.isTyping ? (
                <TypingEffect
                  text={message.content}
                  onUpdate={scrollToBottom} // Scroll on each character added
                  onComplete={() => {
                    // Disable typing effect once complete
                    setMessages(prev => prev.map((msg, idx) =>
                      idx === index ? { ...msg, isTyping: false } : msg
                    ))
                  }}
                />
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {/* Loading indicator (3 bouncing dots) */}
        {isLoading && (
          <div className="flex justify-start message-fade-in">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-4 py-2">
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

      {/* Input form */}
      <form onSubmit={sendMessage} className="border-t border-slate-200 dark:border-slate-700 p-3 sm:p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your question..."
            // text-base (16px) on mobile to avoid iOS Safari automatic zoom
            className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            // flex-shrink-0 prevents button from shrinking on mobile
            // whitespace-nowrap keeps "Send" on a single line
            className="px-4 sm:px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed cursor-pointer transition-colors whitespace-nowrap text-sm sm:text-base flex-shrink-0"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}