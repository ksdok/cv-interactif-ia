#!/usr/bin/env node
/**
 * scripts/measure-viewports.mjs — mesure responsive reproductible (PROJ-001, N7).
 *
 * Port du script CDP utilisé pour la revue UX-003 (Chrome headless +
 * `Emulation.setDeviceMetricsOverride`), rendu exécutable dans le dépôt pour
 * que la vérification responsive (grille Projets 1 colonne en mobile, aucune
 * barre de défilement horizontale) ne dépende plus d'un script ad hoc.
 *
 * Principe :
 * - lance Chrome headless avec --remote-debugging-port ;
 * - pour chaque largeur demandée, force le viewport via CDP ;
 * - GARDE-FOU : vérifie que `window.innerWidth === width` (sinon la mesure est
 *   non fiable — device pixel ratio / meta viewport) ;
 * - mesure `nav.getBoundingClientRect().height` ;
 * - ASSERTION : `document.documentElement.scrollWidth === innerWidth`
 *   (aucun débordement horizontal).
 *
 * Usage :
 *   node scripts/measure-viewports.mjs <url> [width …]
 *   node scripts/measure-viewports.mjs http://localhost:3000/fr/projets 320 375 768 1280
 *
 * Chrome : détecté automatiquement (macOS/Linux/Windows) ou via CHROME_PATH.
 * Exit 0 = toutes les largeurs passent ; Exit 1 = débordement ou garde-fou KO.
 * Nécessite un serveur lancé (npm run build && npm run start).
 */

import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL_ARG = process.argv[2]
if (!URL_ARG) {
  console.error('Usage: node scripts/measure-viewports.mjs <url> [width …]')
  process.exit(2)
}
const WIDTHS = (process.argv.slice(3).map(Number).filter((n) => n > 0).length
  ? process.argv.slice(3).map(Number).filter((n) => n > 0)
  : [320, 375, 768, 1280])

const PORT = Number(process.env.CDP_PORT || 9222)

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ]
  return candidates.find((c) => existsSync(c)) || null
}

const chrome = findChrome()
if (!chrome) {
  console.error('Chrome/Chromium introuvable — définir CHROME_PATH.')
  process.exit(2)
}

const profile = await mkdtemp(join(tmpdir(), 'proj001-cdp-'))
const child = spawn(
  chrome,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForDevtools() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      if (res.ok) {
        const targets = await res.json()
        const page = targets.find((t) => t.type === 'page')
        if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
      }
    } catch {
      /* pas encore prêt */
    }
    await sleep(200)
  }
  throw new Error('Devtools CDP indisponible — Chrome a-t-il démarré ?')
}

function makeCdp(ws) {
  let nextId = 1
  const pending = new Map()
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    }
  })
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
}

let failures = 0
let exited = false
const cleanup = async () => {
  if (exited) return
  exited = true
  try { child.kill('SIGKILL') } catch { /* déjà mort */ }
  await rm(profile, { recursive: true, force: true }).catch(() => {})
}

try {
  const wsUrl = await waitForDevtools()
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve)
    ws.addEventListener('error', () => reject(new Error('WebSocket CDP en échec')))
  })
  const cdp = makeCdp(ws)

  await cdp('Page.enable')
  await cdp('Page.navigate', { url: URL_ARG })
  await sleep(1500) // laisse la navigation/le rendu se stabiliser

  for (const width of WIDTHS) {
    await cdp('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await sleep(300)
    const { result } = await cdp('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const nav = document.querySelector('nav');
        return {
          innerWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          navHeight: nav ? Math.round(nav.getBoundingClientRect().height) : null,
        };
      })()`,
    })
    const { innerWidth, scrollWidth, navHeight } = result.value
    const guardOk = innerWidth === width
    const overflowOk = scrollWidth === innerWidth
    if (!guardOk || !overflowOk) failures++
    const status = guardOk && overflowOk ? 'OK ' : 'ÉCHEC'
    console.log(
      `${status} ${String(width).padStart(4)}px — innerWidth=${innerWidth} ` +
        `scrollWidth=${scrollWidth} navHeight=${navHeight}px` +
        (guardOk ? '' : ' [garde-fou innerWidth KO]') +
        (overflowOk ? '' : ' [débordement horizontal]'),
    )
  }

  ws.close()
  await cleanup()
  if (failures > 0) {
    console.error(`\n${failures} largeur(s) en échec — corriger le responsive.`)
    process.exit(1)
  }
  console.log(`\nOK — aucune barre horizontale sur ${WIDTHS.length} viewport(s).`)
} catch (error) {
  await cleanup()
  console.error(`Erreur : ${error instanceof Error ? error.message : error}`)
  process.exit(2)
}
