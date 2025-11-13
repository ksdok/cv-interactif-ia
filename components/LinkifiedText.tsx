'use client'

import { parseUrlsFromText } from '@/lib/linkify'

interface LinkifiedTextProps {
  text: string
  className?: string
}

/**
 * Component that renders text with clickable URLs
 * Automatically detects and converts URLs to clickable links
 * URLs open in a new tab
 */
export default function LinkifiedText({ text, className = '' }: LinkifiedTextProps) {
  const segments = parseUrlsFromText(text)

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'url') {
          return (
            <a
              key={index}
              href={segment.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-blue-500 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 active:text-blue-800 dark:active:text-blue-100 transition-colors break-all"
            >
              {segment.content}
            </a>
          )
        }
        return <span key={index}>{segment.content}</span>
      })}
    </span>
  )
}
