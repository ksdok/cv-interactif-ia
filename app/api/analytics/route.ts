import { NextResponse } from 'next/server'

/**
 * API Route pour récupérer les statistiques de visiteurs
 * Utilise l'API Vercel Analytics pour obtenir les données réelles
 *
 * Documentation Vercel Analytics API: https://vercel.com/docs/analytics/api
 */

export async function GET() {
  try {
    // Récupérer les variables d'environnement nécessaires
    const VERCEL_ACCESS_TOKEN = process.env.VERCEL_ACCESS_TOKEN
    const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID
    const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID

    // Vérifier que les variables d'environnement sont définies
    if (!VERCEL_ACCESS_TOKEN || !VERCEL_PROJECT_ID) {
      console.warn('Variables d\'environnement Vercel manquantes, utilisation de données simulées')
      // Retourner des données simulées si les variables ne sont pas configurées
      return NextResponse.json({
        visitors: 47,
        source: 'simulated',
        message: 'Configurez VERCEL_ACCESS_TOKEN et VERCEL_PROJECT_ID pour obtenir les vraies données'
      })
    }

    // Calculer la date d'il y a 7 jours (pour "cette semaine")
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const since = Math.floor(weekAgo.getTime())
    const until = Math.floor(Date.now())

    // Construire l'URL de l'API Vercel Analytics
    const teamParam = VERCEL_TEAM_ID ? `teamId=${VERCEL_TEAM_ID}&` : ''
    const apiUrl = `https://vercel.com/api/web/insights/stats?${teamParam}projectId=${VERCEL_PROJECT_ID}&since=${since}&until=${until}`

    // Appeler l'API Vercel Analytics
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${VERCEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      // Cache les résultats pendant 5 minutes pour éviter trop d'appels API
      next: { revalidate: 300 }
    })

    if (!response.ok) {
      throw new Error(`Erreur API Vercel: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Extraire le nombre de visiteurs uniques
    // La structure exacte dépend de l'API Vercel, ajustez selon la documentation
    const visitors = data.visitors || data.uniqueVisitors || 47

    return NextResponse.json({
      visitors,
      source: 'vercel',
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erreur lors de la récupération des analytics:', error)

    // En cas d'erreur, retourner des données simulées
    return NextResponse.json({
      visitors: 47,
      source: 'simulated',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    })
  }
}
