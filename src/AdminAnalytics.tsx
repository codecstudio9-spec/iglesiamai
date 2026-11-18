/**
 * Analítica (owner only): who visited the public site and which tools they used,
 * above all "Ora aquí" with Luján. Data: site_events (src/lib/analytics.ts).
 */
import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { AIcon, PageHeader, PanelTitle } from "./AdminApp"
import { loadEvents, type SiteEvent } from "./lib/analytics"

const RANGES: [number, string][] = [
  [1, "Hoy"],
  [7, "7 días"],
  [30, "30 días"],
  [90, "3 meses"],
]

const TOOL_NAMES: Record<string, string> = {
  palabra: "Palabra de hoy",
  oracion: "Pedir oración",
  visita: "Quiero visitar",
  jesus: "Conocer a Jesús",
  ofrenda: "Ofrenda",
  momento: "Ora aquí con Luján",
}

const FORM_NAMES: Record<string, string> = {
  oracion: "Petición de oración",
  visita: "Invitación a visitar",
  ujier: "Inscripción de ujier",
  inscripcion: "Inscripción a evento",
}

const KIND_TEXT: Record<string, (e: SiteEvent) => string> = {
  visita: (e) => `Entró al sitio${e.referrer && e.referrer !== "Directo" ? ` desde ${e.referrer}` : ""}`,
  pagina: (e) => `Vio la sección ${e.label || e.path}`,
  oracion_abrir: () => "Abrió Ora aquí (Luján)",
  oracion_nombre: (e) => `Le dijo su nombre a Luján: ${e.name}`,
  oracion_escribio: (e) => `Le contó a Luján su necesidad · ${e.label}`,
  oracion_tema: (e) => `Oró: ${e.label}`,
  oracion_completa: (e) => `Terminó la oración: ${e.label}`,
  herramienta: (e) => `Abrió ${TOOL_NAMES[e.label] ?? e.label}`,
  formulario: (e) => `Envió: ${FORM_NAMES[e.label] ?? e.label}`,
  anuncio: (e) => `Vio el anuncio “${e.label}”`,
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
const fmtNumber = (n: number) => n.toLocaleString("es-CO")

function countBy<T>(items: T[], key: (t: T) => string) {
  const map = new Map<string, number>()
  for (const it of items) {
    const k = key(it)
    if (k) map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

/** Unique visitors per value (so one person opening a tool 10 times counts once). */
function peopleBy(events: SiteEvent[], key: (e: SiteEvent) => string) {
  const map = new Map<string, Set<string>>()
  for (const e of events) {
    const k = key(e)
    if (!k) continue
    if (!map.has(k)) map.set(k, new Set())
    map.get(k)!.add(e.visitorId)
  }
  return [...map.entries()].map(([k, s]) => [k, s.size] as [string, number]).sort((a, b) => b[1] - a[1])
}

function BarList({ title, kicker, rows, empty, unit = "personas" }: { title: string; kicker: string; rows: [string, number][]; empty: string; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]))
  return (
    <section className="panel analytics-panel">
      <PanelTitle kicker={kicker} title={title} />
      {rows.length === 0 ? (
        <p className="analytics-empty">{empty}</p>
      ) : (
        <ul className="analytics-bars">
          {rows.slice(0, 8).map(([label, n]) => (
            <li key={label}>
              <div>
                <span>{label}</span>
                <strong>
                  {fmtNumber(n)} <small>{unit}</small>
                </strong>
              </div>
              <i style={{ width: `${(n / max) * 100}%` }} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type Visitor = {
  id: string
  name: string
  city: string
  device: string
  source: string
  sessions: number
  first: string
  last: string
  tools: string[]
  usedLujan: boolean
  prayed: number
  events: SiteEvent[]
}

function buildVisitors(events: SiteEvent[]): Visitor[] {
  const map = new Map<string, SiteEvent[]>()
  for (const e of events) {
    if (!map.has(e.visitorId)) map.set(e.visitorId, [])
    map.get(e.visitorId)!.push(e)
  }
  return [...map.entries()]
    .map(([id, list]) => {
      // list is newest first
      const tools = new Set<string>()
      for (const e of list) {
        if (e.kind.startsWith("oracion_")) tools.add("Luján")
        else if (e.kind === "herramienta") tools.add(TOOL_NAMES[e.label] ?? e.label)
        else if (e.kind === "formulario") tools.add(FORM_NAMES[e.label] ?? e.label)
      }
      const oldest = list[list.length - 1]
      return {
        id,
        name: list.find((e) => e.name)?.name ?? "",
        city: list.find((e) => e.city)?.city ?? "",
        device: list[0].device,
        source: (list.filter((e) => e.kind === "visita").pop() ?? oldest).referrer,
        sessions: new Set(list.map((e) => e.sessionId)).size,
        first: oldest.createdAt,
        last: list[0].createdAt,
        tools: [...tools],
        usedLujan: tools.has("Luján"),
        prayed: list.filter((e) => e.kind === "oracion_completa").length,
        events: list,
      }
    })
    .sort((a, b) => (a.last < b.last ? 1 : -1))
}

function exportCsv(visitors: Visitor[]) {
  const rows = [
    ["Persona", "Ciudad", "Dispositivo", "Llegó desde", "Visitas", "Usó", "Oraciones completas", "Primera vez", "Última vez"],
    ...visitors.map((v) => [v.name || "Anónimo", v.city, v.device, v.source, v.sessions, v.tools.join(" / "), v.prayed, fmtTime(v.first), fmtTime(v.last)]),
  ]
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
  a.download = "analitica-mai.csv"
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(7)
  const [events, setEvents] = useState<SiteEvent[] | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [onlyLujan, setOnlyLujan] = useState(false)
  const [open, setOpen] = useState("")
  const [showAll, setShowAll] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    loadEvents(days)
      .then(setEvents)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [days])

  useEffect(load, [load])

  const all = events ?? []
  const visitors = useMemo(() => buildVisitors(all), [all])
  const sessions = useMemo(() => new Set(all.map((e) => e.sessionId)).size, [all])
  const lujanPeople = visitors.filter((v) => v.usedLujan).length
  const prayers = all.filter((e) => e.kind === "oracion_completa").length
  const named = visitors.filter((v) => v.name).length

  const perDay = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      map.set(dayKey(d.toISOString()), new Set())
    }
    for (const e of all) map.get(dayKey(e.createdAt))?.add(e.visitorId)
    return [...map.entries()].map(([k, s]) => [k, s.size] as [string, number])
  }, [all, days])
  const dayMax = Math.max(1, ...perDay.map((d) => d[1]))

  const tools = useMemo(() => {
    const rows = peopleBy(
      all.filter((e) => e.kind === "herramienta" || e.kind.startsWith("oracion_") || e.kind === "formulario"),
      (e) => (e.kind.startsWith("oracion_") ? "Ora aquí con Luján" : e.kind === "formulario" ? `Envió: ${FORM_NAMES[e.label] ?? e.label}` : TOOL_NAMES[e.label] ?? e.label),
    )
    return rows
  }, [all])
  const topics = useMemo(() => countBy(all.filter((e) => e.kind === "oracion_escribio" || e.kind === "oracion_tema"), (e) => e.label), [all])
  const sources = useMemo(() => peopleBy(all.filter((e) => e.kind === "visita"), (e) => e.referrer || "Directo"), [all])
  const cities = useMemo(() => peopleBy(all, (e) => (e.city ? `${e.city}${e.country && e.country !== "CO" ? ` (${e.country})` : ""}` : "")), [all])
  const devices = useMemo(() => peopleBy(all, (e) => e.device), [all])
  const sections = useMemo(() => countBy(all.filter((e) => e.kind === "pagina"), (e) => e.label), [all])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return visitors
      .filter((v) => !onlyLujan || v.usedLujan)
      .filter((v) => !q || `${v.name} ${v.city} ${v.device} ${v.source} ${v.tools.join(" ")}`.toLowerCase().includes(q))
  }, [visitors, query, onlyLujan])
  const visible = showAll ? shown : shown.slice(0, 60)

  return (
    <>
      <PageHeader
        eyebrow="Solo administrador"
        title="Analítica"
        copy="Quiénes entran a la página y qué herramientas usan, como Ora aquí con Luján."
        onExport={shown.length ? () => exportCsv(shown) : undefined}
      />

      <div className="analytics-toolbar">
        <div className="ann-segment">
          {RANGES.map(([d, label]) => (
            <button key={d} className={days === d ? "active" : ""} onClick={() => setDays(d)}>
              {label}
            </button>
          ))}
        </div>
        <button className="secondary-action" onClick={load} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error && <p className="users-error">No pudimos cargar la analítica. Revisa tu conexión y vuelve a intentarlo.</p>}

      <div className="module-stats">
        <div>
          <span>Personas</span>
          <strong>{events ? fmtNumber(visitors.length) : "—"}</strong>
          <small>{named ? `${named} nos dijeron su nombre` : "Visitantes únicos"}</small>
        </div>
        <div>
          <span>Visitas</span>
          <strong>{events ? fmtNumber(sessions) : "—"}</strong>
          <small>Veces que abrieron la página</small>
        </div>
        <div>
          <span>Usaron a Luján</span>
          <strong>{events ? fmtNumber(lujanPeople) : "—"}</strong>
          <small>{visitors.length ? `${Math.round((lujanPeople / visitors.length) * 100)}% de las personas` : "Ora aquí"}</small>
        </div>
        <div>
          <span>Oraciones completas</span>
          <strong>{events ? fmtNumber(prayers) : "—"}</strong>
          <small>Llegaron hasta el amén</small>
        </div>
      </div>

      {days > 1 && (
        <section className="panel analytics-panel">
          <PanelTitle kicker="Tendencia" title="Personas por día" />
          <div className={`analytics-days ${perDay.length > 31 ? "is-dense" : ""}`}>
            {perDay.map(([d, n]) => (
              <div key={d} title={`${new Date(d + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}: ${n}`}>
                <i style={{ height: `${(n / dayMax) * 100}%` }}>{n > 0 && perDay.length <= 31 && <b>{n}</b>}</i>
                {perDay.length <= 31 && <span>{new Date(d + "T12:00:00").getDate()}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="analytics-grid">
        <BarList kicker="Herramientas" title="Qué usaron" rows={tools} empty="Nadie ha usado las herramientas en este periodo." />
        <BarList kicker="Luján" title="Por qué oraron" rows={topics} unit="veces" empty="Todavía nadie ha orado con Luján en este periodo." />
        <BarList kicker="Origen" title="De dónde llegan" rows={sources} empty="Sin visitas en este periodo." />
        <BarList kicker="Ubicación" title="Ciudades" rows={cities} empty="La ciudad aparece en las visitas al sitio publicado." />
        <BarList kicker="Equipos" title="Dispositivos" rows={devices} empty="Sin datos todavía." />
        <BarList kicker="Navegación" title="Secciones más vistas" rows={sections} unit="veces" empty="Solo han visto la página de inicio." />
      </div>

      <section className="panel table-panel">
        <PanelTitle kicker="Personas" title="Quiénes entraron" />
        <div className="table-tools people-tools">
          <div className="admin-search">
            <AIcon name="search" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nombre, ciudad, herramienta..." />
          </div>
          <label className="analytics-check">
            <input type="checkbox" checked={onlyLujan} onChange={(e) => setOnlyLujan(e.target.checked)} /> Solo quienes usaron a Luján
          </label>
        </div>
        {events && shown.length === 0 ? (
          <div className="users-empty">
            <h2>{all.length ? "Nadie coincide con la búsqueda" : "Sin visitas registradas todavía"}</h2>
            <p>Las visitas se registran desde ahora en www.iglesiamai.com. Los visitantes son anónimos hasta que le dicen su nombre a Luján o envían un formulario.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table analytics-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Ciudad</th>
                  <th>Dispositivo</th>
                  <th>Llegó desde</th>
                  <th>Visitas</th>
                  <th>Usó</th>
                  <th>Última vez</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((v) => (
                  <Fragment key={v.id}>
                    <tr className="analytics-row" onClick={() => setOpen(open === v.id ? "" : v.id)}>
                      <td>
                        <strong>{v.name || "Visitante anónimo"}</strong>
                        <small>{open === v.id ? "Ocultar recorrido" : "Ver recorrido"}</small>
                      </td>
                      <td>{v.city || "—"}</td>
                      <td>{v.device || "—"}</td>
                      <td>{v.source || "Directo"}</td>
                      <td>{v.sessions}</td>
                      <td>
                        <div className="analytics-chips">
                          {v.tools.length ? v.tools.map((t) => <span key={t} className={t === "Luján" ? "is-lujan" : ""}>{t}</span>) : "Solo navegó"}
                        </div>
                      </td>
                      <td>{fmtTime(v.last)}</td>
                    </tr>
                    {open === v.id && (
                      <tr className="analytics-timeline">
                        <td colSpan={7}>
                          <ol>
                            {v.events.slice(0, 80).map((e) => (
                              <li key={e.id}>
                                <time>{fmtTime(e.createdAt)}</time>
                                <span>{(KIND_TEXT[e.kind] ?? ((x: SiteEvent) => `${x.kind} ${x.label}`))(e)}</span>
                              </li>
                            ))}
                          </ol>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {!showAll && shown.length > visible.length && (
              <button className="analytics-more" onClick={() => setShowAll(true)}>
                Ver las {fmtNumber(shown.length)} personas
              </button>
            )}
          </div>
        )}
        <p className="analytics-note">
          <AIcon name="shield" /> Solo tú (administrador principal) ves esta sección. No guardamos lo que las personas le escriben a Luján: solo el tema.
        </p>
      </section>
    </>
  )
}
