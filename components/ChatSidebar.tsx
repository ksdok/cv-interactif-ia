'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/LanguageContext'
import { getTranslation } from '@/lib/translations'

export interface ChatHistory {
  id: string
  question: string
  timestamp: number
  preview?: string
}

interface ChatSidebarProps {
  history: ChatHistory[]
  onSelectHistory: (id: string) => void
  onNewChat: () => void
  onDeleteHistory?: (id: string) => void
  isOpen?: boolean
  onClose?: () => void
}

export default function ChatSidebar({
  history,
  onSelectHistory,
  onNewChat,
  onDeleteHistory,
  isOpen = true,
  onClose,
}: ChatSidebarProps) {
  const { language } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  const formatTime = (timestamp: number): string => {
    const now = new Date()
    const date = new Date(timestamp)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return language === 'fr' ? 'À l\'instant' : 'Just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays === 1) return language === 'fr' ? 'Hier' : 'Yesterday'
    if (diffDays < 7) return `${diffDays}d`

    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const truncateText = (text: string, maxLength: number = 40): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <>
      {/* Mobile backdrop */}
      {!isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative w-64 h-screen bg-slate-900 dark:bg-slate-900 border-r border-slate-700 flex flex-col z-40 md:z-auto transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header - New Chat Button */}
        <div className="p-4 border-b border-slate-700">
          <button
            onClick={() => {
              onNewChat()
              onClose?.()
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-semibold">
              {language === 'fr' ? 'Nouvelle discussion' : 'New chat'}
            </span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {history.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              {language === 'fr'
                ? 'Aucune discussion précédente'
                : 'No previous chats'}
            </p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="group relative"
              >
                <button
                  onClick={() => {
                    onSelectHistory(item.id)
                    onClose?.()
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-slate-200 hover:text-white"
                >
                  <p className="text-sm truncate font-medium">
                    {truncateText(item.question)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatTime(item.timestamp)}
                  </p>
                </button>

                {/* Delete button on hover */}
                {onDeleteHistory && (
                  <button
                    onClick={() => onDeleteHistory(item.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={language === 'fr' ? 'Supprimer' : 'Delete'}
                  >
                    <svg className="w-4 h-4 text-slate-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 text-xs text-slate-400 space-y-2">
          <p>{language === 'fr' ? 'Cliquez sur une discussion pour continuer' : 'Click on a chat to continue'}</p>
        </div>
      </div>
    </>
  )
}
