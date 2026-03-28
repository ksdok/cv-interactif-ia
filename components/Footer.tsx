export default function Footer() {
  return (
    <footer className="w-full py-12 bg-transparent">
      <div className="flex flex-col md:flex-row justify-between items-center px-8 w-full max-w-7xl mx-auto gap-6 md:gap-0">
        <p className="text-[0.75rem] tracking-wider uppercase text-secondary">
          © 2025 Kim-san DOK. Curated Minimalism.
        </p>
        <div className="flex space-x-12">
          <a
            href="https://www.linkedin.com/in/kim-san-dok"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/ksdok"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
          >
            GitHub
          </a>
          <a
            href="mailto:dokkimsan@gmail.com"
            className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
          >
            Email
          </a>
        </div>
      </div>
    </footer>
  )
}
