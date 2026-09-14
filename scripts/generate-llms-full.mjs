#!/usr/bin/env node
/**
 * scripts/generate-llms-full.mjs — GEO-06, critère 2.
 *
 * Génère public/llms-full.txt (CV intégral en Markdown pour les agents IA)
 * depuis data/cv.md — la source unique du CV consommée par le chatbot en mode
 * CAG. Exécuté automatiquement au build via le hook npm `prebuild` : le
 * contenu dérivé ne peut pas dériver de la source (pas de duplication
 * maintenue à la main).
 *
 * Le fichier généré est committé : il reste servi en dev (public/ statique)
 * et le build Vercel le régénère à chaque déploiement.
 *
 * Usage : node scripts/generate-llms-full.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const source = join(root, 'data', 'cv.md')
const target = join(root, 'public', 'llms-full.txt')

const cv = readFileSync(source, 'utf8')

const header = `<!-- Généré au build depuis data/cv.md par scripts/generate-llms-full.mjs — NE PAS ÉDITER ce fichier directement : modifier data/cv.md. (GEO-06, critère 2) -->
<!--
CV intégral de Kim-san DOK (source FR — la version EN est servie à https://kimsandok.com/en/cv).
Ce site propose aussi un chatbot IA (Nicky) répondant aux questions sur ce parcours, fondé sur ce même CV (CAG).
-->

`

mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, header + cv.trimEnd() + '\n', 'utf8')

console.log(`[llms-full] ${source} → ${target} (${cv.length} chars)`)