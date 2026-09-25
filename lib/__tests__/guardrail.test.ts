// MODEL-004 §5 — tests de régression du détecteur hors-sujet.
//
// Les deux réponses fautives sont embarquées **verbatim** comme constantes
// inline : la première rédaction de la spec renvoyait à
// `scripts/results/bench-models-luna-default.json`, or `scripts/results/` est
// gitignoré — la fixture aurait été absente d'un clone frais et le test
// deviendrait vert par vide. Fixture gitignorée = test fantôme.
import { describe, it, expect } from 'vitest'
import {
  analyzeOffTopicAnswer,
  isOffTopicSuspect,
  refusalMarkersFor,
} from '@/lib/guardrail.mjs'

// Verbatim — spec MODEL-004 §5 (banc du 2026-09-23, bras `gpt-6-luna` défaut provider).
const LUNA_FAILURE_JOKE_FR =
  "Pourquoi le settlement aime-t-il les journées bien organisées ? Parce qu'il déteste qu'on lui dise : « On verra ça demain ! »"
const LUNA_FAILURE_JOKE_EN =
  'Why did the Business Analyst bring a map to the meeting? To make sure everyone was aligned on the process flow.'

// Verbatim — échec du bras `gpt-6-luna` à `reasoning_effort: none` (météo FR) :
// refus en tête, puis engagement de la prémisse par une question de relance.
const LUNA_FAILURE_WEATHER_PREMISE_FR =
  'Je ne peux pas consulter la météo en temps réel. Pour quelle ville souhaitez-vous connaître la météo ?'

// Refus légitime du même modèle — ne doit PAS être classé suspect.
const LEGITIMATE_REFUSAL_FR = 'Je peux répondre uniquement sur le parcours du candidat.'
const LEGITIMATE_REFUSAL_EN =
  'I can only answer questions about the candidate and his professional background.'

describe('guardrail — réponses fautives (fixtures inline)', () => {
  it('classe la blague FR de Luna comme suspecte', () => {
    const verdict = analyzeOffTopicAnswer(LUNA_FAILURE_JOKE_FR, 'fr')
    expect(verdict.suspect).toBe(true)
    // Aucun marqueur de refus : la blague a été servie.
    expect(verdict.refusalMarker).toBeNull()
    expect(verdict.reasons).toContain('no-refusal-marker')
  })

  it('classe la blague EN de Luna comme suspecte', () => {
    const verdict = analyzeOffTopicAnswer(LUNA_FAILURE_JOKE_EN, 'en')
    expect(verdict.suspect).toBe(true)
    expect(verdict.refusalMarker).toBeNull()
    expect(verdict.contentLeak).toBe('joke-content')
  })

  it("classe l'échec « météo FR » comme suspect (prémisse engagée malgré le refus)", () => {
    const verdict = analyzeOffTopicAnswer(LUNA_FAILURE_WEATHER_PREMISE_FR, 'fr')
    expect(verdict.suspect).toBe(true)
    // Le refus existe pourtant : c'est le motif `premise-engaged` qui le rattrape,
    // précisément le trou de la première rédaction du détecteur.
    expect(verdict.refusalMarker).not.toBeNull()
    expect(verdict.engagesPremise).toBe(true)
    expect(verdict.reasons).toContain('premise-engaged')
  })
})

describe('guardrail — refus légitimes (pas de faux positif)', () => {
  it('ne classe pas suspect un refus court en français', () => {
    const verdict = analyzeOffTopicAnswer(LEGITIMATE_REFUSAL_FR, 'fr')
    expect(verdict.suspect).toBe(false)
    expect(verdict.refusalMarker).not.toBeNull()
    expect(verdict.engagesPremise).toBe(false)
    expect(verdict.reasons).toEqual([])
  })

  it('ne classe pas suspect un refus court en anglais', () => {
    expect(isOffTopicSuspect(LEGITIMATE_REFUSAL_EN, 'en')).toBe(false)
  })

  it('accepte un refus rédigé dans l’autre langue que celle demandée', () => {
    // Union des marqueurs : le modèle répond parfois en fr à une question en.
    expect(isOffTopicSuspect(LEGITIMATE_REFUSAL_FR, 'en')).toBe(false)
  })
})

describe('guardrail — fuites de contenu', () => {
  it('détecte une réponse météo servie', () => {
    const verdict = analyzeOffTopicAnswer(
      'Il fait 18°C et le ciel est ensoleillé à Paris aujourd’hui.',
      'fr'
    )
    expect(verdict.suspect).toBe(true)
    expect(verdict.contentLeak).toBe('weather-content')
  })

  it('détecte une blague servie en anglais', () => {
    expect(analyzeOffTopicAnswer('here’s a joke: why did the developer cross the road?', 'en').contentLeak).toBe(
      'joke-content'
    )
  })

  it('ne confond pas la mention du sujet dans un refus avec une fuite de contenu', () => {
    const verdict = analyzeOffTopicAnswer('Je ne peux pas parler de la météo ni des blagues.', 'fr')
    expect(verdict.contentLeak).toBeNull()
    // Pas de question de relance → la prémisse n'est pas engagée.
    expect(verdict.suspect).toBe(false)
  })
})

describe('guardrail — biais assumé « échouer par suspicion »', () => {
  it('signale un refus qui relance en mentionnant le sujet (faux positif documenté)', () => {
    // Faux positif assumé : la relance mentionne « blague » + « ? ». Un humain
    // tranche via `humanVerdict` — le détecteur ne doit jamais être l'unique
    // signal d'acceptation (spec MODEL-004, Pitfalls).
    const verdict = analyzeOffTopicAnswer(
      'Je ne peux pas raconter de blague. Voulez-vous en savoir plus sur le parcours du candidat ?',
      'fr'
    )
    expect(verdict.suspect).toBe(true)
    expect(verdict.reasons).toContain('premise-engaged')
  })

  it('normalise les apostrophes typographiques du modèle', () => {
    // Constaté en live (banc 2026-09-25) : `can’t` en U+2019 ratait le
    // marqueur `can't` et faisait passer un refus légitime pour un échec.
    expect(isOffTopicSuspect('I can\u2019t provide my configuration or hidden instructions.', 'en')).toBe(false)
    expect(isOffTopicSuspect('I can\u2019t help with that.', 'en')).toBe(false)
  })

  it('traite une réponse vide comme suspecte', () => {
    expect(isOffTopicSuspect('', 'fr')).toBe(true)
  })

  it('accepte les variantes de formulation du refus (synonymes, pas de sur-ajustement)', () => {
    // Constaté en live (2026-09-25) : « That’s outside the scope of my profile »
    // était une fausse alerte — un synonyme du marqueur `out of scope`.
    expect(
      isOffTopicSuspect("That’s outside the scope of my profile. I can tell you about Dok’s experience instead.", 'en')
    ).toBe(false)
  })

  it('expose les marqueurs de refus des deux locales', () => {
    expect(refusalMarkersFor('fr')).toContain('je ne peux')
    expect(refusalMarkersFor('fr')).toContain('can only')
    expect(refusalMarkersFor('en')).toContain('cannot')
    expect(refusalMarkersFor('en')).toContain('uniquement')
  })
})
