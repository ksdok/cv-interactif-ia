'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import ChatPreview from '@/components/ChatPreview'
import ExperienceGrid from '@/components/ExperienceGrid'
import Footer from '@/components/Footer'
import JobMatcher from '@/components/JobMatcher'

export default function Home() {
  const [csrfToken] = useState<string>(() => {
    if (typeof document === 'undefined') return ''
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  })
  const [jobMatcherOpen, setJobMatcherOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header />

      <div className="w-full pt-16">
        <Hero />
        <ChatPreview csrfToken={csrfToken} />
        <ExperienceGrid onOpenJobMatcher={() => setJobMatcherOpen(true)} />
        <Footer />
      </div>

      <JobMatcher isOpen={jobMatcherOpen} onClose={() => setJobMatcherOpen(false)} />
    </div>
  )
}
