'use client'

import type { Dictionary } from '@/lib/i18n/types'

interface HeaderProps {
  dictionary: Dictionary
}

export default function Header({ dictionary }: HeaderProps) {
  return (
    <nav className="sticky top-0 w-full z-50 bg-surface/80 backdrop-blur-xl">
      <div className="flex justify-between items-center w-full px-8 py-6 max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex flex-col">
          <span className="text-2xl font-semibold tracking-[-0.02em] text-on-surface">{dictionary.header.name}</span>
          <span className="text-[10px] uppercase tracking-widest text-secondary mt-1">{dictionary.header.tagline}</span>
        </div>
      </div>
    </nav>
  )
}