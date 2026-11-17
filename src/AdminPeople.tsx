/**
 * Real people data in the panel: Personas, profiles, Líderes, Mis discípulos,
 * the programs (Encuentro, Misión 180, Destino), notifications and the public
 * sign-up through a leader's personal link (src/lib/people.ts, supabase/personas.sql).
 */
import { FormEvent, useCallback, useContext, useEffect, useMemo, useState } from "react"
import QRCode from "qrcode"
import { AdminLogo, AIcon, PageHeader, PanelTitle, StatusPill, type AdminIcon } from "./AdminApp"
import { PersonRecords } from "./AdminRecords"
import { MyAccess } from "./AdminUsers"
import {
  blobToDataUrl,
  deletePerson,
  discipleLink,
  emptyPerson,
  getPerson,
  isLeaderRole,
  joinLeader,
  listPeople,
  listTeam,
  onPeopleChange,
  PERSON_ROLES,
  photoUrls,
  preparePhoto,
  readLeaderLink,
  removePhoto,
  savePerson,
  setStaffPhoto,
  updatePerson,
  uploadPhoto,
  type LeaderPreview,
  type Person,
  type PersonInput,
  type PersonStatus,
  type TeamMember,
} from "./lib/people"
import { SettingsContext, type Program } from "./lib/settings"
import { can, createInvitation, invitationState, listInvitations, listStaff, onInvitationsChange, onStaffChange } from "./lib/staff"
import { listSubmissions } from "./lib/submissions"
import { onTableChange } from "./lib/supabase"

/* ---------------------------------------------------------------- */
/* Small shared pieces                                                */
/* ---------------------------------------------------------------- */

export function useLiveData<T>(load: () => Promise<T>, subscribe: ((cb: () => void) => () => void)[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let alive = true
    const refresh = () =>
      load()
        .then((d) => alive && (setData(d), setError(false), setLoaded(true)))
        .catch(() => alive && setError(true))
    refresh()
    const offs = subscribe.map((s) => s(refresh))
    return () => {
      alive = false
      offs.forEach((off) => off())
    }
    // The loaders and subscriptions are stable module functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load])
  return { data, error, loaded }
}

const onTeamChange = (cb: () => void) => {
  const a = onStaffChange(cb)
  const b = onPeopleChange(cb)
  return () => (a(), b())
}

export function usePhotos(paths: (string | null | undefined)[]) {
  const key = paths.filter(Boolean).sort().join("|")
  const [urls, setUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!key) return
    let alive = true
    photoUrls(key.split("|")).then((u) => alive && setUrls(u))
    return () => {
      alive = false
    }
  }, [key])
  return urls
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  )
}

export function Avatar({ url, name, size = 35 }: { url?: string; name: string; size?: number }) {
  const style = { width: size, height: size, flexBasis: size, fontSize: Math.max(11, size / 3) }
  return url ? (
    <img className="person-photo" src={url} alt="" style={style} />
  ) : (
    <span className="user-avatar" style={style}>
      {initials(name)}
    </span>
  )
}

export function formatDate(iso: string | null | undefined, withYear = true) {
  if (!iso) return "—"
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) })
}

export function timeAgo(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return "Ahora"
  if (min < 60) return `Hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `Hace ${h} h`
  const d = Math.round(h / 24)
  if (d < 30) return `Hace ${d} ${d === 1 ? "día" : "días"}`
  return formatDate(iso)
}

const statusPill: Record<PersonStatus, [string, string]> = {
  activo: ["Activo", "pill-ok"],
  pendiente: ["Por aceptar", "pill-warn"],
  inactivo: ["Inactivo", ""],
  rechazado: ["Rechazado", ""],
}

function programName(programs: Program[], id: string) {
  return programs.find((p) => p.id === id)?.name ?? ""
}

function waLink(phone: string, text = "") {
  const digits = phone.replace(/\D/g, "")
  const full = digits.length === 10 ? `57${digits}` : digits
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n")
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/** Photo chooser with preview; the file is uploaded by whoever saves the form. */
function PhotoField({ current, onPick, label = "Foto" }: { current?: string; onPick: (blob: Blob | null, preview: string) => void; label?: string }) {
  const [preview, setPreview] = useState(current ?? "")
  const [error, setError] = useState("")
  useEffect(() => setPreview(current ?? ""), [current])
  async function pick(file?: File) {
    if (!file) return
    setError("")
    try {
      const blob = await preparePhoto(file)
      const url = URL.createObjectURL(blob)
      setPreview(url)
      onPick(blob, url)
    } catch (err) {
      setError((err as Error).message)
    }
  }
  return (
    <div className="photo-upload">
      <div>{preview ? <img src={preview} alt="Vista previa" /> : <AIcon name="people" />}</div>
      <label>
        {label}
        <span>{error || (preview ? "Toca para cambiarla" : "JPG o PNG · desde la galería o la cámara")}</span>
        <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {preview && (
        <button
          type="button"
          className="photo-remove"
          onClick={() => {
            setPreview("")
            onPick(null, "")
          }}
        >
          Quitar
        </button>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Person form (create / edit)                                        */
/* ---------------------------------------------------------------- */

export function PersonModal({
  person,
  defaults,
  close,
  onSaved,
}: {
  person?: Person
  defaults?: Partial<PersonInput>
  close: () => void
  onSaved?: (p: Person) => void
}) {
  const settings = useContext(SettingsContext)
  const me = useContext(MyAccess)
  const team = useLiveData(listTeam, [onStaffChange])
  const urls = usePhotos([person?.photoPath])
  const [form, setForm] = useState<PersonInput>(() => (person ? { ...person } : emptyPerson(defaults)))
  const [photo, setPhoto] = useState<{ blob: Blob | null; changed: boolean }>({ blob: null, changed: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const set = <K extends keyof PersonInput>(k: K, v: PersonInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const program = settings.programas.find((p) => p.id === form.program)
  const canPickLeader = can(me, "personas")

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    let uploaded: string | null = null
    try {
      let photoPath = form.photoPath
      if (photo.changed) {
        uploaded = photo.blob ? await uploadPhoto(photo.blob, "personas") : null
        photoPath = uploaded
      }
      const saved = await savePerson({ ...form, photoPath }, person?.id)
      if (photo.changed && person?.photoPath && person.photoPath !== photoPath) await removePhoto(person.photoPath)
      onSaved?.(saved)
      close()
    } catch (err) {
      if (uploaded) await removePhoto(uploaded)
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const leaders = (team.data ?? []).filter((t) => isLeaderRole(t.roleLabel) || t.userId === form.leaderId || t.userId === me?.userId)

  return (
    <div className="modal-layer">
      <button className="modal-scrim" onClick={close} aria-label="Cerrar" />
      <section className="invite-modal person-modal" role="dialog" aria-modal="true" aria-label={person ? "Editar persona" : "Registrar persona"}>
        <header>
          <div>
            <span>Personas</span>
            <h2>{person ? "Editar persona" : "Registrar persona"}</h2>
          </div>
          <button onClick={close} aria-label="Cerrar">
            <AIcon name="close" />
          </button>
        </header>
        <form onSubmit={submit}>
          <PhotoField current={person?.photoPath ? urls[person.photoPath] : undefined} onPick={(blob) => setPhoto({ blob, changed: true })} />
          <div className="invite-fields">
            <label className="field-full">
              Nombre completo
              <input required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Nombre y apellidos" />
            </label>
            <label>
              Tipo de documento
              <select value={form.docType} onChange={(e) => set("docType", e.target.value)}>
                <option value="CC">Cédula de ciudadanía</option>
                <option value="CE">Cédula de extranjería</option>
                <option value="TI">Tarjeta de identidad</option>
                <option value="RC">Registro civil</option>
                <option value="PA">Pasaporte</option>
              </select>
            </label>
            <label>
              Número de documento
              <input value={form.docNumber} onChange={(e) => set("docNumber", e.target.value)} inputMode="numeric" placeholder="Opcional" />
            </label>
            <label>
              Teléfono / WhatsApp
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} type="tel" placeholder="300 000 0000" />
            </label>
            <label>
              Correo
              <input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" placeholder="Opcional" />
            </label>
            <label>
              Fecha de nacimiento
              <input value={form.birthDate ?? ""} onChange={(e) => set("birthDate", e.target.value || null)} type="date" />
            </label>
            <label>
              Género
              <select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Sin especificar</option>
                <option>Femenino</option>
                <option>Masculino</option>
              </select>
            </label>
            <label className="field-full">
              Dirección
              <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Barrio y dirección" />
            </label>
            <label className="field-full">
              Contacto de emergencia
              <input value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} placeholder="Nombre y teléfono" />
            </label>
            <label>
              Rol en la iglesia
              <select value={form.role} onChange={(e) => set("role", e.target.value)}>
                {PERSON_ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Estado
              <select value={form.status} onChange={(e) => set("status", e.target.value as PersonStatus)}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                {form.status === "pendiente" && <option value="pendiente">Por aceptar</option>}
              </select>
            </label>
            <label>
              Líder que lo acompaña
              <select value={form.leaderId ?? ""} onChange={(e) => set("leaderId", e.target.value || null)} disabled={!canPickLeader}>
                <option value="">Sin líder asignado</option>
                {leaders.map((t) => (
                  <option key={t.userId} value={t.userId}>
                    {t.name}
                    {t.roleLabel ? ` · ${t.roleLabel}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Proceso / programa
              <select
                value={form.program}
                onChange={(e) => {
                  const next = settings.programas.find((p) => p.id === e.target.value)
                  setForm((f) => ({ ...f, program: e.target.value, programStep: next?.steps[0] ?? "" }))
                }}
              >
                <option value="">Ninguno por ahora</option>
                {settings.programas
                  .filter((p) => p.active || p.id === form.program)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            {program && program.steps.length > 0 && (
              <label className="field-full">
                Etapa en {program.name}
                <select value={form.programStep} onChange={(e) => set("programStep", e.target.value)}>
                  {program.steps.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="field-full">
              Observaciones
              <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Algo importante para acompañarlo mejor" />
            </label>
          </div>
          {error && <p className="users-error">{error}</p>}
          <button className="modal-primary" type="submit" disabled={saving}>
            {saving ? "Guardando..." : person ? "Guardar cambios" : "Registrar persona"} <AIcon name="check" />
          </button>
        </form>
      </section>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Personas                                                           */
/* ---------------------------------------------------------------- */

export function PeoplePage({ openPerson, initialQuery = "" }: { openPerson: (id: string) => void; initialQuery?: string }) {
  const settings = useContext(SettingsContext)
  const me = useContext(MyAccess)
  const people = useLiveData(listPeople, [onPeopleChange])
  const team = useLiveData(listTeam, [onStaffChange])
  const [query, setQuery] = useState(initialQuery)
  const [filter, setFilter] = useState({ status: "", program: "", role: "", leader: "" })
  const [adding, setAdding] = useState(false)
  const [page, setPage] = useState(0)
  useEffect(() => setQuery(initialQuery), [initialQuery])

  const all = people.data ?? []
  const leaderName = useMemo(() => Object.fromEntries((team.data ?? []).map((t) => [t.userId, t.name])), [team.data])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(
      (p) =>
        (!q || `${p.fullName} ${p.docNumber} ${p.phone} ${p.email}`.toLowerCase().includes(q)) &&
        (!filter.status ? p.status !== "rechazado" : p.status === filter.status) &&
        (!filter.program || p.program === filter.program) &&
        (!filter.role || p.role === filter.role) &&
        (!filter.leader || (filter.leader === "none" ? !p.leaderId : p.leaderId === filter.leader)),
    )
  }, [all, query, filter])
  useEffect(() => setPage(0), [query, filter])
  const urls = usePhotos(shown.slice(page * 25, page * 25 + 25).map((p) => p.photoPath))

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
  const active = all.filter((p) => p.status === "activo")
  const pages = Math.max(1, Math.ceil(shown.length / 25))

  function exportCsv() {
    downloadCsv(`personas-mai-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Nombre", "Documento", "Teléfono", "Correo", "Nacimiento", "Dirección", "Rol", "Programa", "Etapa", "Líder", "Estado", "Registrada"],
      ...shown.map((p) => [
        p.fullName,
        p.docNumber ? `${p.docType} ${p.docNumber}` : "",
        p.phone,
        p.email,
        p.birthDate ?? "",
        p.address,
        p.role,
        programName(settings.programas, p.program),
        p.programStep,
        p.leaderId ? leaderName[p.leaderId] ?? "" : "",
        statusPill[p.status][0],
        p.createdAt.slice(0, 10),
      ]),
    ])
  }

  return (
    <>
      <PageHeader
        eyebrow="Base de datos"
        title="Personas"
        copy="El centro de cada proceso, equipo y etapa dentro de MAI."
        primary={can(me, "personas") ? "Registrar persona" : undefined}
        onPrimary={() => setAdding(true)}
        onExport={shown.length ? exportCsv : undefined}
      />
      <div className="module-stats">
        <div>
          <span>Total personas</span>
          <strong>{people.data ? all.filter((p) => p.status !== "rechazado").length : "—"}</strong>
          <small>En la base de datos</small>
        </div>
        <div>
          <span>Activas</span>
          <strong>{people.data ? active.length : "—"}</strong>
          <small>{all.length ? `${Math.round((active.length / all.length) * 100)}% de la base` : "Aún sin registros"}</small>
        </div>
        <div>
          <span>Nuevas este mes</span>
          <strong>{people.data ? all.filter((p) => new Date(p.createdAt).getTime() >= monthStart).length : "—"}</strong>
          <small>Registradas desde el día 1</small>
        </div>
        <div>
          <span>Sin líder asignado</span>
          <strong>{people.data ? active.filter((p) => !p.leaderId).length : "—"}</strong>
          <small>Requieren atención</small>
        </div>
      </div>
      <section className="panel table-panel">
        <div className="table-tools people-tools">
          <div className="admin-search">
            <AIcon name="search" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, documento o teléfono..." />
          </div>
          <select value={filter.program} onChange={(e) => setFilter((f) => ({ ...f, program: e.target.value }))} aria-label="Programa">
            <option value="">Todos los procesos</option>
            {settings.programas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select value={filter.role} onChange={(e) => setFilter((f) => ({ ...f, role: e.target.value }))} aria-label="Rol">
            <option value="">Todos los roles</option>
            {PERSON_ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select value={filter.leader} onChange={(e) => setFilter((f) => ({ ...f, leader: e.target.value }))} aria-label="Líder">
            <option value="">Todos los líderes</option>
            <option value="none">Sin líder</option>
            {(team.data ?? []).map((t) => (
              <option key={t.userId} value={t.userId}>
                {t.name}
              </option>
            ))}
          </select>
          <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="pendiente">Por aceptar</option>
            <option value="inactivo">Inactivos</option>
            <option value="rechazado">Rechazados</option>
          </select>
        </div>
        {people.error && <p className="users-error">No pudimos cargar las personas. Revisa tu conexión.</p>}
        {people.data && shown.length === 0 ? (
          <div className="users-empty">
            <h2>{all.length ? "Nadie coincide con la búsqueda" : "Aún no hay personas registradas"}</h2>
            <p>{all.length ? "Prueba con otro nombre o quita los filtros." : "Registra la primera con “Registrar persona” o comparte el enlace de un líder."}</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Proceso</th>
                  <th>Líder</th>
                  <th>Rol</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(page * 25, page * 25 + 25).map((p) => {
                  const [label, tone] = statusPill[p.status]
                  return (
                    <tr key={p.id} onClick={() => openPerson(p.id)}>
                      <td>
                        <div className="person-cell">
                          <Avatar url={p.photoPath ? urls[p.photoPath] : undefined} name={p.fullName} />
                          <p>
                            <strong>{p.fullName}</strong>
                            <span>{p.phone || p.email || "Sin contacto"}</span>
                          </p>
                        </div>
                      </td>
                      <td>
                        {programName(settings.programas, p.program) || "—"}
                        {p.programStep && <small className="cell-sub">{p.programStep}</small>}
                      </td>
                      <td>{p.leaderId ? leaderName[p.leaderId] ?? "—" : "Sin líder"}</td>
                      <td>{p.role}</td>
                      <td>
                        <StatusPill tone={tone}>{label}</StatusPill>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {shown.length > 0 && (
          <div className="table-footer">
            <span>
              Mostrando {Math.min(shown.length, page * 25 + 1)}–{Math.min(shown.length, page * 25 + 25)} de {shown.length}
            </span>
            {pages > 1 && (
              <div>
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  ←
                </button>
                <b>{page + 1}</b>
                <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>
                  →
                </button>
              </div>
            )}
          </div>
        )}
      </section>
      {adding && <PersonModal close={() => setAdding(false)} onSaved={(p) => openPerson(p.id)} />}
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Profile                                                            */
/* ---------------------------------------------------------------- */

export function PersonProfile({ id, back }: { id: string; back: () => void }) {
  const settings = useContext(SettingsContext)
  const me = useContext(MyAccess)
  const load = useCallback(() => getPerson(id), [id])
  const person = useLiveData(load, [onPeopleChange])
  const team = useLiveData(listTeam, [onStaffChange])
  const p = person.data
  const urls = usePhotos([p?.photoPath])
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState("")

  if (!p) {
    return (
      <>
        <button className="page-back" onClick={back}>
          ← Volver
        </button>
        <section className="panel users-empty">
          <h2>{person.error ? "No pudimos abrir esta persona" : person.loaded ? "Esta persona ya no existe o no tienes acceso" : "Cargando..."}</h2>
        </section>
      </>
    )
  }

  const leader = (team.data ?? []).find((t) => t.userId === p.leaderId)
  const program = settings.programas.find((x) => x.id === p.program)
  const stepIndex = program ? program.steps.indexOf(p.programStep) : -1
  const [label, tone] = statusPill[p.status]
  const canDelete = can(me, "personas") || (p.leaderId === me?.userId && can(me, "equipo"))

  async function remove() {
    try {
      await deletePerson(p!)
      back()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const facts: [string, string][] = [
    ["Documento", p.docNumber ? `${p.docType} ${p.docNumber}` : "—"],
    ["Teléfono", p.phone || "—"],
    ["Correo", p.email || "—"],
    ["Nacimiento", formatDate(p.birthDate)],
    ["Género", p.gender || "—"],
    ["Dirección", p.address || "—"],
    ["Contacto de emergencia", p.emergencyContact || "—"],
    ["Líder", leader?.name ?? (p.leaderId ? "—" : "Sin líder asignado")],
    ["Registrada", `${formatDate(p.createdAt)}${p.source === "enlace" ? " · por enlace del líder" : ""}`],
  ]

  return (
    <>
      <button className="page-back" onClick={back}>
        ← Volver
      </button>
      <section className="profile-hero">
        <div className="profile-person">
          <Avatar url={p.photoPath ? urls[p.photoPath] : undefined} name={p.fullName} size={86} />
          <div>
            <span>{p.role}</span>
            <h1>{p.fullName}</h1>
            <p>
              {program ? `${program.name}${p.programStep ? ` · ${p.programStep}` : ""}` : "Sin proceso asignado"} · Desde {formatDate(p.createdAt)}
            </p>
            <div>
              <StatusPill tone={tone}>{label}</StatusPill>
              {program && <StatusPill tone="pill-blue">{program.name}</StatusPill>}
            </div>
          </div>
        </div>
        <div className="profile-actions">
          {p.phone && (
            <a className="profile-wa" href={waLink(p.phone)} target="_blank" rel="noreferrer">
              <b>WA</b> WhatsApp
            </a>
          )}
          <button className="admin-primary" onClick={() => setEditing(true)}>
            Editar perfil
          </button>
        </div>
      </section>
      {error && <p className="users-error">{error}</p>}
      <div className="profile-grid">
        <section className="panel profile-main">
          <PanelTitle kicker="Proceso personal" title={program ? `Camino en ${program.name}` : "Camino en MAI"} />
          {program && program.steps.length ? (
            <div className="journey">
              {program.steps.map((step, i) => {
                const done = i < stepIndex
                const current = i === stepIndex
                return (
                  <div className={done ? "journey-done" : current ? "journey-current" : ""} key={step}>
                    <span>{done ? <AIcon name="check" /> : i + 1}</span>
                    <p>
                      <strong>{step}</strong>
                      <small>{done ? "Completado" : current ? "Etapa actual" : "Pendiente"}</small>
                    </p>
                    {i < program.steps.length - 1 && <i />}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="muted-note">Aún no está en ningún proceso. Asígnale uno con “Editar perfil”.</p>
          )}
          {program && program.steps.length > 0 && (
            <div className="step-actions">
              <button disabled={stepIndex <= 0} onClick={() => updatePerson(p.id, { programStep: program.steps[stepIndex - 1] }).catch((e) => setError(e.message))}>
                ← Etapa anterior
              </button>
              <button
                className="accept"
                disabled={stepIndex >= program.steps.length - 1}
                onClick={() => updatePerson(p.id, { programStep: program.steps[stepIndex + 1] ?? program.steps[0] }).catch((e) => setError(e.message))}
              >
                Avanzar etapa →
              </button>
            </div>
          )}
          {p.notes && (
            <div className="profile-notes">
              <span>Observaciones</span>
              <p>{p.notes}</p>
            </div>
          )}
        </section>
        <aside className="panel profile-contact">
          <PanelTitle kicker="Información" title="Datos personales" />
          <dl>
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
      <PersonRecords person={p} />
      {canDelete && (
        <section className="danger-zone">
          {confirmDelete ? (
            <>
              <p>¿Eliminar a {p.fullName}? Se borran sus datos y su foto. No se puede deshacer.</p>
              <button onClick={() => setConfirmDelete(false)}>Cancelar</button>
              <button className="danger" onClick={remove}>
                Sí, eliminar
              </button>
            </>
          ) : (
            <button className="danger-link" onClick={() => setConfirmDelete(true)}>
              Eliminar esta persona
            </button>
          )}
        </section>
      )}
      {editing && <PersonModal person={p} close={() => setEditing(false)} />}
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Invitar líder: one click, the leader fills everything             */
/* ---------------------------------------------------------------- */

function LeaderInviteModal({ close }: { close: () => void }) {
  const me = useContext(MyAccess)
  const settings = useContext(SettingsContext)
  const preset = settings.roles.find((r) => r.id === "lider") ?? settings.roles.find((r) => isLeaderRole(r.name))
  const [days, setDays] = useState(settings.general.leaderInviteDays || 7)
  const [name, setName] = useState("")
  const [link, setLink] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  async function create() {
    setSending(true)
    setError("")
    try {
      setLink(
        await createInvitation({
          name,
          email: "",
          phone: "",
          roleLabel: "Líder",
          days,
          createdByName: me?.name || "Administrador",
          kind: "lider",
          autoPermissions: preset?.permissions ?? ["equipo"],
        }),
      )
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // The link stays visible to copy by hand.
    }
  }

  const first = name.trim().split(/\s+/)[0]
  const message = `Hola${first ? ` ${first}` : ""}, te invito a ser parte del equipo de líderes de Iglesia MAI. Abre este enlace, completa tus datos y crea tu usuario y contraseña para entrar a la plataforma:\n\n${link}`

  return (
    <div className="modal-layer">
      <button className="modal-scrim" onClick={close} aria-label="Cerrar" />
      <section className="invite-modal" role="dialog" aria-modal="true" aria-label="Invitar líder">
        <header>
          <div>
            <span>Líderes · Invitación</span>
            <h2>Invitar líder</h2>
          </div>
          <button onClick={close} aria-label="Cerrar">
            <AIcon name="close" />
          </button>
        </header>
        {!link ? (
          <>
            <p className="modal-intro">
              Genera un enlace y compártelo. El líder llena sus datos, sube su foto y crea su usuario y contraseña. Su cuenta queda{" "}
              <strong>activa de inmediato</strong> con los permisos de líder; no tienes que aprobar nada.
            </p>
            <div className="invite-fields">
              <label className="field-full">
                ¿Para quién es? <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Opcional: solo para saludarlo en el mensaje" />
              </label>
              <label className="field-full">
                El enlace vence en
                <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  <option value={1}>24 horas</option>
                  <option value={7}>7 días</option>
                  <option value={15}>15 días</option>
                  <option value={30}>30 días</option>
                </select>
              </label>
            </div>
            <div className="modal-security">
              <AIcon name="shield" />
              <p>
                Entrará con los permisos del rol Líder ({(preset?.permissions ?? ["equipo"]).length} módulos). Puedes cambiarlos en Configuración → Roles o
                después en Usuarios. Cada enlace sirve para una sola cuenta.
              </p>
            </div>
            {error && <p className="users-error">{error}</p>}
            <button className="modal-primary" onClick={create} disabled={sending}>
              {sending ? "Generando enlace..." : "Generar enlace"} <AIcon name="arrow" />
            </button>
          </>
        ) : (
          <div className="generated-link">
            <span className="generated-check">
              <AIcon name="check" />
            </span>
            <h3>Enlace listo{first ? ` para ${first}` : ""}</h3>
            <p>Cópialo o envíalo ahora: por seguridad no se vuelve a mostrar. Si se pierde, genera uno nuevo.</p>
            <div className="link-box">
              <span>{link}</span>
              <button onClick={copy}>{copied ? "Copiado" : "Copiar"}</button>
            </div>
            <div className="share-actions share-actions-two">
              <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                <b>WA</b> WhatsApp
              </a>
              <a href={`mailto:?subject=${encodeURIComponent("Tu acceso como líder de Iglesia MAI")}&body=${encodeURIComponent(message)}`}>
                <b>@</b> Correo
              </a>
            </div>
            <button className="preview-registration" onClick={close}>
              Listo
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Líderes and Mis discípulos                                         */
/* ---------------------------------------------------------------- */

function PersonalLinkCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState("")
  const link = code ? discipleLink(code) : ""
  useEffect(() => {
    if (link) QRCode.toDataURL(link, { margin: 1, width: 240, color: { dark: "#0f2b33", light: "#ffffff" } }).then(setQr)
  }, [link])
  if (!code) return null
  const message = `Hola, te invito a empezar tu proceso en Iglesia MAI. Completa tus datos aquí:\n\n${link}`
  return (
    <section className="personal-link-card">
      <div className="personal-link-copy">
        <span>Mi enlace de registro</span>
        <h2>
          Haz crecer tu equipo,
          <br />
          <em>un corazón a la vez.</em>
        </h2>
        <p>Comparte este enlace con las personas que quieres acompañar. Llenan sus datos y su foto, y te llegan aquí para que las aceptes.</p>
        <div className="personal-url">
          <span>{link.replace(/^https?:\/\//, "")}</span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(link).then(() => {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 2000)
              })
            }}
          >
            {copied ? "Copiado" : "Copiar enlace"}
          </button>
        </div>
        <div className="personal-actions">
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
            <b>WA</b> Compartir por WhatsApp
          </a>
          {qr && (
            <a href={qr} download="enlace-mai-qr.png">
              <b>QR</b> Descargar QR
            </a>
          )}
          <a href={link} target="_blank" rel="noreferrer">
            <AIcon name="eye" /> Vista previa
          </a>
        </div>
      </div>
      <div className="qr-preview">
        {qr && <img className="real-qr" src={qr} alt="Código QR del enlace de registro" />}
        <p>Escanéalo</p>
        <span>Para inscribirse desde el celular</span>
      </div>
    </section>
  )
}

function LeaderCard({ leader, url, canEditPhoto }: { leader: TeamMember; url?: string; canEditPhoto: boolean }) {
  const [busy, setBusy] = useState(false)
  async function changePhoto(file?: File) {
    if (!file) return
    setBusy(true)
    try {
      const path = await uploadPhoto(await preparePhoto(file), "equipo")
      await setStaffPhoto(leader.userId, path)
      await removePhoto(leader.photoPath)
    } finally {
      setBusy(false)
    }
  }
  return (
    <article className="panel disciple-card">
      <Avatar url={url} name={leader.name} size={55} />
      <div>
        <StatusPill tone="pill-ok">{leader.roleLabel || "Equipo"}</StatusPill>
        <h3>{leader.name}</h3>
        <p>{leader.phone || leader.email || "Sin contacto"}</p>
      </div>
      <dl>
        <div>
          <dt>Discípulos activos</dt>
          <dd>{leader.disciples}</dd>
        </div>
        <div>
          <dt>Líder desde</dt>
          <dd>{formatDate(leader.createdAt)}</dd>
        </div>
      </dl>
      <div className="card-actions">
        {leader.phone && (
          <a href={waLink(leader.phone)} target="_blank" rel="noreferrer">
            WhatsApp <AIcon name="arrow" />
          </a>
        )}
        {canEditPhoto && (
          <label>
            {busy ? "Subiendo..." : "Cambiar foto"}
            <input type="file" accept="image/*" hidden onChange={(e) => changePhoto(e.target.files?.[0])} />
          </label>
        )}
      </div>
    </article>
  )
}

export function TeamPage({ leaders = false, openPerson }: { leaders?: boolean; openPerson: (id: string) => void }) {
  const me = useContext(MyAccess)
  const settings = useContext(SettingsContext)
  const team = useLiveData(listTeam, [onTeamChange])
  const people = useLiveData(listPeople, [onPeopleChange])
  const [inviting, setInviting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")

  const leaderList = (team.data ?? []).filter((t) => isLeaderRole(t.roleLabel))
  const mine = (people.data ?? []).filter((p) => p.leaderId === me?.userId)
  const requests = mine.filter((p) => p.status === "pendiente")
  const disciples = mine.filter((p) => p.status === "activo" || p.status === "inactivo")
  const urls = usePhotos(leaders ? leaderList.map((l) => l.photoPath) : mine.map((p) => p.photoPath))
  const canInvite = can(me, "usuarios")

  async function decide(p: Person, status: PersonStatus) {
    setError("")
    try {
      await updatePerson(p.id, { status })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (leaders) {
    const withoutLeader = (people.data ?? []).filter((p) => p.status === "activo" && !p.leaderId).length
    return (
      <>
        <PageHeader
          eyebrow="Estructura pastoral"
          title="Líderes"
          copy="Acompaña equipos y visualiza la red de discipulado de MAI."
          primary={canInvite ? "Invitar líder" : undefined}
          onPrimary={() => setInviting(true)}
        />
        {!canInvite && <p className="muted-note">Para invitar líderes necesitas el permiso “Usuarios y permisos”.</p>}
        <div className="module-stats">
          <div>
            <span>Líderes activos</span>
            <strong>{team.data ? leaderList.length : "—"}</strong>
            <small>Con acceso a la plataforma</small>
          </div>
          <div>
            <span>Discípulos acompañados</span>
            <strong>{team.data ? leaderList.reduce((n, l) => n + l.disciples, 0) : "—"}</strong>
            <small>Activos con un líder</small>
          </div>
          <div>
            <span>Promedio por líder</span>
            <strong>{leaderList.length ? (leaderList.reduce((n, l) => n + l.disciples, 0) / leaderList.length).toFixed(1) : "0"}</strong>
            <small>Discípulos</small>
          </div>
          <div>
            <span>Personas sin líder</span>
            <strong>{people.data ? withoutLeader : "—"}</strong>
            <small>{can(me, "personas") ? "Asígnalas desde Personas" : "Para asignar"}</small>
          </div>
        </div>
        {team.data && leaderList.length === 0 ? (
          <section className="panel users-empty">
            <h2>Aún no hay líderes</h2>
            <p>{canInvite ? "Usa “Invitar líder”: comparte el enlace y el líder se registra solo." : "Cuando se registren aparecerán aquí."}</p>
          </section>
        ) : (
          <div className="disciples-grid">
            {leaderList.map((l) => (
              <LeaderCard key={l.userId} leader={l} url={l.photoPath ? urls[l.photoPath] : undefined} canEditPhoto={canInvite || l.userId === me?.userId} />
            ))}
          </div>
        )}
        {inviting && <LeaderInviteModal close={() => setInviting(false)} />}
      </>
    )
  }

  const inProgram = disciples.filter((p) => p.program).length
  return (
    <>
      <PageHeader
        eyebrow="Mi equipo"
        title="Mis discípulos"
        copy="Personas que caminan contigo y sus próximos pasos."
        primary="Agregar discípulo"
        onPrimary={() => setAdding(true)}
      />
      <PersonalLinkCard code={me?.joinCode ?? ""} />
      <div className="module-stats">
        <div>
          <span>Total en mi equipo</span>
          <strong>{people.data ? disciples.length : "—"}</strong>
          <small>{disciples.filter((p) => p.status === "activo").length} activos</small>
        </div>
        <div>
          <span>Solicitudes nuevas</span>
          <strong>{people.data ? requests.length : "—"}</strong>
          <small>{requests.length ? "Esperando que las aceptes" : "Todo al día"}</small>
        </div>
        <div>
          <span>En un proceso</span>
          <strong>{people.data ? inProgram : "—"}</strong>
          <small>Encuentro, Misión 180 o Destino</small>
        </div>
        <div>
          <span>Sin proceso</span>
          <strong>{people.data ? disciples.length - inProgram : "—"}</strong>
          <small>Para invitar al siguiente paso</small>
        </div>
      </div>
      {error && <p className="users-error">{error}</p>}
      {requests.length > 0 && (
        <section className="panel new-requests">
          <PanelTitle kicker="Nuevos registros" title="Solicitudes de discípulos" />
          <div>
            {requests.map((p) => (
              <article key={p.id}>
                <Avatar url={p.photoPath ? urls[p.photoPath] : undefined} name={p.fullName} />
                <p>
                  <strong>{p.fullName}</strong>
                  <span>
                    {timeAgo(p.createdAt)} · {p.phone || "Sin teléfono"}
                  </span>
                </p>
                <button onClick={() => openPerson(p.id)}>Ver</button>
                <button className="accept" onClick={() => decide(p, "activo")}>
                  Aceptar
                </button>
                <button onClick={() => decide(p, "rechazado")}>Rechazar</button>
              </article>
            ))}
          </div>
        </section>
      )}
      {people.data && disciples.length === 0 ? (
        <section className="panel users-empty">
          <h2>Aún no tienes discípulos</h2>
          <p>Comparte tu enlace o usa “Agregar discípulo”.</p>
        </section>
      ) : (
        <div className="disciples-grid">
          {disciples.map((p) => {
            const program = settings.programas.find((x) => x.id === p.program)
            const [label, tone] = statusPill[p.status]
            return (
              <article className="panel disciple-card" key={p.id}>
                <Avatar url={p.photoPath ? urls[p.photoPath] : undefined} name={p.fullName} size={55} />
                <div>
                  <StatusPill tone={tone}>{label}</StatusPill>
                  <h3>{p.fullName}</h3>
                  <p>{p.phone || p.email || "Sin contacto"}</p>
                </div>
                <dl>
                  <div>
                    <dt>Proceso</dt>
                    <dd>{program?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Etapa</dt>
                    <dd>{p.programStep || "—"}</dd>
                  </div>
                  <div>
                    <dt>Con MAI desde</dt>
                    <dd>{formatDate(p.createdAt)}</dd>
                  </div>
                </dl>
                <button onClick={() => openPerson(p.id)}>
                  Ver proceso <AIcon name="arrow" />
                </button>
              </article>
            )
          })}
        </div>
      )}
      {adding && <PersonModal defaults={{ leaderId: me?.userId ?? null, role: "Discípulo" }} close={() => setAdding(false)} />}
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Programs: Encuentros, Misión 180, Capacitación Destino             */
/* ---------------------------------------------------------------- */

function EnrollModal({ program, close }: { program: Program; close: () => void }) {
  const people = useLiveData(listPeople, [onPeopleChange])
  const [query, setQuery] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const candidates = (people.data ?? [])
    .filter((p) => p.program !== program.id && p.status === "activo")
    .filter((p) => !query.trim() || `${p.fullName} ${p.docNumber} ${p.phone}`.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 30)
  if (creating) return <PersonModal defaults={{ program: program.id, programStep: program.steps[0] ?? "" }} close={close} />
  return (
    <div className="modal-layer">
      <button className="modal-scrim" onClick={close} aria-label="Cerrar" />
      <section className="invite-modal" role="dialog" aria-modal="true" aria-label={`Inscribir en ${program.name}`}>
        <header>
          <div>
            <span>{program.name}</span>
            <h2>Inscribir persona</h2>
          </div>
          <button onClick={close} aria-label="Cerrar">
            <AIcon name="close" />
          </button>
        </header>
        <div className="admin-search enroll-search">
          <AIcon name="search" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, documento o teléfono..." />
        </div>
        {error && <p className="users-error">{error}</p>}
        <div className="enroll-list">
          {candidates.map((p) => (
            <button
              key={p.id}
              onClick={() =>
                updatePerson(p.id, { program: program.id, programStep: program.steps[0] ?? "" })
                  .then(close)
                  .catch((e) => setError(e.message))
              }
            >
              <strong>{p.fullName}</strong>
              <span>{p.program ? "Cambiar de proceso" : p.phone || "Inscribir"}</span>
            </button>
          ))}
          {people.data && candidates.length === 0 && <p className="muted-note">No hay personas para inscribir con esa búsqueda.</p>}
        </div>
        <button className="modal-primary" onClick={() => setCreating(true)}>
          Registrar una persona nueva <AIcon name="plus" />
        </button>
      </section>
    </div>
  )
}

export function ProgramPage({ programId, openPerson }: { programId: string; openPerson: (id: string) => void }) {
  const settings = useContext(SettingsContext)
  const program = settings.programas.find((p) => p.id === programId)
  const people = useLiveData(listPeople, [onPeopleChange])
  const team = useLiveData(listTeam, [onStaffChange])
  const [enrolling, setEnrolling] = useState(false)
  const [step, setStep] = useState("")
  const [error, setError] = useState("")
  const participants = (people.data ?? []).filter((p) => p.program === programId && p.status !== "rechazado")
  const shown = participants.filter((p) => !step || p.programStep === step)
  const urls = usePhotos(shown.map((p) => p.photoPath))
  const leaderName = Object.fromEntries((team.data ?? []).map((t) => [t.userId, t.name]))
  if (!program) return <p className="users-error">Este programa no existe. Revísalo en Configuración → Programas.</p>
  const last = program.steps[program.steps.length - 1]

  return (
    <>
      <PageHeader eyebrow="Procesos" title={program.name} copy={program.description} primary="Inscribir persona" onPrimary={() => setEnrolling(true)} />
      <div className="module-stats">
        <div>
          <span>Participantes</span>
          <strong>{people.data ? participants.length : "—"}</strong>
          <small>{participants.filter((p) => p.status === "activo").length} activos</small>
        </div>
        <div>
          <span>Etapas</span>
          <strong>{program.steps.length}</strong>
          <small>{program.steps[0] ? `De ${program.steps[0]} a ${last}` : "Configúralas"}</small>
        </div>
        <div>
          <span>En la última etapa</span>
          <strong>{people.data ? participants.filter((p) => p.programStep === last).length : "—"}</strong>
          <small>{last || "—"}</small>
        </div>
        <div>
          <span>Valor</span>
          <strong>{program.cost ? `$${program.cost.toLocaleString("es-CO")}` : "Gratis"}</strong>
          <small>Se cambia en Configuración</small>
        </div>
      </div>
      {program.steps.length > 0 && (
        <section className="panel learning-path">
          <PanelTitle kicker="Ruta" title="Personas por etapa" />
          <div className="class-track step-filter">
            {program.steps.map((s, i) => {
              const count = participants.filter((p) => p.programStep === s).length
              return (
                <button className={step === s ? "class-current" : count ? "class-complete" : ""} key={s} onClick={() => setStep(step === s ? "" : s)}>
                  <span>{count}</span>
                  <p>{s}</p>
                  {i < program.steps.length - 1 && <i />}
                </button>
              )
            })}
          </div>
        </section>
      )}
      {error && <p className="users-error">{error}</p>}
      <section className="panel table-panel">
        <PanelTitle kicker="Participantes" title={step ? `En ${step}` : "Todos los participantes"} action={step ? "Ver todos" : undefined} onAction={() => setStep("")} />
        {people.data && shown.length === 0 ? (
          <div className="users-empty">
            <h2>Aún no hay participantes{step ? " en esta etapa" : ""}</h2>
            <p>Usa “Inscribir persona” para agregar a alguien.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Líder</th>
                  <th>Etapa</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td onClick={() => openPerson(p.id)}>
                      <div className="person-cell">
                        <Avatar url={p.photoPath ? urls[p.photoPath] : undefined} name={p.fullName} />
                        <p>
                          <strong>{p.fullName}</strong>
                          <span>{p.phone || "Sin teléfono"}</span>
                        </p>
                      </div>
                    </td>
                    <td>{p.leaderId ? leaderName[p.leaderId] ?? "—" : "Sin líder"}</td>
                    <td>
                      <select
                        className="inline-select"
                        value={p.programStep}
                        onChange={(e) => updatePerson(p.id, { programStep: e.target.value }).catch((err) => setError(err.message))}
                      >
                        {!program.steps.includes(p.programStep) && <option value={p.programStep}>{p.programStep || "Sin etapa"}</option>}
                        {program.steps.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="inline-actions">
                        <button onClick={() => updatePerson(p.id, { program: "", programStep: "" }).catch((err) => setError(err.message))}>Quitar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {enrolling && <EnrollModal program={program} close={() => setEnrolling(false)} />}
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Notifications (built from what really needs attention)            */
/* ---------------------------------------------------------------- */

export type Alert = { id: string; text: string; detail: string; icon: AdminIcon; page: string; when: string }

const onAlertsChange = (cb: () => void) => {
  const offs = [onStaffChange(cb), onPeopleChange(cb), onInvitationsChange(cb), onTableChange("submissions", cb)]
  return () => offs.forEach((off) => off())
}

export function useAlerts() {
  const me = useContext(MyAccess)
  const settings = useContext(SettingsContext)
  const prefs = settings.notificaciones
  const load = useCallback(async (): Promise<Alert[]> => {
    if (!me) return []
    const out: Alert[] = []
    const jobs: Promise<void>[] = []
    if (prefs.cuentas && can(me, "usuarios")) {
      jobs.push(
        listStaff().then((staff) => {
          for (const s of staff.filter((x) => x.status === "pendiente"))
            out.push({ id: `staff-${s.userId}`, text: `${s.name} espera aprobación de su cuenta`, detail: s.roleLabel || "Sin rol", icon: "shield", page: "Usuarios", when: s.createdAt })
        }),
      )
    }
    if (prefs.invitaciones && can(me, "usuarios")) {
      jobs.push(
        listInvitations().then((invs) => {
          const soon = Date.now() + 2 * 86_400_000
          for (const i of invs.filter((x) => invitationState(x) === "vigente" && new Date(x.expiresAt).getTime() < soon))
            out.push({ id: `inv-${i.id}`, text: `La invitación${i.name ? ` de ${i.name}` : ""} vence pronto`, detail: `Vence ${formatDate(i.expiresAt)}`, icon: "clock", page: "Invitaciones", when: i.createdAt })
        }),
      )
    }
    if (prefs.discipulos || prefs.cumpleanos) {
      jobs.push(
        listPeople().then((people) => {
          if (prefs.discipulos)
            for (const p of people.filter((x) => x.status === "pendiente" && x.leaderId === me.userId))
              out.push({ id: `disc-${p.id}`, text: `${p.fullName} quiere ser parte de tu equipo`, detail: "Inscripción por tu enlace", icon: "people", page: "Mis discípulos", when: p.createdAt })
          if (prefs.cumpleanos) {
            const today = new Date()
            const md = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            const week = Array.from({ length: 7 }, (_, i) => md(new Date(today.getTime() + i * 86_400_000)))
            for (const p of people.filter((x) => x.status === "activo" && x.birthDate && week.includes(x.birthDate.slice(5)))) {
              const isToday = p.birthDate!.slice(5) === week[0]
              out.push({ id: `bday-${p.id}`, text: `${isToday ? "Hoy cumple años" : "Cumple años esta semana"}: ${p.fullName}`, detail: formatDate(p.birthDate, false), icon: "certificate", page: "Personas", when: new Date().toISOString() })
            }
          }
        }),
      )
    }
    if (prefs.solicitudes && can(me, "solicitudes")) {
      jobs.push(
        listSubmissions().then((subs) => {
          const labels: Record<string, [string, string]> = {
            oracion: ["Nueva petición de oración", "Peticiones de oración"],
            visita: ["Alguien quiere visitarnos", "Quieren visitarnos"],
            ujier: ["Nueva inscripción para ser ujier", "Ujieres"],
            inscripcion: ["Nueva inscripción a un evento", "Inscripciones"],
          }
          for (const s of subs.filter((x) => x.status === "nueva")) {
            const [text, page] = labels[s.kind] ?? ["Nueva solicitud del sitio web", "Sitio web"]
            out.push({ id: `sub-${s.id}`, text, detail: "Sitio web", icon: "globe", page, when: s.createdAt })
          }
        }),
      )
    }
    await Promise.allSettled(jobs)
    return out.sort((a, b) => b.when.localeCompare(a.when))
  }, [me, prefs])
  return useLiveData(load, [onAlertsChange])
}

export function NotificationsPage({ go }: { go: (page: string) => void }) {
  const alerts = useAlerts()
  return (
    <>
      <PageHeader eyebrow="Centro de actividad" title="Notificaciones" copy="Lo que necesita tu atención ahora mismo." />
      {alerts.data && alerts.data.length === 0 ? (
        <section className="panel users-empty">
          <h2>Todo al día</h2>
          <p>No hay nada pendiente. Aquí verás cuentas por aprobar, discípulos nuevos, solicitudes del sitio y cumpleaños.</p>
        </section>
      ) : (
        <section className="panel notification-list">
          {(alerts.data ?? []).map((a) => (
            <article className="unread" key={a.id}>
              <span>
                <AIcon name={a.icon} />
              </span>
              <div>
                <h3>{a.text}</h3>
                <p>
                  {a.detail} · {timeAgo(a.when)}
                </p>
              </div>
              <button onClick={() => go(a.page)} aria-label="Abrir">
                <AIcon name="arrow" />
              </button>
            </article>
          ))}
        </section>
      )}
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Dashboard                                                          */
/* ---------------------------------------------------------------- */

export function Dashboard({ go, name }: { go: (s: string) => void; name: string }) {
  const me = useContext(MyAccess)
  const settings = useContext(SettingsContext)
  const people = useLiveData(listPeople, [onPeopleChange])
  const team = useLiveData(listTeam, [onTeamChange])
  const alerts = useAlerts()
  const all = (people.data ?? []).filter((p) => p.status !== "rechazado")
  const active = all.filter((p) => p.status === "activo")
  const leaders = (team.data ?? []).filter((t) => isLeaderRole(t.roleLabel))
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
  const newThisMonth = all.filter((p) => new Date(p.createdAt).getTime() >= monthStart).length
  const recent = all.slice(0, 5)
  const urls = usePhotos(recent.map((p) => p.photoPath))
  const today = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })
  const colors = ["#1b6f7b", "#e98a43", "#7b65a8", "#4c9b7a", "#bd8c4c", "#9aa3a5"]
  const groups = [
    ...settings.programas.map((p) => ({ label: p.name, count: active.filter((x) => x.program === p.id).length })),
    { label: "Sin proceso", count: active.filter((x) => !x.program).length },
  ]
  let acc = 0
  const total = active.length || 1
  const gradient = groups
    .map((g, i) => {
      const from = (acc / total) * 100
      acc += g.count
      return `${colors[i % colors.length]} ${from}% ${(acc / total) * 100}%`
    })
    .join(", ")

  return (
    <>
      <header className="page-welcome">
        <div>
          <p>{today.charAt(0).toUpperCase() + today.slice(1)}</p>
          <h1>Hola, {name}.</h1>
          <span>Este es el pulso de MAI hoy.</span>
        </div>
        {can(me, "personas") && (
          <button onClick={() => go("Personas")}>
            <AIcon name="plus" /> Registrar persona
          </button>
        )}
      </header>
      <section className="stat-grid">
        <Stat label="Personas activas" value={people.data ? String(active.length) : "—"} change={`${newThisMonth} nuevas este mes`} />
        <Stat label="Líderes" value={team.data ? String(leaders.length) : "—"} change={`${(team.data ?? []).length} en el equipo`} />
        <Stat label="Discípulos con líder" value={people.data ? String(active.filter((p) => p.leaderId).length) : "—"} change={`${active.filter((p) => !p.leaderId).length} sin líder`} />
        <Stat label="Pendientes" value={alerts.data ? String(alerts.data.length) : "—"} change="Ver notificaciones" tone="stat-accent" />
      </section>
      <section className="dashboard-grid">
        <article className="panel people-stage">
          <PanelTitle kicker="Proceso MAI" title="Personas por proceso" action="Ver personas" onAction={() => go("Personas")} />
          <div className="donut-wrap">
            <div className="donut" style={{ background: active.length ? `conic-gradient(${gradient})` : "#e7eded" }}>
              <div>
                <strong>{active.length}</strong>
                <span>personas</span>
              </div>
            </div>
            <ul>
              {groups.map((g, i) => (
                <li key={g.label}>
                  <i style={{ background: colors[i % colors.length] }} /> {g.label} <b>{g.count}</b>
                </li>
              ))}
            </ul>
          </div>
        </article>
        <article className="panel activity-panel">
          <PanelTitle kicker="Recientes" title="Últimas personas registradas" action={can(me, "personas") ? "Ver todas" : undefined} onAction={() => go("Personas")} />
          {people.data && recent.length === 0 ? (
            <p className="muted-note">Aún no hay personas registradas. Empieza con “Registrar persona” o invitando a tus líderes.</p>
          ) : (
            <div className="activity-list">
              {recent.map((p) => (
                <div className="activity-row" key={p.id}>
                  <Avatar url={p.photoPath ? urls[p.photoPath] : undefined} name={p.fullName} />
                  <p>
                    <strong>{p.fullName}</strong> {p.source === "enlace" ? "se inscribió por el enlace de su líder" : "fue registrada"}
                    <span>{timeAgo(p.createdAt)}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
      <section className="dashboard-lower dashboard-lower-one">
        <article className="panel quick-panel">
          <PanelTitle kicker="Acciones" title="Accesos rápidos" />
          <div className="quick-grid">
            {(
              [
                ["Registrar persona", "people", "Personas"],
                ["Invitar líder", "team", "Líderes"],
                ["Mis discípulos", "school", "Mis discípulos"],
                ["Notificaciones", "bell", "Notificaciones"],
              ] as [string, AdminIcon, string][]
            ).map(([label, icon, page]) => (
              <button key={label} onClick={() => go(page)}>
                <span>
                  <AIcon name={icon} />
                </span>
                {label}
                <AIcon name="arrow" />
              </button>
            ))}
          </div>
        </article>
      </section>
      {alerts.data && alerts.data.length > 0 && (
        <section className="admin-attention">
          <header>
            <span>Requiere tu atención</span>
            <h2>Procesos pendientes</h2>
          </header>
          {alerts.data.slice(0, 3).map((a) => (
            <button key={a.id} onClick={() => go(a.page)}>
              <span>
                <AIcon name={a.icon} />
              </span>
              <p>
                <strong>{a.text}</strong>
                <small>{a.detail}</small>
              </p>
              <AIcon name="arrow" />
            </button>
          ))}
        </section>
      )}
    </>
  )
}

function Stat({ label, value, change, tone = "" }: { label: string; value: string; change: string; tone?: string }) {
  return (
    <article className={`admin-stat ${tone}`}>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      <span>{change}</span>
    </article>
  )
}

/* ---------------------------------------------------------------- */
/* Modules for a later phase                                          */
/* ---------------------------------------------------------------- */

export function ComingSoon({ page, icon, copy }: { page: string; icon: AdminIcon; copy: string }) {
  return (
    <>
      <PageHeader eyebrow="Módulo" title={page} copy={copy} />
      <section className="panel coming-soon">
        <span>
          <AIcon name={icon} />
        </span>
        <h2>Este módulo se activa en la próxima fase</h2>
        <p>Ya quitamos los datos de ejemplo. Aquí vas a registrar información real cuando lo conectemos.</p>
      </section>
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Public: a new disciple signs up with a leader's link              */
/* ---------------------------------------------------------------- */

export function DiscipleSignup({ code, onExit }: { code: string; onExit: () => void }) {
  const [leader, setLeader] = useState<LeaderPreview | null>(null)
  const [invalid, setInvalid] = useState("")
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState<null | { pending: boolean }>(null)

  useEffect(() => {
    readLeaderLink(code)
      .then(setLeader)
      .catch((err) => setInvalid((err as Error).message))
  }, [code])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const data = Object.fromEntries([...f.entries()].map(([k, v]) => [k, String(v)]))
    setSending(true)
    setError("")
    try {
      const result = await joinLeader({ ...data, code, ...(photo ? { photo: await blobToDataUrl(photo) } : {}) })
      setDone({ pending: result.pending })
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  const leaderFirst = leader?.leaderName.trim().split(/\s+/).slice(0, 2).join(" ") ?? ""

  if (done || invalid) {
    return (
      <main className="onboarding-page">
        <section className="onboarding-card onboarding-complete">
          <AdminLogo dark />
          <span className={done ? "complete-mark" : "complete-mark complete-mark-warn"}>
            <AIcon name={done ? "check" : "shield"} />
          </span>
          <p className="onboarding-kicker">{done ? "Inscripción recibida" : "Enlace"}</p>
          <h1>{done ? "Tu proceso comienza aquí." : "Este enlace no está disponible."}</h1>
          <p>
            {done
              ? `${leaderFirst} recibió tus datos${done.pending ? " y pronto se comunicará contigo" : ""}. ¡Bienvenido a la familia MAI!`
              : invalid}
          </p>
          <button onClick={onExit}>Volver a Iglesia MAI</button>
        </section>
      </main>
    )
  }

  if (!leader) {
    return (
      <div className="app-loading">
        <img src="/logo-mai-white.png" alt="Iglesia MAI" />
        <p>Abriendo el enlace...</p>
      </div>
    )
  }

  return (
    <main className="onboarding-page">
      <div className="onboarding-top">
        <AdminLogo dark />
        <button onClick={onExit}>Salir</button>
      </div>
      <section className="onboarding-card">
        <div className="onboarding-heading">
          <p className="onboarding-kicker">Invitación personal · {leaderFirst}</p>
          <h1>Inicia tu proceso en MAI</h1>
          <span>{leader.welcome}</span>
        </div>
        <form className="onboarding-form" onSubmit={submit}>
          <PhotoField label="Tu foto (opcional)" onPick={(blob) => setPhoto(blob)} />
          <div className="form-section-title">
            <span>01</span>
            <p>Información personal</p>
          </div>
          <div className="onboarding-fields">
            <label className="field-full">
              Nombre completo
              <input name="name" required placeholder="Escribe tu nombre y apellidos" autoComplete="name" />
            </label>
            <label>
              Tipo de documento
              <select name="docType" defaultValue="CC">
                <option value="CC">Cédula de ciudadanía</option>
                <option value="CE">Cédula de extranjería</option>
                <option value="TI">Tarjeta de identidad</option>
                <option value="PA">Pasaporte</option>
              </select>
            </label>
            <label>
              Número de documento
              <input name="docNumber" inputMode="numeric" placeholder="Sin puntos ni espacios" />
            </label>
            <label>
              Fecha de nacimiento
              <input name="birthDate" type="date" />
            </label>
            <label>
              Teléfono / WhatsApp
              <input name="phone" required type="tel" placeholder="300 000 0000" autoComplete="tel" />
            </label>
            <label className="field-full">
              Correo electrónico
              <input name="email" type="email" placeholder="tu@correo.com (opcional)" autoComplete="email" />
            </label>
            <label className="field-full">
              Dirección
              <input name="address" placeholder="Barrio y dirección" autoComplete="street-address" />
            </label>
            <label className="field-full">
              Contacto de emergencia
              <input name="emergencyContact" placeholder="Nombre y teléfono" />
            </label>
            <label className="field-full">
              ¿Algo que debamos saber?
              <textarea name="notes" rows={3} placeholder="Opcional: cómo podemos acompañarte mejor" />
            </label>
            <input name="website" tabIndex={-1} autoComplete="off" className="hp-field" aria-hidden="true" />
          </div>
          <label className="data-consent">
            <input required type="checkbox" />
            <span>Acepto el tratamiento de mis datos personales según la política de privacidad de Iglesia MAI.</span>
          </label>
          {error && (
            <p className="users-error" role="alert">
              {error}
            </p>
          )}
          <button className="onboarding-submit" type="submit" disabled={sending}>
            {sending ? "Enviando..." : "Enviar inscripción"}
            <AIcon name="arrow" />
          </button>
        </form>
      </section>
      <footer className="onboarding-footer">Iglesia MAI · Bogotá, Colombia</footer>
    </main>
  )
}
