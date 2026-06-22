/**
 * CV Context Loader (server-only)
 *
 * Reads data/cv.md once at module load time and caches it in memory.
 * Subsequent calls to getCVContext() return the cached string without
 * hitting the filesystem.
 *
 * This module is marked 'server-only' to prevent accidental client-side imports.
 */

import 'server-only'
import { readFileSync } from 'fs'
import { join } from 'path'

let cachedCV: string | null = null

/**
 * Load and return the CV content from data/cv.md.
 * The file is read once on first call, then cached in memory for all
 * subsequent requests in the same server process.
 *
 * @returns The CV content as a normalized string
 * @throws Error if the file is missing, empty, or unreadable
 */
export function getCVContext(): string {
  if (cachedCV !== null) {
    return cachedCV
  }

  const cvPath = join(process.cwd(), 'data', 'cv.md')

  try {
    const content = readFileSync(cvPath, 'utf-8').trim()

    if (!content) {
      throw new Error('CV file is empty')
    }

    cachedCV = content
    return cachedCV
  } catch (error) {
    if (error instanceof Error && error.message === 'CV file is empty') {
      throw error
    }
    throw new Error(`Failed to load CV file at ${cvPath}: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}