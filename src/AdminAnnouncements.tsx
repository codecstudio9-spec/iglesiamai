import { FormEvent, useEffect, useState } from "react"
import { AnnouncementCard, useFileUrl } from "./components/AnnouncementPopup"
import {
  deleteAnnouncement,
  emptyAnnouncement,
  formatEventDate,
  listAnnouncements,
  onAnnouncementsChange,
  saveAnnouncement,
  setAnnouncementActive,
  type Announcement,
  type AnnouncementDraft,
  type CtaType,
} from "./lib/announcements"
import { compressImage, deleteFile, MAX_UPLOAD_BYTES, putFile } from "./lib/files"
import {
  BACKEND_CONNECTED,
  listSubmissions,
  onSubmissionsChange,
  type InscriptionData,
} from "./lib/submissions"

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function visibility(a: Announcement): [string, string] {
  if (!a.active) return ["Oculto", ""]
  if (a.showFrom && a.showFrom > today()) return ["Programado", "pill-blue"]
  if (a.showUntil && a.showUntil < today()) return ["Vencido", "pill-warn"]
  return ["Publicado", "pill-ok"]
}

function useAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([])
  useEffect(() => {
    const load = () => listAnnouncements().then(setItems)
    load()
    return onAnnouncementsChange(load)
  }, [])
  return items
}

function useInscriptionCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    const load = () =>
      listSubmissions("inscripcion").then((items) => {
        const c: Record<string, number> = {}
        items.forEach((s) => {
          const id = (s.data as InscriptionData).announcementId
          c[id] = (c[id] ?? 0) + 1
        })
        setCounts(c)
      })
    load()
    return onSubmissionsChange(load)
  }, [])
  return counts
}

function Thumb({ id }: { id: string | null }) {
  const url = useFileUrl(id)
  return url ? <img src={url} alt="" /> : <div className="ann-thumb-empty">Sin imagen</div>
}

/* ------------------------------------------------------------------ */

function Editor({
  initial,
  editingId,
  onClose,
}: {
  initial: AnnouncementDraft
  editingId?: string
  onClose: () => void
}) {
  const [draft, setDraft] = useState<AnnouncementDraft>(initial)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [newImages, setNewImages] = useState<string[]>([])

  const set = <K extends keyof AnnouncementDraft>(key: K, value: AnnouncementDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  async function onImage(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES * 2) {
      setError("La imagen es muy pesada (máximo 16 MB).")
      return
    }
    try {
      const id = await putFile(await compressImage(file, 1800), "anuncios")
      setNewImages((ids) => [...ids, id])
      set("imageId", id)
    } catch {
      setError("No pudimos subir la imagen. Revisa tu conexión e inténtalo de nuevo.")
    }
  }

  async function cancel() {
    // Discard images uploaded during this edit that were not saved.
    await Promise.all(newImages.map((id) => deleteFile(id).catch(() => undefined)))
    onClose()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!draft.title.trim()) return setError("Escribe un título para el anuncio.")
    if (draft.ctaType === "enlace" && !/^https?:\/\//.test(draft.ctaUrl))
      return setError("El enlace del botón debe empezar con https://")
    if (draft.showFrom && draft.showUntil && draft.showFrom > draft.showUntil)
      return setError("La fecha 'Mostrar hasta' debe ser posterior a 'Mostrar desde'.")
    setSaving(true)
    try {
      await saveAnnouncement(draft, editingId)
    } catch {
      setSaving(false)
      return setError("No pudimos guardar el anuncio. Revisa tu conexión e inténtalo de nuevo.")
    }
    // Saved: now remove images replaced during this edit (and the previous one if changed).
    const unused = newImages.filter((id) => id !== draft.imageId)
    if (initial.imageId && initial.imageId !== draft.imageId) unused.push(initial.imageId)
    await Promise.all(unused.map((id) => deleteFile(id).catch(() => undefined)))
    onClose()
  }

  const ctaOptions: [CtaType, string][] = [
    ["inscripcion", "Formulario de inscripción"],
    ["enlace", "Enlace externo"],
    ["ninguno", "Sin botón"],
  ]

  return (
    <div className="ann-editor">
      <form className="panel ann-form" onSubmit={submit}>
        <h2>{editingId ? "Editar anuncio" : "Nuevo anuncio"}</h2>

        <fieldset>
          <legend>Contenido</legend>
          <label>
            Etiqueta
            <input
              list="ann-kickers"
              value={draft.kicker}
              onChange={(e) => set("kicker", e.target.value)}
              placeholder="Próximo evento"
            />
            <datalist id="ann-kickers">
              <option>Próximo evento</option>
              <option>Encuentro</option>
              <option>Convención</option>
              <option>Anuncio importante</option>
              <option>Retiro</option>
            </datalist>
          </label>
          <label>
            Título *
            <input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Convención de Hombres 2026" required />
          </label>
          <label>
            Descripción
            <textarea rows={4} value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="Cuenta de qué se trata, a quién va dirigido y por qué no se lo pueden perder." />
          </label>
          <div className="ann-image-field">
            <div className="ann-image-preview">
              <Thumb id={draft.imageId} />
            </div>
            <div>
              <label className="ann-upload">
                <input type="file" accept="image/*" onChange={(e) => onImage(e.target.files?.[0])} />
                {draft.imageId ? "Cambiar imagen" : "Subir imagen o flyer"}
              </label>
              {draft.imageId && (
                <button type="button" className="ann-link-danger" onClick={() => set("imageId", null)}>
                  Quitar imagen
                </button>
              )}
              <small>Recomendado: vertical o cuadrada, como un flyer de Instagram.</small>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Evento</legend>
          <div className="ann-row">
            <label>
              Fecha
              <input type="date" value={draft.eventDate} onChange={(e) => set("eventDate", e.target.value)} />
            </label>
            <label>
              Hora
              <input value={draft.eventTime} onChange={(e) => set("eventTime", e.target.value)} placeholder="7:00 PM" />
            </label>
          </div>
          <label>
            Lugar
            <input value={draft.location} onChange={(e) => set("location", e.target.value)} placeholder="Sede MAI · Av. Boyacá #8-13" />
          </label>
        </fieldset>

        <fieldset>
          <legend>Llamado a la acción</legend>
          <div className="ann-segment">
            {ctaOptions.map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={draft.ctaType === value ? "active" : ""}
                onClick={() => {
                  set("ctaType", value)
                  if (value === "inscripcion" && !draft.ctaLabel) set("ctaLabel", "Inscríbete aquí")
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {draft.ctaType !== "ninguno" && (
            <label>
              Texto del botón
              <input value={draft.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="Inscríbete aquí" />
            </label>
          )}
          {draft.ctaType === "enlace" && (
            <label>
              Enlace
              <input value={draft.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="https://..." />
            </label>
          )}
          {draft.ctaType === "inscripcion" && (
            <>
              <label className="ann-check">
                <input type="checkbox" checked={draft.requiresPayment} onChange={(e) => set("requiresPayment", e.target.checked)} />
                Tiene costo: pedir comprobante de pago
              </label>
              {draft.requiresPayment && (
                <>
                  <label>
                    Valor
                    <input value={draft.price} onChange={(e) => set("price", e.target.value)} placeholder="$80.000 por persona" />
                  </label>
                  <label>
                    Instrucciones de pago
                    <textarea rows={3} value={draft.paymentInfo} onChange={(e) => set("paymentInfo", e.target.value)} placeholder={"Nequi 300 000 0000 a nombre de Iglesia MAI\nCuenta de ahorros Bancolombia 000-000000-00"} />
                  </label>
                </>
              )}
            </>
          )}
        </fieldset>

        <fieldset>
          <legend>Publicación</legend>
          <label className="ann-check">
            <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} />
            Publicado (se muestra en la página)
          </label>
          <div className="ann-row">
            <label>
              Mostrar desde
              <input type="date" value={draft.showFrom} onChange={(e) => set("showFrom", e.target.value)} />
            </label>
            <label>
              Mostrar hasta
              <input type="date" value={draft.showUntil} onChange={(e) => set("showUntil", e.target.value)} />
            </label>
          </div>
          <small>Déjalo en blanco para mostrarlo desde hoy y sin fecha de fin.</small>
        </fieldset>

        {error && <p className="ann-error">{error}</p>}

        <div className="ann-form-actions">
          <button type="button" className="secondary-action" onClick={cancel}>
            Cancelar
          </button>
          <button type="submit" className="admin-primary" disabled={saving}>
            {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Publicar anuncio"}
          </button>
        </div>
      </form>

      <aside className="ann-live">
        <span>Vista previa en la página</span>
        <div className="ann-live-frame">
          <AnnouncementCard item={draft} preview />
        </div>
      </aside>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function AdminAnnouncements({ go }: { go: (page: string) => void }) {
  const items = useAnnouncements()
  const counts = useInscriptionCounts()
  const [editing, setEditing] = useState<{ id?: string; draft: AnnouncementDraft } | null>(null)

  if (editing) {
    return (
      <>
        <header className="module-header">
          <div>
            <span>Sitio web · Anuncios</span>
            <h1>{editing.id ? "Editar anuncio" : "Nuevo anuncio"}</h1>
            <p>Lo que escribas aquí aparecerá en una ventana elegante al abrir la página.</p>
          </div>
        </header>
        <Editor key={editing.id ?? "new"} initial={editing.draft} editingId={editing.id} onClose={() => setEditing(null)} />
      </>
    )
  }

  return (
    <>
      <header className="module-header">
        <div>
          <span>Sitio web</span>
          <h1>Anuncios</h1>
          <p>Eventos, encuentros y convocatorias que aparecen como ventana emergente al abrir la página.</p>
        </div>
        <div>
          <button className="admin-primary" onClick={() => setEditing({ draft: { ...emptyAnnouncement } })}>
            + Nuevo anuncio
          </button>
        </div>
      </header>

      {!BACKEND_CONNECTED && (
        <div className="web-notice">
          <strong>Modo vista previa.</strong> Mientras Supabase no esté conectado, los anuncios solo se
          ven en este navegador. Al conectarlo, todas las personas que abran la página los verán.
        </div>
      )}

      {items.length === 0 ? (
        <section className="panel ann-empty">
          <h2>Aún no hay anuncios</h2>
          <p>Crea el primero: por ejemplo, el próximo Encuentro o la Convención de Hombres con su botón “Inscríbete aquí”.</p>
          <button className="admin-primary" onClick={() => setEditing({ draft: { ...emptyAnnouncement } })}>
            + Crear anuncio
          </button>
        </section>
      ) : (
        <div className="ann-list">
          {items.map((a) => {
            const [label, tone] = visibility(a)
            const { id, createdAt, updatedAt, ...draft } = a
            void createdAt
            void updatedAt
            return (
              <article className="panel ann-item" key={id}>
                <div className="ann-thumb">
                  <Thumb id={a.imageId} />
                </div>
                <div className="ann-body">
                  <div className="ann-top">
                    <span className={`status-pill ${tone}`}>{label}</span>
                    <small>{a.kicker}</small>
                  </div>
                  <h3>{a.title}</h3>
                  <p>{[formatEventDate(a.eventDate, a.eventTime), a.location].filter(Boolean).join(" · ") || "Sin fecha definida"}</p>
                  <dl>
                    <dt>Botón</dt>
                    <dd>{a.ctaType === "ninguno" ? "Sin botón" : a.ctaLabel}</dd>
                    {a.ctaType === "inscripcion" && (
                      <>
                        <dt>Inscritos</dt>
                        <dd>{counts[id] ?? 0}</dd>
                        <dt>Pago</dt>
                        <dd>{a.requiresPayment ? a.price || "Con comprobante" : "Gratis"}</dd>
                      </>
                    )}
                  </dl>
                  <div className="ann-actions">
                    <button onClick={() => setEditing({ id, draft })}>Editar</button>
                    <button onClick={() => setAnnouncementActive(id, !a.active)}>{a.active ? "Ocultar" : "Publicar"}</button>
                    {a.ctaType === "inscripcion" && <button onClick={() => go("Inscripciones")}>Ver inscripciones</button>}
                    <button
                      className="ann-link-danger"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el anuncio "${a.title}"? Esta acción no se puede deshacer.`)) deleteAnnouncement(id)
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
