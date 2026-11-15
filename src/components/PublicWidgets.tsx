import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Icon from "./Icon"
import PrayerMoment from "./PrayerMoment"
import { moodIntro, moods, randomWord, wordOfTheDay, type Mood, type Word } from "../palabra"
import { BACKEND_CONNECTED, saveSubmission } from "../lib/submissions"

export type WidgetName = "palabra" | "oracion" | "visita" | "momento" | "jesus" | "ofrenda"

/** Opens one of the floating widgets from anywhere on the site. */
export function openWidget(name: WidgetName) {
  window.dispatchEvent(new CustomEvent<WidgetName>("mai:open", { detail: name }))
}

const PREFS_KEY = "mai.palabra.prefs"

function readPrefs(): { name: string; mood: Mood | "" } {
  try {
    return { name: "", mood: "", ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") }
  } catch {
    return { name: "", mood: "" }
  }
}

/** Also remembers the day and the verse read, so the guided prayer knows how they felt *today*. */
function savePrefs(prefs: { name: string; mood: Mood | "" }) {
  try {
    const wordRef = wordOfTheDay(prefs.mood || undefined, prefs.name).main.ref
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, day: new Date().toDateString(), wordRef }))
  } catch {
    // Preferences are a convenience only.
  }
}

function Sheet({
  title,
  kicker,
  intro,
  cover,
  onClose,
  children,
}: {
  title: string
  kicker: string
  intro?: string
  cover?: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    // Lock the page behind the sheet (works on iOS Safari too).
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

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <aside
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={`sheet-close ${cover ? "sheet-close-light" : ""}`} onClick={onClose} aria-label="Cerrar">
          <Icon name="close" />
        </button>
        <div className="sheet-scroll">
          <header className={`sheet-head ${cover ? "sheet-head-cover" : ""}`}>
            {cover && (
              <>
                <img src={cover} alt="" />
                <div className="sheet-head-overlay" />
              </>
            )}
            <div className="sheet-head-text">
              <p>{kicker}</p>
              <h2>{title}</h2>
              {intro && <span>{intro}</span>}
            </div>
          </header>
          <div className="sheet-body">{children}</div>
        </div>
      </aside>
    </div>
  )
}

export function PreviewNote() {
  if (BACKEND_CONNECTED) return null
  return (
    <p className="preview-note">
      Vista previa: por ahora esta información se guarda solo en este navegador y aún no llega al
      equipo de la iglesia.
    </p>
  )
}

/** Sending state for the public forms: blocks double submits and shows a friendly error. */
export function useSend() {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false)
  async function send(task: () => Promise<void>) {
    if (sending) return
    setSending(true)
    setError(false)
    try {
      await task()
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setSending(false)
    }
  }
  return { sending, error, send }
}

export function SendError({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p className="send-error" role="alert">
      No pudimos enviarlo. Revisa tu conexión e inténtalo de nuevo.
    </p>
  )
}

/* ------------------------------------------------------------------ */
/* Palabra de hoy                                                      */
/* ------------------------------------------------------------------ */

function shareText(word: Word) {
  return `Palabra de hoy · ${word.ref}\n\n“${word.text}”\n\n${word.message}\n\nIglesia MAI · ${window.location.origin}`
}

const WORD_COVER = "/mai-hero.jpg"

function WordSheet({ onClose, onPrayer }: { onClose: () => void; onPrayer: () => void }) {
  const initial = useMemo(readPrefs, [])
  const [name, setName] = useState(initial.name)
  const [mood, setMood] = useState<Mood | "">(initial.mood)
  const [step, setStep] = useState<"ask" | "word">(initial.name || initial.mood ? "word" : "ask")
  const [extra, setExtra] = useState<ReturnType<typeof randomWord> | null>(null)

  const daily = useMemo(() => wordOfTheDay(mood || undefined, name), [mood, name])
  const { main, companion } = extra ?? daily
  const firstName = name.trim().split(/\s+/)[0]
  const today = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })

  function reveal(e?: FormEvent) {
    e?.preventDefault()
    savePrefs({ name: name.trim(), mood })
    setExtra(null)
    setStep("word")
  }

  function another() {
    setExtra(randomWord(main))
    document.querySelector(".sheet-scroll")?.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (step === "ask") {
    return (
      <Sheet
        kicker="Palabra de hoy"
        title="Una palabra de Dios para ti"
        intro="Cada día Dios tiene algo que decirte."
        cover={WORD_COVER}
        onClose={onClose}
      >
        <form className="word-ask" onSubmit={reveal}>
          <p className="word-lead">
            Si quieres, cuéntanos tu nombre y cómo te sientes para que esta palabra llegue de forma
            más personal.
          </p>
          <label>
            Tu nombre <span>Opcional</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="¿Cómo te llamas?" autoComplete="given-name" enterKeyHint="next" />
          </label>
          <fieldset>
            <legend>¿Cómo te sientes hoy?</legend>
            <div className="mood-chips">
              {moods.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={mood === m.id ? "is-active" : ""}
                  aria-pressed={mood === m.id}
                  onClick={() => setMood(mood === m.id ? "" : m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </fieldset>
          <button className="submit-button" type="submit">
            Ver mi palabra de hoy <Icon name="arrow" />
          </button>
        </form>
      </Sheet>
    )
  }

  return (
    <Sheet
      kicker={`Palabra de hoy · ${today}`}
      title={firstName ? `Para ti, ${firstName}` : "Para ti, hoy"}
      intro={mood && !extra ? moodIntro[mood] : undefined}
      cover={WORD_COVER}
      onClose={onClose}
    >
      <article className="word-card" key={main.ref}>
        <blockquote className="word-verse">
          <span aria-hidden="true">“</span>
          <p>{main.text}</p>
          <cite>{main.ref} · RVR1960</cite>
        </blockquote>

        <section className="word-section">
          <p className="eyebrow">¿Qué significa?</p>
          <p>{main.explanation}</p>
        </section>

        <section className="word-message">
          <p className="eyebrow">{firstName ? `${firstName}, Dios te dice hoy` : "Dios te dice hoy"}</p>
          <p>{main.message}</p>
        </section>

        <aside className="word-companion">
          <p className="eyebrow">Medita también en</p>
          <p>“{companion.text}”</p>
          <cite>{companion.ref}</cite>
        </aside>

        <div className="word-actions">
          <a
            className="button button-primary"
            href={`https://wa.me/?text=${encodeURIComponent(shareText(main))}`}
            target="_blank"
            rel="noreferrer"
          >
            Compartir por WhatsApp <Icon name="share" />
          </a>
          <button className="button button-ghost" onClick={another}>
            Otra palabra <Icon name="refresh" />
          </button>
        </div>
        <div className="word-footer">
          <button onClick={() => setStep("ask")}>Cambiar nombre o cómo me siento</button>
          <button onClick={onPrayer}>Quiero que oren por mí →</button>
        </div>
        <p className="word-note">Vuelve mañana: cada día hay una palabra nueva para ti.</p>
      </article>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* Prayer request                                                      */
/* ------------------------------------------------------------------ */

function PrayerSheet({ onClose }: { onClose: () => void }) {
  const [sent, setSent] = useState(false)
  const { sending, error, send } = useSend()

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    send(async () => {
      await saveSubmission("oracion", {
        name: String(f.get("name") || "Anónimo"),
        contact: String(f.get("contact") || ""),
        request: String(f.get("request") || ""),
        wantsCall: f.get("call") === "on",
      })
      setSent(true)
    })
  }

  return (
    <Sheet kicker="No estás sin compañía" title="Queremos orar por ti" onClose={onClose}>
      {sent ? (
        <div className="sheet-success">
          <span>
            <Icon name="heart" />
          </span>
          <h3>Gracias por confiar en nosotros.</h3>
          <p>“Echad toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros.” — 1 Pedro 5:7</p>
          <PreviewNote />
          <button className="button button-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      ) : (
        <form className="sheet-form" onSubmit={submit}>
          <p className="word-lead">
            Cuéntanos por qué quieres que oremos. Nuestro equipo de intercesión orará por ti con
            cuidado y en confidencialidad.
          </p>
          <label>
            Nombre <span>Opcional</span>
            <input name="name" placeholder="Puedes dejarlo en blanco" />
          </label>
          <label>
            Petición de oración
            <textarea name="request" required rows={5} placeholder="Escribe aquí tu petición…" />
          </label>
          <label>
            WhatsApp o correo <span>Opcional</span>
            <input name="contact" placeholder="Para escribirte si lo deseas" />
          </label>
          <label className="check">
            <input type="checkbox" name="call" />
            <span>Me gustaría que alguien me contacte para orar conmigo</span>
          </label>
          <SendError show={error} />
          <button className="submit-button" type="submit" disabled={sending}>
            {sending ? "Enviando…" : "Enviar petición"} <Icon name="arrow" />
          </button>
          <p className="privacy">Tu petición es confidencial.</p>
        </form>
      )}
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* "Invite me" — for people who would like someone to welcome them    */
/* ------------------------------------------------------------------ */

function VisitSheet({ onClose }: { onClose: () => void }) {
  const [sent, setSent] = useState(false)
  const { sending, error, send } = useSend()

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    send(async () => {
      await saveSubmission("visita", {
        name: String(f.get("name") || ""),
        phone: String(f.get("phone") || ""),
        service: String(f.get("service") || ""),
        company: String(f.get("company") || ""),
        message: String(f.get("message") || ""),
      })
      setSent(true)
    })
  }

  return (
    <Sheet kicker="Tu primera visita" title="Queremos invitarte" onClose={onClose}>
      {sent ? (
        <div className="sheet-success">
          <span>
            <Icon name="heart" />
          </span>
          <h3>¡Qué alegría!</h3>
          <p>
            Alguien de nuestro equipo de bienvenida te escribirá para invitarte personalmente, resolver
            tus preguntas y esperarte en la entrada el día que vengas.
          </p>
          <PreviewNote />
          <button className="button button-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      ) : (
        <form className="sheet-form" onSubmit={submit}>
          <p className="word-lead">
            Llegar por primera vez a una iglesia puede dar un poco de nervios, y es normal. Déjanos
            tus datos y alguien de MAI te escribirá para invitarte y acompañarte desde que llegues.
          </p>
          <label>
            Tu nombre
            <input name="name" required placeholder="¿Cómo te llamas?" autoComplete="name" />
          </label>
          <label>
            WhatsApp
            <input name="phone" required type="tel" placeholder="+57" autoComplete="tel" />
          </label>
          <div className="form-row">
            <label>
              Servicio
              <select name="service" defaultValue="Aún no sé">
                <option>8:00 AM</option>
                <option>10:00 AM</option>
                <option>Aún no sé</option>
              </select>
            </label>
            <label>
              Vendría
              <select name="company" defaultValue="Sin acompañante">
                <option>Sin acompañante</option>
                <option>Con mi familia</option>
                <option>Con amigos</option>
              </select>
            </label>
          </div>
          <label>
            ¿Algo que quieras contarnos? <span>Opcional</span>
            <textarea name="message" rows={3} placeholder="Una pregunta, una necesidad…" />
          </label>
          <SendError show={error} />
          <button className="submit-button" type="submit" disabled={sending}>
            {sending ? "Enviando…" : "Quiero que me inviten"} <Icon name="arrow" />
          </button>
          <p className="privacy">Solo usaremos tu número para invitarte. Nada de spam.</p>
        </form>
      )}
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* Ofrenda de amor                                                     */
/* ------------------------------------------------------------------ */

const OFFERING = [
  { label: "Titular", value: "Iglesia Cristiana MAI" },
  { label: "Banco", value: "Davivienda" },
  { label: "Cuenta de ahorros", value: "003900109319", mono: true },
  { label: "NIT", value: "900.332.947-9", copy: "9003329479", mono: true },
]

function CopyRow({ label, value, copy, mono }: { label: string; value: string; copy?: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  async function onCopy() {
    const text = copy ?? value
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const area = document.createElement("textarea")
      area.value = text
      area.setAttribute("readonly", "")
      area.style.position = "fixed"
      area.style.opacity = "0"
      document.body.appendChild(area)
      area.select()
      document.execCommand("copy")
      area.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div className="offering-row">
      <div>
        <span>{label}</span>
        <strong className={mono ? "is-mono" : ""}>{value}</strong>
      </div>
      <button type="button" className={copied ? "is-copied" : ""} onClick={onCopy} aria-label={`Copiar ${label.toLowerCase()}`}>
        <Icon name={copied ? "check" : "copy"} />
        <span aria-live="polite">{copied ? "Copiado" : "Copiar"}</span>
      </button>
    </div>
  )
}

function OfferingSheet({ onClose }: { onClose: () => void }) {
  const allText = `Ofrenda de amor · Iglesia Cristiana MAI\nBanco Davivienda\nCuenta de ahorros: 003900109319\nNIT: 900.332.947-9`
  return (
    <Sheet
      kicker="Donaciones"
      title="Ofrenda de amor"
      intro="Tu generosidad sostiene el ministerio y extiende la obra a más corazones, para que más personas conozcan el reino de Dios."
      cover="/mai-adoracion-sala.jpg"
      onClose={onClose}
    >
      <blockquote className="word-verse">
        <span aria-hidden="true">“</span>
        <p>Cada uno dé como propuso en su corazón: no con tristeza, ni por necesidad, porque Dios ama al dador alegre.</p>
        <cite>2 Corintios 9:7 · RVR1960</cite>
      </blockquote>

      <p className="eyebrow">Única cuenta oficial</p>
      <div className="offering-card">
        {OFFERING.map((row) => (
          <CopyRow key={row.label} {...row} />
        ))}
      </div>
      <CopyAll text={allText} />
      <p className="offering-note">
        Gracias por sembrar en esta casa. Cada ofrenda se convierte en reuniones, alcance y cuidado para
        las personas que Dios trae a MAI.
      </p>
    </Sheet>
  )
}

function CopyAll({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="word-actions offering-actions">
      <button
        className="button button-primary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1800)
          } catch {
            // Each row still has its own copy button.
          }
        }}
      >
        {copied ? "Datos copiados" : "Copiar todos los datos"} <Icon name={copied ? "check" : "copy"} />
      </button>
      <a className="button button-ghost" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
        Compartir <Icon name="share" />
      </a>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Floating buttons                                                    */
/* ------------------------------------------------------------------ */

type FabPos = { side: "left" | "right"; bottom: number }
const FAB_POS_KEY = "mai.fab.pos"
const FAB_HINT_KEY = "mai.fab.hint"
/** Space kept above the "+" so the opened menu always fits on screen. */
const FAB_MENU_ROOM = 404

function readFabPos(): FabPos | null {
  try {
    const pos = JSON.parse(localStorage.getItem(FAB_POS_KEY) || "null") as FabPos | null
    return pos && { ...pos, bottom: Math.min(pos.bottom, window.innerHeight - FAB_MENU_ROOM) }
  } catch {
    return null
  }
}

export default function FloatingActions() {
  const [open, setOpen] = useState<WidgetName | null>(null)

  useEffect(() => {
    const onOpen = (e: Event) => setOpen((e as CustomEvent<WidgetName>).detail)
    window.addEventListener("mai:open", onOpen)
    return () => window.removeEventListener("mai:open", onOpen)
  }, [])

  const [expanded, setExpanded] = useState(false)
  const close = useCallback(() => setOpen(null), [])
  const pick = (name: WidgetName) => {
    setExpanded(false)
    setOpen(name)
  }
  const toPrayer = useCallback(() => setOpen("oracion"), [])
  const toWord = useCallback(() => setOpen("palabra"), [])
  const toVisit = useCallback(() => setOpen("visita"), [])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [expanded])

  // The "+" can be dragged anywhere; it docks to the nearest side.
  const [pos, setPos] = useState<FabPos | null>(readFabPos)
  const [dragging, setDragging] = useState(false)
  const [hint, setHint] = useState(false)
  const stackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const fromRect = useRef<DOMRect | null>(null)
  const swallowClick = useRef(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(FAB_HINT_KEY)) return
    } catch {
      return
    }
    const show = window.setTimeout(() => setHint(true), 4000)
    const hide = window.setTimeout(() => setHint(false), 9500)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [])

  function dismissHint() {
    setHint(false)
    try {
      localStorage.setItem(FAB_HINT_KEY, "1")
    } catch {
      // Hint memory is a convenience only.
    }
  }

  // Glide from where it was dropped to its docked place.
  useLayoutEffect(() => {
    const el = stackRef.current
    const from = fromRect.current
    if (!el || !from) return
    fromRect.current = null
    const to = el.getBoundingClientRect()
    el.style.transition = "none"
    el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`
    requestAnimationFrame(() => {
      el.style.transition = "transform .45s cubic-bezier(.2,.8,.2,1)"
      el.style.transform = ""
    })
  }, [pos])

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current
    const el = stackRef.current
    if (!d || !el) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 8) return
    if (!d.moved) {
      d.moved = true
      setDragging(true)
      setExpanded(false)
      dismissHint()
    }
    el.style.transition = "none"
    el.style.transform = `translate(${dx}px, ${dy}px)`
  }

  function onPointerUp() {
    const d = drag.current
    const el = stackRef.current
    drag.current = null
    if (!d?.moved || !el) return
    swallowClick.current = true
    setDragging(false)
    const rect = el.getBoundingClientRect()
    const next: FabPos = {
      side: rect.left + rect.width / 2 < window.innerWidth / 2 ? "left" : "right",
      bottom: Math.round(Math.max(14, Math.min(window.innerHeight - rect.bottom, window.innerHeight - FAB_MENU_ROOM))),
    }
    fromRect.current = rect
    el.style.transform = ""
    setPos(next)
    try {
      localStorage.setItem(FAB_POS_KEY, JSON.stringify(next))
    } catch {
      // Position memory is a convenience only.
    }
  }

  function onToggleClick() {
    if (swallowClick.current) {
      swallowClick.current = false
      return
    }
    dismissHint()
    setExpanded((v) => !v)
  }

  const placement: React.CSSProperties | undefined = pos
    ? {
        bottom: pos.bottom,
        left: pos.side === "left" ? "calc(var(--fab-gap) + env(safe-area-inset-left))" : "auto",
        right: pos.side === "right" ? "calc(var(--fab-gap) + env(safe-area-inset-right))" : "auto",
      }
    : undefined

  return (
    <>
      {expanded && <button className="fab-backdrop" aria-label="Cerrar accesos rápidos" tabIndex={-1} onClick={() => setExpanded(false)} />}
      <div
        ref={stackRef}
        className={`fab-stack ${expanded ? "is-open" : ""} ${pos?.side === "left" ? "is-left" : ""} ${dragging ? "is-dragging" : ""}`}
        style={placement}
      >
        <div className="fab-menu" id="fab-menu" role="group" aria-label="Accesos rápidos">
          <button className="fab-item" onClick={() => pick("ofrenda")}>
            <Icon name="gift" />
            <span>Donaciones</span>
          </button>
          <button className="fab-item" onClick={() => pick("visita")}>
            <Icon name="users" />
            <span>Quiero que me inviten</span>
          </button>
          <button className="fab-item" onClick={() => pick("oracion")}>
            <Icon name="hands" />
            <span>Necesito oración</span>
          </button>
          <button className="fab-item" onClick={() => pick("momento")}>
            <Icon name="heart" />
            <span>Ora aquí</span>
          </button>
          <button className="fab-item" onClick={() => pick("palabra")}>
            <Icon name="book" />
            <span>Palabra de hoy</span>
          </button>
        </div>
        <button
          className="fab-toggle"
          onClick={onToggleClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-expanded={expanded}
          aria-controls="fab-menu"
          aria-label={expanded ? "Cerrar accesos rápidos" : "Abrir accesos rápidos: palabra de hoy, oración, invitación y donaciones"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v16M4 12h16" />
          </svg>
        </button>
        {hint && (
          <p className="fab-hint" role="status">
            Toca el + para orar, pedir oración y más
          </p>
        )}
      </div>
      {open === "palabra" && <WordSheet onClose={close} onPrayer={toPrayer} />}
      {open === "oracion" && <PrayerSheet onClose={close} />}
      {open === "visita" && <VisitSheet onClose={close} />}
      {open === "ofrenda" && <OfferingSheet onClose={close} />}
      {(open === "momento" || open === "jesus") && (
        <PrayerMoment
          onClose={close}
          onPrayer={toPrayer}
          onWord={toWord}
          onVisit={toVisit}
          startWith={open === "jesus" ? "conocer-a-jesus" : undefined}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Usher signup (Servicio ministry)                                    */
/* ------------------------------------------------------------------ */

export function UsherForm() {
  const [sent, setSent] = useState(false)
  const { sending, error, send } = useSend()

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    send(async () => {
      await saveSubmission("ujier", {
        name: String(f.get("name") || ""),
        phone: String(f.get("phone") || ""),
        email: String(f.get("email") || ""),
        availability: String(f.get("availability") || ""),
        attends: String(f.get("attends") || ""),
        notes: String(f.get("notes") || ""),
      })
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="form-success">
        <span>Gracias por servir</span>
        <h3>¡Recibimos tu inscripción!</h3>
        <p>El equipo de Servicio se pondrá en contacto contigo para contarte los siguientes pasos.</p>
        <PreviewNote />
        <button onClick={() => setSent(false)}>Inscribir a otra persona</button>
      </div>
    )
  }

  return (
    <form className="prayer-form" onSubmit={submit}>
      <div className="form-row">
        <label>
          Nombre completo
          <input required name="name" placeholder="Tu nombre" autoComplete="name" />
        </label>
        <label>
          WhatsApp
          <input required name="phone" type="tel" placeholder="+57" autoComplete="tel" />
        </label>
      </div>
      <label>
        Correo <span>Opcional</span>
        <input name="email" type="email" placeholder="tu@correo.com" autoComplete="email" />
      </label>
      <div className="form-row">
        <label>
          Disponibilidad
          <select name="availability" defaultValue="Ambos servicios">
            <option>Servicio 8:00 AM</option>
            <option>Servicio 10:00 AM</option>
            <option>Ambos servicios</option>
          </select>
        </label>
        <label>
          ¿Ya asistes a MAI?
          <select name="attends" defaultValue="Sí, asisto">
            <option>Sí, asisto</option>
            <option>Estoy empezando</option>
          </select>
        </label>
      </div>
      <label>
        Cuéntanos de ti <span>Opcional</span>
        <textarea name="notes" rows={3} placeholder="¿Has servido antes? ¿Por qué quieres ser ujier?" />
      </label>
      <SendError show={error} />
      <button className="submit-button" type="submit" disabled={sending}>
        {sending ? "Enviando…" : "Inscribirme como ujier"} <Icon name="arrow" />
      </button>
    </form>
  )
}
