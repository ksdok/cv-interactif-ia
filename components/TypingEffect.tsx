'use client'

import { useState, useEffect } from 'react'

interface TypingEffectProps {
  text: string
  speed?: number
  onComplete?: () => void
  onUpdate?: () => void
}

export default function TypingEffect({ text, speed = 15, onComplete, onUpdate }: TypingEffectProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
        onUpdate?.() // Notifier à chaque caractère ajouté
      }, speed)

      return () => clearTimeout(timeout)
    } else if (!isComplete) {
      setIsComplete(true)
      onComplete?.()
    }
  }, [currentIndex, text, speed, isComplete, onComplete, onUpdate])

  return (
    <span className="whitespace-pre-wrap">
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-[2px] h-4 bg-slate-900 dark:bg-slate-100 ml-[2px] animate-blink"></span>
      )}
    </span>
  )
}
