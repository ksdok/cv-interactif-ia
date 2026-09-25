'use client'

import { useState, useRef, useEffect } from 'react'
import LinkifiedText from './LinkifiedText'
import { ChatStreamDecoder, resolveApiErrorMessage } from '@/lib/chatStreamProtocol'
import type { Dictionary } from '@/lib/i18n/types'
import type { Lang } from '@/lib/i18n/config'

interface Message {
  role: 'user' | 'assistant'
  content: string
  /** PERF-002 : true tant que la réponse assistant est en cours de streaming. */
  streaming?: boolean
}

interface ChatPreviewProps {
  isExpanded?: boolean
  onExpand?: () => void
  csrfToken: string
  dictionary: Dictionary
  // GEO-08g : la locale de la page est transmise à /api/chat (champ `lang`) —
  // /api/chat est hors [lang], `params.lang` y est inaccessible (review M7).
  locale: Lang
}

export default function ChatPreview({
  isExpanded = false,
  onExpand,
  csrfToken,
  dictionary,
  locale
}: ChatPreviewProps) {
  // Review F5 (GEO-08b) : dérivé de greeting1/greeting2 (pas de clé dupliquée —
  // une divergence ferait se contredire la bulle d'accueil et le 1er message).
  const initialMessage = `${dictionary.chat.greeting1}\n\n${dictionary.chat.greeting2}`
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: initialMessage }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expanded, setExpanded] = useState(isExpanded)
  const [isTokenReady, setIsTokenReady] = useState(false)

  const buildApiMessages = (history: Message[], newUserContent: string) => {
    const firstUserIdx = history.findIndex((m) => m.role === 'user')
    const conversationHistory = firstUserIdx >= 0 ? history.slice(firstUserIdx) : []
    return [...conversationHistory, { role: 'user', content: newUserContent }].map((m) => ({
      role: m.role,
      content: m.content,
    }))
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // PERF-002 (review M7) : contrôleur de la requête en vol — abort au démontage
  // et à chaque nouvel envoi.
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setIsTokenReady(!!csrfToken)
  }, [csrfToken])

  useEffect(() => () => {
    abortRef.current?.abort()
  }, [])

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    if (expanded) scrollToBottom()
  }, [messages, expanded])

  const handleExpand = () => {
    setExpanded(true)
    onExpand?.()
  }

  const doSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    handleExpand()
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])

    // After transition completes, blur input (dismiss iOS keyboard) and scroll to top of chat — mobile only
    setTimeout(() => {
      if (window.innerWidth < 768) {
        inputRef.current?.blur()
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 500)
    setIsLoading(true)
    // PERF-002 : la réponse assistant est un placeholder consommé par le flux NDJSON.
    setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true }])

    // Cycle de vie (review M7) : abort au démontage et à chaque nouvel envoi.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // PERF-002 (review M16) : les deltas sont coalescés et vidés une fois par
    // frame — la région aria-live ne doit pas être réannoncée à chaque token.
    let buffered = ''
    let frame = 0
    const flush = () => {
      frame = 0
      if (!buffered) return
      const text = buffered
      buffered = ''
      setMessages((prev) =>
        prev.map((m) => (m.streaming ? { ...m, content: m.content + text } : m))
      )
      scrollToBottom()
    }
    const scheduleFlush = () => {
      if (!frame) frame = requestAnimationFrame(flush)
    }
    const cancelFlush = () => {
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
    }
    const finalizeStream = () => {
      cancelFlush()
      flush()
      setMessages((prev) => prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)))
    }
    // Review M7 : si du texte a déjà été affiché, on le garde et on ajoute
    // l'erreur comme nouveau message ; sinon l'erreur s'affiche seule.
    const showError = (errorCode: string | undefined, fallback: string) => {
      cancelFlush()
      flush()
      const text = resolveApiErrorMessage(dictionary, errorCode) ?? fallback
      setMessages((prev) => {
        const streamed = prev.find((m) => m.streaming)
        if (streamed && streamed.content.length > 0) {
          return [
            ...prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
            { role: 'assistant' as const, content: text },
          ]
        }
        return prev.map((m) =>
          m.streaming ? { role: 'assistant' as const, content: text } : m
        )
      })
    }

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          messages: buildApiMessages(messages, userMessage),
          // GEO-08g : langue de réponse = locale de la page. Valeur invalide ou
          // absente côté serveur → fallback fr (pas un 400) — la whitelist est
          // appliquée par resolveResponseLanguage(), pas ici.
          lang: locale,
        }),
        signal: controller.signal,
      })

      const contentType = response.headers.get('content-type') ?? ''

      // Échecs pré-stream : contrat JSON inchangé (429/403/400/500).
      if (contentType.includes('application/json')) {
        const data = await response.json()

        if (data.error) {
          // Review M4 : l'API renvoie un errorCode agnostique de la langue ; le
          // client mappe vers le message localisé. Exception F3 (review GEO-08b) :
          // pour VALIDATION, le message serveur est actionnable (longueur,
          // structure) — le générique du dictionnaire effacerait le détail.
          const mapped = resolveApiErrorMessage(dictionary, data.errorCode)
          throw new Error(
            data.errorCode === 'VALIDATION' ? data.error : (mapped ?? data.error)
          )
        }

        // Défensif : plus attendu depuis PERF-002, mais on garde la forme
        // non-streaming fonctionnelle si elle revenait.
        finalizeStream()
        return
      }

      if (!contentType.includes('application/x-ndjson') || !response.body) {
        throw new Error(dictionary.apiErrors.SERVER)
      }

      reader = response.body.getReader()
      const decoder = new TextDecoder()
      const protocol = new ChatStreamDecoder()
      let receivedDelta = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        let sawDone = false
        for (const event of protocol.push(decoder.decode(value, { stream: true }))) {
          if (event.type === 'delta') {
            receivedDelta = true
            buffered += event.text
            scheduleFlush()
          } else if (event.type === 'error') {
            showError(event.errorCode, dictionary.apiErrors.SERVER)
            return
          } else {
            sawDone = true
          }
        }

        if (sawDone) {
          finalizeStream()
          return
        }
      }

      // Flux terminé sans événement `done`.
      if (receivedDelta) {
        finalizeStream()
      } else {
        showError('SERVER', dictionary.apiErrors.SERVER)
      }
    } catch (error) {
      // Les abort (démontage / nouvel envoi) ne sont pas des erreurs visibles.
      if ((error as Error)?.name === 'AbortError') return
      console.error('Error:', error)
      const message =
        error instanceof Error && error.message ? error.message : dictionary.chat.errorMessage
      showError(undefined, message)
    } finally {
      cancelFlush()
      try {
        await reader?.cancel()
      } catch {
        // Lecteur déjà libéré.
      }
      if (abortRef.current === controller) abortRef.current = null
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      doSend()
    }
  }

  return (
    <section ref={sectionRef} className={`w-full px-8 transition-all duration-500 ${expanded ? 'mb-16 py-8' : 'mb-32'}`}>
      <div className={`max-w-3xl mx-auto transition-all duration-500 ${
        expanded
          ? 'bg-surface p-0'
          : 'bg-surface-container-low rounded-lg p-12 hover:shadow-sm'
      }`}>

        {/* Greeting — fades out when expanded */}
        <div className={`transition-all duration-500 overflow-hidden ${
          expanded ? 'max-h-0 opacity-0 mb-0' : 'max-h-96 opacity-100 mb-12'
        }`}>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-on-primary-container" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
              </svg>
            </div>
            <div className="space-y-4">
              <p className="text-on-surface text-lg leading-relaxed opacity-70">
                {dictionary.chat.greeting1}
              </p>
              <p className="text-on-surface text-lg leading-relaxed opacity-70">
                {dictionary.chat.greeting2}
              </p>
            </div>
          </div>
        </div>

        {/* Messages list — fades in when expanded */}
        <div className={`transition-all duration-500 overflow-hidden ${
          expanded ? 'max-h-[500px] opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0'
        }`}>
          <div ref={messagesContainerRef} className="max-h-[500px] overflow-y-auto space-y-6" aria-live="polite" aria-atomic="false">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-6 py-4 text-sm ${
                  message.role === 'user'
                    ? 'bg-primary text-on-primary-fixed'
                    : 'bg-surface-container-low text-on-surface'
                }`}>
                  {message.role === 'assistant' && message.streaming ? (
                    // PERF-002 (review M16) : texte brut pendant le streaming —
                    // `LinkifiedText` re-parse le texte entier à chaque rendu
                    // (O(n²) sur une réponse qui grandit) ; on ne bascule vers
                    // les liens qu'une fois le `done` reçu.
                    <div className="whitespace-pre-wrap">
                      {message.content}
                      <span className="inline-block w-[2px] h-4 bg-on-surface ml-[2px] align-middle animate-blink" />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">
                      <LinkifiedText text={message.content} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && !messages.some((m) => m.streaming && m.content.length > 0) && (
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
        </div>

        {/* Input — always visible */}
        <div className={`relative group chat-shadow-focus transition-all duration-300 ${expanded ? '' : 'mb-8'}`}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={dictionary.chat.placeholder}
            aria-label={dictionary.chat.placeholderAria}
            className="w-full h-20 pl-8 pr-24 bg-surface-container-lowest text-on-surface placeholder:text-[#5f5e5e] rounded-full border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 text-[max(20px,1.25rem)] transition-all duration-200 ease-in-out"
            disabled={isLoading}
            enterKeyHint="send"
          />
          <button
            type="button"
            onClick={doSend}
            disabled={!isTokenReady || isLoading || !input.trim()}
            aria-label={dictionary.chat.sendAria}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
            title={!isTokenReady ? dictionary.chat.loadingTitle : ''}
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
