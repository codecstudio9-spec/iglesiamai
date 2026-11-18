/**
 * Site analytics (supabase/lideres-analitica.sql, table `site_events`).
 * The public site logs visits and tool use; only the owner (admin) can read
 * them, in the panel's "Analítica". Visitors stay anonymous unless they tell us
 * their name (Ora aquí, a form), which is then attached to their later events.
 */
import { supabase } from "./supabase"

export type EventKind =
  | "visita" // a new session opened the site
  | "pagina" // moved to another section (#/...)
  | "oracion_abrir" // opened "Ora aquí" (Luján)
  | "oracion_nombre" // told Luján their name
  | "oracion_escribio" // wrote what they need (label = topic found)
  | "oracion_tema" // chose a prayer (label = title)
  | "oracion_completa" // finished a guided prayer
  | "herramienta" // opened a tool (label = widget)
  | "formulario" // sent a form (label = kind)
  | "anuncio" // saw / used an announcement (label = title)

const VISITOR_KEY = "mai.vid"
const NAME_KEY = "mai.vname"
const SESSION_KEY = "mai.sid"
const GEO_KEY = "mai.geo"

function randomId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, "0")).join("")
}

function stored(storage: Storage | undefined, key: string, make: () => string) {
  try {
    const v = storage?.getItem(key)
    if (v) return v
    const n = make()
    storage?.setItem(key, n)
    return n
  } catch {
    return make()
  }
}

const visitorId = () => stored(typeof localStorage === "undefined" ? undefined : localStorage, VISITOR_KEY, randomId)

let sessionId = ""
let newSession = false
function session() {
  if (sessionId) return sessionId
  try {
    sessionId = sessionStorage.getItem(SESSION_KEY) || ""
    if (!sessionId) {
      sessionId = randomId()
      newSession = true
      sessionStorage.setItem(SESSION_KEY, sessionId)
    }
  } catch {
    sessionId = randomId()
    newSession = true
  }
  return sessionId
}

function device() {
  const ua = navigator.userAgent
  const kind = /iPad|Tablet/i.test(ua) ? "Tablet" : /Mobi|Android|iPhone/i.test(ua) ? "Celular" : "Computador"
  const os = /iPhone|iPad|Mac OS/i.test(ua) ? (kind === "Computador" ? "Mac" : "iPhone") : /Android/i.test(ua) ? "Android" : /Windows/i.test(ua) ? "Windows" : ""
  return os ? `${kind} · ${os}` : kind
}

/** Where they came from, in words people recognize. */
function source() {
  const params = new URLSearchParams(window.location.search)
  const utm = params.get("utm_source") || params.get("fbclid") ? (params.get("utm_source") || "facebook") : ""
  const ref = utm || document.referrer
  if (!ref) return "Directo"
  if (/whatsapp|wa\.me/i.test(ref)) return "WhatsApp"
  if (/instagram/i.test(ref)) return "Instagram"
  if (/facebook|fb\./i.test(ref)) return "Facebook"
  if (/tiktok/i.test(ref)) return "TikTok"
  if (/youtube/i.test(ref)) return "YouTube"
  if (/google/i.test(ref)) return "Google"
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "")
    return host === window.location.hostname.replace(/^www\./, "") ? "Directo" : host
  } catch {
    return ref.slice(0, 60)
  }
}

let geo: Promise<{ city: string; country: string }> | null = null
function location() {
  if (geo) return geo
  geo = (async () => {
    try {
      const saved = sessionStorage.getItem(GEO_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    try {
      const res = await fetch("/api/geo")
      if (!res.ok) throw new Error()
      const data = await res.json()
      const value = { city: String(data.city || ""), country: String(data.country || "") }
      try {
        sessionStorage.setItem(GEO_KEY, JSON.stringify(value))
      } catch {
        // ignore
      }
      return value
    } catch {
      return { city: "", country: "" }
    }
  })()
  return geo
}

function knownName() {
  try {
    return localStorage.getItem(NAME_KEY) || ""
  } catch {
    return ""
  }
}

/** Remember who this visitor is (they told us their name). */
export function rememberVisitorName(name: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 80)
  if (clean.length < 2) return
  try {
    localStorage.setItem(NAME_KEY, clean)
  } catch {
    // ignore
  }
}

function enabled() {
  if (typeof window === "undefined") return false
  if (navigator.webdriver) return false
  // Not the panel, not the registration links, not local development.
  if (/^#\/(admin|registro|inscripcion)/.test(window.location.hash)) return false
  if (import.meta.env.DEV) {
    try {
      return localStorage.getItem("mai.track.dev") === "1"
    } catch {
      return false
    }
  }
  return true
}

const sectionPath = () => (window.location.hash.replace(/^#\/?/, "").split(/[/?]/)[0] || "inicio").slice(0, 120)

/** Logs one event. Never throws and never blocks the page. */
export function track(kind: EventKind, label = "", name = "") {
  if (!enabled()) return
  if (name) rememberVisitorName(name)
  const row = {
    visitor_id: visitorId(),
    session_id: session(),
    kind,
    label: label.slice(0, 160),
    name: (name || knownName()).slice(0, 80),
    path: sectionPath(),
    referrer: source().slice(0, 160),
    device: device(),
  }
  location()
    .then(({ city, country }) => supabase.from("site_events").insert({ ...row, city: city.slice(0, 80), country: country.slice(0, 8) }))
    .then(
      () => undefined,
      () => undefined,
    )
}

/** Call once when the public site opens: a visit per session, then each section they move to. */
export function startTracking() {
  if (!enabled()) return () => {}
  session()
  if (newSession) track("visita")
  let last = sectionPath()
  const onHash = () => {
    const now = sectionPath()
    if (now !== last && enabled()) track("pagina", now)
    last = now
  }
  // "momento" is Ora aquí, which logs its own steps.
  const onWidget = (e: Event) => {
    const name = String((e as CustomEvent).detail ?? "")
    if (name && name !== "momento") track("herramienta", name)
  }
  window.addEventListener("hashchange", onHash)
  window.addEventListener("mai:open", onWidget)
  return () => {
    window.removeEventListener("hashchange", onHash)
    window.removeEventListener("mai:open", onWidget)
  }
}

/* ---------------------------------------------------------------- */
/* Owner side                                                         */
/* ---------------------------------------------------------------- */

export type SiteEvent = {
  id: number
  createdAt: string
  visitorId: string
  sessionId: string
  kind: EventKind
  label: string
  name: string
  path: string
  referrer: string
  device: string
  city: string
  country: string
}

type Row = {
  id: number
  created_at: string
  visitor_id: string
  session_id: string
  kind: EventKind
  label: string
  name: string
  path: string
  referrer: string
  device: string
  city: string
  country: string
}

/** Events since `days` ago (newest first), in pages of 1000 up to 20 000. */
export async function loadEvents(days: number): Promise<SiteEvent[]> {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))
  const rows: Row[] = []
  for (let from = 0; from < 20_000; from += 1000) {
    const { data, error } = await supabase
      .from("site_events")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .range(from, from + 999)
    if (error) throw error
    rows.push(...(data as Row[]))
    if (data.length < 1000) break
  }
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    visitorId: r.visitor_id,
    sessionId: r.session_id,
    kind: r.kind,
    label: r.label,
    name: r.name,
    path: r.path,
    referrer: r.referrer,
    device: r.device,
    city: r.city,
    country: r.country,
  }))
}
