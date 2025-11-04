import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/rag'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const lastUserMessage = messages[messages.length - 1].content

    // Rechercher dans le RAG
    const relevantDocs = await searchDocuments(lastUserMessage, 3)

    // Construire le contexte à partir des documents trouvés
    let context = ''
    if (relevantDocs.length > 0) {
      context = '\n\nINFORMATIONS PERTINENTES DU CV:\n'
      relevantDocs.forEach((doc: any, index: number) => {
        context += `\n[${index + 1}] ${doc.content}\n`
      })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `Tu es un assistant IA personnel qui représente un candidat dans son CV interactif. 

Tu as accès à des informations extraites du CV du candidat via un système RAG (Retrieval Augmented Generation).
Tu veux le mettre en valeur.

INSTRUCTIONS:
- Utilise PRIORITAIREMENT les informations fournies dans le contexte RAG ci-dessous
- Si l'information n'est pas dans le contexte RAG, utilise tes connaissances générales sur le candidat
- Réponds de manière naturelle et conversationnelle
- Sois précis et factuel quand tu as les informations
- Si tu n'as pas l'information, dis-le honnêtement
- Ne réponds QU'aux questions concernant le candidat
- Réponds en français ou en anglais
- Fais des réponses concives
${context}`,
      messages: messages,
    })

    const textContent = response.content.find((block) => block.type === 'text')
    const text = textContent && 'text' in textContent ? textContent.text : ''

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error('Erreur API:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la communication avec Claude' },
      { status: 500 }
    )
  }
}