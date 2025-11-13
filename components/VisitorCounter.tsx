'use client'

import { useEffect, useState, useRef } from 'react'

/**
 * Component displaying the number of recruiters who visited the site this week
 * Displays a static value for social proof
 */
export default function VisitorCounter() {
  const [visitors, setVisitors] = useState<number>(0)
  const [isAnimating, setIsAnimating] = useState(true) // Start animating immediately
  const animationStartedRef = useRef(false)

  useEffect(() => {
    // Only run animation once
    if (animationStartedRef.current) return
    animationStartedRef.current = true

    // Static number of visitors for social proof
    const totalVisitors = 47

    // Counter animation that increases progressively
    let current = 0
    const increment = Math.ceil(totalVisitors / 30)
    const timer = setInterval(() => {
      current += increment
      if (current >= totalVisitors) {
        current = totalVisitors
        clearInterval(timer)
        setIsAnimating(false)
      }
      setVisitors(current)
    }, 50)

    return () => {
      clearInterval(timer)
    }
  }, [])

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-lg shadow-sm border border-emerald-200 dark:border-emerald-800 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {/* Uptrend icon */}
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Popular profile
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className={`text-2xl font-bold text-emerald-600 dark:text-emerald-400 ${isAnimating ? 'animate-pulse' : ''}`}>
              {visitors}
            </span>
            <span className="ml-2">recruiters have viewed this profile this week</span>
          </p>
        </div>

        {/* "Trending" badge */}
        <div className="flex-shrink-0">
          <div className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <span className="animate-pulse">🔥</span>
            <span>Trending</span>
          </div>
        </div>
      </div>

      {/* Visual progress bar */}
      <div className="mt-3 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${Math.min((visitors / 50) * 100, 100)}%` }}
        ></div>
      </div>
      
    </div>
  )
}
