'use client'

export default function Header() {
  return (
    <nav className="sticky top-0 w-full z-50 bg-surface/80 backdrop-blur-xl">
      <div className="flex justify-between items-center w-full px-8 py-6 max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex flex-col">
          <span className="text-2xl font-semibold tracking-[-0.02em] text-on-surface">Kim-san DOK</span>
          <span className="text-[10px] uppercase tracking-widest text-secondary mt-1">designed by kim-san / coded by AI</span>
        </div>
      </div>
    </nav>
  )
}
