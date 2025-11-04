'use client'

const projects = [
  {
    title: 'Bot Telegram Automatisé',
    description: 'Bot intelligent avec n8n qui répond automatiquement aux messages',
    tech: ['n8n', 'Telegram API', 'Claude'],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'Système RAG Personnel',
    description: 'Base de connaissances intelligente avec recherche sémantique',
    tech: ['Python', 'OpenAI', 'Vector DB'],
    color: 'from-purple-500 to-pink-500',
  },
  {
    title: 'Dashboard Analytics',
    description: 'Tableau de bord temps réel avec visualisations interactives',
    tech: ['Next.js', 'React', 'TailwindCSS'],
    color: 'from-green-500 to-emerald-500',
  },
]

export default function ProjectGallery() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Projets</h2>

      <div className="space-y-4">
        {projects.map((project, index) => (
          <div
            key={index}
            className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className={`h-32 bg-gradient-to-br ${project.color} flex items-center justify-center`}>
              <span className="text-white text-4xl">🚀</span>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {project.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                {project.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {project.tech.map((tech, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}