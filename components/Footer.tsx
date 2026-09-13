import Link from 'next/link'
import type { Dictionary } from '@/lib/i18n/types'

interface FooterProps {
  dictionary: Dictionary
}

export default function Footer({ dictionary }: FooterProps) {
  return (
    <footer className="w-full py-12 bg-transparent">
      <div className="flex flex-col md:flex-row justify-between items-center px-8 w-full max-w-7xl mx-auto gap-6 md:gap-0">
        <p className="text-[0.75rem] tracking-wider uppercase text-secondary">
          {dictionary.footer.copyright}
        </p>
        <div className="flex space-x-12">
          <Link
            href="/cv"
            className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
          >
            {dictionary.footer.cvLink}
          </Link>
          <a
            href="https://www.linkedin.com/in/kim-san-dok"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
          >
            {dictionary.footer.linkedinLink}
          </a>
          <a
            href="https://github.com/ksdok"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
          >
            {dictionary.footer.githubLink}
          </a>
          <a
            href="mailto:dokkimsan@gmail.com"
            className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
          >
            {dictionary.footer.emailLink}
          </a>
        </div>
      </div>
    </footer>
  )
}