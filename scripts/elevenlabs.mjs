// Generates the guided-prayer audio ("1 minuto para Dios") with ElevenLabs.
// The key stays on this computer (.env.local); the site only ships the MP3s.
//
//   node scripts/elevenlabs.mjs voices            → Latin American Spanish male voices to audition
//   node scripts/elevenlabs.mjs sample <id>...     → short audition of the prayer in each voice
//   node scripts/elevenlabs.mjs prayers [--force]  → narration for every step in src/oraciones.json
//   node scripts/elevenlabs.mjs names [--force]    → "Hola, <nombre>…" greetings + src/nombres.json
//   node scripts/elevenlabs.mjs welcome [--force]  → opening breathing phrases (inicio/1..7)
//   node scripts/elevenlabs.mjs needs [--force]    → per-need messages + release prayers (src/necesidades.json)
//   node scripts/elevenlabs.mjs music              → soft instrumental background
//
// Existing files are skipped unless --force, so re-running only fills what is new.
import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = join(root, "public", "audio", "oracion")
const API = "https://api.elevenlabs.io"
/** Luján: warm, natural Latin American male voice chosen for the prayers. */
const VOICE = "GcbypXUfJn5DbptRc2U7"
const force = process.argv.includes("--force")

async function apiKey() {
  const env = await readFile(join(root, ".env.local"), "utf8").catch(() => "")
  const key = env.match(/^ELEVENLABS_API_KEY=(.+)$/m)?.[1]?.trim() || process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error("Falta ELEVENLABS_API_KEY en .env.local")
  return key
}

async function call(path, { method = "GET", body, binary = false } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { "xi-api-key": await apiKey(), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`)
  return binary ? Buffer.from(await res.arrayBuffer()) : res.json()
}

const pause = (s) => `<break time="${s}s" />`
/** "[1.5]" in the scripts becomes a real pause in the voice. */
const withPauses = (text) => text.replace(/\[(\d+(?:\.\d+)?)\]/g, (_, s) => pause(s))
const exists = (file) => access(file).then(() => true, () => false)

function speak(voiceId, text, settings = {}) {
  return call(`/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    binary: true,
    body: {
      text,
      model_id: "eleven_multilingual_v2",
      language_code: "es",
      voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: 0.92, ...settings },
    },
  })
}

async function save(file, text, settings) {
  if (!force && (await exists(file))) return false
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, await speak(VOICE, text, settings))
  return true
}

async function voices() {
  const query = new URLSearchParams({ language: "es", gender: "male", page_size: "40", sort: "trending" })
  const { voices } = await call(`/v1/shared-voices?${query}`)
  const latin = voices.filter((v) => /latin|mexic|colomb|argentin|venez|chile|peru|latam/i.test(`${v.accent} ${v.description} ${v.name} ${v.descriptive}`))
  for (const v of latin.length ? latin : voices) {
    console.log(`\n${v.name} · ${v.accent} · ${v.age ?? ""} · ${v.descriptive ?? v.use_case ?? ""}`)
    console.log(`  id: ${v.voice_id}  owner: ${v.public_owner_id}`)
    console.log(`  ${(v.description || "").slice(0, 140)}`)
    console.log(`  preview: ${v.preview_url}`)
  }
}

async function ensureVoice(voiceId) {
  const mine = await call("/v1/voices")
  if (mine.voices.some((v) => v.voice_id === voiceId)) return
  const { voices: shared } = await call(`/v1/shared-voices?${new URLSearchParams({ search: voiceId, page_size: "5" })}`)
  const match = shared.find((v) => v.voice_id === voiceId)
  if (!match) throw new Error(`No encontré la voz ${voiceId}`)
  await call(`/v1/voices/add/${match.public_owner_id}/${voiceId}`, { method: "POST", body: { new_name: `MAI · ${match.name}` } })
  console.log(`Voz añadida a tu biblioteca: ${match.name}`)
}

async function sample(...voiceIds) {
  const dir = join(outDir, "muestras")
  await mkdir(dir, { recursive: true })
  const text = `Hola. Qué bueno que estás aquí. ${pause(1)} No necesitas palabras perfectas... Dios ya está aquí, contigo. ${pause(1.2)} Respira profundo... ${pause(2)} y suelta el aire, despacio.`
  for (const id of voiceIds) {
    await ensureVoice(id)
    await writeFile(join(dir, `${id}.mp3`), await speak(id, text))
    console.log(`✓ muestras/${id}.mp3`)
  }
}

async function prayers() {
  await ensureVoice(VOICE)
  const list = JSON.parse(await readFile(join(root, "src", "oraciones.json"), "utf8"))
  for (const prayer of list) {
    for (const [i, step] of prayer.steps.entries()) {
      const made = await save(join(outDir, prayer.id, `${i + 1}.mp3`), withPauses(step.voice))
      if (made) console.log(`✓ ${prayer.id}/${i + 1}.mp3`)
    }
  }
  const amen = `Amén. ${pause(1.2)} Dios te escuchó. ${pause(0.8)} No estás solo. ${pause(1.5)} Vuelve a este momento cuando lo necesites. ${pause(1.2)} Aquí en MAI, lo único que queremos es que conozcas a Papá Dios... ${pause(0.6)} y que te acerques a Él. ${pause(1)} Te esperamos, con los brazos abiertos.`
  if (await save(join(outDir, "amen.mp3"), amen)) console.log("✓ amen.mp3")
}

/** Most common first names in Colombia, spelled as people usually write them. */
const NAMES = `María Ana Luz Carmen Sandra Diana Claudia Martha Marta Gloria Paola Andrea Carolina Natalia Nathalia Daniela Valentina Laura Camila Juliana Paula Sofía Isabella Isabela Mariana Gabriela Alejandra Catalina Viviana Angélica Patricia Liliana Adriana Lorena Marcela Mónica Johana Yohana Johanna Yolanda Rosa Blanca Elizabeth Jessica Tatiana Lina Ángela Nancy Esperanza Beatriz Teresa Lucía Margarita Stella Amparo Fernanda Valeria Sara Salomé Antonella Manuela Luciana Victoria Samantha Isabel Elena Cristina Verónica Milena Yuliana Leidy Yesenia Katherine Karen Kelly Melissa Vanessa Ximena Jimena Alba Inés Rocío Mercedes Dora Olga Ruth Raquel Esther Débora Rebeca Miriam Noemí Erika Eliana Yaneth Marisol Maribel Pilar Consuelo Graciela Susana Silvia Fanny Cecilia Alicia Aurora Abigail Emma Mía Zoe Allison Ashley Wendy Ingrid Dayana Estefanía Samara Martina Jazmín Emilia Julieta Florencia Clara Carla Karina Lucero Rosario Yamile Edith Nelly Sonia Doris Elsa Irma Lilia Ruby Marlene Nubia Sindy Lizeth
José Juan Luis Carlos Jorge Andrés Diego David Daniel Alejandro Santiago Sebastián Samuel Mateo Nicolás Felipe Camilo Julián Javier Fernando Ricardo Eduardo Óscar Mauricio Fabio Hernando Jaime Germán Gustavo Álvaro Alberto Rafael Miguel Pedro Pablo Manuel Francisco Antonio Jesús Héctor Hugo Mario Martín Rodrigo Raúl Rubén Sergio Wilson William Edwin Jhon John Jhonatan Jonathan Johan Brayan Bryan Kevin Cristian Christian Esteban Gabriel Emmanuel Tomás Simón Emiliano Matías Joaquín Lucas Thiago Jerónimo Maximiliano Agustín Benjamín Isaac Jacobo Elías Josué Abraham Moisés Douglas Duglas Iván Víctor Arturo Enrique Guillermo Gilberto Humberto Orlando Ramiro Rodolfo Alfonso Armando Ernesto Fredy Freddy Henry Harold Nelson Omar Oswaldo Leonardo Alexander Steven Duván Yeison Wilmer Edgar Elkin Hernán Gonzalo Marco Rolando Ángel Adrián Alexis Darío Fabián Giovanni Jairo Ronald Roberto Julio César Ignacio Jhonny Johnny Dylan Ian Aarón Jeferson Yesid Luciano Valentín Efraín`
  .split(/\s+/)
  .filter(Boolean)

const slug = (name) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

async function names() {
  await ensureVoice(VOICE)
  const done = {}
  for (const name of NAMES) {
    const id = slug(name)
    if (done[id]) continue
    done[id] = name
    const made = await save(join(outDir, "nombres", `${id}.mp3`), `Hola, ${name}... ${pause(0.5)} qué bueno que estás aquí.`)
    if (made) console.log(`✓ nombres/${id}.mp3`)
  }
  if (await save(join(outDir, "saludo.mp3"), `Hola... ${pause(0.5)} qué bueno que estás aquí.`)) console.log("✓ saludo.mp3")
  await welcome()
  await writeFile(join(root, "src", "nombres.json"), JSON.stringify(Object.keys(done).sort()) + "\n")
  console.log(`${Object.keys(done).length} nombres listos`)
}

/**
 * Opening screen, as short separate phrases: many <break> tags in one take make
 * the voice rush, so PrayerMoment plays these with real breathing pauses between.
 */
const WELCOME = [
  "Inhala, despacio...",
  "y exhala.",
  "Otra vez... inhala.",
  "Exhala.",
  "Calma tu corazón. Él está contigo. No temas.",
  "Escucha lo que Dios te dice: No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios.",
  "Antes de empezar... ¿cuál es tu nombre?",
]

async function welcome() {
  for (const [i, line] of WELCOME.entries()) {
    const made = await save(join(outDir, "inicio", `${i + 1}.mp3`), line, { stability: 0.65, style: 0.15, speed: 0.85 })
    if (made) console.log(`✓ inicio/${i + 1}.mp3`)
  }
}

/** The AI only picks a need; these recordings are what the voice says, so visitors cost no credits. */
async function needs() {
  await ensureVoice(VOICE)
  const calm = { stability: 0.62, style: 0.2, speed: 0.88 }
  const list = JSON.parse(await readFile(join(root, "src", "necesidades.json"), "utf8"))
  for (const need of list) {
    for (const [i, message] of need.messages.entries()) {
      if (await save(join(outDir, "necesidad", `${need.id}-${i + 1}.mp3`), message, calm)) console.log(`✓ necesidad/${need.id}-${i + 1}.mp3`)
    }
    if (await save(join(outDir, "entrega", `${need.id}.mp3`), need.release, calm)) console.log(`✓ entrega/${need.id}.mp3`)
  }  // "Una palabra para ti": the voice only invites them to read the AI's words.
  if (await save(join(outDir, "lee.mp3"), "Lee despacio lo que Dios te dice hoy... es para ti.", calm)) console.log("✓ lee.mp3")
}

async function music() {
  await mkdir(outDir, { recursive: true })
  const audio = await call("/v1/music?output_format=mp3_44100_128", {
    method: "POST",
    binary: true,
    body: {
      prompt:
        "Soft, slow and peaceful instrumental worship music for personal prayer. Warm felt piano, gentle ambient pads and subtle low strings, intimate and hopeful, 60 BPM, very calm, no drums, no percussion, no vocals. Smooth start and ending so it can loop.",
      music_length_ms: 180000,
      force_instrumental: true,
    },
  })
  await writeFile(join(outDir, "fondo.mp3"), audio)
  console.log(`✓ fondo.mp3 (${Math.round(audio.length / 1024)} KB)`)
}

const [command] = process.argv.slice(2)
const commands = { voices, sample: () => sample(...process.argv.slice(3)), prayers, names, welcome, needs, music }
if (!commands[command]) {
  console.log("Comandos: voices | sample <voice_id>... | prayers [--force] | names [--force] | welcome [--force] | needs [--force] | music")
  process.exit(1)
}
commands[command]().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
