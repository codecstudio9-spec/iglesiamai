/**
 * Real team accounts: invitation links, the invited person's registration,
 * pending approvals and per-module permissions (src/lib/staff.ts, supabase/accesos.sql).
 */
import { createContext, FormEvent, useContext, useEffect, useMemo, useState } from "react"
import { AdminLogo, AIcon, PanelTitle, StatusPill } from "./AdminApp"
import { blobToDataUrl, preparePhoto } from "./lib/people"
import { SettingsContext } from "./lib/settings"
import {
  acceptInvitation,
  can,
  createInvitation,
  invitationState,
  listInvitations,
  listStaff,
  onInvitationsChange,
  onStaffChange,
  PERMISSIONS,
  readInvitation,
  revokeInvitation,
  setStaffAccess,
  USERNAME_RE,
  type Invitation,
  type InvitationPreview,
  type Permission,
  type StaffMember,
  type StaffStatus,
} from "./lib/staff"

/** The signed-in person's access, provided by AdminApp. */
export const MyAccess = createContext<StaffMember | null>(null)

const ROLE_OPTIONS = ["Pastor", "Líder", "Profesor", "Tesorería", "Servicio", "Comunicaciones", "Consulta"]

const statusLabel: Record<StaffStatus, [string, string]> = {
  pendiente: ["Pendiente", "pill-warn"],
  activo: ["Activo", "pill-ok"],
  suspendido: ["Suspendido", ""],
  rechazado: ["Rechazado", ""],
}

const inviteLabel: Record<ReturnType<typeof invitationState>, [string, string]> = {
  vigente: ["Vigente", "pill-blue"],
  usada: ["Usada", "pill-ok"],
  expirada: ["Vencida", "pill-warn"],
  revocada: ["Anulada", ""],
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  )
}

function permissionSummary(m: StaffMember) {
  if (m.isOwner) return "Acceso total"
  if (!m.permissions.length) return "Sin permisos"
  return m.permissions.length === 1
    ? PERMISSIONS.find((p) => p.id === m.permissions[0])?.label ?? "1 permiso"
    : `${m.permissions.length} permisos`
}

function useLive<T>(load: () => Promise<T>, subscribe: (cb: () => void) => () => void) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let alive = true
    const refresh = () =>
      load()
        .then((d) => alive && (setData(d), setError(false)))
        .catch(() => alive && setError(true))
    refresh()
    const off = subscribe(refresh)
    return () => {
      alive = false
      off()
    }
  }, [load, subscribe])
  return { data, error }
}

/* ---------------------------------------------------------------- */
/* Invite modal                                                       */
/* ---------------------------------------------------------------- */

function InviteModal({ close }: { close: () => void }) {
  const me = useContext(MyAccess)
  const [link, setLink] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const settings = useContext(SettingsContext)
  const [days, setDays] = useState(settings.general.inviteDays || 7)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setSending(true)
    setError("")
    try {
      const invitee = String(f.get("name") || "")
      setLink(
        await createInvitation({
          name: invitee,
          email: String(f.get("email") || ""),
          phone: String(f.get("phone") || ""),
          roleLabel: String(f.get("role") || ""),
          days,
          createdByName: me?.name || "Administrador",
        }),
      )
      setName(invitee)
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

  const firstName = name.trim().split(/\s+/)[0]
  const message = `Hola${firstName ? ` ${firstName}` : ""}, te invito a crear tu cuenta en la gestión interna de Iglesia MAI. Abre este enlace, completa tus datos y elige tu usuario y contraseña:\n\n${link}`

  return (
    <div className="modal-layer">
      <button className="modal-scrim" onClick={close} aria-label="Cerrar" />
      <section className="invite-modal" role="dialog" aria-modal="true" aria-label="Invitar a MAI">
        <header>
          <div>
            <span>Mi equipo · Invitaciones</span>
            <h2>Invitar a MAI</h2>
          </div>
          <button onClick={close} aria-label="Cerrar">
            <AIcon name="close" />
          </button>
        </header>
        {!link ? (
          <form onSubmit={submit}>
            <p className="modal-intro">
              Escribe a quién invitas. La persona recibirá un enlace para completar sus datos y crear su
              propio usuario y contraseña. Entrará sin permisos hasta que tú los asignes.
            </p>
            <div className="invite-fields">
              <label className="field-full">
                Nombre de la persona <input name="name" required placeholder="Nombre y apellido" />
              </label>
              <label>
                Correo <input name="email" type="email" placeholder="Opcional" />
              </label>
              <label>
                WhatsApp <input name="phone" type="tel" placeholder="Opcional" />
              </label>
              <label>
                Rol en la iglesia
                <select name="role" defaultValue="Líder">
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>
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
                Cada enlace es único, sirve para una sola cuenta y solo se muestra una vez. La cuenta
                quedará pendiente hasta que la apruebes y le des permisos.
              </p>
            </div>
            {error && <p className="users-error">{error}</p>}
            <button className="modal-primary" type="submit" disabled={sending}>
              {sending ? "Creando enlace..." : "Crear enlace de invitación"} <AIcon name="arrow" />
            </button>
          </form>
        ) : (
          <div className="generated-link">
            <span className="generated-check">
              <AIcon name="check" />
            </span>
            <h3>Enlace listo para {firstName || "compartir"}</h3>
            <p>Cópialo ahora: por seguridad no se vuelve a mostrar. Si se pierde, crea uno nuevo.</p>
            <div className="link-box">
              <span>{link}</span>
              <button onClick={copy}>{copied ? "Copiado" : "Copiar"}</button>
            </div>
            <div className="share-actions share-actions-two">
              <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                <b>WA</b> WhatsApp
              </a>
              <a href={`mailto:?subject=${encodeURIComponent("Tu acceso a Iglesia MAI")}&body=${encodeURIComponent(message)}`}>
                <b>@</b> Correo
              </a>
            </div>
            <dl>
              <div>
                <dt>Estado</dt>
                <dd>
                  <StatusPill tone="pill-blue">Vigente</StatusPill>
                </dd>
              </div>
              <div>
                <dt>Vence</dt>
                <dd>{formatDate(new Date(Date.now() + days * 86_400_000).toISOString())}</dd>
              </div>
              <div>
                <dt>Cuentas</dt>
                <dd>Una sola</dd>
              </div>
            </dl>
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
/* Permissions modal                                                  */
/* ---------------------------------------------------------------- */

function AccessModal({ person, close }: { person: StaffMember; close: () => void }) {
  const me = useContext(MyAccess)
  const meIsOwner = Boolean(me?.isOwner)
  const [status, setStatus] = useState<StaffStatus>(person.status === "pendiente" ? "activo" : person.status)
  const [perms, setPerms] = useState<Permission[]>(person.permissions)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const settings = useContext(SettingsContext)
  const locked = person.isOwner || person.userId === me?.userId || (!meIsOwner && person.permissions.includes("usuarios"))
  function applyRole(id: string) {
    const role = settings.roles.find((r) => r.id === id)
    if (!role) return
    setPerms((p) => [...role.permissions.filter((x) => x !== "usuarios"), ...(p.includes("usuarios") ? (["usuarios"] as Permission[]) : [])])
  }

  function toggle(id: Permission) {
    setPerms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  async function save(nextStatus = status) {
    setSaving(true)
    setError("")
    try {
      await setStaffAccess(person.userId, nextStatus, nextStatus === "rechazado" ? [] : perms)
      close()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const facts: [string, string][] = [
    ["Usuario", person.username || "—"],
    ["Rol en la iglesia", person.roleLabel || "—"],
    ["Correo", person.email || "—"],
    ["Teléfono", person.phone || "—"],
    ["Documento", person.docNumber ? `${person.docType} ${person.docNumber}` : "—"],
    ["Nacimiento", person.birthDate ? formatDate(`${person.birthDate}T12:00:00`) : "—"],
    ["Dirección", person.address || "—"],
    ["Se registró", formatDate(person.createdAt)],
  ]

  return (
    <div className="modal-layer">
      <button className="modal-scrim" onClick={close} aria-label="Cerrar" />
      <section className="invite-modal access-modal" role="dialog" aria-modal="true" aria-label={`Permisos de ${person.name}`}>
        <header>
          <div>
            <span>Usuarios · Permisos</span>
            <h2>{person.name}</h2>
          </div>
          <button onClick={close} aria-label="Cerrar">
            <AIcon name="close" />
          </button>
        </header>

        <dl className="access-facts">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        {locked ? (
          <p className="modal-intro">
            {person.isOwner
              ? "Es el administrador principal: tiene acceso total y nadie puede cambiarlo."
              : person.userId === me?.userId
                ? "No puedes cambiar tus propios permisos."
                : "Esta persona administra usuarios. Solo el administrador principal puede cambiar su acceso."}
          </p>
        ) : (
          <>
            <label className="access-status">
              Estado de la cuenta
              <select value={status} onChange={(e) => setStatus(e.target.value as StaffStatus)}>
                <option value="activo">Activo: puede entrar</option>
                <option value="suspendido">Suspendido: no puede entrar</option>
                {person.status === "pendiente" && <option value="pendiente">Pendiente de aprobación</option>}
              </select>
            </label>
            <label className="access-status">
              Marcar los permisos de un rol
              <select value="" onChange={(e) => applyRole(e.target.value)}>
                <option value="">Elegir rol…</option>
                {settings.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="access-title">¿Qué puede ver y hacer?</p>
            <div className="access-grid">
              {PERMISSIONS.map((p) => {
                const ownerOnly = p.id === "usuarios" && !meIsOwner
                return (
                  <label key={p.id} className={`${perms.includes(p.id) ? "is-on" : ""} ${ownerOnly ? "is-disabled" : ""}`}>
                    <input type="checkbox" checked={perms.includes(p.id)} disabled={ownerOnly} onChange={() => toggle(p.id)} />
                    <span>
                      <strong>{p.label}</strong>
                      <small>{ownerOnly ? "Solo el administrador principal puede darlo" : p.hint}</small>
                    </span>
                  </label>
                )
              })}
            </div>
            {error && <p className="users-error">{error}</p>}
            <button className="modal-primary" onClick={() => save()} disabled={saving}>
              {saving ? "Guardando..." : person.status === "pendiente" && status === "activo" ? "Aprobar y guardar permisos" : "Guardar cambios"}
              <AIcon name="check" />
            </button>
            {person.status === "pendiente" && (
              <button className="access-reject" onClick={() => save("rechazado")} disabled={saving}>
                Rechazar esta solicitud
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/* Users & invitations page                                           */
/* ---------------------------------------------------------------- */

export function UsersPage({ invitations = false }: { invitations?: boolean }) {
  const me = useContext(MyAccess)
  const [tab, setTab] = useState<"Usuarios" | "Invitaciones">(invitations ? "Invitaciones" : "Usuarios")
  const [inviting, setInviting] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [query, setQuery] = useState("")
  const staff = useLive(listStaff, onStaffChange)
  const invites = useLive(listInvitations, onInvitationsChange)

  useEffect(() => setTab(invitations ? "Invitaciones" : "Usuarios"), [invitations])

  const people = staff.data ?? []
  const pending = people.filter((p) => p.status === "pendiente")
  const active = people.filter((p) => p.status === "activo")
  const live = (invites.data ?? []).filter((i) => invitationState(i) === "vigente")

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return people
      .filter((p) => p.status !== "rechazado")
      .filter((p) => !q || `${p.name} ${p.username} ${p.email} ${p.roleLabel}`.toLowerCase().includes(q))
  }, [people, query])

  if (!can(me, "usuarios")) {
    return (
      <section className="panel users-empty">
        <h2>No tienes acceso a usuarios</h2>
        <p>Pide al administrador principal que te dé el permiso de usuarios.</p>
      </section>
    )
  }

  return (
    <>
      <header className="module-header">
        <div>
          <span>Identidad y acceso</span>
          <h1>{tab}</h1>
          <p>Invita personas con un enlace, revisa sus datos y decide qué puede ver cada una.</p>
        </div>
        <div>
          <button className="admin-primary" onClick={() => setInviting(true)}>
            <AIcon name="plus" /> Invitar integrante
          </button>
        </div>
      </header>

      <section className="account-overview account-overview-three">
        <div>
          <span>Usuarios activos</span>
          <strong>{staff.data ? active.length : "—"}</strong>
          <small>Con acceso al panel</small>
        </div>
        <div>
          <span>Pendientes de aprobación</span>
          <strong>{staff.data ? pending.length : "—"}</strong>
          <small>{pending.length ? "Requieren tu revisión" : "Todo al día"}</small>
        </div>
        <div>
          <span>Invitaciones vigentes</span>
          <strong>{invites.data ? live.length : "—"}</strong>
          <small>Enlaces sin usar</small>
        </div>
      </section>

      {(staff.error || invites.error) && (
        <p className="users-error">No pudimos cargar los usuarios. Revisa tu conexión y vuelve a intentarlo.</p>
      )}

      {pending.length > 0 && (
        <section className="pending-approvals panel">
          <PanelTitle kicker="Acceso" title="Solicitudes pendientes" />
          <div className="approval-cards">
            {pending.map((p) => (
              <article key={p.userId}>
                <span className="user-avatar">{initials(p.name)}</span>
                <div>
                  <StatusPill tone="pill-warn">Pendiente de aprobación</StatusPill>
                  <h3>{p.name}</h3>
                  <p>
                    @{p.username} · {p.roleLabel || "Sin rol"} · {formatDate(p.createdAt)}
                  </p>
                </div>
                <div className="approval-actions">
                  <button onClick={() => setEditing(p)}>Revisar y dar permisos</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="account-tabs">
        {(["Usuarios", "Invitaciones"] as const).map((item) => (
          <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>
            {item}
            {item === "Invitaciones" && live.length > 0 && <span>{live.length}</span>}
          </button>
        ))}
      </div>

      {tab === "Invitaciones" ? (
        <section className="panel table-panel">
          {invites.data && invites.data.length === 0 ? (
            <div className="users-empty">
              <h2>Aún no hay invitaciones</h2>
              <p>Crea la primera con “Invitar integrante”.</p>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Persona invitada</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Creada</th>
                    <th>Vence</th>
                    <th>Creada por</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(invites.data ?? []).map((inv: Invitation) => {
                    const state = invitationState(inv)
                    const [label, tone] = inviteLabel[state]
                    return (
                      <tr key={inv.id}>
                        <td>
                          <strong>{inv.name || "Sin nombre"}</strong>
                          <small>{inv.email || inv.phone || "—"}</small>
                        </td>
                        <td>
                          {inv.roleLabel || "—"}
                          {inv.kind === "lider" && <small>Se activa sola</small>}
                        </td>
                        <td>
                          <StatusPill tone={tone}>{label}</StatusPill>
                        </td>
                        <td>{formatDate(inv.createdAt)}</td>
                        <td>{formatDate(inv.expiresAt)}</td>
                        <td>{inv.createdByName || "—"}</td>
                        <td>
                          {state === "vigente" && (
                            <div className="inline-actions">
                              <button onClick={() => revokeInvitation(inv.id).catch(() => undefined)}>Anular</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="panel table-panel">
          <div className="table-tools">
            <div className="admin-search">
              <AIcon name="search" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, usuario o rol..." />
            </div>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Permisos</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const [label, tone] = statusLabel[p.status]
                  return (
                    <tr key={p.userId}>
                      <td>
                        <div className="person-cell">
                          <span className="user-avatar">{initials(p.name)}</span>
                          <p>
                            <strong>{p.name}</strong>
                            <span>@{p.username || "—"}</span>
                          </p>
                        </div>
                      </td>
                      <td>{p.isOwner ? "Administrador principal" : p.roleLabel || "—"}</td>
                      <td>{permissionSummary(p)}</td>
                      <td>{p.phone || "—"}</td>
                      <td>
                        <StatusPill tone={tone}>{label}</StatusPill>
                      </td>
                      <td>
                        <div className="inline-actions">
                          <button onClick={() => setEditing(p)}>{p.isOwner || p.userId === me?.userId ? "Ver" : "Permisos"}</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {inviting && <InviteModal close={() => setInviting(false)} />}
      {editing && <AccessModal person={editing} close={() => setEditing(null)} />}
    </>
  )
}

/* ---------------------------------------------------------------- */
/* The invited person's registration (#/registro/<token>)             */
/* ---------------------------------------------------------------- */

export function InviteRegistration({ token, onExit }: { token: string; onExit: () => void }) {
  const [invite, setInvite] = useState<InvitationPreview | null>(null)
  const [invalid, setInvalid] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState("")
  const [active, setActive] = useState(false)
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null)
  const [photoError, setPhotoError] = useState("")

  async function pickPhoto(file?: File) {
    if (!file) return
    setPhotoError("")
    try {
      const blob = await preparePhoto(file)
      setPhoto({ blob, url: URL.createObjectURL(blob) })
    } catch (err) {
      setPhotoError((err as Error).message)
    }
  }

  useEffect(() => {
    readInvitation(token)
      .then(setInvite)
      .catch((err) => setInvalid((err as Error).message))
  }, [token])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const username = String(f.get("username") || "").trim().toLowerCase()
    const password = String(f.get("password") || "")
    setError("")
    if (!USERNAME_RE.test(username))
      return setError("El usuario debe tener de 3 a 30 letras o números, sin espacios ni tildes (puedes usar . - _).")
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.")
    if (password !== f.get("confirm")) return setError("Las contraseñas no coinciden.")
    setSending(true)
    try {
      const result = await acceptInvitation({
        token,
        name: String(f.get("name") || ""),
        docType: String(f.get("docType") || ""),
        docNumber: String(f.get("docNumber") || ""),
        birthDate: String(f.get("birthDate") || ""),
        phone: String(f.get("phone") || ""),
        address: String(f.get("address") || ""),
        email: String(f.get("email") || ""),
        username,
        password,
        ...(photo ? { photo: await blobToDataUrl(photo.blob) } : {}),
      })
      setActive(result.active)
      setDone(username)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (done || invalid) {
    return (
      <main className="onboarding-page">
        <section className="onboarding-card onboarding-complete">
          <AdminLogo dark />
          <span className={done ? "complete-mark" : "complete-mark complete-mark-warn"}>
            <AIcon name={done ? "check" : "shield"} />
          </span>
          <p className="onboarding-kicker">{done ? (active ? "Cuenta activa" : "Registro recibido") : "Invitación"}</p>
          <h1>{done ? (active ? "¡Bienvenido al equipo!" : "Tu cuenta fue creada.") : "Este enlace no está disponible."}</h1>
          <p>
            {done
              ? active
                ? `Tu usuario es “${done}”. Tu cuenta ya está activa: entra ahora con tu usuario y contraseña.`
                : `Tu usuario es “${done}”. Un administrador revisará tus datos y te dará los permisos que necesitas. Cuando estés aprobado podrás entrar con tu usuario y contraseña.`
              : invalid}
          </p>
          {done && active && (
            <button
              onClick={() => {
                window.location.hash = "#/admin"
              }}
            >
              Entrar a la plataforma
            </button>
          )}
          {done && !active && (
            <>
              <div className="approval-flow">
                <span className="done">1</span>
                <i />
                <span className="done">2</span>
                <i />
                <span>3</span>
              </div>
              <div className="approval-labels">
                <span>Datos</span>
                <span>Cuenta</span>
                <span>Aprobación</span>
              </div>
            </>
          )}
          <button onClick={onExit}>Volver a Iglesia MAI</button>
        </section>
      </main>
    )
  }

  if (!invite) {
    return (
      <div className="app-loading">
        <img src="/logo-mai-white.png" alt="Iglesia MAI" />
        <p>Abriendo tu invitación...</p>
      </div>
    )
  }

  const firstName = invite.name.trim().split(/\s+/)[0]

  return (
    <main className="onboarding-page">
      <div className="onboarding-top">
        <AdminLogo dark />
        <button onClick={onExit}>Salir</button>
      </div>
      <section className="onboarding-card">
        <div className="onboarding-heading">
          <p className="onboarding-kicker">Invitación personal{invite.roleLabel ? ` · ${invite.roleLabel}` : ""}</p>
          <h1>{firstName ? `Bienvenido, ${firstName}` : "Bienvenido a MAI"}</h1>
          <span>
            Completa tus datos y crea tu usuario y contraseña para entrar a la gestión interna de Iglesia MAI.
            {invite.kind === "lider" ? " Tu cuenta de líder queda activa apenas termines." : ""}
          </span>
        </div>
        <form className="onboarding-form" onSubmit={submit}>
          <div className="photo-upload">
            <div>{photo ? <img src={photo.url} alt="Vista previa" /> : <AIcon name="people" />}</div>
            <label>
              Tu foto de perfil
              <span>{photoError || (photo ? "Toca para cambiarla" : "Opcional · desde la galería o la cámara")}</span>
              <input type="file" accept="image/*" onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </label>
          </div>
          <div className="form-section-title">
            <span>01</span>
            <p>Información personal</p>
          </div>
          <div className="onboarding-fields">
            <label className="field-full">
              Nombre completo
              <input name="name" required defaultValue={invite.name} placeholder="Escribe tu nombre y apellidos" autoComplete="name" />
            </label>
            <label>
              Tipo de documento
              <select name="docType" required defaultValue="CC">
                <option value="CC">Cédula de ciudadanía</option>
                <option value="CE">Cédula de extranjería</option>
                <option value="TI">Tarjeta de identidad</option>
                <option value="PA">Pasaporte</option>
              </select>
            </label>
            <label>
              Número de documento
              <input name="docNumber" required inputMode="numeric" placeholder="Sin puntos ni espacios" />
            </label>
            <label>
              Fecha de nacimiento
              <input name="birthDate" required type="date" />
            </label>
            <label>
              Teléfono
              <input name="phone" required type="tel" defaultValue={invite.phone} placeholder="+57 300 000 0000" autoComplete="tel" />
            </label>
            <label className="field-full">
              Dirección
              <input name="address" required placeholder="Dirección de residencia" autoComplete="street-address" />
            </label>
            <label className="field-full">
              Correo electrónico
              <input name="email" required type="email" defaultValue={invite.email} placeholder="tu@correo.com" autoComplete="email" />
            </label>
          </div>
          <div className="form-section-title">
            <span>02</span>
            <p>Crea tu acceso</p>
          </div>
          <div className="onboarding-fields">
            <label className="field-full">
              Usuario
              <input
                name="username"
                required
                placeholder="Ej: juan.perez"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
              />
              <small>Con este usuario vas a entrar. Sin espacios ni tildes.</small>
            </label>
            <label>
              Contraseña
              <input name="password" required type="password" minLength={8} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
            </label>
            <label>
              Confirmar contraseña
              <input name="confirm" required type="password" minLength={8} placeholder="Repite tu contraseña" autoComplete="new-password" />
            </label>
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
            {sending ? "Creando tu cuenta..." : "Crear mi cuenta"}
            <AIcon name="arrow" />
          </button>
          <p className="password-note">
            <AIcon name="shield" /> Tu contraseña es privada. Ningún administrador puede verla.
          </p>
        </form>
      </section>
      <footer className="onboarding-footer">Iglesia MAI · Bogotá, Colombia</footer>
    </main>
  )
}
