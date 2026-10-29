import { useEffect, useState } from "react"
import { useFileUrl } from "./components/AnnouncementPopup"
import { getFileType } from "./lib/files"
import { listAnnouncements, onAnnouncementsChange } from "./lib/announcements"
import {
  BACKEND_CONNECTED,
  deleteSubmission,
  listSubmissions,
  onSubmissionsChange,
  updateSubmission,
  type InscriptionData,
  type PrayerData,
  type Submission,
  type SubmissionKind,
  type SubmissionStatus,
  type UsherData,
  type VisitData,
} from "./lib/submissions"

export const webPages: Record<string, SubmissionKind> = {
  Inscripciones: "inscripcion",
  "Peticiones de oración": "oracion",
  "Quieren visitarnos": "visita",
  Ujieres: "ujier",
}

const copy: Record<SubmissionKind, { title: string; text: string; empty: string }> = {
  oracion: {
    title: "Peticiones de oración",
    text: "Peticiones enviadas desde el sitio web para el equipo de Intercesión.",
    empty: "Aún no hay peticiones de oración.",
  },
  visita: {
    title: "Quieren visitarnos",
    text: "Personas que pidieron que alguien de MAI las invite y las reciba en su primera visita.",
    empty: "Aún nadie ha pedido una invitación.",
  },
  ujier: {
    title: "Ujieres",
    text: "Inscripciones al ministerio de Servicio para ser ujier.",
    empty: "Aún no hay inscripciones de ujieres.",
  },
  inscripcion: {
    title: "Inscripciones",
    text: "Personas inscritas a eventos desde los anuncios, con su comprobante de pago.",
    empty: "Aún no hay inscripciones a eventos.",
  },
}

const defaultLabels: Record<SubmissionStatus, string> = {
  nueva: "Nueva",
  en_proceso: "En proceso",
  atendida: "Atendida",
}

const inscriptionLabels: Record<SubmissionStatus, string> = {
  nueva: "Por verificar",
  en_proceso: "En revisión",
  atendida: "Confirmada",
}

const labelsFor = (kind: SubmissionKind) => (kind === "inscripcion" ? inscriptionLabels : defaultLabels)

const statusTone: Record<SubmissionStatus, string> = {
  nueva: "pill-warn",
  en_proceso: "pill-blue",
  atendida: "pill-ok",
}

function useSubmissions(kind?: SubmissionKind) {
  const [items, setItems] = useState<Submission[]>([])
  useEffect(() => {
    const load = () => listSubmissions(kind).then(setItems)
    load()
    return onSubmissionsChange(load)
  }, [kind])
  return items
}

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return null
  return `https://wa.me/${digits.length === 10 ? `57${digits}` : digits}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

function ConnectionNotice() {
  if (BACKEND_CONNECTED) return null
  return (
    <div className="web-notice">
      <strong>Modo vista previa.</strong> Supabase aún no está conectado: estos datos se guardan solo
      en este navegador. Cuando conectemos Supabase, aquí llegarán las solicitudes de todas las
      personas que visiten la página.
    </div>
  )
}

function Proof({ fileId, name }: { fileId: string | null; name: string }) {
  const url = useFileUrl(fileId)
  const [type, setType] = useState("")
  useEffect(() => {
    if (fileId) getFileType(fileId).then(setType)
  }, [fileId])
  if (!fileId) return <p className="web-proof-missing">Sin comprobante adjunto</p>
  if (!url) return <p className="web-proof-missing">Cargando comprobante…</p>
  return (
    <a className="web-proof" href={url} target="_blank" rel="noreferrer">
      {type.startsWith("image/") ? <img src={url} alt="Comprobante de pago" /> : <span className="web-proof-pdf">PDF</span>}
      <span>
        Ver comprobante
        <small>{name}</small>
      </span>
    </a>
  )
}

function Details({ item }: { item: Submission }) {
  if (item.kind === "inscripcion") {
    const d = item.data as InscriptionData
    return (
      <>
        <p className="web-event">{d.eventTitle}</p>
        <h3>{d.name}</h3>
        <dl>
          <dt>WhatsApp</dt>
          <dd>{d.phone}</dd>
          {d.email && (
            <>
              <dt>Correo</dt>
              <dd>{d.email}</dd>
            </>
          )}
          <dt>Personas</dt>
          <dd>{d.attendees}</dd>
        </dl>
        <Proof fileId={d.proofFileId} name={d.proofName} />
        {d.notes && <p className="web-quote">“{d.notes}”</p>}
      </>
    )
  }
  if (item.kind === "oracion") {
    const d = item.data as PrayerData
    return (
      <>
        <h3>{d.name || "Anónimo"}</h3>
        <p className="web-quote">“{d.request}”</p>
        <dl>
          {d.contact && (
            <>
              <dt>Contacto</dt>
              <dd>{d.contact}</dd>
            </>
          )}
          <dt>¿Quiere que lo contacten?</dt>
          <dd>{d.wantsCall ? "Sí" : "No"}</dd>
        </dl>
      </>
    )
  }
  if (item.kind === "visita") {
    const d = item.data as VisitData
    return (
      <>
        <h3>{d.name}</h3>
        <dl>
          <dt>WhatsApp</dt>
          <dd>{d.phone}</dd>
          <dt>Servicio</dt>
          <dd>{d.service}</dd>
          <dt>Vendría</dt>
          <dd>{d.company}</dd>
        </dl>
        {d.message && <p className="web-quote">“{d.message}”</p>}
      </>
    )
  }
  const d = item.data as UsherData
  return (
    <>
      <h3>{d.name}</h3>
      <dl>
        <dt>WhatsApp</dt>
        <dd>{d.phone}</dd>
        {d.email && (
          <>
            <dt>Correo</dt>
            <dd>{d.email}</dd>
          </>
        )}
        <dt>Disponibilidad</dt>
        <dd>{d.availability}</dd>
        <dt>¿Asiste a MAI?</dt>
        <dd>{d.attends}</dd>
      </dl>
      {d.notes && <p className="web-quote">“{d.notes}”</p>}
    </>
  )
}

function phoneOf(item: Submission) {
  if (item.kind === "oracion") return (item.data as PrayerData).contact
  return (item.data as VisitData | UsherData).phone
}

export function WebOverview({ go }: { go: (page: string) => void }) {
  const all = useSubmissions()
  const [announcements, setAnnouncements] = useState(0)
  useEffect(() => {
    const load = () => listAnnouncements().then((a) => setAnnouncements(a.length))
    load()
    return onAnnouncementsChange(load)
  }, [])
  return (
    <>
      <header className="module-header">
        <div>
          <span>Sitio web</span>
          <h1>Solicitudes del sitio</h1>
          <p>Todo lo que las personas envían desde la página pública de MAI.</p>
        </div>
      </header>
      <ConnectionNotice />
      <div className="web-overview">
        <button onClick={() => go("Anuncios")} className="web-overview-main">
          <span>Anuncios</span>
          <strong>{announcements}</strong>
          <small>Crear, editar y publicar</small>
        </button>
        {Object.entries(webPages).map(([page, kind]) => {
          const items = all.filter((s) => s.kind === kind)
          const pending = items.filter((s) => s.status === "nueva").length
          return (
            <button key={page} onClick={() => go(page)}>
              <span>{copy[kind].title}</span>
              <strong>{items.length}</strong>
              <small>{pending ? `${pending} sin atender` : "Todo al día"}</small>
            </button>
          )
        })}
      </div>
    </>
  )
}

export default function WebInbox({ kind }: { kind: SubmissionKind }) {
  const items = useSubmissions(kind)
  const [filter, setFilter] = useState<SubmissionStatus | "todas">("todas")
  const [eventFilter, setEventFilter] = useState("")
  const statusLabel = labelsFor(kind)
  const events = kind === "inscripcion" ? [...new Set(items.map((s) => (s.data as InscriptionData).eventTitle))] : []
  const byEvent = eventFilter ? items.filter((s) => (s.data as InscriptionData).eventTitle === eventFilter) : items
  const shown = filter === "todas" ? byEvent : byEvent.filter((s) => s.status === filter)
  const count = (s: SubmissionStatus) => items.filter((i) => i.status === s).length

  return (
    <>
      <header className="module-header">
        <div>
          <span>Sitio web</span>
          <h1>{copy[kind].title}</h1>
          <p>{copy[kind].text}</p>
        </div>
      </header>
      <ConnectionNotice />
      <div className="module-stats">
        <div>
          <span>Total</span>
          <strong>{items.length}</strong>
          <small>Desde el sitio web</small>
        </div>
        <div>
          <span>{statusLabel.nueva}</span>
          <strong>{count("nueva")}</strong>
          <small>Requieren atención</small>
        </div>
        <div>
          <span>{statusLabel.en_proceso}</span>
          <strong>{count("en_proceso")}</strong>
          <small>Alguien las está atendiendo</small>
        </div>
        <div>
          <span>{statusLabel.atendida}</span>
          <strong>{count("atendida")}</strong>
          <small>Completadas</small>
        </div>
      </div>

      <section className="panel web-panel">
        <div className="web-filters">
          {(["todas", "nueva", "en_proceso", "atendida"] as const).map((f) => (
            <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
              {f === "todas" ? "Todas" : statusLabel[f]}
            </button>
          ))}
          {events.length > 0 && (
            <select className="web-event-filter" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} aria-label="Filtrar por evento">
              <option value="">Todos los eventos</option>
              {events.map((ev) => (
                <option key={ev}>{ev}</option>
              ))}
            </select>
          )}
        </div>

        {shown.length === 0 ? (
          <p className="web-empty">{copy[kind].empty}</p>
        ) : (
          <div className="web-list">
            {shown.map((item) => {
              const wa = whatsappLink(phoneOf(item) || "")
              return (
                <article className="web-card" key={item.id}>
                  <div className="web-card-top">
                    <span className={`status-pill ${statusTone[item.status]}`}>
                      {statusLabel[item.status]}
                    </span>
                    <time>{formatDate(item.createdAt)}</time>
                  </div>
                  <Details item={item} />
                  <div className="web-card-actions">
                    <select
                      value={item.status}
                      onChange={(e) => updateSubmission(item.id, e.target.value as SubmissionStatus)}
                      aria-label="Cambiar estado"
                    >
                      {Object.entries(statusLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer" className="web-wa">
                        Escribir por WhatsApp
                      </a>
                    )}
                    <button
                      className="web-delete"
                      onClick={() => {
                        if (window.confirm("¿Eliminar esta solicitud?")) deleteSubmission(item.id)
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
