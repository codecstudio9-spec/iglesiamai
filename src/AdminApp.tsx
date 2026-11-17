import { createContext, FormEvent, useContext, useEffect, useState } from "react"
import "./admin.css"
import WebInbox, { WebOverview, webPages } from "./AdminWebInbox"
import AdminAnnouncements from "./AdminAnnouncements"
import { currentStaff, RECOVERY_FLAG, sendPasswordReset, setNewPassword, signIn, signOut, staffName } from "./lib/auth"
import { InviteRegistration, MyAccess, UsersPage } from "./AdminUsers"
import { ComingSoon, Dashboard, DiscipleSignup, NotificationsPage, PeoplePage, PersonProfile, ProgramPage, TeamPage, useAlerts } from "./AdminPeople"
import SettingsPage from "./AdminSettings"
import { SettingsContext, useSettings } from "./lib/settings"
import { can, myAccess, type Permission, type StaffMember } from "./lib/staff"

export type AdminIcon = "home" | "people" | "team" | "calendar" | "school" | "target" | "wallet" | "expense" | "file" | "certificate" | "chart" | "bell" | "shield" | "settings" | "search" | "plus" | "arrow" | "check" | "clock" | "more" | "menu" | "close" | "upload" | "filter" | "download" | "eye" | "logout" | "globe"

export function AIcon({ name }: { name: AdminIcon }) {
  const p: Record<AdminIcon, React.ReactNode> = {
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    people: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    team: (
      <>
        <circle cx="8" cy="8" r="3" />
        <circle cx="17" cy="7" r="2.5" />
        <path d="M2 20c0-4 2-7 6-7s6 3 6 7M14 13c4 0 7 2 7 6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    school: (
      <>
        <path d="m3 9 9-5 9 5-9 5-9-5Z" />
        <path d="M7 12v5c3 2 7 2 10 0v-5M21 9v6" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 6h15a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12" />
        <path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z" />
      </>
    ),
    expense: (
      <>
        <path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        <path d="m18 3 3 3-3 3" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h8l4 4v16H6z" />
        <path d="M14 2v5h5M9 13h6M9 17h6" />
      </>
    ),
    certificate: (
      <>
        <circle cx="12" cy="9" r="6" />
        <path d="m8 14-1 8 5-3 5 3-1-8" />
        <path d="m10 9 1.3 1.3L14 7.5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20V7" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a2 2 0 0 0 .4 2.2l.1.1-2.6 2.6-.1-.1a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.2 1.8v.2h-3.6v-.2A2 2 0 0 0 9 19.4a2 2 0 0 0-2.2.4l-.1.1-2.6-2.6.1-.1A2 2 0 0 0 4.6 15a2 2 0 0 0-1.8-1.2h-.2v-3.6h.2A2 2 0 0 0 4.6 9a2 2 0 0 0-.4-2.2l-.1-.1 2.6-2.6.1.1A2 2 0 0 0 9 4.6a2 2 0 0 0 1.2-1.8v-.2h3.6v.2A2 2 0 0 0 15 4.6a2 2 0 0 0 2.2-.4l.1-.1 2.6 2.6-.1.1A2 2 0 0 0 19.4 9a2 2 0 0 0 1.8 1.2h.2v3.6h-.2a2 2 0 0 0-1.8 1.2Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 6 6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    close: (
      <>
        <path d="m5 5 14 14M19 5 5 19" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0L7 9m5-5 5 5" />
        <path d="M4 15v5h16v-5" />
      </>
    ),
    filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
    download: (
      <>
        <path d="M12 4v12m0 0 5-5m-5 5-5-5" />
        <path d="M4 19h16" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
      </>
    ),
    logout: (
      <>
        <path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" />
      </>
    ),
  }
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {p[name]}
    </svg>
  )
}

/** Name of whoever is signed in, for the greeting and the user badges. */
const StaffName = createContext("Equipo MAI")

const nav = [
  { label: "Dashboard", icon: "home" as AdminIcon },
  { label: "Personas", icon: "people" as AdminIcon },
  {
    label: "Sitio web",
    icon: "globe" as AdminIcon,
    children: ["Anuncios", ...Object.keys(webPages)],
  },
  {
    label: "Mi equipo",
    icon: "team" as AdminIcon,
    children: ["Usuarios", "Líderes", "Mis discípulos", "Invitaciones"],
  },
  { label: "Encuentros", icon: "calendar" as AdminIcon },
  { label: "Misión 180", icon: "school" as AdminIcon },
  { label: "Capacitación Destino", icon: "target" as AdminIcon },
  { label: "Pagos", icon: "wallet" as AdminIcon },
  { label: "Gastos", icon: "expense" as AdminIcon },
  { label: "Documentos", icon: "file" as AdminIcon },
  { label: "Certificados", icon: "certificate" as AdminIcon },
  { label: "Reportes", icon: "chart" as AdminIcon },
  { label: "Notificaciones", icon: "bell" as AdminIcon },
  { label: "Auditoría", icon: "shield" as AdminIcon },
  { label: "Configuración", icon: "settings" as AdminIcon },
]

/** Which permission opens each page (pages not listed: everyone on the team, or owner-only below). */
const pagePermission: Record<string, Permission> = {
  Personas: "personas",
  "Sitio web": "solicitudes",
  Anuncios: "anuncios",
  "Mi equipo": "equipo",
  Líderes: "equipo",
  "Mis discípulos": "equipo",
  Usuarios: "usuarios",
  Invitaciones: "usuarios",
  Encuentros: "encuentros",
  "Misión 180": "universidad",
  "Capacitación Destino": "capacitacion",
  Pagos: "pagos",
  Gastos: "gastos",
  Documentos: "documentos",
  Certificados: "documentos",
  Reportes: "reportes",
}
const ownerOnlyPages = ["Auditoría", "Configuración"]

export function canOpen(me: StaffMember | null, page: string) {
  if (!me) return false
  if (me.isOwner) return true
  if (ownerOnlyPages.includes(page)) return false
  if (page in webPages) return can(me, "solicitudes")
  const perm = pagePermission[page]
  return perm ? can(me, perm) : true
}

function accessLabel(me: StaffMember | null) {
  if (!me) return "Equipo MAI"
  if (me.isOwner) return "Acceso total"
  return me.roleLabel || "Equipo MAI"
}

export function AdminLogo({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`admin-logo ${dark ? "admin-logo-dark" : ""}`}>
      <img
        src={dark ? "/logo-mai.png" : "/logo-mai-white.png"}
        alt="Iglesia Cristiana MAI"
      />
      <small>GESTIÓN INTERNA</small>
    </div>
  )
}

function Login({
  onLogin,
  onExit,
  resetting = false,
}: {
  onLogin: () => void
  onExit: () => void
  /** Arrived from the "forgot password" email: ask for the new password. */
  resetting?: boolean
}) {
  const [recovery, setRecovery] = useState(false)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const email = String(f.get("email") || "")
    const password = String(f.get("password") || "")
    setBusy(true)
    setError("")
    try {
      if (resetting) {
        if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.")
        if (password !== f.get("confirm")) throw new Error("Las contraseñas no coinciden.")
        await setNewPassword(password)
        history.replaceState(null, "", `${window.location.pathname}#/admin`)
        onLogin()
      } else if (recovery) {
        await sendPasswordReset(email)
        setSent(true)
      } else {
        await signIn(email, password)
        onLogin()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="login-brand-photo" />
        <div className="login-brand-overlay" />
        <div className="login-brand-top">
          <AdminLogo />
        </div>
        <div className="login-quote">
          <p>
            Todo MAI,
            <br />
            <em>en un solo lugar.</em>
          </p>
          <span>Personas · Procesos · Formación · Recursos</span>
        </div>
        <button className="back-site" onClick={onExit}>
          ← Volver al sitio público
        </button>
      </section>
      <section className="login-panel">
        <div className="login-mobile-logo">
          <AdminLogo dark />
        </div>
        <div className="login-form-wrap">
          {sent ? (
            <div className="login-success">
              <span>
                <AIcon name="check" />
              </span>
              <h1>Revisa tu correo</h1>
              <p>
                Si existe una cuenta asociada, recibirás instrucciones para
                restablecer tu contraseña.
              </p>
              <button
                onClick={() => {
                  setRecovery(false)
                  setSent(false)
                }}
              >
                Volver a iniciar sesión
              </button>
            </div>
          ) : (
            <>
              <div className="login-heading">
                <p>Plataforma interna</p>
                <h1>{resetting ? "Nueva contraseña" : recovery ? "Recupera tu acceso" : "Bienvenido a MAI"}</h1>
                <span>
                  {resetting
                    ? "Escribe la contraseña con la que entrarás desde ahora."
                    : recovery
                    ? "Te enviaremos un enlace seguro para crear una nueva contraseña."
                    : "Gestiona personas, procesos, formación y recursos de nuestra iglesia desde un solo lugar."}
                </span>
              </div>
              <form onSubmit={submit} className="login-form">
                {!resetting && (
                  <label>
                    {recovery ? "Correo electrónico" : "Usuario o correo"}
                    <input
                      required
                      name="email"
                      type={recovery ? "email" : "text"}
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={recovery ? "nombre@iglesiamai.com" : "Tu usuario"}
                    />
                  </label>
                )}
                {!recovery && (
                  <label>
                    {resetting ? "Nueva contraseña" : "Contraseña"}
                    <input
                      required
                      name="password"
                      type="password"
                      autoComplete={resetting ? "new-password" : "current-password"}
                      minLength={resetting ? 8 : undefined}
                    />
                  </label>
                )}
                {resetting && (
                  <label>
                    Repite la contraseña
                    <input required name="confirm" type="password" autoComplete="new-password" />
                  </label>
                )}
                {!recovery && !resetting && (
                  <div className="login-options">
                    <label>
                      <input type="checkbox" defaultChecked /> Mantener sesión
                      iniciada
                    </label>
                    <button type="button" onClick={() => setRecovery(true)}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}
                {error && (
                  <p className="login-error" role="alert">
                    {error}
                  </p>
                )}
                <button className="login-submit" type="submit" disabled={busy}>
                  {busy
                    ? "Un momento…"
                    : resetting
                    ? "Guardar y entrar"
                    : recovery
                    ? "Enviar instrucciones"
                    : "Iniciar sesión"}
                  <AIcon name="arrow" />
                </button>
                {recovery && (
                  <button
                    className="login-back"
                    type="button"
                    onClick={() => setRecovery(false)}
                  >
                    Volver al inicio de sesión
                  </button>
                )}
              </form>
              <div className="demo-notice">
                <AIcon name="shield" />
                <p>
                  <strong>Acceso protegido</strong>
                  <br />
                  Solo el personal habilitado por un administrador puede
                  entrar. Las peticiones de oración son confidenciales.
                </p>
              </div>
            </>
          )}
        </div>
        <p className="login-legal">
          Acceso exclusivo para personal autorizado de Iglesia MAI.
        </p>
      </section>
    </main>
  )
}

export function PanelTitle({
  kicker,
  title,
  action,
  onAction,
}: {
  kicker: string
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <header className="panel-title">
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
      </div>
      {action && (
        <button onClick={onAction}>
          {action}
          <AIcon name="arrow" />
        </button>
      )}
    </header>
  )
}

export function StatusPill({
  children,
  tone = "",
}: {
  children: React.ReactNode
  tone?: string
}) {
  return <span className={`status-pill ${tone}`}>{children}</span>
}

export function PageHeader({
  eyebrow,
  title,
  copy,
  primary,
  onPrimary,
  onExport,
}: {
  eyebrow: string
  title: string
  copy: string
  primary?: string
  onPrimary?: () => void
  onExport?: () => void
}) {
  return (
    <header className="module-header">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {(onExport || primary) && (
        <div>
          {onExport && (
            <button className="secondary-action" onClick={onExport}>
              <AIcon name="download" /> Exportar
            </button>
          )}
          {primary && (
            <button className="admin-primary" onClick={onPrimary}>
              <AIcon name="plus" /> {primary}
            </button>
          )}
        </div>
      )}
    </header>
  )
}

function Sidebar({
  page,
  go,
  open,
  close,
  logout,
  alerts,
}: {
  page: string
  go: (x: string) => void
  open: boolean
  close: () => void
  logout: () => void
  alerts: number
}) {
  const name = useContext(StaffName)
  const me = useContext(MyAccess)
  const items = nav
    .map((item) => ({ ...item, children: item.children?.filter((c) => canOpen(me, c)) }))
    .filter((item) => canOpen(me, item.label) || (item.children?.length ?? 0) > 0)
  return (
    <>
      <aside className={`admin-sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-head">
          <AdminLogo />
          <button onClick={close}>
            <AIcon name="close" />
          </button>
        </div>
        <nav>
          {items.map((item) => (
            <div key={item.label}>
              <button
                className={page === item.label ? "active" : ""}
                onClick={() => {
                  go(item.label)
                  close()
                }}
              >
                <AIcon name={item.icon} />
                <span>{item.label}</span>
                {item.label === "Notificaciones" && alerts > 0 && <b>{alerts}</b>}
              </button>
              {item.children && item.children.length > 0 && (
                <div className="subnav">
                  {item.children.map((c) => (
                    <button
                      className={page === c ? "active" : ""}
                      onClick={() => {
                        go(c)
                        close()
                      }}
                      key={c}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="user-initial">{name[0].toUpperCase()}</span>
          <div>
            <strong>{name}</strong>
            <span>{accessLabel(me)}</span>
          </div>
          <button onClick={logout}>
            <AIcon name="logout" />
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-scrim"
          onClick={close}
          aria-label="Cerrar menú"
        />
      )}
    </>
  )
}

function AdminTopbar({
  page,
  menu,
  go,
  search,
  alerts,
}: {
  page: string
  menu: () => void
  go: (s: string) => void
  search: (q: string) => void
  alerts: number
}) {
  const name = useContext(StaffName)
  const me = useContext(MyAccess)
  const [q, setQ] = useState("")
  return (
    <header className="admin-topbar">
      <button className="mobile-menu-btn" onClick={menu}>
        <AIcon name="menu" />
      </button>
      <form
        className="global-search"
        onSubmit={(e) => {
          e.preventDefault()
          search(q)
        }}
      >
        <AIcon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar personas por nombre, documento o teléfono..." />
        <kbd>Enter</kbd>
      </form>
      <div className="top-actions">
        <button
          onClick={() => go("Notificaciones")}
          className="notification-button"
        >
          <AIcon name="bell" />
          {alerts > 0 && <i />}
        </button>
        <div className="top-user">
          <span className="user-initial">{name[0].toUpperCase()}</span>
          <p>
            <strong>{name}</strong>
            <span>{accessLabel(me)}</span>
          </p>
          <AIcon name="more" />
        </div>
      </div>
      <span className="mobile-page-title">{page}</span>
    </header>
  )
}

function MobileNav({ page, go, more }: { page: string; go: (s: string) => void; more: () => void }) {
  const me = useContext(MyAccess)
  const links = (
    [
      ["Dashboard", "home"],
      ["Personas", "people"],
      ["Mis discípulos", "team"],
      ["Notificaciones", "bell"],
      ["Más", "more"],
    ] as [string, AdminIcon][]
  ).filter(([label]) => label === "Más" || canOpen(me, label))
  return (
    <nav className="mobile-bottom-nav">
      {links.map(([label, icon]) => (
        <button
          className={
            page === label ||
            (label === "Más" && !links.some((l) => l[0] === page))
              ? "active"
              : ""
          }
          onClick={() => (label === "Más" ? more() : go(label))}
          key={label}
        >
          <AIcon name={icon} />
          <span>{label === "Dashboard" ? "Inicio" : label === "Mis discípulos" ? "Discípulos" : label === "Notificaciones" ? "Avisos" : label}</span>
        </button>
      ))}
    </nav>
  )
}

export default function AdminApp({ onExit }: { onExit: () => void }) {
  const [logged, setLogged] = useState(false)
  const [name, setName] = useState("Equipo MAI")
  const [me, setMe] = useState<StaffMember | null>(null)
  const [checking, setChecking] = useState(true)
  const [resetting] = useState(() => window.location.search.includes(RECOVERY_FLAG))
  useEffect(() => {
    // Reset links sign the person in first; they still have to choose a new password.
    if (resetting) return setChecking(false)
    currentStaff()
      .then(async (user) => {
        const access = user ? await myAccess() : null
        setMe(access)
        setLogged(Boolean(user && access))
        if (user) setName(access?.name || staffName(user))
      })
      .finally(() => setChecking(false))
  }, [resetting, logged])
  const [page, setPage] = useState("Dashboard")
  const [sidebar, setSidebar] = useState(false)
  const [personId, setPersonId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [route, setRoute] = useState(window.location.hash)
  const { settings } = useSettings(me?.userId ?? "")
  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash)
    window.addEventListener("hashchange", updateRoute)
    return () => window.removeEventListener("hashchange", updateRoute)
  }, [])
  if (route.startsWith("#/registro/")) {
    return <InviteRegistration token={decodeURIComponent(route.slice("#/registro/".length).split(/[/?]/)[0])} onExit={onExit} />
  }
  if (route.startsWith("#/inscripcion/")) {
    return <DiscipleSignup code={decodeURIComponent(route.slice("#/inscripcion/".length).split(/[/?]/)[0])} onExit={onExit} />
  }
  if (checking) {
    return (
      <div className="app-loading">
        <img src="/logo-mai-white.png" alt="Iglesia MAI" />
        <p>Cargando gestión MAI...</p>
      </div>
    )
  }
  if (!logged) return <Login onLogin={() => setLogged(true)} onExit={onExit} resetting={resetting} />
  function go(p: string) {
    setPage(p)
    setPersonId(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  return (
    <MyAccess.Provider value={me}>
      <StaffName.Provider value={name}>
        <SettingsContext.Provider value={settings}>
          <AdminShell
            page={page}
            go={go}
            sidebar={sidebar}
            setSidebar={setSidebar}
            personId={personId}
            setPersonId={setPersonId}
            query={query}
            search={(q) => {
              setQuery(q)
              go("Personas")
            }}
            logout={() => signOut().finally(() => (setLogged(false), setMe(null)))}
          />
        </SettingsContext.Provider>
      </StaffName.Provider>
    </MyAccess.Provider>
  )
}

/** The signed-in panel (inside the access, name and settings providers). */
function AdminShell({
  page,
  go,
  sidebar,
  setSidebar,
  personId,
  setPersonId,
  query,
  search,
  logout,
}: {
  page: string
  go: (p: string) => void
  sidebar: boolean
  setSidebar: (open: boolean) => void
  personId: string | null
  setPersonId: (id: string | null) => void
  query: string
  search: (q: string) => void
  logout: () => void
}) {
  const me = useContext(MyAccess)
  const name = useContext(StaffName)
  const alerts = useAlerts()
  const count = alerts.data?.length ?? 0
  const open = (id: string) => {
    setPersonId(id)
    window.scrollTo({ top: 0 })
  }
  let content: React.ReactNode
  if (!canOpen(me, page)) content = <Dashboard go={go} name={name} />
  else if (personId) content = <PersonProfile id={personId} back={() => setPersonId(null)} />
  else if (page === "Dashboard") content = <Dashboard go={go} name={name} />
  else if (page === "Personas") content = <PeoplePage openPerson={open} initialQuery={query} />
  else if (page === "Sitio web") content = <WebOverview go={go} />
  else if (page === "Anuncios") content = <AdminAnnouncements go={go} />
  else if (webPages[page]) content = <WebInbox kind={webPages[page]} />
  else if (page === "Líderes") content = <TeamPage leaders openPerson={open} />
  else if (page === "Mis discípulos" || page === "Mi equipo") content = <TeamPage openPerson={open} />
  else if (page === "Encuentros") content = <ProgramPage programId="encuentro" openPerson={open} />
  else if (page === "Misión 180") content = <ProgramPage programId="mision180" openPerson={open} />
  else if (page === "Capacitación Destino") content = <ProgramPage programId="destino" openPerson={open} />
  else if (page === "Usuarios") content = <UsersPage />
  else if (page === "Invitaciones") content = <UsersPage invitations />
  else if (page === "Notificaciones") content = <NotificationsPage go={go} />
  else if (page === "Configuración") content = <SettingsPage go={go} />
  else if (page === "Pagos") content = <ComingSoon page="Pagos" icon="wallet" copy="Ingresos, abonos y comprobantes de cada persona." />
  else if (page === "Gastos") content = <ComingSoon page="Gastos" icon="expense" copy="Egresos de la iglesia y de cada encuentro, con su soporte." />
  else if (page === "Documentos") content = <ComingSoon page="Documentos" icon="file" copy="El archivo de documentos de MAI." />
  else if (page === "Certificados") content = <ComingSoon page="Certificados" icon="certificate" copy="Certificados de Encuentro, Misión 180 y Destino." />
  else if (page === "Reportes") content = <ComingSoon page="Reportes" icon="chart" copy="Indicadores conectados para tomar mejores decisiones." />
  else if (page === "Auditoría") content = <ComingSoon page="Auditoría" icon="shield" copy="Quién hizo qué cambio y cuándo." />
  else content = <Dashboard go={go} name={name} />
  return (
    <main className="admin-app">
      <Sidebar page={page} go={go} open={sidebar} close={() => setSidebar(false)} logout={logout} alerts={count} />
      <div className="admin-shell">
        <AdminTopbar page={page} menu={() => setSidebar(true)} go={go} search={search} alerts={count} />
        <div className="admin-content">{content}</div>
      </div>
      <MobileNav page={page} go={go} more={() => setSidebar(true)} />
    </main>
  )
}
