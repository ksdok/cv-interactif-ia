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
}

export default function ChatInterface({ suggestedQuestion, onQuestionSent }: ChatInterfaceProps) {
  // État des messages du chat
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Bonjour ! Je suis l'assistant IA qui représente Kim-San. Posez-moi des questions sur son parcours, ses compétences, ou comment ce site a été créé !",
    },
  ])
  const [input, setInput] = useState('') // Texte du champ de saisie
  const [isLoading, setIsLoading] = useState(false) // Indicateur de chargement pendant l'appel API

  // Refs pour gérer le scroll automatique
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Ref pour éviter les boucles infinies dans useEffect lors des questions suggérées
  const lastSuggestedRef = useRef('')

  // Fonction pour scroller automatiquement vers le bas du chat
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  // Scroller vers le bas à chaque nouveau message
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Gérer les questions suggérées cliquées depuis la section "À propos"
  useEffect(() => {
    if (suggestedQuestion && suggestedQuestion !== lastSuggestedRef.current) {
      lastSuggestedRef.current = suggestedQuestion
      setInput(suggestedQuestion) // Remplir le champ de saisie avec la question
      onQuestionSent() // Notifier le parent pour réinitialiser la question suggérée
    }
  }, [suggestedQuestion, onQuestionSent])

  // Fonction pour envoyer un message à l'API
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('') // Vider le champ de saisie
    lastSuggestedRef.current = '' // Réinitialiser la dernière question suggérée pour permettre de la réutiliser
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    // Sur mobile, scroller vers le haut du conteneur de messages après l'envoi
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0
    }

    try {
      // Appel à l'API Claude via le backend Next.js
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      // Ajouter la réponse de l'assistant avec l'effet de typing activé
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response, isTyping: true },
      ])
    } catch (error) {
      console.error('Erreur:', error)
      // Afficher un message d'erreur en cas de problème
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
      {/* Zone des messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            } ${
              // Animation slide-in : depuis la droite pour l'utilisateur, depuis la gauche pour l'assistant
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
              {/* Utiliser l'effet de typing uniquement pour les nouveaux messages de l'assistant */}
              {message.role === 'assistant' && message.isTyping ? (
                <TypingEffect
                  text={message.content}
                  onUpdate={scrollToBottom} // Scroller à chaque caractère ajouté
                  onComplete={() => {
                    // Désactiver l'effet de typing une fois terminé
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
        {/* Indicateur de chargement (3 points qui rebondissent) */}
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

      {/* Formulaire de saisie */}
      <form onSubmit={sendMessage} className="border-t border-slate-200 dark:border-slate-700 p-3 sm:p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question..."
            // text-base (16px) sur mobile pour éviter le zoom automatique iOS Safari
            className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            // flex-shrink-0 empêche le bouton de rétrécir sur mobile
            // whitespace-nowrap garde "Envoyer" sur une seule ligne
            className="px-4 sm:px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed cursor-pointer transition-colors whitespace-nowrap text-sm sm:text-base flex-shrink-0"
          >
            Envoyer
          </button>
        </div>
      </form>
    </div>
  )
}