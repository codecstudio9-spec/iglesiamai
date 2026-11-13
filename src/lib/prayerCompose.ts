/**
 * Algoritmo de "Ora aquí". La IA responde primero; este algoritmo responde
 * cuando la IA no puede y ora sobre lo que la persona entrega en cada paso,
 * siguiendo la necesidad que la IA leyó. Lee lo que la persona escribió
 * (necesidad, lo que siente, a quién menciona, la situación concreta) y arma
 * frases del banco (src/frasesOracion.ts), cada una con su grabación de Luján.
 */
import * as F from "../frasesOracion"
import { matchNeed, plain, type Need } from "./prayerMatch"
import { versiculos, type Verse } from "../versiculos"

const RECENT_KEY = "mai.oracion.recientes"

const relations: Record<string, string> = {
  hijo: "tu hijo", hija: "tu hija", hijos: "tus hijos", hijas: "tus hijas",
  mama: "tu mamá", madre: "tu mamá", papa: "tu papá", padre: "tu papá", papas: "tus papás", padres: "tus papás",
  esposo: "tu esposo", esposa: "tu esposa", marido: "tu esposo", mujer: "tu esposa", pareja: "tu pareja",
  novio: "tu novio", novia: "tu novia", hermano: "tu hermano", hermana: "tu hermana", hermanos: "tus hermanos",
  abuelo: "tu abuelo", abuela: "tu abuela", nieto: "tu nieto", nieta: "tu nieta", bebe: "tu bebé",
  tio: "tu tío", tia: "tu tía", primo: "tu primo", prima: "tu prima", suegra: "tu suegra", suegro: "tu suegro",
  amigo: "tu amigo", amiga: "tu amiga", jefe: "tu jefe", familia: "tu familia", casa: "tu casa",
}

const stop = new Set(["para", "porque", "cuando", "como", "pero", "esta", "este", "estoy", "tengo", "quiero", "mucho", "muy", "todo", "toda", "algo", "nada", "siento", "dios", "señor", "senor", "ayuda", "orar", "hoy"])

/** Short, comparable word stems ("preocupaciones" → "preo"). */
const stems = (text: string) =>
  new Set(plain(text).split(/[^a-zñ]+/).filter((w) => w.length >= 4 && !stop.has(w)).map((w) => w.slice(0, 4)))

const hash = (text: string) => {
  let h = 2166136261
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

/** Stable per text and day, so the same request reads the same, but each day feels new. */
const seed = (text: string) => hash(text + new Date().toDateString())

/** One recording per phrase of the bank: the file name comes from the phrase itself. */
const clipOf = (phrase: string) => `algoritmo/${hash(phrase).toString(36)}`

type Ctx = { nombre: string; quien: string; situacion: string; seed: number }
type Line = { text: string; clip: string }

function fill(phrase: string, ctx: Pick<Ctx, "nombre" | "quien" | "situacion">) {
  let s = phrase
  if (!ctx.nombre) s = s.replace(/^\{nombre\},\s*/, "").replace(/,\s*\{nombre\}(?=[.,!?])/g, "")
  s = s.replace(/\{nombre\}/g, ctx.nombre).replace(/\{quien\}/g, ctx.quien).replace(/\{situacion\}/g, ctx.situacion)
  s = s.replace(/\s+([.,!?])/g, "$1").replace(/\s{2,}/g, " ").trim()
  return s.charAt(0).toLocaleUpperCase("es") + s.slice(1)
}

/** What Luján says for a phrase: the same words, without the details only the screen knows. */
const spoken = (phrase: string, prayer = false) =>
  fill(phrase, { nombre: prayer ? "este corazón" : "", quien: "esa persona", situacion: "esta situación" })

/** Picks a phrase that can be filled (no {quien} if nobody was named, and so on). */
function pick(list: string[] | undefined, ctx: Ctx, salt: number): Line | null {
  const usable = (list ?? []).filter((p) => (ctx.quien || !p.includes("{quien}")) && (ctx.situacion || !p.includes("{situacion}")))
  if (!usable.length) return null
  const phrase = usable[(ctx.seed + salt * 7919) % usable.length]
  return { text: fill(phrase, ctx), clip: clipOf(phrase) }
}

const textOf = (lines: (Line | null)[]) => lines.flatMap((l) => (l ? [l.text] : [])).join(" ")

/** Clips with a short breath between phrases. */
const voiceOf = (lines: (Line | null)[]) =>
  lines.flatMap((l) => (l ? [l.clip] : [])).flatMap((clip, i) => (i ? ["pause:600", clip] : [clip]))

/** Every phrase of the bank with the words to record (used by scripts/elevenlabs.mjs). */
export function voiceLines() {
  const answer = [
    ...Object.values(F.aperturas).flat(), ...F.emociones.flatMap((e) => e.validar), ...F.quien, ...F.situacion,
    ...Object.values(F.verdades).flat(), ...Object.values(F.pasos).flat(), ...F.crisis,
  ]
  const prayer = [...F.entrega.apertura, ...F.entrega.aperturaQuien, ...Object.values(F.entrega.peticion).flat(), ...F.entrega.cierre]
  const all = [...answer.map((p) => ({ clip: clipOf(p), text: spoken(p) })), ...prayer.map((p) => ({ clip: clipOf(p), text: spoken(p, true) }))]
  return [...new Map(all.map((l) => [l.clip, l])).values()]
}

/** "mi hijo Andrés" → "tu hijo Andrés"; "mi mamá" → "tu mamá". */
function findPerson(text: string) {
  const m = text.match(/\bmis?\s+([a-záéíóúñ]+)(?:\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+))?/i)
  if (!m) return ""
  const who = relations[plain(m[1])]
  if (!who) return ""
  const name = m[2] && /^[A-ZÁÉÍÓÚÑ]/.test(m[2]) && !stop.has(plain(m[2])) ? ` ${m[2]}` : ""
  return who + name
}

const findSituation = (t: string) => F.situaciones.find((s) => s.claves.some((k) => t.includes(plain(k))))?.nombre ?? ""
const findFeeling = (t: string) => F.emociones.find((e) => e.claves.some((k) => t.includes(plain(k))))

function timeOfDay() {
  const h = new Date().getHours()
  return h < 12 ? "manana" : h < 19 ? "tarde" : "noche"
}

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")
  } catch {
    return []
  }
}

export function rememberVerse(ref: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([ref, ...readRecent().filter((r) => r !== ref)].slice(0, 12)))
  } catch {
    /* private mode: no memory, still works */
  }
}

/**
 * The verse whose "cuando" best matches what they wrote, within their need;
 * verses they saw recently (or already read today) are left for another day.
 */
export function bestVerse(text: string, needId: string, exclude?: string): Verse {
  const words = stems(text)
  const recent = new Set([...readRecent(), exclude ?? ""])
  const scored = versiculos
    .filter((v) => !recent.has(v.ref))
    .map((v) => {
      const needScore = v.needs[0] === needId ? 3 : v.needs.includes(needId) ? 2 : 0
      let overlap = 0
      for (const s of stems(v.cuando)) if (words.has(s)) overlap++
      return { v, score: needScore + overlap * 2.5 }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  if (!scored.length) return versiculos.find((v) => v.needs.includes("general"))!
  // A little variety among the best few, never a weak match over a strong one.
  const top = scored.filter((x) => x.score >= scored[0].score - 1).slice(0, 4)
  return top[seed(text) % top.length].v
}

export type LocalAnswer = {
  need: Need
  score: number
  crisis: boolean
  label: string
  message: string
  verse: Verse
  verseWhy: string
  /** Luján's recordings of these same phrases, in order. */
  voice: string[]
}

export function composeAnswer(text: string, name: string, need?: Need, excludeRef?: string): LocalAnswer {
  const found = matchNeed(text)
  const n = need ?? found.need
  const t = plain(text)
  const ctx: Ctx = { nombre: name, quien: findPerson(text), situacion: findSituation(t), seed: seed(text) }
  const verse = bestVerse(text, n.id, excludeRef)

  if (found.crisis) {
    const near = versiculos.find((v) => v.ref === "Salmos 34:18") ?? verse
    const line = pick(F.crisis, ctx, 0)
    return {
      need: n, score: found.score, crisis: true, label: "Tu vida vale mucho", message: textOf([line]), verse: near,
      verseWhy: "Dios está cerca de ti ahora mismo, aunque no lo sientas.", voice: voiceOf([line]),
    }
  }

  const feeling = findFeeling(t)
  const glad = feeling?.id === "alegria" || n.id === "gratitud"
  const personal = ctx.quien ? pick(F.quien, ctx, 3) : ctx.situacion && !glad ? pick(F.situacion, ctx, 3) : null
  // Four sentences at most: when there is a feeling and a person, those say more than a greeting.
  const parts = [
    feeling && personal ? null : pick(glad ? F.aperturas.siempre : [...F.aperturas[timeOfDay()], ...F.aperturas.siempre], ctx, 1),
    feeling ? pick(feeling.validar, ctx, 2) : null,
    personal,
    pick(F.verdades[n.id] ?? F.verdades.general, ctx, 4),
    pick(F.pasos[n.id] ?? F.pasos.general, ctx, 5),
  ]

  const label = ctx.quien ? `Orando por ${ctx.quien}` : ctx.situacion && !glad ? `Dios en ${ctx.situacion}` : n.label
  return {
    need: n,
    score: found.score,
    crisis: false,
    label: label.charAt(0).toLocaleUpperCase("es") + label.slice(1),
    message: textOf(parts),
    verse,
    verseWhy: pick([...(F.porQue[n.id] ?? []), ...F.porQue.todas], ctx, 6)?.text ?? "",
    voice: voiceOf(parts),
  }
}

/** A short written prayer over what someone just handed to God, with its recordings. */
export function composeRelease(text: string, name: string, needId: string) {
  // Spoken to God about the person: "su hijo", and "este corazón" when no name was given.
  const quien = findPerson(text).replace(/^tu /, "su ").replace(/^tus /, "sus ")
  const ctx: Ctx = { nombre: name || "este corazón", quien, situacion: findSituation(plain(text)), seed: seed(text) }
  const lines = [
    ctx.quien ? pick(F.entrega.aperturaQuien, ctx, 1) : pick(F.entrega.apertura, ctx, 1),
    pick(F.entrega.peticion[needId] ?? F.entrega.peticion.general, ctx, 2),
    pick(F.entrega.cierre, ctx, 3),
  ]
  return { text: textOf(lines), voice: voiceOf(lines) }
}
