'use client'

import { useState, useEffect } from 'react'

interface TypingEffectProps {
  text: string // Le texte complet à afficher
  speed?: number // Vitesse de frappe en ms (défaut: 15ms par caractère)
  onComplete?: () => void // Callback appelé quand le typing est terminé
  onUpdate?: () => void // Callback appelé à chaque caractère ajouté (pour le scroll)
}

/**
 * Composant qui affiche du texte avec un effet de typing (machine à écrire)
 * Affiche les caractères un par un avec un curseur clignotant
 */
export default function TypingEffect({ text, speed = 15, onComplete, onUpdate }: TypingEffectProps) {
  const [displayedText, setDisplayedText] = useState('') // Texte affiché jusqu'à présent
  const [currentIndex, setCurrentIndex] = useState(0) // Index du prochain caractère à afficher
  const [isComplete, setIsComplete] = useState(false) // Flag indiquant si le typing est terminé

  // Effet pour ajouter un caractère à la fois
  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
        onUpdate?.() // Notifier le parent (pour scroller automatiquement)
      }, speed)

      return () => clearTimeout(timeout)
    } else if (!isComplete) {
      // Le typing est terminé
      setIsComplete(true)
      onComplete?.()
    }
  }, [currentIndex, text, speed, isComplete, onComplete, onUpdate])

  return (
    <span className="whitespace-pre-wrap">
      {displayedText}
      {/* Curseur clignotant visible uniquement pendant le typing */}
      {!isComplete && (
        <span className="inline-block w-[2px] h-4 bg-slate-900 dark:bg-slate-100 ml-[2px] animate-blink"></span>
      )}
    </span>
  )
}
