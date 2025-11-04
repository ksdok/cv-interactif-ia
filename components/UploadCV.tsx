'use client'

import { useState } from 'react'

export default function UploadCV() {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`✅ ${data.message}`)
      } else {
        setMessage(`❌ Erreur: ${data.error}`)
      }
    } catch (error) {
      setMessage('❌ Erreur lors de l\'upload')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4">
        📄 Importer mon CV
      </h2>

      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Uploadez votre CV en PDF pour alimenter l'assistant IA avec vos
          informations.
        </p>

        <label className="block">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
            <div className="text-4xl mb-2">📤</div>
            <p className="text-sm font-medium text-slate-700">
              {uploading ? 'Upload en cours...' : 'Cliquez pour choisir un PDF'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Format accepté: PDF uniquement
            </p>
          </div>
        </label>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.includes('✅')
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}