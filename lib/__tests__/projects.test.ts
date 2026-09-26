/**
 * PROJ-001 — tests de la source éditoriale `content/projects.ts`.
 *
 * L'invariant M3 (`featured ⟹ detailFr && detailEn`) est le garde-fou
 * anti-thin-content de la spec : la page détail n'existe que si le contenu est
 * complet dans les DEUX locales, sinon pas d'alternate hreflang vers une page
 * inexistante (erreur d'annotation Google). C'est une règle de DONNÉES — on la
 * verrouille ici plutôt qu'à la main.
 */
import { describe, it, expect } from 'vitest'
import {
  PROJECTS,
  detailProjects,
  hasDetail,
  projectBySlug,
  projectsLastModified,
  visibleProjects,
} from '@/content/projects'

describe('content/projects — invariant M3', () => {
  it('tout projet `featured` a un détail complet FR ET EN', () => {
    const offenders = PROJECTS.filter(
      (p) => p.featured && !(p.detailFr?.length && p.detailEn?.length),
    )
    expect(offenders.map((p) => p.slug)).toEqual([])
  })

  it('hasDetail exige les deux locales (un détail mono-langue ne suffit pas)', () => {
    for (const p of PROJECTS) {
      const both = Boolean(p.detailFr?.length && p.detailEn?.length)
      expect(hasDetail(p)).toBe(both)
    }
  })

  it('detailProjects ne contient que des projets hasDetail', () => {
    for (const p of detailProjects()) expect(hasDetail(p)).toBe(true)
  })
})

describe('content/projects — cohérence éditoriale', () => {
  it('les slugs sont uniques', () => {
    const slugs = PROJECTS.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('visibleProjects trie featured d’abord puis par `order`', () => {
    const visible = visibleProjects()
    for (let i = 1; i < visible.length; i++) {
      const prev = visible[i - 1]
      const cur = visible[i]
      if (prev.featured === cur.featured) {
        expect(prev.order).toBeLessThanOrEqual(cur.order)
      } else {
        expect(prev.featured).toBe(true)
      }
    }
  })

  it('visibleProjects exclut les projets `hidden`', () => {
    expect(visibleProjects().every((p) => !p.hidden)).toBe(true)
    expect(visibleProjects().length).toBe(PROJECTS.filter((p) => !p.hidden).length)
  })

  it('projectBySlug résout un slug connu et renvoie undefined sinon', () => {
    expect(projectBySlug('cv-interactif-ia')?.repo.name).toBe('cv-interactif-ia')
    expect(projectBySlug('inconnu')).toBeUndefined()
  })

  it('projectsLastModified renvoie une date valide, ≥ chaque updatedAt', () => {
    const last = projectsLastModified()
    expect(Number.isNaN(last.getTime())).toBe(false)
    for (const p of visibleProjects()) {
      expect(last.getTime()).toBeGreaterThanOrEqual(new Date(p.updatedAt).getTime())
    }
  })
})
