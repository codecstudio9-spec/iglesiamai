/**
 * Offline fallback for "¿Por qué quieres orar hoy?" and the release steps: when
 * the AI can't answer, keywords in what the person wrote pick the need (its
 * recorded message and prayer) so they are never left without a word.
 */
import needsData from "../necesidades.json"

export type Need = {
  id: string
  label: string
  prayerId: string
  keywords: string[]
  messages: string[]
  release: string
}

export const needs = needsData as Need[]

const crisisWords = ["suicid", "matarme", "quitarme la vida", "hacerme dano", "no quiero vivir", "quiero morir", "acabar con todo", "me quiero morir", "cortarme"]

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/** Short keywords ("fe") must be whole words so "feliz" doesn't count. */
function mentions(text: string, keyword: string) {
  const k = plain(keyword)
  return k.length <= 3 ? new RegExp(`\\b${k}\\b`).test(text) : text.includes(k)
}

export function matchNeed(text: string): { need: Need; crisis: boolean } {
  const t = plain(text)
  let best = needs.find((n) => n.id === "general")!
  let bestScore = 0
  for (const need of needs) {
    const score = need.keywords.filter((k) => mentions(t, k)).length
    if (score > bestScore) {
      best = need
      bestScore = score
    }
  }
  return { need: best, crisis: crisisWords.some((w) => t.includes(w)) }
}
