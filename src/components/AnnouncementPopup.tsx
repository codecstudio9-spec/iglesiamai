import { FormEvent, useCallback, useEffect, useState } from "react"
import Icon from "./Icon"
import { PreviewNote } from "./PublicWidgets"
import {
  activeAnnouncements,
  formatEventDate,
  onAnnouncementsChange,
  type Announcement,
} from "../lib/announcements"
import { compressImage, getFileUrl, MAX_UPLOAD_BYTES, putFile } from "../lib/files"
import { saveSubmission } from "../lib/submissions"

const SEEN_KEY = "mai.anuncios.vistos"

function seenMap(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) || "{}")
  } catch {
    return {}
  }
}

function markSeen(items: Announcement[]) {
  try {
    const map = seenMap()
    items.forEach((a) => (map[a.id] = a.updatedAt))
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(map))
  } catch {
    // Without storage the popup simply shows again next time.
  }
}

/** Opens the announcements popup (optionally at a given announcement). */
export function openAnnouncement(id?: string) {
  window.dispatchEvent(new CustomEvent("mai:anuncio", { detail: id }))
}

export function useFileUrl(id: string | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setUrl(null)
    if (id) getFileUrl(id).then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [id])
  return url
}

export function useActiveAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([])
  useEffect(() => {
    const load = () => activeAnnouncements().then(setItems)
    load()
    return onAnnouncementsChange(load)
  }, [])
  return items
}

/* ------------------------------------------------------------------ */

export function AnnouncementCard({
  item,
  onCta,
  onLater,
  preview = false,
}: {
  item: Announcement | (Omit<Announcement, "id" | "createdAt" | "updatedAt"> & { id?: string })
  onCta?: () => void
  onLater?: () => void
  preview?: boolean
}) {
  const image = useFileUrl(item.imageId)
  const date = formatEventDate(item.eventDate, item.eventTime)
  return (
    <div className={`announce-card ${image ? "" : "announce-no-image"} ${preview ? "announce-preview" : ""}`}>
      {image && (
        <figure className="announce-image">
          <img src={image} alt="" />
        </figure>
      )}
      <div className="announce-content">
        <p className="announce-kicker">{item.kicker || "Anuncio"}</p>
        <h2>{item.title || "Título del anuncio"}</h2>
        {(date || item.location) && (
          <ul className="announce-meta">
            {date && (
              <li>
                <Icon name="clock" />
                <span>{date}</span>
              </li>
            )}
            {item.location && (
              <li>
                <Icon name="pin" />
                <span>{item.location}</span>
              </li>
            )}
          </ul>
        )}
        {item.description && <p className="announce-text">{item.description}</p>}
        {item.price && (
          <p className="announce-price">
            <small>Inversión</small>
            {item.price}
          </p>
        )}
        <div className="announce-actions">
          {item.ctaType === "ninguno" ? (
            <button className="button button-primary" onClick={onLater}>
              Entendido
            </button>
          ) : item.ctaType === "enlace" ? (
            <a className="button button-primary" href={item.ctaUrl || "#"} target="_blank" rel="noreferrer" onClick={onCta}>
              {item.ctaLabel || "Ver más"} <Icon name="arrow" />
            </a>
          ) : (
            <button className="button button-primary" onClick={onCta}>
              {item.ctaLabel || "Inscríbete aquí"} <Icon name="arrow" />
            </button>
          )}
          {item.ctaType !== "ninguno" && (
            <button className="announce-later" onClick={onLater}>
              Ahora no
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function RegistrationForm({ item, onDone, onBack }: { item: Announcement; onDone: () => void; onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (item.requiresPayment && !file) {
      setError("Adjunta el comprobante de pago para completar tu inscripción.")
      return
    }
    if (file && file.size > MAX_UPLOAD_BYTES) {
      setError("El archivo es muy pesado. Sube una foto o PDF de máximo 8 MB.")
      return
    }
    setSending(true)
    try {
      const f = new FormData(e.currentTarget)
      const proofFileId = file ? await putFile(await compressImage(file), "comprobantes") : null
      await saveSubmission("inscripcion", {
        announcementId: item.id,
        eventTitle: item.title,
        name: String(f.get("name") || ""),
        phone: String(f.get("phone") || ""),
        email: String(f.get("email") || ""),
        attendees: String(f.get("attendees") || "1"),
        notes: String(f.get("notes") || ""),
        proofFileId,
        proofName: file?.name ?? "",
      })
      onDone()
    } catch {
      setError("No pudimos guardar tu inscripción. Inténtalo de nuevo.")
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="announce-form" onSubmit={submit}>
      <button type="button" className="announce-back" onClick={onBack}>
        ← Volver
      </button>
      <p className="announce-kicker">Inscripción</p>
      <h2>{item.title}</h2>
      <div className="form-row">
        <label>
          Nombre completo
          <input name="name" required autoComplete="name" placeholder="Tu nombre" />
        </label>
        <label>
          WhatsApp
          <input name="phone" required type="tel" autoComplete="tel" placeholder="+57" />
        </label>
      </div>
      <div className="form-row">
        <label>
          Correo <span>Opcional</span>
          <input name="email" type="email" autoComplete="email" placeholder="tu@correo.com" />
        </label>
        <label>
          Personas
          <select name="attendees" defaultValue="1">
            {["1", "2", "3", "4", "5 o más"].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      {item.requiresPayment && (
        <div className="payment-box">
          <p>
            <strong>{item.price ? `Valor: ${item.price}` : "Pago de la inscripción"}</strong>
          </p>
          {item.paymentInfo && <p className="payment-info">{item.paymentInfo}</p>}
        </div>
      )}

      <label className={`upload ${file ? "upload-ready" : ""}`}>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Icon name={file ? "check" : "arrow"} />
        <span>
          {file ? file.name : "Sube tu comprobante de pago"}
          <small>
            {file
              ? "Toca para cambiar el archivo"
              : item.requiresPayment
                ? "Foto o PDF · máximo 8 MB"
                : "Opcional · foto o PDF · máximo 8 MB"}
          </small>
        </span>
      </label>

      <label>
        Comentarios <span>Opcional</span>
        <textarea name="notes" rows={2} placeholder="¿Algo que debamos saber?" />
      </label>

      {error && <p className="form-error">{error}</p>}

      <button className="submit-button" type="submit" disabled={sending}>
        {sending ? "Enviando…" : "Confirmar inscripción"} <Icon name="arrow" />
      </button>
    </form>
  )
}

export default function AnnouncementPopup() {
  const items = useActiveAnnouncements()
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<"info" | "form" | "done">("info")

  // Show automatically once per visit (again if an announcement is edited).
  useEffect(() => {
    if (!items.length) return
    const seen = seenMap()
    const fresh = items.filter((a) => seen[a.id] !== a.updatedAt)
    if (!fresh.length) return
    const t = window.setTimeout(() => {
      setIndex(items.indexOf(fresh[0]))
      setStep("info")
      setOpen(true)
    }, 1400)
    return () => window.clearTimeout(t)
  }, [items])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string | undefined>).detail
      const i = id ? items.findIndex((a) => a.id === id) : 0
      if (!items.length) return
      setIndex(Math.max(0, i))
      setStep("info")
      setOpen(true)
    }
    window.addEventListener("mai:anuncio", onOpen)
    return () => window.removeEventListener("mai:anuncio", onOpen)
  }, [items])

  const close = useCallback(() => {
    markSeen(items)
    setOpen(false)
  }, [items])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, close])

  if (!open || !items[index]) return null
  const item = items[index]
  const move = (d: number) => {
    setIndex((index + d + items.length) % items.length)
    setStep("info")
  }

  return (
    <div className="announce-backdrop" onClick={close}>
      <div className="announce-dialog" role="dialog" aria-modal="true" aria-label={item.title} onClick={(e) => e.stopPropagation()}>
        <button className="announce-close" onClick={close} aria-label="Cerrar">
          <Icon name="close" />
        </button>

        {step === "info" && (
          <AnnouncementCard
            key={item.id}
            item={item}
            onCta={() => (item.ctaType === "inscripcion" ? setStep("form") : close())}
            onLater={close}
          />
        )}
        {step === "form" && <RegistrationForm item={item} onDone={() => setStep("done")} onBack={() => setStep("info")} />}
        {step === "done" && (
          <div className="announce-done">
            <span>
              <Icon name="check" />
            </span>
            <h2>¡Inscripción recibida!</h2>
            <p>
              Gracias por inscribirte a <strong>{item.title}</strong>. Nuestro equipo verificará tu
              información y te escribirá por WhatsApp para confirmar.
            </p>
            <PreviewNote />
            <button className="button button-primary" onClick={close}>
              Cerrar
            </button>
          </div>
        )}

        {items.length > 1 && step === "info" && (
          <div className="announce-nav">
            <button onClick={() => move(-1)} aria-label="Anuncio anterior">
              <Icon name="arrow" />
            </button>
            <span>
              {index + 1} / {items.length}
            </span>
            <button onClick={() => move(1)} aria-label="Anuncio siguiente">
              <Icon name="arrow" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
