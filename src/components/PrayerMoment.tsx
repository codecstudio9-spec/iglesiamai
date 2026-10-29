import { useEffect, useMemo, useRef, useState } from "react"
import Icon from "./Icon"
import { moods, wordOfTheDay, type Mood } from "../palabra"
import prayersData from "../oraciones.json"
import namesData from "../nombres.json"
import { matchNeed, needs } from "../lib/prayerMatch"
import { verseForNeed } from "../versiculos"

type Step = {
  type: "breath" | "plain" | "write" | "word"
  kicker: string
  title: string
  text?: string
  verse?: string
  cite?: string
  placeholder?: string
  release?: string
  released?: string
  voice: string
}

type Prayer = { id: string; title: string; theme: string; teaching: string; steps: Step[] }

const prayers = prayersData as Prayer[]
const greetedNames = new Set(namesData as string[])

const AUDIO = "/audio/oracion"
// Same visit details as the site (src/App.tsx `church`).
const CHURCH_ADDRESS = "Avenida Boyacá #8-13 · Castilla, Bogotá"
const CHURCH_MAPS = "https://maps.google.com/?q=Avenida+Boyaca+8-13+Castilla+Bogota"
const SOUND_KEY = "mai.moment.sound"
const PREFS_KEY = "mai.palabra.prefs"
const MUSIC_VOLUME = 0.32
const MUSIC_UNDER_VOICE = 0.12

/**
 * Opening voice as short phrases with real breathing room between them,
 * timed to the 8-second orb (4s in, 4s out). "pause:<ms>" waits in silence.
 */
const WELCOME_CLIPS = [
  "inicio/1", "pause:1750",
  "inicio/2", "pause:2450",
  "inicio/3", "pause:1750",
  "inicio/4", "pause:2250",
  "inicio/5", "pause:1200",
  "inicio/6", "pause:1200",
  "inicio/7",
]

/** A different prayer is featured each day. */
function prayerOfTheDay() {
  const now = new Date()
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000)
  return prayers[day % prayers.length]
}

/** "DUGLAS" or "duglas" → "Duglas". */
const properName = (name: string) =>
  name.charAt(0).toLocaleUpperCase("es") + name.slice(1).toLocaleLowerCase("es")

/** One of a need's two recorded messages, so repeat visits don't always sound the same. */
const messageClip = (needId: string) => `necesidad/${needId}-${Math.random() < 0.5 ? 1 : 2}`

const slug = (name: string) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

type Prefs = { name: string; mood: Mood | ""; day?: string; wordRef?: string }

function readPrefs(): Prefs {
  try {
    return { name: "", mood: "", ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") }
  } catch {
    return { name: "", mood: "" }
  }
}

/** How they said they felt in "Palabra de hoy" earlier today, and the verse they read there. */
function todaysHint(prefs: Prefs) {
  if (prefs.day !== new Date().toDateString()) return null
  const mood = moods.find((m) => m.id === prefs.mood)
  return mood || prefs.wordRef ? { mood: mood?.id ?? "", feeling: mood?.label.toLowerCase() ?? "", wordRef: prefs.wordRef ?? "" } : null
}

/** "Palabra de hoy" moods → recorded needs, for when the AI can't answer. */
const moodNeed: Record<Mood, string> = {
  ansiedad: "ansiedad",
  miedo: "ansiedad",
  tristeza: "duelo",
  cansancio: "cansancio",
  soledad: "soledad",
  direccion: "direccion",
  gratitud: "gratitud",
}

function saveName(name: string) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), name }))
  } catch {
    // The name is a convenience only.
  }
}

function readSound() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off"
  } catch {
    return true
  }
}

/** Smoothly moves an audio element's volume to a target. */
function fade(audio: HTMLAudioElement, to: number, ms = 900) {
  const from = audio.volume
  const start = performance.now()
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / ms)
    audio.volume = from + (to - from) * t
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/**
 * Soft instrumental background plus Luján's narration (generated once with
 * ElevenLabs, see scripts/elevenlabs.mjs). `clips` (or "pause:<ms>") play one after another
 * whenever they change; the music dips while the voice speaks. Missing files
 * simply stay silent.
 */
function usePrayerSound(clips: string[], enabled: boolean) {
  const music = useRef<HTMLAudioElement | null>(null)
  const voice = useRef<HTMLAudioElement | null>(null)
  const [blocked, setBlocked] = useState(false)
  const key = clips.join("|")

  useEffect(() => {
    const bg = new Audio(`${AUDIO}/fondo.mp3`)
    bg.loop = true
    bg.volume = 0
    music.current = bg
    return () => {
      fade(bg, 0, 600)
      window.setTimeout(() => bg.pause(), 650)
      voice.current?.pause()
    }
  }, [])

  useEffect(() => {
    const bg = music.current
    if (!bg) return
    if (!enabled) {
      fade(bg, 0, 500)
      window.setTimeout(() => !bg.volume && bg.pause(), 550)
      voice.current?.pause()
      return
    }
    bg.play()
      .then(() => {
        setBlocked(false)
        fade(bg, voice.current && !voice.current.paused ? MUSIC_UNDER_VOICE : MUSIC_VOLUME, 2000)
      })
      .catch((err: DOMException) => setBlocked(err.name === "NotAllowedError"))
  }, [enabled, blocked])

  useEffect(() => {
    voice.current?.pause()
    if (!enabled || !key) return
    const queue = key.split("|")
    let cancelled = false
    let timer = 0
    const bg = music.current
    const playFrom = (i: number) => {
      if (cancelled) return
      if (i >= queue.length) {
        if (bg) fade(bg, MUSIC_VOLUME, 1600)
        return
      }
      if (queue[i].startsWith("pause:")) {
        timer = window.setTimeout(() => playFrom(i + 1), Number(queue[i].slice(6)))
        return
      }
      const v = new Audio(`${AUDIO}/${queue[i]}.mp3`)
      voice.current = v
      v.addEventListener("play", () => bg && fade(bg, MUSIC_UNDER_VOICE, 700))
      v.addEventListener("ended", () => (timer = window.setTimeout(() => playFrom(i + 1), 450)))
      v.addEventListener("error", () => playFrom(i + 1))
      v.play().catch(() => {})
    }
    // A short breath before the voice comes in.
    timer = window.setTimeout(() => playFrom(0), 700)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      voice.current?.pause()
    }
  }, [key, enabled])

  return { blocked, retry: () => setBlocked(false) }
}

type Phase = "welcome" | "choose" | "listen" | "answer" | "intro" | "pray" | "end"

type Answer = {
  need: string
  message: string
  verse: { ref: string; text: string }
  verseWhy?: string
  prayer: { id: string; title: string }
  crisis: boolean
  needId: string
}

/** Guided prayers: breathe and say your name, pick a prayer (one is featured daily), learn why, then pray step by step. */
export default function PrayerMoment({
  onClose,
  onPrayer,
  onWord,
  onVisit,
  startWith,
}: {
  onClose: () => void
  onPrayer: () => void
  onWord: () => void
  onVisit: () => void
  /** Skip the chooser and go straight to this prayer after the welcome (e.g. "conocer-a-jesus"). */
  startWith?: string
}) {
  const today = useMemo(prayerOfTheDay, [])
  const prefs = useMemo(readPrefs, [])
  const hint = useMemo(() => todaysHint(prefs), [prefs])
  const [name, setName] = useState(prefs.name)
  const [prayer, setPrayer] = useState<Prayer>(today)
  const [phase, setPhase] = useState<Phase>("welcome")
  const [step, setStep] = useState(0)
  const [burden, setBurden] = useState("")
  const [released, setReleased] = useState(false)
  // Prayer over what was just handed to God: the AI's words on screen, Luján's recording of that need aloud.
  const [spoken, setSpoken] = useState<{ text: string; clip: string } | null>(null)
  const [praying, setPraying] = useState(false)
  const [releaseCrisis, setReleaseCrisis] = useState(false)
  const [greeted, setGreeted] = useState(false)
  const nextRef = useRef<HTMLButtonElement>(null)
  const [reason, setReason] = useState("")
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [answerClip, setAnswerClip] = useState("")
  // The chosen prayer rewritten around what they shared (prepared while they read their word).
  const [personal, setPersonal] = useState<{ prayerId: string; teaching: string; steps: { title: string; text: string }[] } | null>(null)

  const word = useMemo(() => wordOfTheDay(prefs.mood || undefined, name).main, [prefs, name])
  // What the person shared reshapes the texts on screen; verses and recorded voice stay.
  const mine = personal?.prayerId === prayer.id ? personal : null
  const teaching = mine?.teaching ?? prayer.teaching
  const current = { ...prayer.steps[step], ...(mine?.steps[step] ?? {}) }
  const theirWord = answer && answer.prayer.id === prayer.id ? answer.verse : null
  const firstName = properName(name.trim().split(/\s+/)[0] ?? "")

  const [sound, setSound] = useState(readSound)
  // Read the name only when leaving the welcome screen, so typing does not restart the voice.
  const [greetName, setGreetName] = useState("")
  const clips = useMemo(() => {
    if (phase === "welcome") return WELCOME_CLIPS
    if (phase === "choose") {
      if (greeted) return []
      return [greetedNames.has(slug(greetName)) ? `nombres/${slug(greetName)}` : "saludo"]
    }
    if (phase === "pray") return spoken ? [spoken.clip] : [`${prayer.id}/${step + 1}`]
    if (phase === "answer") return ["lee"]
    if (phase === "intro") {
      if (answer && answer.prayer.id === prayer.id && answerClip) return [answerClip]
      // Came straight here from the welcome: say hello first.
      if (!greeted) return [greetedNames.has(slug(greetName)) ? `nombres/${slug(greetName)}` : "saludo"]
      return []
    }
    if (phase === "end") return ["amen"]
    return []
  }, [phase, prayer, step, greeted, greetName, spoken, answerClip])
  const { blocked, retry } = usePrayerSound(clips, sound)

  // Fetch the next recording ahead of time so the voice starts without a gap.
  useEffect(() => {
    if (!sound) return
    const next =
      phase === "answer" || phase === "intro" ? `${prayer.id}/1` : phase === "pray" && step + 1 < prayer.steps.length ? `${prayer.id}/${step + 2}` : phase === "pray" ? "amen" : ""
    if (!next) return
    const a = new Audio()
    a.preload = "auto"
    a.src = `${AUDIO}/${next}.mp3`
  }, [phase, prayer, step, sound])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    const scrollY = window.scrollY
    const { style } = document.body
    style.position = "fixed"
    style.top = `-${scrollY}px`
    style.left = "0"
    style.right = "0"
    return () => {
      window.removeEventListener("keydown", onKey)
      style.position = ""
      style.top = ""
      style.left = ""
      style.right = ""
      window.scrollTo(0, scrollY)
    }
  }, [onClose])

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true })
  }, [phase, step])

  function toggleSound() {
    const next = !sound || blocked
    setSound(next)
    if (blocked) retry()
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off")
    } catch {
      // Sound preference is a convenience only.
    }
  }

  function welcomeDone() {
    setGreetName(firstName)
    const direct = prayers.find((p) => p.id === startWith)
    if (direct) {
      setPrayer(direct)
      setPhase("intro")
    } else setPhase("choose")
    if (name.trim() !== prefs.name) saveName(name.trim())
  }

  /** Asks the server (OpenRouter, verified verses only) for a word that fits why they came. */
  async function ask(text = reason) {
    if (text.trim().length < 3) return
    setReason(text)
    setGreeted(true)
    setPhase("listen")
    const found = matchNeed(text)
    // Keywords found nothing? How they felt in "Palabra de hoy" still points the way.
    const hinted = found.need.id === "general" && hint?.mood ? needs.find((n) => n.id === moodNeed[hint.mood as Mood]) : undefined
    const local = { ...found, need: hinted ?? found.need }
    const context = { mood: hint?.feeling ?? "", wordRef: hint?.wordRef ?? "" }
    try {
      const res = await fetch("/api/oracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, name: firstName, ...context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAnswer({ ...(data as Answer), crisis: data.crisis || local.crisis })
      setAnswerClip(messageClip(data.needId))
      setPersonal(null)
      fetch("/api/oracion-pasos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prayerId: data.prayer.id, text, name: firstName, mood: context.mood }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => p && setPersonal(p))
        .catch(() => {})
    } catch {
      // No AI right now: keywords pick the need; its recorded message is shown and heard.
      const clip = messageClip(local.need.id)
      const p = prayers.find((x) => x.id === local.need.prayerId) ?? prayers[0]
      const verse = verseForNeed(local.need.id, context.wordRef)
      setAnswer({
        need: local.need.label,
        needId: local.need.id,
        message: local.need.messages[clip.endsWith("-1") ? 0 : 1],
        verse: { ref: verse.ref, text: verse.text },
        prayer: { id: p.id, title: p.title },
        crisis: local.crisis,
      })
      setAnswerClip(clip)
    }
    setPhase("answer")
  }

  function choose(p: Prayer) {
    setPrayer(p)
    setGreeted(true)
    setPhase("intro")
  }

  function clearRelease() {
    setSpoken(null)
    setPraying(false)
    setReleaseCrisis(false)
  }

  function goTo(i: number) {
    clearRelease()
    setBurden("")
    setReleased(false)
    if (i >= prayer.steps.length) setPhase("end")
    else setStep(i)
  }

  function start() {
    setGreeted(true)
    setStep(0)
    setBurden("")
    setReleased(false)
    setPhase("pray")
  }

  async function release() {
    const text = burden
    setReleased(true)
    window.setTimeout(() => setBurden(""), 1400)
    const local = matchNeed(text)
    if (local.crisis) {
      setReleaseCrisis(true)
      return
    }
    setPraying(true)
    try {
      const res = await fetch("/api/oracion-entrega", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, name: firstName, step: current.title }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const need = needs.find((n) => n.id === data.needId) ?? local.need
      setSpoken({ text: data.text || need.release, clip: `entrega/${need.id}` })
    } catch {
      // No AI right now: the recorded prayer for the need the keywords found.
      setSpoken({ text: local.need.release, clip: `entrega/${local.need.id}` })
    } finally {
      setPraying(false)
    }
  }

  return (
    <div className="moment" role="dialog" aria-modal="true" aria-label="Un momento con Dios">
      <div className="moment-glow" aria-hidden="true" />
      <header className="moment-top">
        <div className="moment-progress" aria-hidden="true">
          {(phase === "pray" || phase === "end") &&
            prayer.steps.map((s, i) => (
              <i key={s.kicker + i} className={phase === "end" || i < step ? "is-done" : i === step ? "is-current" : ""} />
            ))}
        </div>
        <button
          className={`moment-sound ${sound && !blocked ? "is-on" : ""}`}
          onClick={toggleSound}
          aria-label={sound && !blocked ? "Silenciar voz y música" : "Activar voz y música"}
          aria-pressed={sound && !blocked}
        >
          <Icon name={sound && !blocked ? "volume" : "mute"} />
          <span>{blocked ? "Activar sonido" : sound ? "Con voz" : "Silencio"}</span>
        </button>
        <button className="moment-close" onClick={onClose} aria-label="Cerrar">
          <Icon name="close" />
        </button>
      </header>

      {phase === "welcome" && (
        <form
          className="moment-body moment-welcome"
          key="welcome"
          onSubmit={(e) => {
            e.preventDefault()
            welcomeDone()
          }}
        >
          <p className="moment-kicker">Un momento con Dios</p>
          <div className="moment-breath" aria-hidden="true">
            <span />
            <b>
              <em>Inhala</em>
              <em>Exhala</em>
            </b>
          </div>
          <h2>
            Calma tu corazón. <em>Él está contigo.</em>
          </h2>
          <p className="moment-text">No temas. Respira despacio con el círculo y deja que Su paz te alcance.</p>
          <blockquote className="moment-verse">
            “No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios.”<cite>Isaías 41:10</cite>
          </blockquote>
          <label className="moment-name">
            <span>¿Cuál es tu nombre?</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Escribe tu nombre"
              autoComplete="given-name"
              enterKeyHint="go"
              maxLength={40}
            />
          </label>
          <div className="moment-actions">
            <button type="submit" className="button button-light">
              Continuar <Icon name="arrow" />
            </button>
          </div>
        </form>
      )}

      {phase === "choose" && (
        <div className="moment-body moment-choose" key="choose">
          <p className="moment-kicker">{firstName ? `Hola, ${firstName}` : "Un momento con Dios"}</p>
          <h2>
            ¿Cómo quieres <em>acercarte a Él hoy?</em>
          </h2>
          {hint?.feeling && (
            <div className="moment-hint">
              <p>
                En la Palabra de hoy nos contaste que te sientes <strong>{hint.feeling}</strong>.
              </p>
              <button className="moment-release" onClick={() => ask(`Hoy me siento ${hint.feeling}.`)}>
                Orar por esto <Icon name="arrow" />
              </button>
            </div>
          )}
          <form
            className="moment-ask"
            onSubmit={(e) => {
              e.preventDefault()
              ask()
            }}
          >
            <label htmlFor="moment-reason">{hint?.feeling ? "¿Quieres contarle algo más?" : "¿Por qué quieres orar hoy?"}</label>
            <textarea
              id="moment-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Cuéntale a Dios lo que estás viviendo: una preocupación, una alegría, una decisión…"
              rows={3}
              maxLength={800}
            />
            <div>
              <small>Se usa solo para encontrar tu versículo. No guardamos lo que escribes.</small>
              <button type="submit" className="button button-light" disabled={reason.trim().length < 3}>
                Buscar una palabra para mí <Icon name="arrow" />
              </button>
            </div>
          </form>
          <button ref={nextRef} className="moment-skip" onClick={() => choose(today)}>
            Prefiero orar sin escribir · <span>{today.title}</span>
          </button>
        </div>
      )}

      {phase === "listen" && (
        <div className="moment-body" key="listen">
          <div className="moment-breath" aria-hidden="true">
            <span />
          </div>
          <h2>
            Dios te escucha. <em>Buscando una palabra para ti…</em>
          </h2>
          <p className="moment-text" role="status">Respira mientras tanto. Él conoce tu corazón.</p>
        </div>
      )}

      {phase === "answer" && answer && (
        <div className="moment-body" key="answer">
          <p className="moment-kicker">{answer.need}</p>
          <h2>
            Una palabra <em>para ti{firstName ? `, ${firstName}` : ""}.</em>
          </h2>
          <p className="moment-text moment-answer">{answer.message}</p>
          <blockquote className="moment-verse moment-verse-big">
            “{answer.verse.text}”<cite>{answer.verse.ref}</cite>
          </blockquote>
          {answer.verseWhy && <p className="moment-verse-why">{answer.verseWhy}</p>}
          {answer.crisis && (
            <div className="moment-crisis" role="alert">
              <strong>No estás solo. Hay personas listas para escucharte ahora mismo.</strong>
              <span>
                En Bogotá llama a la <a href="tel:106">Línea 106</a> (apoyo emocional, gratuita, 24 horas). Si estás en
                peligro, llama al <a href="tel:123">123</a>.
              </span>
              <button className="moment-back" onClick={onPrayer}>
                Quiero que alguien de MAI ore conmigo
              </button>
            </div>
          )}
          <div className="moment-actions moment-actions-stack">
            <button
              ref={nextRef}
              className="button button-light"
              onClick={() => choose(prayers.find((p) => p.id === answer.prayer.id) ?? today)}
            >
              Orar: {answer.prayer.title} <Icon name="arrow" />
            </button>
            <button className="moment-back" onClick={() => setPhase("choose")}>
              Elegir otra oración
            </button>
          </div>
        </div>
      )}

      {phase === "intro" && (
        <div className="moment-body" key={`intro-${prayer.id}`}>
          <p className="moment-kicker">{prayer.theme}</p>
          <h2>{prayer.title}</h2>
          <div className="moment-teaching">
            <small>Antes de orar</small>
            <p>{teaching}</p>
          </div>
          <div className="moment-actions">
            <button className="moment-back" onClick={() => setPhase("choose")}>
              Elegir otra
            </button>
            <button ref={nextRef} className="button button-light" onClick={start}>
              Comenzar a orar <Icon name="arrow" />
            </button>
          </div>
        </div>
      )}

      {phase === "pray" && (
        <div className="moment-body" key={`${prayer.id}-${step}`}>
          <p className="moment-kicker">
            {step + 1} de {prayer.steps.length} · {current.kicker}
          </p>
          <h2>{current.title}</h2>

          {current.type === "breath" && (
            <div className="moment-breath" aria-hidden="true">
              <span />
              <b>
                <em>Inhala</em>
                <em>Exhala</em>
              </b>
            </div>
          )}

          {current.type === "word" ? (
            <>
              <p className="moment-text">{firstName ? `${firstName}, esto` : "Esto"} es lo que Dios te dice hoy:</p>
              <blockquote className="moment-verse moment-verse-big">
                “{theirWord?.text ?? word.text}”<cite>{theirWord?.ref ?? word.ref}</cite>
              </blockquote>
              {!theirWord && <p className="moment-text">{word.message}</p>}
            </>
          ) : (
            <>
              <p className="moment-text">{current.text}</p>
              {current.type === "write" && (
                <div className={`moment-burden ${released ? "is-released" : ""}`}>
                  {!released ? (
                    <>
                      <textarea
                        value={burden}
                        onChange={(e) => setBurden(e.target.value)}
                        placeholder={current.placeholder}
                        rows={3}
                        aria-label={current.title}
                      />
                      <button className="moment-release" onClick={release} disabled={!burden.trim()}>
                        {current.release} <Icon name="hands" />
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="moment-floating">{burden}</p>
                      <p className="moment-released">{current.released}</p>
                      {praying && (
                        <p className="moment-praying" role="status">
                          Orando por ti…
                        </p>
                      )}
                      {spoken && <p className="moment-spoken">{spoken.text}</p>}
                      {releaseCrisis && (
                        <div className="moment-crisis" role="alert">
                          <strong>No estás solo. Hay personas listas para escucharte ahora mismo.</strong>
                          <span>
                            En Bogotá llama a la <a href="tel:106">Línea 106</a> (apoyo emocional, gratuita, 24 horas).
                            Si estás en peligro, llama al <a href="tel:123">123</a>.
                          </span>
                          <button className="moment-back" onClick={onPrayer}>
                            Quiero que alguien de MAI ore conmigo
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {current.verse && (
                <blockquote className="moment-verse">
                  “{current.verse}”<cite>{current.cite}</cite>
                </blockquote>
              )}
            </>
          )}

          <div className="moment-actions">
            <button className="moment-back" onClick={() => (step ? goTo(step - 1) : setPhase("intro"))}>
              Atrás
            </button>
            <button ref={nextRef} className="button button-light" onClick={() => goTo(step + 1)}>
              {step === prayer.steps.length - 1
                ? "Amén"
                : current.type === "write" && !released && !burden.trim()
                  ? "Continuar sin escribir"
                  : "Continuar"}
              <Icon name="arrow" />
            </button>
          </div>
        </div>
      )}

      {phase === "end" && (
        <div className="moment-body moment-end" key="end">
          <span className="moment-end-icon">
            <Icon name="heart" />
          </span>
          <h2>
            Amén. <em>Dios te escuchó.</em>
          </h2>
          <p className="moment-text">
            {firstName ? `${firstName}, no` : "No"} estás solo. Vuelve a este momento cuando lo necesites; cada día
            hay una oración nueva para acercarte a Él.
          </p>
          <p className="moment-invite">
            Aquí en MAI lo único que queremos es que conozcas a Papá Dios y te acerques a Él.{" "}
            <em>Te esperamos con los brazos abiertos.</em>
          </p>
          <div className="moment-sunday">
            <small>Tu siguiente paso</small>
            <strong>Ven este domingo · 8:00 o 10:00 AM</strong>
            <span>{CHURCH_ADDRESS}</span>
            <div>
              <a className="moment-release" href={CHURCH_MAPS} target="_blank" rel="noreferrer">
                Cómo llegar <Icon name="pin" />
              </a>
              <button className="moment-release" onClick={onVisit}>
                Quiero que alguien me reciba <Icon name="users" />
              </button>
            </div>
          </div>
          <div className="moment-actions moment-actions-stack">
            {prayer.id === "conocer-a-jesus" ? (
              <button ref={nextRef} className="button button-light" onClick={onVisit}>
                Quiero hablar con alguien de MAI <Icon name="arrow" />
              </button>
            ) : (
              <button ref={nextRef} className="button button-light" onClick={() => setPhase("choose")}>
                Orar de otra forma <Icon name="arrow" />
              </button>
            )}
            <button className="button button-outline" onClick={onPrayer}>
              Quiero que oren por mí <Icon name="arrow" />
            </button>
            <button className="moment-back" onClick={onWord}>
              Leer la Palabra de hoy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
