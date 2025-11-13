'use client'

import { useState, useEffect } from 'react'
import LinkifiedText from './LinkifiedText'

interface TypingEffectProps {
  text: string // Full text to display
  speed?: number // Typing speed in ms (default: 15ms per character)
  onComplete?: () => void // Callback called when typing is complete
  onUpdate?: () => void // Callback called for each character added (for scrolling)
}

/**
 * Component that displays text with a typing effect (typewriter)
 * Displays characters one by one with a blinking cursor
 */
export default function TypingEffect({ text, speed = 15, onComplete, onUpdate }: TypingEffectProps) {
  const [displayedText, setDisplayedText] = useState('') // Text displayed so far
  const [currentIndex, setCurrentIndex] = useState(0) // Index of next character to display
  const [isComplete, setIsComplete] = useState(false) // Flag indicating if typing is complete

  // Effect to add one character at a time
  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
        onUpdate?.() // Notify parent (for auto-scrolling)
      }, speed)

      return () => clearTimeout(timeout)
    } else if (!isComplete) {
      // Typing is complete
      setIsComplete(true)
      onComplete?.()
    }
  }, [currentIndex, text, speed, isComplete, onComplete, onUpdate])

  return (
    <span className="whitespace-pre-wrap block">
      <LinkifiedText text={displayedText} className="whitespace-pre-wrap" />
      {/* Blinking cursor visible only during typing */}
      {!isComplete && (
        <span className="inline-block w-[2px] h-4 bg-slate-900 dark:bg-slate-100 ml-[2px] animate-blink"></span>
      )}
    </span>
  )
}
