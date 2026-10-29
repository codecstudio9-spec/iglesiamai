/**
 * "Cuéntale a Dios": reads why someone wants to pray and answers with a
 * personal, pastoral message, a Bible verse and the guided prayer that fits.
 *
 * Runs only on the server (Vite dev middleware and api/ on Vercel) so the
 * OpenRouter key never reaches the browser. The model can only pick verses
 * from the site's verified RVR1960 catalog, never quote its own, and it picks
 * a need whose message and prayer Luján already recorded: the screen shows
 * the AI's personal words while the voice costs no credits per visitor.
 */
import { words } from "../src/palabra.js"
import { versiculos } from "../src/versiculos.js"
import prayersData from "../src/oraciones.json" with { type: "json" }
import needsData from "../src/necesidades.json" with { type: "json" }

type PrayerStep = { type: string; kicker: string; title: string; text?: string; verse?: string; cite?: string }
type Prayer = { id: string; title: string; theme: string; teaching: string; steps: PrayerStep[] }
type Need = { id: string; label: string; prayerId: string }

export type PrayerAnswer = {
  need: string
  needId: string
  message: string
  verse: { ref: string; text: string }
  verseWhy: string
  prayer: { id: string; title: string }
  crisis: boolean
}

const prayers = prayersData as Prayer[]
const needs = needsData as Need[]
const needList = needs.map((n) => `${n.id} | ${n.label}`).join("\n")

/** Every verified verse on the site, once each; the tagged catalog says when each one fits. */
const verses: { id: string; ref: string; text: string; cuando: string }[] = (() => {
  const byRef = new Map<string, { text: string; cuando: string }>()
  for (const v of versiculos) byRef.set(v.ref, { text: v.text, cuando: `${v.cuando} [${v.needs.join(", ")}]` })
  for (const w of words) if (!byRef.has(w.ref)) byRef.set(w.ref, { text: w.text, cuando: w.moods.join(", ") })
  for (const p of prayers) for (const s of p.steps) if (s.verse && s.cite && !byRef.has(s.cite)) byRef.set(s.cite, { text: s.verse, cuando: p.theme })
  return [...byRef].map(([ref, v], i) => ({ id: `v${i + 1}`, ref, ...v }))
})()

const MODELS = ["anthropic/claude-sonnet-5.5", "anthropic/claude-sonnet-4.5", "openai/gpt-4o-mini"]

const SYSTEM = `Eres parte del equipo pastoral de la Iglesia Cristiana MAI en Bogotá: un amigo sabio, cercano y lleno de la Palabra. Una persona te cuenta por qué quiere orar hoy.

Antes de escribir, piensa (sin mostrarlo): ¿qué le está pasando EXACTAMENTE? ¿A quién involucra (hijo, esposo, mamá, jefe, ella misma)? ¿Qué siente de fondo (miedo, culpa, rabia, vergüenza, cansancio)? ¿Qué necesita oír de Dios hoy: consuelo, perdón, valentía, dirección, esperanza, confrontación amorosa?

Tu tarea:
1. Escoge UNA necesidad de la lista (su id).
2. Escribe un mensaje (3 a 5 frases) en español latino, tuteando, con su nombre si lo tienes:
   - Nombra su situación concreta con sus propias palabras o detalles (por ejemplo "tu hijo Andrés", "la entrevista del jueves", "esa deuda", "lo que pasó con tu papá"), con delicadeza.
   - Valida lo que siente en una frase, sin exagerar.
   - Dile algo verdadero y específico de Dios para ESA situación (quién es Él ahí: Padre que espera al hijo, Dios que pelea por ti, el que ve a la que nadie ve...).
   - Termina con UN paso pequeño y concreto para hoy (algo que pueda decirle a Dios, hacer o soltar).
   - PROHIBIDO lo genérico: no uses frases como "Dios tiene un propósito", "todo va a estar bien", "Dios te ama mucho" sin anclarlas a su caso, "en este momento difícil", "no estás solo/a" como relleno. Si una frase serviría igual para cualquier persona, cámbiala.
   Sin juicio, sin sermones, sin prometer milagros ni dar consejos médicos o legales. No cites versículos dentro del mensaje.
3. Escoge UN versículo del catálogo. Cada versículo trae "cuándo usarlo": prefiere el que coincida con su situación PRECISA (no el más famoso). Evita los muy conocidos (Juan 3:16, Jeremías 29:11, Filipenses 4:13) si hay uno más específico. Si la persona pide un pasaje que está en el catálogo, úsalo.
4. Escribe "verseWhy": UNA frase (máximo 180 caracteres) que conecte ese versículo con su caso, por ejemplo "Pedro escribió esto para gente probada como tú: Dios sabe sacarte de esta tentación, no solo perdonarte después."
5. Escoge UNA oración guiada de la lista que mejor la acompañe.
6. Si menciona querer morir, hacerse daño, suicidio, violencia, abuso o un peligro inmediato, marca crisis=true y en el mensaje anímala con mucho amor a buscar ayuda ahora mismo, sin asustarla.
Si el texto no tiene relación con orar o es ofensivo, responde igual con amor e invítala a hablar con Dios.
Responde SOLO con JSON: {"need": "su situación en 2-5 palabras (específica, ej. 'Tu hijo lejos de casa')", "needId": "...", "message": "...", "verseId": "v..", "verseRef": "cita exacta del catálogo", "verseWhy": "...", "prayerId": "...", "crisis": false}`

function catalog() {
  // Citation + when-to-use only: the model knows these passages, and the site fills in the verified text.
  const v = verses.map((x) => `${x.id} | ${x.ref} | ${x.cuando}`).join("\n")
  const p = prayers.map((x) => `${x.id} | ${x.title} | ${x.theme}`).join("\n")
  return `NECESIDADES (id | nombre):\n${needList}\n\nVERSÍCULOS RVR1960 (id | cita | cuándo usarlo [necesidades]):\n${v}\n\nORACIONES GUIADAS (id | título | tema):\n${p}`
}

/** Finds the OpenRouter key whatever exact name it was saved under. */
export function openRouterKey(env: Record<string, string | undefined>) {
  const name =
    Object.keys(env).find((k) => /ROUTER/i.test(k) && env[k]?.trim()) ??
    Object.keys(env).find((k) => env[k]?.trim().startsWith("sk-or-"))
  return name ? env[name]?.trim().replace(/^["']|["']$/g, "") : undefined
}

async function chat(apiKey: string, system: string, user: string, maxTokens: number) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://iglesiamai.com",
      "X-Title": "Iglesia MAI · Ora aquí",
    },
    body: JSON.stringify({
      models: MODELS,
      temperature: 0.6,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  })
  if (!res.ok) throw Object.assign(new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`), { status: 502 })
  const data = await res.json()
  const raw = String(data.choices?.[0]?.message?.content ?? "{}")
  return JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1) || "{}")
}

/** Models sometimes return "V12", 12 or only the citation: accept any of them. */
function findVerse(id: unknown, ref: unknown) {
  const key = String(id ?? "").trim().toLowerCase().replace(/^v?/, "v")
  const cite = String(ref ?? "").trim().toLowerCase()
  return verses.find((v) => v.id === key) ?? (cite ? verses.find((v) => v.ref.toLowerCase() === cite) : undefined)
}

const validNeed = (id: unknown) => (needs.some((n) => n.id === id) ? String(id) : "general")

const PRAY_FOR = `Eres un pastor de la Iglesia Cristiana MAI en Bogotá orando por una persona, en una oración guiada.
La persona acaba de escribir lo que le entrega a Dios en el paso indicado.
1. Escoge UNA necesidad de la lista (su id) que mejor describa lo que entregó.
2. Escribe UNA oración breve (2 o 3 frases, máximo 300 caracteres), en español latino, cálida, humana y reverente, dirigida a Dios ("Padre", "Señor"), mencionando con delicadeza lo que la persona entregó (la persona, la situación o el sentimiento concreto), sin repetir detalles íntimos palabra por palabra, y usando su nombre si lo tienes. Pide algo específico para ESO (no "bendice su vida" en general): que sane esa relación, que le dé valentía para esa conversación, que libre a ese hijo... Puedes aludir a una verdad bíblica sin citar el versículo. Termina con "Amén."
Responde SOLO con JSON: {"needId": "...", "prayer": "..."}

NECESIDADES (id | nombre):
${needList}`

/** A short written prayer over what someone just handed to God, plus the need it fits. */
export async function prayOver(input: { text?: unknown; name?: unknown; step?: unknown }, apiKey: string) {
  const text = String(input.text ?? "").trim().slice(0, 500)
  const name = String(input.name ?? "").trim().slice(0, 40)
  const step = String(input.step ?? "").trim().slice(0, 60)
  if (text.length < 2) throw Object.assign(new Error("Escribe lo que quieres entregarle a Dios"), { status: 400 })
  const parsed = await chat(apiKey, PRAY_FOR, `Paso: ${step}\nNombre: ${name || "(no lo dijo)"}\nLo que entrega: ${text}`, 260)
  return {
    needId: validNeed(parsed.needId),
    text: String(parsed.prayer || "").replace(/^["“]|["”]$/g, "").trim().slice(0, 420),
  }
}

const PERSONALIZE = `Eres parte del equipo pastoral de la Iglesia Cristiana MAI en Bogotá. Vas a adaptar una oración guiada a la situación concreta de una persona.
Recibes la oración original (enseñanza y pasos) y lo que la persona contó. Reescribe, en español latino, cálido, humano y tuteando:
- "teaching": la enseñanza "Antes de orar" (2 o 3 frases, máximo 320 caracteres), conectando el tema de la oración con lo que la persona vive y enseñando cómo acercarse a Dios con un corazón sincero y rendido.
- "steps": un objeto por cada paso, en el MISMO orden y cantidad, con:
  · "title": una frase corta y nueva (2 a 6 palabras), sin repetir la etiqueta del paso ni usar "·".
  · "text": 1 o 2 frases (máximo 220 caracteres) que guíen a orar sobre SU situación concreta: nómbrala con delicadeza en cada paso (por ejemplo su miedo, su familia, su decisión), de modo que se note que la oración fue hecha para ella.
  Mantén la intención de cada paso. Si el paso es de escribir ("write"), invítala a escribir sobre su situación. Si es de leer la Palabra ("word"), invítala a leer despacio el versículo que Dios le da hoy. No cites versículos (cada paso ya tiene el suyo). Sin juicio ni promesas de milagros. Usa su nombre como máximo una vez en todos los pasos.
Responde SOLO con JSON: {"teaching": "...", "steps": [{"title": "...", "text": "..."}]}`

/** The chosen guided prayer, rewritten around what the person shared (verses stay as recorded). */
export async function personalizePrayer(input: { prayerId?: unknown; text?: unknown; name?: unknown; mood?: unknown }, apiKey: string) {
  const prayer = prayers.find((p) => p.id === input.prayerId)
  const text = String(input.text ?? "").trim().slice(0, 800)
  const name = String(input.name ?? "").trim().slice(0, 40)
  if (!prayer || text.length < 3) throw Object.assign(new Error("Falta la oración o el motivo"), { status: 400 })
  const original = prayer.steps.map((s, i) => `${i + 1}. tipo: ${s.type} | etiqueta: ${s.kicker} | título: ${s.title} | texto: ${s.text ?? "(la persona lee la Palabra que Dios le da hoy)"}`).join("\n")
  const parsed = await chat(
    apiKey,
    PERSONALIZE,
    `Oración: ${prayer.title} (${prayer.theme})\nEnseñanza original: ${prayer.teaching}\nPasos:\n${original}\n\nNombre: ${name || "(no lo dijo)"}\nLo que contó: ${text}\n${todayContext(input)}`,
    900,
  )
  const steps = Array.isArray(parsed.steps) ? parsed.steps : []
  return {
    prayerId: prayer.id,
    teaching: String(parsed.teaching || prayer.teaching).slice(0, 420),
    steps: prayer.steps.map((s, i) => ({
      title: String(steps[i]?.title || s.title).slice(0, 80),
      text: String(steps[i]?.text || s.text || "").slice(0, 300),
    })),
  }
}

/** What "Palabra de hoy" told us earlier today, as extra context for the model. */
function todayContext(input: { mood?: unknown; wordRef?: unknown }) {
  const mood = String(input.mood ?? "").trim().slice(0, 40)
  const wordRef = String(input.wordRef ?? "").trim().slice(0, 40)
  return [
    mood && `Hoy, en la Palabra de hoy, dijo sentirse: ${mood}.`,
    wordRef && `Ya leyó hoy ${wordRef}; si puedes, escoge un versículo distinto.`,
  ]
    .filter(Boolean)
    .join("\n")
}

export async function answerPrayer(
  input: { text?: unknown; name?: unknown; mood?: unknown; wordRef?: unknown },
  apiKey: string,
): Promise<PrayerAnswer> {
  const text = String(input.text ?? "").trim().slice(0, 800)
  const name = String(input.name ?? "").trim().slice(0, 40)
  if (text.length < 3) throw Object.assign(new Error("Cuéntanos un poco más"), { status: 400 })

  const parsed = await chat(apiKey, `${SYSTEM}\n\n${catalog()}`, `Nombre: ${name || "(no lo dijo)"}\nPor qué quiere orar: ${text}\n${todayContext(input)}`, 800)
  const needId = validNeed(parsed.needId)
  const need = needs.find((n) => n.id === needId)!
  const verse = findVerse(parsed.verseId, parsed.verseRef) ?? verses.find((v) => v.ref === "Mateo 11:28") ?? verses[0]
  const prayer = prayers.find((p) => p.id === parsed.prayerId) ?? prayers.find((p) => p.id === need.prayerId) ?? prayers[0]
  return {
    need: String(parsed.need || need.label).slice(0, 60),
    needId,
    message: String(parsed.message || "Dios te ve y te ama. Acércate a Él tal como estás: Él te escucha.").slice(0, 900),
    verse: { ref: verse.ref, text: verse.text },
    verseWhy: String(parsed.verseWhy || "").trim().slice(0, 240),
    prayer: { id: prayer.id, title: prayer.title },
    crisis: Boolean(parsed.crisis),
  }
}
