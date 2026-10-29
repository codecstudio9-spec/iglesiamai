import { FormEvent, useEffect, useMemo, useState } from "react"
import "./admin.css"
import WebInbox, { WebOverview, webPages } from "./AdminWebInbox"
import AdminAnnouncements from "./AdminAnnouncements"
import { currentStaff, RECOVERY_FLAG, sendPasswordReset, setNewPassword, signIn, signOut } from "./lib/auth"

type AdminIcon = "home" | "people" | "team" | "calendar" | "school" | "target" | "wallet" | "expense" | "file" | "certificate" | "chart" | "bell" | "shield" | "settings" | "search" | "plus" | "arrow" | "check" | "clock" | "more" | "menu" | "close" | "upload" | "filter" | "download" | "eye" | "logout" | "globe"

function AIcon({ name }: { name: AdminIcon }) {
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

const avatar = (id: number) => `https://i.pravatar.cc/160?img=${id}`

const people = [
  {
    id: 1,
    name: "Juan David Pérez",
    role: "Discípulo",
    leader: "Andrés Moreno",
    stage: "Universidad",
    status: "Activo",
    phone: "310 452 8190",
    progress: 72,
    img: avatar(12),
    payment: "Parcial",
  },
  {
    id: 2,
    name: "María Fernanda Gómez",
    role: "Líder",
    leader: "Laura Martínez",
    stage: "Destino",
    status: "Activo",
    phone: "315 801 2247",
    progress: 91,
    img: avatar(47),
    payment: "Al día",
  },
  {
    id: 3,
    name: "Carlos Andrés Rodríguez",
    role: "Estudiante",
    leader: "Daniel Rojas",
    stage: "Encuentro",
    status: "Nuevo",
    phone: "300 772 1834",
    progress: 38,
    img: avatar(11),
    payment: "Pendiente",
  },
  {
    id: 4,
    name: "Laura Valentina Martínez",
    role: "Profesora",
    leader: "Pastor MAI",
    stage: "Graduado",
    status: "Activo",
    phone: "320 113 5098",
    progress: 100,
    img: avatar(45),
    payment: "Al día",
  },
  {
    id: 5,
    name: "Samuel Esteban Torres",
    role: "Discípulo",
    leader: "María Gómez",
    stage: "Pre-encuentro",
    status: "Activo",
    phone: "301 550 1248",
    progress: 24,
    img: avatar(15),
    payment: "Parcial",
  },
]

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
  { label: "Universidad de la Vida", icon: "school" as AdminIcon },
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

function AdminLogo({ dark = false }: { dark?: boolean }) {
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
                    Correo electrónico
                    <input
                      required
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="nombre@iglesiamai.co"
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

function RegistrationOnboarding({
  disciple = false,
  onExit,
}: {
  disciple?: boolean
  onExit: () => void
}) {
  const [complete, setComplete] = useState(false)
  const [photo, setPhoto] = useState(false)
  function submit(e: FormEvent) {
    e.preventDefault()
    setComplete(true)
  }
  if (complete) {
    return (
      <main className="onboarding-page">
        <section className="onboarding-card onboarding-complete">
          <AdminLogo dark />
          <span className="complete-mark">
            <AIcon name="check" />
          </span>
          <p className="onboarding-kicker">Registro recibido</p>
          <h1>
            {disciple ? "Tu proceso comienza aquí." : "Tu cuenta fue creada."}
          </h1>
          <p>
            {disciple
              ? "Carlos Rodríguez recibirá tu solicitud y podrá acompañarte en tus próximos pasos en MAI."
              : "Tu acceso está pendiente de autorización. Un administrador asignará tu rol y permisos antes de activar la cuenta."}
          </p>
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
          <button onClick={onExit}>Volver a Iglesia MAI</button>
        </section>
      </main>
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
          <p className="onboarding-kicker">
            {disciple
              ? "Invitación personal · Carlos Rodríguez"
              : "Registro de integrante"}
          </p>
          <h1>{disciple ? "Inicia tu proceso en MAI" : "Bienvenido a MAI"}</h1>
          <span>
            {disciple
              ? "Completa tus datos para ser parte del equipo de Carlos Rodríguez."
              : "Completa tus datos para crear tu acceso."}
          </span>
        </div>
        <form className="onboarding-form" onSubmit={submit}>
          <div className="photo-upload">
            <div>
              {photo ? (
                <img src={avatar(33)} alt="Vista previa" />
              ) : (
                <AIcon name="people" />
              )}
            </div>
            <label>
              Foto de perfil
              <span>JPG o PNG · Máximo 5 MB</span>
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={() => setPhoto(true)}
              />
            </label>
          </div>
          <div className="form-section-title">
            <span>01</span>
            <p>Información personal</p>
          </div>
          <div className="onboarding-fields">
            <label className="field-full">
              Nombre completo
              <input required placeholder="Escribe tu nombre y apellidos" />
            </label>
            <label>
              Tipo de documento
              <select required defaultValue="CC">
                <option value="CC">Cédula de ciudadanía</option>
                <option value="CE">Cédula de extranjería</option>
                <option value="TI">Tarjeta de identidad</option>
                <option value="PA">Pasaporte</option>
              </select>
            </label>
            <label>
              Número de documento
              <input required placeholder="Sin puntos ni espacios" />
            </label>
            <label>
              Fecha de nacimiento
              <input required type="date" />
            </label>
            <label>
              Teléfono
              <input required type="tel" placeholder="+57 300 000 0000" />
            </label>
            <label className="field-full">
              Dirección
              <input required placeholder="Dirección de residencia" />
            </label>
            {disciple && (
              <label className="field-full">
                Contacto de emergencia
                <input placeholder="Nombre y teléfono" />
              </label>
            )}
          </div>
          <div className="form-section-title">
            <span>02</span>
            <p>{disciple ? "Información de contacto" : "Crea tu acceso"}</p>
          </div>
          <div className="onboarding-fields">
            <label className={disciple ? "field-full" : ""}>
              Correo electrónico
              <input required type="email" placeholder="tu@correo.com" />
            </label>
            {!disciple && (
              <>
                <label>
                  Usuario
                  <input required placeholder="Elige tu usuario" />
                  <small>Este será tu identificador de acceso.</small>
                </label>
                <label>
                  Contraseña
                  <input
                    required
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                  />
                </label>
                <label>
                  Confirmar contraseña
                  <input
                    required
                    type="password"
                    placeholder="Repite tu contraseña"
                  />
                </label>
              </>
            )}
            {disciple && (
              <label className="field-full">
                Información adicional
                <textarea
                  rows={3}
                  placeholder="¿Hay algo que debamos saber para acompañarte mejor?"
                />
              </label>
            )}
          </div>
          <label className="data-consent">
            <input required type="checkbox" />
            <span>
              Acepto el tratamiento de mis datos personales según la política de
              privacidad de Iglesia MAI.
            </span>
          </label>
          <button className="onboarding-submit" type="submit">
            {disciple ? "Enviar inscripción" : "Crear mi cuenta"}
            <AIcon name="arrow" />
          </button>
          {!disciple && (
            <p className="password-note">
              <AIcon name="shield" /> Tu contraseña es privada. Ningún
              administrador puede verla.
            </p>
          )}
        </form>
      </section>
      <footer className="onboarding-footer">
        Iglesia MAI · Bogotá, Colombia
      </footer>
    </main>
  )
}

function Stat({
  label,
  value,
  change,
  tone = "",
}: {
  label: string
  value: string
  change: string
  tone?: string
}) {
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

function DonutChart() {
  return (
    <div className="donut-wrap">
      <div className="donut">
        <div>
          <strong>1.284</strong>
          <span>personas</span>
        </div>
      </div>
      <ul>
        <li>
          <i className="c1" /> Nuevos <b>18%</b>
        </li>
        <li>
          <i className="c2" /> Encuentro <b>24%</b>
        </li>
        <li>
          <i className="c3" /> Universidad <b>31%</b>
        </li>
        <li>
          <i className="c4" /> Destino <b>27%</b>
        </li>
      </ul>
    </div>
  )
}

function BarChart() {
  const values = [42, 60, 48, 73, 65, 82]
  return (
    <div className="bar-chart">
      <div className="bar-y">
        <span>$8M</span>
        <span>$4M</span>
        <span>$0</span>
      </div>
      <div className="bars">
        {values.map((v, i) => (
          <div key={i} className="bar-column">
            <div className="bar-pair">
              <i style={{ height: `${v}%` }} />
              <i style={{ height: `${Math.max(25, v - 22)}%` }} />
            </div>
            <span>{["Ene", "Feb", "Mar", "Abr", "May", "Jun"][i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Dashboard({ go }: { go: (s: string) => void }) {
  const activity = [
    ["María Fernanda Gómez", "registró un pago de $150.000", "Hace 8 min", 47],
    ["Andrés Moreno", "inscribió a Juan Pérez en Encuentro", "Hace 24 min", 14],
    ["Laura Martínez", "marcó asistencia de Universidad", "Hace 1 h", 45],
    ["Carlos Rodríguez", "subió un documento de soporte", "Hace 2 h", 11],
    ["Sistema MAI", "generó 3 certificados de graduación", "Hace 3 h", 5],
  ]
  return (
    <>
      <header className="page-welcome">
        <div>
          <p>Jueves, 9 de julio</p>
          <h1>Buenos días, Daniela.</h1>
          <span>Este es el pulso de MAI hoy.</span>
        </div>
        <button onClick={() => go("Personas")}>
          <AIcon name="plus" /> Registrar persona
        </button>
      </header>
      <section className="stat-grid">
        <Stat label="Personas activas" value="1.284" change="+4.8% este mes" />
        <Stat label="Líderes" value="46" change="8 equipos activos" />
        <Stat label="Discípulos" value="327" change="+18 este mes" />
        <Stat
          label="Próximo encuentro"
          value="52"
          change="8 cupos disponibles"
          tone="stat-accent"
        />
      </section>
      <section className="dashboard-grid">
        <article className="panel people-stage">
          <PanelTitle
            kicker="Proceso MAI"
            title="Personas por etapa"
            action="Ver personas"
            onAction={() => go("Personas")}
          />
          <DonutChart />
        </article>
        <article className="panel finance-chart">
          <PanelTitle
            kicker="Finanzas"
            title="Ingresos vs. egresos"
            action="Ver reporte"
            onAction={() => go("Reportes")}
          />
          <BarChart />
          <div className="chart-legend">
            <span>
              <i /> Ingresos <b>$7.8M</b>
            </span>
            <span>
              <i /> Egresos <b>$5.1M</b>
            </span>
          </div>
        </article>
      </section>
      <section className="dashboard-lower">
        <article className="panel quick-panel">
          <PanelTitle kicker="Acciones" title="Accesos rápidos" />
          <div className="quick-grid">
            {[
              ["Registrar persona", "people", "Personas"],
              ["Inscribir a encuentro", "calendar", "Encuentros"],
              ["Registrar pago", "wallet", "Pagos"],
              ["Subir documento", "upload", "Documentos"],
            ].map(([label, icon, page]) => (
              <button key={label} onClick={() => go(page)}>
                <span>
                  <AIcon name={icon as AdminIcon} />
                </span>
                {label}
                <AIcon name="arrow" />
              </button>
            ))}
          </div>
        </article>
        <article className="panel activity-panel">
          <PanelTitle
            kicker="En vivo"
            title="Actividad reciente"
            action="Ver auditoría"
            onAction={() => go("Auditoría")}
          />
          <div className="activity-list">
            {activity.map(([name, action, time, img]) => (
              <div className="activity-row" key={name as string}>
                <img src={avatar(img as number)} alt="" />
                <p>
                  <strong>{name}</strong> {action}
                  <span>{time}</span>
                </p>
                <i />
              </div>
            ))}
          </div>
        </article>
      </section>
      <section className="mini-stat-row">
        <div>
          <AIcon name="wallet" />
          <p>
            Pagos pendientes<strong>$3.450.000</strong>
          </p>
          <span>23 personas</span>
        </div>
        <div>
          <AIcon name="school" />
          <p>
            Universidad de la Vida<strong>124 estudiantes</strong>
          </p>
          <span>Generación #12</span>
        </div>
        <div>
          <AIcon name="target" />
          <p>
            Capacitación Destino<strong>86 estudiantes</strong>
          </p>
          <span>6 cursos activos</span>
        </div>
        <div>
          <AIcon name="certificate" />
          <p>
            Certificados pendientes<strong>12 por generar</strong>
          </p>
          <span>4 listos hoy</span>
        </div>
      </section>
      <section className="admin-attention">
        <header>
          <span>Requiere tu atención</span>
          <h2>Procesos pendientes</h2>
        </header>
        <button onClick={() => go("Usuarios")}>
          <span>12</span>
          <p>
            <strong>Cuentas esperando aprobación</strong>
            <small>Revisar identidad, rol y permisos</small>
          </p>
          <AIcon name="arrow" />
        </button>
        <button onClick={() => go("Mis discípulos")}>
          <span>23</span>
          <p>
            <strong>Solicitudes de discípulos</strong>
            <small>Nuevas inscripciones por enlace</small>
          </p>
          <AIcon name="arrow" />
        </button>
        <button onClick={() => go("Documentos")}>
          <span>8</span>
          <p>
            <strong>Documentos pendientes</strong>
            <small>Validación y aprobación</small>
          </p>
          <AIcon name="arrow" />
        </button>
      </section>
    </>
  )
}

function PanelTitle({
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

function StatusPill({
  children,
  tone = "",
}: {
  children: React.ReactNode
  tone?: string
}) {
  return <span className={`status-pill ${tone}`}>{children}</span>
}

function PeoplePage({ openPerson }: { openPerson: (id: number) => void }) {
  const [query, setQuery] = useState("")
  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <>
      <PageHeader
        eyebrow="Base de datos"
        title="Personas"
        copy="El centro de cada proceso, equipo y etapa dentro de MAI."
        primary="Registrar persona"
      />
      <div className="module-stats">
        <div>
          <span>Total personas</span>
          <strong>1.284</strong>
          <small>+62 este año</small>
        </div>
        <div>
          <span>Activas</span>
          <strong>1.109</strong>
          <small>86% de la base</small>
        </div>
        <div>
          <span>Nuevas este mes</span>
          <strong>32</strong>
          <small>+12% vs. junio</small>
        </div>
        <div>
          <span>Sin líder asignado</span>
          <strong>18</strong>
          <small>Requieren atención</small>
        </div>
      </div>
      <section className="panel table-panel">
        <div className="table-tools">
          <div className="admin-search">
            <AIcon name="search" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, documento o teléfono..."
            />
          </div>
          <button>
            <AIcon name="filter" /> Filtros
          </button>
          <button>
            <AIcon name="download" /> Exportar
          </button>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Etapa</th>
                <th>Líder</th>
                <th>Pago</th>
                <th>Progreso</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((person) => (
                <tr key={person.id} onClick={() => openPerson(person.id)}>
                  <td>
                    <div className="person-cell">
                      <img src={person.img} alt="" />
                      <p>
                        <strong>{person.name}</strong>
                        <span>
                          {person.phone} · {person.role}
                        </span>
                      </p>
                    </div>
                  </td>
                  <td>{person.stage}</td>
                  <td>{person.leader}</td>
                  <td>
                    <StatusPill
                      tone={
                        person.payment === "Pendiente"
                          ? "pill-warn"
                          : person.payment === "Parcial"
                            ? "pill-blue"
                            : "pill-ok"
                      }
                    >
                      {person.payment}
                    </StatusPill>
                  </td>
                  <td>
                    <div className="progress-cell">
                      <span>
                        <i style={{ width: `${person.progress}%` }} />
                      </span>
                      <b>{person.progress}%</b>
                    </div>
                  </td>
                  <td>
                    <StatusPill
                      tone={person.status === "Nuevo" ? "pill-blue" : "pill-ok"}
                    >
                      {person.status}
                    </StatusPill>
                  </td>
                  <td>
                    <button className="icon-more">
                      <AIcon name="more" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Mostrando {filtered.length} de 1.284 personas</span>
          <div>
            <button>←</button>
            <b>1</b>
            <button>2</button>
            <button>3</button>
            <button>→</button>
          </div>
        </div>
      </section>
    </>
  )
}

function PersonProfile({ id, back }: { id: number; back: () => void }) {
  const person = people.find((p) => p.id === id) || people[0]
  const steps = [
    ["Ingreso a MAI", "12 enero 2026", true],
    ["Pre-encuentro", "4 clases completadas", true],
    ["Encuentro MAI", "18–20 abril 2026", true],
    ["Universidad", "Clase 6 de 8", false],
    ["Graduación", "Pendiente", false],
    ["Destino", "Aún no inicia", false],
  ]
  return (
    <>
      <button className="page-back" onClick={back}>
        ← Volver a personas
      </button>
      <section className="profile-hero">
        <div className="profile-person">
          <img src={person.img} alt="" />
          <div>
            <span>MAI-001284</span>
            <h1>{person.name}</h1>
            <p>{person.role} · Ingresó el 12 de enero de 2026</p>
            <div>
              <StatusPill tone="pill-ok">Activo</StatusPill>
              <StatusPill tone="pill-blue">{person.stage}</StatusPill>
            </div>
          </div>
        </div>
        <div className="profile-actions">
          <button>
            <AIcon name="file" /> Generar documento
          </button>
          <button className="admin-primary">Editar perfil</button>
          <button className="icon-more">
            <AIcon name="more" />
          </button>
        </div>
      </section>
      <nav className="profile-tabs">
        {["Información", "Equipo", "Permisos", "Actividad", "Documentos"].map(
          (item, i) => (
            <button className={i === 0 ? "active" : ""} key={item}>
              {item}
            </button>
          ),
        )}
      </nav>
      <section className="profile-quick-actions">
        {[
          ["Inscribir a encuentro", "calendar"],
          ["Registrar pago", "wallet"],
          ["Subir documento", "upload"],
          ["Agregar observación", "file"],
          ["Cambiar líder", "team"],
          ["Generar certificado", "certificate"],
        ].map(([label, icon]) => (
          <button key={label}>
            <AIcon name={icon as AdminIcon} />
            {label}
          </button>
        ))}
      </section>
      <div className="profile-grid">
        <section className="panel profile-main">
          <PanelTitle kicker="Proceso personal" title="Camino en MAI" />
          <div className="journey">
            {steps.map(([title, meta, done], i) => (
              <div className={done ? "journey-done" : ""} key={title as string}>
                <span>{done ? <AIcon name="check" /> : i + 1}</span>
                <p>
                  <strong>{title}</strong>
                  <small>{meta}</small>
                </p>
                {i < steps.length - 1 && <i />}
              </div>
            ))}
          </div>
        </section>
        <aside className="panel profile-contact">
          <PanelTitle kicker="Información" title="Datos personales" />
          <dl>
            <div>
              <dt>Documento</dt>
              <dd>1.023.456.789</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{person.phone}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>juan.perez@email.com</dd>
            </div>
            <div>
              <dt>Líder</dt>
              <dd>{person.leader}</dd>
            </div>
            <div>
              <dt>Ministerio</dt>
              <dd>Servicio familiar</dd>
            </div>
            <div>
              <dt>Fecha de nacimiento</dt>
              <dd>14 de junio de 1998</dd>
            </div>
          </dl>
        </aside>
      </div>
      <section className="profile-summary">
        <article className="panel">
          <span>Encuentro</span>
          <h3>Completado</h3>
          <p>18–20 abril 2026</p>
          <StatusPill tone="pill-ok">Asistió</StatusPill>
        </article>
        <article className="panel">
          <span>Universidad</span>
          <h3>6 de 8 clases</h3>
          <div className="wide-progress">
            <i style={{ width: "75%" }} />
          </div>
          <p>75% completado</p>
        </article>
        <article className="panel">
          <span>Estado financiero</span>
          <h3>$50.000 pendiente</h3>
          <p>Pagado: $150.000 de $200.000</p>
          <StatusPill tone="pill-warn">Pago parcial</StatusPill>
        </article>
      </section>
      <section className="panel profile-timeline">
        <PanelTitle kicker="Historial" title="Actividad de la persona" />
        <div className="activity-list">
          <div className="activity-row">
            <span className="timeline-icon">
              <AIcon name="wallet" />
            </span>
            <p>
              <strong>Pago registrado</strong> por María Gómez
              <span>5 julio 2026 · $100.000</span>
            </p>
          </div>
          <div className="activity-row">
            <span className="timeline-icon">
              <AIcon name="school" />
            </span>
            <p>
              <strong>Asistió a la clase 6</strong> de Universidad
              <span>2 julio 2026 · Laura Martínez</span>
            </p>
          </div>
          <div className="activity-row">
            <span className="timeline-icon">
              <AIcon name="calendar" />
            </span>
            <p>
              <strong>Encuentro completado</strong>
              <span>20 abril 2026 · Encuentro MAI</span>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

function EncountersPage() {
  const [section, setSection] = useState("Resumen")
  const encounterSections = [
    "Resumen",
    "Participantes",
    "Finanzas",
    "Gastos",
    "Documentos",
    "Equipo",
    "Reportes",
  ]
  return (
    <>
      <PageHeader
        eyebrow="Procesos"
        title="Encuentros"
        copy="Administra inscripciones, pagos, cupos y asistencia en un solo flujo."
        primary="Crear encuentro"
      />
      <section className="encounter-feature">
        <div className="encounter-copy">
          <span>Próximo encuentro</span>
          <h2>
            Encuentro MAI
            <br />
            <em>Octubre 2026</em>
          </h2>
          <p>18 — 20 de octubre · Lugar por confirmar</p>
          <div>
            <button>
              Ver dashboard del encuentro <AIcon name="arrow" />
            </button>
            <button>Inscribir persona</button>
          </div>
        </div>
        <div className="encounter-capacity">
          <div className="capacity-ring">
            <div>
              <strong>42</strong>
              <span>de 50 cupos</span>
            </div>
          </div>
          <ul>
            <li>
              <span>Confirmados</span>
              <b>32</b>
            </li>
            <li>
              <span>Pago parcial</span>
              <b>10</b>
            </li>
            <li>
              <span>Pendientes</span>
              <b>8</b>
            </li>
          </ul>
        </div>
      </section>
      <section className="encounter-link">
        <div>
          <span>Enlace público de inscripción</span>
          <strong>mai.org/encuentro/t8k4p2x9</strong>
          <small>Activo · 42 / 50 registros · Expira 17 oct 2026</small>
        </div>
        <button>Copiar enlace</button>
        <button>
          <b>WA</b> WhatsApp
        </button>
        <button>
          <b>QR</b> Código QR
        </button>
      </section>
      <nav className="encounter-tabs">
        {encounterSections.map((item) => (
          <button
            className={section === item ? "active" : ""}
            onClick={() => setSection(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </nav>
      <div className="module-stats">
        <div>
          <span>Total inscritos</span>
          <strong>42</strong>
          <small>84% del cupo</small>
        </div>
        <div>
          <span>Valor recaudado</span>
          <strong>$6.8M</strong>
          <small>Meta: $10M</small>
        </div>
        <div>
          <span>Saldo pendiente</span>
          <strong>$1.6M</strong>
          <small>12 personas</small>
        </div>
        <div>
          <span>Líderes responsables</span>
          <strong>8</strong>
          <small>2 coordinadores</small>
        </div>
      </div>
      {section === "Finanzas" && (
        <section className="encounter-finance">
          <article className="panel">
            <PanelTitle kicker="Recaudo" title="Ingresos del encuentro" />
            <div className="finance-big">
              <span>Ingresos esperados</span>
              <strong>$15.000.000</strong>
            </div>
            <dl>
              <div>
                <dt>Ingresos recibidos</dt>
                <dd>$11.500.000</dd>
              </div>
              <div>
                <dt>Saldo pendiente</dt>
                <dd>$3.500.000</dd>
              </div>
              <div>
                <dt>Personas pendientes</dt>
                <dd>12</dd>
              </div>
            </dl>
          </article>
          <article className="panel">
            <PanelTitle
              kicker="Operación"
              title="Gastos del encuentro"
              action="Registrar gasto"
            />
            <dl className="expense-breakdown">
              <div>
                <dt>Alimentación</dt>
                <dd>$2.500.000</dd>
              </div>
              <div>
                <dt>Transporte</dt>
                <dd>$800.000</dd>
              </div>
              <div>
                <dt>Materiales</dt>
                <dd>$400.000</dd>
              </div>
              <div>
                <dt>Lugar</dt>
                <dd>$1.000.000</dd>
              </div>
              <div>
                <dt>Total gastos</dt>
                <dd>$4.700.000</dd>
              </div>
            </dl>
          </article>
          <article className="balance-card">
            <span>Balance actual</span>
            <strong>$6.800.000</strong>
            <p>Ingresos recibidos menos gastos registrados</p>
            <AIcon name="chart" />
          </article>
        </section>
      )}
      {section === "Gastos" && (
        <section className="panel encounter-expenses">
          <PanelTitle
            kicker="Gastos asociados"
            title="Control operativo"
            action="Registrar gasto"
          />
          <div className="expense-mobile-action">
            <AIcon name="plus" />
            <p>
              <strong>Registrar un gasto</strong>
              <span>Toma una foto del recibo desde tu celular.</span>
            </p>
            <AIcon name="arrow" />
          </div>
          <p className="finance-note">
            <AIcon name="shield" /> Cada gasto crea un registro financiero,
            guarda su soporte y actualiza automáticamente el balance.
          </p>
        </section>
      )}
      <section className="panel table-panel">
        <PanelTitle
          kicker="Participantes"
          title="Inscripciones recientes"
          action="Ver todos"
        />
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Líder</th>
                <th>Inscripción</th>
                <th>Pago</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {people.slice(0, 4).map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <div className="person-cell">
                      <img src={p.img} alt="" />
                      <p>
                        <strong>{p.name}</strong>
                        <span>CC 1.02{i}...</span>
                      </p>
                    </div>
                  </td>
                  <td>{p.leader}</td>
                  <td>0{4 + i} jul 2026</td>
                  <td>
                    <div className="progress-cell">
                      <span>
                        <i style={{ width: `${[100, 70, 40, 100][i]}%` }} />
                      </span>
                      <b>{[100, 70, 40, 100][i]}%</b>
                    </div>
                  </td>
                  <td>
                    <StatusPill tone={i === 2 ? "pill-warn" : "pill-ok"}>
                      {i === 2 ? "Preinscrito" : "Confirmado"}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function UniversityPage() {
  const classes = [
    "Clase 1",
    "Clase 2",
    "Clase 3",
    "Clase 4",
    "Encuentro",
    "Clase 5",
    "Clase 6",
    "Clase 7",
    "Clase 8",
    "Graduación",
  ]
  return (
    <>
      <PageHeader
        eyebrow="Formación"
        title="Universidad de la Vida"
        copy="Acompañamiento antes y después del encuentro para cada generación."
        primary="Nueva generación"
      />
      <section className="generation-hero">
        <div>
          <span>Generación activa</span>
          <h2>Generación #12</h2>
          <p>15 mayo — 30 agosto 2026 · 3 profesores</p>
        </div>
        <div className="generation-meta">
          <p>
            <strong>124</strong>
            <span>Estudiantes</span>
          </p>
          <p>
            <strong>89%</strong>
            <span>Asistencia</span>
          </p>
          <p>
            <strong>76%</strong>
            <span>Progreso</span>
          </p>
        </div>
      </section>
      <section className="panel learning-path">
        <PanelTitle
          kicker="Ruta académica"
          title="Progreso de la generación"
          action="Tomar asistencia"
        />
        <div className="class-track">
          {classes.map((c, i) => (
            <div
              className={
                i < 7 ? "class-complete" : i === 7 ? "class-current" : ""
              }
              key={c}
            >
              <span>{i < 7 ? <AIcon name="check" /> : i + 1}</span>
              <p>{c}</p>
              {i < classes.length - 1 && <i />}
            </div>
          ))}
        </div>
      </section>
      <div className="university-grid">
        <section className="panel">
          <PanelTitle kicker="Próxima clase" title="Clase 7 · Identidad" />
          <div className="next-class">
            <div>
              <AIcon name="calendar" />
              <p>
                <strong>Sábado, 11 de julio</strong>
                <span>8:00 AM · Sede principal</span>
              </p>
            </div>
            <div>
              <AIcon name="people" />
              <p>
                <strong>Laura V. Martínez</strong>
                <span>Profesora asignada</span>
              </p>
            </div>
            <button>Tomar asistencia</button>
          </div>
        </section>
        <section className="panel">
          <PanelTitle kicker="Atención" title="Estudiantes por acompañar" />
          <div className="attention-list">
            {people.slice(0, 3).map((p, i) => (
              <div key={p.id}>
                <img src={p.img} alt="" />
                <p>
                  <strong>{p.name}</strong>
                  <span>
                    {
                      [
                        "2 ausencias consecutivas",
                        "Material pendiente",
                        "Pago de grado pendiente",
                      ][i]
                    }
                  </span>
                </p>
                <button>
                  <AIcon name="arrow" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

function PaymentsPage({ expenses = false }: { expenses?: boolean }) {
  const rows = expenses
    ? [
        [
          "Alimentos Encuentro",
          "Mercados La 14",
          "Encuentro",
          "$450.000",
          "Aprobado",
        ],
        [
          "Material pedagógico",
          "Papelería Central",
          "Universidad",
          "$286.500",
          "Pendiente",
        ],
        [
          "Transporte equipo",
          "Transportes Bogotá",
          "Operación",
          "$320.000",
          "Aprobado",
        ],
        [
          "Producción audiovisual",
          "Visual MAI",
          "Comunicaciones",
          "$850.000",
          "Aprobado",
        ],
      ]
    : [
        [
          "Juan David Pérez",
          "Encuentro MAI",
          "Transferencia",
          "$100.000",
          "Aplicado",
        ],
        [
          "Samuel Esteban Torres",
          "Universidad",
          "Nequi",
          "$80.000",
          "Aplicado",
        ],
        [
          "Camila Alejandra Ruiz",
          "Encuentro MAI",
          "Efectivo",
          "$200.000",
          "Por verificar",
        ],
        [
          "Mateo Santiago León",
          "Destino",
          "Bancolombia",
          "$150.000",
          "Aplicado",
        ],
      ]
  return (
    <>
      <PageHeader
        eyebrow="Control financiero"
        title={expenses ? "Gastos" : "Pagos"}
        copy={
          expenses
            ? "Registra, soporta y aprueba cada egreso con trazabilidad completa."
            : "Controla recaudos, saldos, comprobantes y cuentas por cobrar."
        }
        primary={expenses ? "Registrar gasto" : "Registrar pago"}
      />
      <div className="module-stats">
        <div>
          <span>{expenses ? "Gastos del mes" : "Recaudado este mes"}</span>
          <strong>{expenses ? "$5.1M" : "$7.8M"}</strong>
          <small>Julio 2026</small>
        </div>
        <div>
          <span>{expenses ? "Pendiente aprobación" : "Saldo pendiente"}</span>
          <strong>{expenses ? "$386K" : "$3.4M"}</strong>
          <small>{expenses ? "4 solicitudes" : "23 personas"}</small>
        </div>
        <div>
          <span>
            {expenses ? "Centro con mayor gasto" : "Pagos verificados"}
          </span>
          <strong>{expenses ? "Encuentros" : "96%"}</strong>
          <small>{expenses ? "$2.3M" : "184 transacciones"}</small>
        </div>
        <div>
          <span>
            {expenses ? "Documentos soporte" : "Comprobantes pendientes"}
          </span>
          <strong>{expenses ? "32" : "7"}</strong>
          <small>Requieren revisión</small>
        </div>
      </div>
      <section className="panel table-panel">
        <div className="table-tools">
          <div className="admin-search">
            <AIcon name="search" />
            <input
              placeholder={`Buscar ${
                expenses ? "gasto o proveedor" : "pago o persona"
              }...`}
            />
          </div>
          <button>
            <AIcon name="filter" /> Filtros
          </button>
          <button>
            <AIcon name="download" /> Exportar
          </button>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{expenses ? "Concepto" : "Persona"}</th>
                <th>{expenses ? "Proveedor" : "Concepto"}</th>
                <th>{expenses ? "Categoría" : "Método"}</th>
                <th>Valor</th>
                <th>Estado</th>
                <th>Soporte</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r[0]}>
                  <td>
                    <strong>{r[0]}</strong>
                    <small>
                      0{8 - i} jul 2026 · #MAI-00{184 + i}
                    </small>
                  </td>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                  <td>
                    <strong>{r[3]}</strong>
                  </td>
                  <td>
                    <StatusPill
                      tone={
                        r[4].includes("Pendiente") || r[4].includes("verificar")
                          ? "pill-warn"
                          : "pill-ok"
                      }
                    >
                      {r[4]}
                    </StatusPill>
                  </td>
                  <td>
                    <button className="file-button">
                      <AIcon name="file" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="finance-note">
          <AIcon name="shield" />
          <p>
            Los registros financieros no se eliminan definitivamente. Reversos y
            anulaciones conservan su historial en auditoría. Esta herramienta es
            de control interno y no reemplaza la contabilidad legal o
            tributaria.
          </p>
        </div>
      </section>
    </>
  )
}

function DocumentsPage({ certificates = false }: { certificates?: boolean }) {
  const docs = certificates
    ? [
        [
          "Certificado Universidad · Juan Pérez",
          "Universidad de la Vida",
          "MAI-UV-2026-0184",
          "Generado",
        ],
        [
          "Certificado Destino · Laura Martínez",
          "Liderazgo Cristiano",
          "MAI-DE-2026-0098",
          "Generado",
        ],
        [
          "Certificado Universidad · Samuel Torres",
          "Universidad de la Vida",
          "MAI-UV-2026-0185",
          "Pendiente",
        ],
      ]
    : [
        ["Comprobante de pago #0184", "Finanzas", "María Gómez", "Activo"],
        ["Soporte de gasto #0082", "Encuentros", "Tesorería MAI", "Pendiente"],
        [
          "Plan de estudio · Liderazgo",
          "Destino",
          "Laura Martínez",
          "Aprobado",
        ],
        [
          "Listado de asistencia · Clase 6",
          "Universidad",
          "Carlos Rodríguez",
          "Activo",
        ],
      ]
  return (
    <>
      <PageHeader
        eyebrow={certificates ? "Logros" : "Biblioteca interna"}
        title={certificates ? "Certificados" : "Documentos"}
        copy={
          certificates
            ? "Genera, descarga y verifica certificados con código único."
            : "Toda la documentación de MAI, organizada y disponible según permisos."
        }
        primary={certificates ? "Generar certificado" : "Subir documento"}
      />
      {certificates && (
        <section className="certificate-preview">
          <div className="certificate-sheet">
            <img className="cert-logo" src="/logo-mai.png" alt="Iglesia MAI" />
            <span>IGLESIA MAI</span>
            <p>Se certifica que</p>
            <h2>JUAN DAVID PÉREZ</h2>
            <p>ha completado satisfactoriamente el programa</p>
            <h3>Universidad de la Vida</h3>
            <div>
              <span>MAI-UV-2026-0184</span>
              <i>QR</i>
            </div>
          </div>
          <div className="certificate-copy">
            <span>Vista previa</span>
            <h2>Certificación conectada al proceso.</h2>
            <p>
              Los estudiantes elegibles pueden recibir automáticamente un PDF
              premium con código único y QR verificable.
            </p>
            <button>
              Descargar ejemplo <AIcon name="download" />
            </button>
          </div>
        </section>
      )}
      <section className="panel table-panel">
        <div className="table-tools">
          <div className="admin-search">
            <AIcon name="search" />
            <input
              placeholder={`Buscar ${
                certificates ? "certificado" : "documento"
              }...`}
            />
          </div>
          <button>
            <AIcon name="filter" /> Categorías
          </button>
          <button>
            <AIcon name="upload" /> {certificates ? "Plantillas" : "Subir"}
          </button>
        </div>
        <div className="doc-grid">
          {docs.map((d, i) => (
            <article key={d[0]}>
              <div className="doc-icon">
                <AIcon name={certificates ? "certificate" : "file"} />
                <small>{i % 2 ? "DOC" : "PDF"}</small>
              </div>
              <div>
                <StatusPill
                  tone={d[3] === "Pendiente" ? "pill-warn" : "pill-ok"}
                >
                  {d[3]}
                </StatusPill>
                <h3>{d[0]}</h3>
                <p>
                  {d[1]} · {d[2]}
                </p>
                <span>
                  Actualizado hace {i + 1} día{i ? "s" : ""}
                </span>
              </div>
              <button>
                <AIcon name="more" />
              </button>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

function InviteModal({ close }: { close: () => void }) {
  const [generated, setGenerated] = useState(false)
  const [copied, setCopied] = useState(false)
  const link = "https://mai.org/registro/8f72k2x9"
  function copy() {
    navigator.clipboard?.writeText(link)
    setCopied(true)
  }
  return (
    <div className="modal-layer">
      <button className="modal-scrim" onClick={close} aria-label="Cerrar" />
      <section className="invite-modal">
        <header>
          <div>
            <span>Mi equipo · Invitaciones</span>
            <h2>Invitar a MAI</h2>
          </div>
          <button onClick={close}>
            <AIcon name="close" />
          </button>
        </header>
        {!generated ? (
          <>
            <p className="modal-intro">
              Prellena la información que conozcas. La persona podrá completar
              sus datos y crear su propia contraseña de forma privada.
            </p>
            <div className="invite-fields">
              <label>
                Nombre <input placeholder="Nombre" />
              </label>
              <label>
                Apellido <input placeholder="Apellido" />
              </label>
              <label className="field-full">
                Correo <input type="email" placeholder="correo@ejemplo.com" />
              </label>
              <label>
                Teléfono <input placeholder="+57" />
              </label>
              <label>
                Rol inicial
                <select defaultValue="Líder">
                  <option>Líder</option>
                  <option>Profesor</option>
                  <option>Pastor</option>
                  <option>Tesorería</option>
                  <option>Consulta</option>
                </select>
              </label>
              <label>
                Expira
                <select defaultValue="7 días">
                  <option>24 horas</option>
                  <option>7 días</option>
                  <option>15 días</option>
                  <option>30 días</option>
                </select>
              </label>
              <label>
                Máximo de registros
                <input type="number" defaultValue="1" />
              </label>
            </div>
            <div className="modal-security">
              <AIcon name="shield" />
              <p>
                El enlace utilizará un token único no predecible. Crear la
                cuenta no otorgará permisos hasta que sea aprobada.
              </p>
            </div>
            <button
              className="modal-primary"
              onClick={() => setGenerated(true)}
            >
              Generar enlace de registro <AIcon name="arrow" />
            </button>
          </>
        ) : (
          <div className="generated-link">
            <span className="generated-check">
              <AIcon name="check" />
            </span>
            <h3>Enlace listo para compartir</h3>
            <p>
              Este enlace permitirá que la persona complete sus datos y cree su
              contraseña.
            </p>
            <div className="link-box">
              <span>{link}</span>
              <button onClick={copy}>{copied ? "Copiado" : "Copiar"}</button>
            </div>
            <div className="share-actions">
              <button>
                <b>WA</b> WhatsApp
              </button>
              <button>
                <b>@</b> Correo
              </button>
              <button>
                <b>QR</b> Mostrar QR
              </button>
            </div>
            <dl>
              <div>
                <dt>Estado</dt>
                <dd>
                  <StatusPill tone="pill-ok">Activo</StatusPill>
                </dd>
              </div>
              <div>
                <dt>Expira</dt>
                <dd>16 julio 2026</dd>
              </div>
              <div>
                <dt>Registros</dt>
                <dd>0 / 1</dd>
              </div>
            </dl>
            <button
              className="preview-registration"
              onClick={() => {
                window.location.hash = "#/registro/8f72k2x9"
              }}
            >
              Ver experiencia de registro <AIcon name="eye" />
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function PersonalLinkCard() {
  const [copied, setCopied] = useState(false)
  const link = "https://mai.org/inscripcion/k9x7m2c4"
  return (
    <section className="personal-link-card">
      <div className="personal-link-copy">
        <span>Mi enlace de registro</span>
        <h2>
          Haz crecer tu equipo,
          <br />
          <em>un corazón a la vez.</em>
        </h2>
        <p>
          Comparte este enlace con las personas que quieres acompañar en su
          proceso en MAI.
        </p>
        <div className="personal-url">
          <span>mai.org/inscripcion/k9x7m2c4</span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(link)
              setCopied(true)
            }}
          >
            {copied ? "Copiado" : "Copiar enlace"}
          </button>
        </div>
        <div className="personal-actions">
          <button>
            <b>WA</b> Compartir por WhatsApp
          </button>
          <button>
            <b>QR</b> Mostrar QR
          </button>
          <button
            onClick={() => {
              window.location.hash = "#/inscripcion/k9x7m2c4"
            }}
          >
            <AIcon name="eye" /> Vista previa
          </button>
        </div>
      </div>
      <div className="qr-preview">
        <div className="fake-qr">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <p>Enlace activo</p>
        <span>17 registros · Sin expiración</span>
      </div>
    </section>
  )
}

function UsersPage({ invitations = false }: { invitations?: boolean }) {
  const [invite, setInvite] = useState(false)
  const [tab, setTab] = useState(invitations ? "Invitaciones" : "Todos")
  const [approved, setApproved] = useState<number[]>([])
  const tabs = [
    "Todos",
    "Administradores",
    "Pastores",
    "Líderes",
    "Profesores",
    "Discípulos",
    "Invitaciones",
  ]
  const accounts = [
    ["Daniela Rojas", "Super administrador", "Activo", 44, "Hoy, 8:42 AM"],
    ["Carlos Andrés Rodríguez", "Líder", "Activo", 11, "Ayer, 6:15 PM"],
    ["Laura Valentina Martínez", "Profesor", "Activo", 45, "08 jul, 9:20 AM"],
    ["María Fernanda Gómez", "Líder", "Activo", 47, "08 jul, 7:05 AM"],
    ["Andrés Moreno", "Pastor", "Activo", 14, "07 jul, 5:32 PM"],
  ]
  const inviteRows = [
    ["Sofía Ramírez", "Profesor", "Pendiente", "09 jul 2026", "16 jul 2026"],
    ["Miguel Ángel López", "Líder", "Aceptada", "07 jul 2026", "14 jul 2026"],
    [
      "Correo sin asignar",
      "Consulta",
      "Expirada",
      "28 jun 2026",
      "05 jul 2026",
    ],
  ]
  return (
    <>
      <PageHeader
        eyebrow="Identidad y acceso"
        title={invitations ? "Invitaciones" : "Usuarios"}
        copy="Cuentas, roles, relaciones y permisos de cada integrante de MAI."
        primary="Invitar integrante"
        onPrimary={() => setInvite(true)}
      />
      <section className="account-overview">
        <div>
          <span>Usuarios activos</span>
          <strong>138</strong>
          <small>7 roles configurados</small>
        </div>
        <div>
          <span>Pendientes de aprobación</span>
          <strong>12</strong>
          <small>Requieren atención</small>
        </div>
        <div>
          <span>Invitaciones vigentes</span>
          <strong>8</strong>
          <small>3 expiran esta semana</small>
        </div>
        <div>
          <span>Enlaces personales</span>
          <strong>46</strong>
          <small>Líderes activos</small>
        </div>
      </section>
      <section className="pending-approvals panel">
        <PanelTitle
          kicker="Acceso"
          title="Solicitudes pendientes"
          action="Ver las 12"
        />
        <div className="approval-cards">
          {[
            ["Carlos Rodríguez", "Líder", 11, "07 oct 2026"],
            ["Natalia Herrera", "Profesor", 32, "08 oct 2026"],
            ["Felipe Castro", "Consulta", 13, "09 oct 2026"],
          ].map(([name, role, img, date], i) => (
            <article
              className={approved.includes(i) ? "approval-approved" : ""}
              key={name as string}
            >
              <img src={avatar(img as number)} alt="" />
              <div>
                <StatusPill
                  tone={approved.includes(i) ? "pill-ok" : "pill-warn"}
                >
                  {approved.includes(i)
                    ? "Aprobada"
                    : "Pendiente de aprobación"}
                </StatusPill>
                <h3>{name}</h3>
                <p>
                  Rol solicitado: {role} · {date}
                </p>
              </div>
              {!approved.includes(i) && (
                <div className="approval-actions">
                  <button
                    onClick={() => setApproved((current) => [...current, i])}
                  >
                    Aprobar
                  </button>
                  <button>Configurar permisos</button>
                  <button>Rechazar</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <div className="account-tabs">
        {tabs.map((item) => (
          <button
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
            key={item}
          >
            {item}
            {item === "Invitaciones" && <span>8</span>}
          </button>
        ))}
      </div>
      {tab === "Invitaciones" ? (
        <section className="panel table-panel">
          <div className="table-tools">
            <div className="admin-search">
              <AIcon name="search" />
              <input placeholder="Buscar invitación..." />
            </div>
            <button>
              <AIcon name="filter" /> Estado
            </button>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Persona invitada</th>
                  <th>Rol propuesto</th>
                  <th>Estado</th>
                  <th>Creada</th>
                  <th>Expira</th>
                  <th>Generada por</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inviteRows.map((row) => (
                  <tr key={row[0]}>
                    <td>
                      <strong>{row[0]}</strong>
                      <small>
                        Token ·•••{Math.floor(Math.random() * 9000 + 1000)}
                      </small>
                    </td>
                    <td>{row[1]}</td>
                    <td>
                      <StatusPill
                        tone={
                          row[2] === "Aceptada"
                            ? "pill-ok"
                            : row[2] === "Pendiente"
                              ? "pill-blue"
                              : "pill-warn"
                        }
                      >
                        {row[2]}
                      </StatusPill>
                    </td>
                    <td>{row[3]}</td>
                    <td>{row[4]}</td>
                    <td>Daniela Rojas</td>
                    <td>
                      <div className="inline-actions">
                        <button>Copiar</button>
                        <button>Reenviar</button>
                        <button>
                          <AIcon name="more" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="panel table-panel">
          <div className="table-tools">
            <div className="admin-search">
              <AIcon name="search" />
              <input placeholder="Buscar usuario, correo o rol..." />
            </div>
            <button>
              <AIcon name="filter" /> Filtros
            </button>
            <button>
              <AIcon name="download" /> Exportar
            </button>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Relación</th>
                  <th>Permisos</th>
                  <th>Último acceso</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {accounts
                  .filter(
                    (row) =>
                      tab === "Todos" ||
                      row[1]
                        .toLowerCase()
                        .includes(tab.slice(0, -1).toLowerCase()),
                  )
                  .map((row, i) => (
                    <tr key={row[0]}>
                      <td>
                        <div className="person-cell">
                          <img src={avatar(row[3] as number)} alt="" />
                          <p>
                            <strong>{row[0]}</strong>
                            <span>
                              {String(row[0])
                                .toLowerCase()
                                .replaceAll(" ", ".")}
                              @iglesiamai.co
                            </span>
                          </p>
                        </div>
                      </td>
                      <td>
                        <StatusPill tone="pill-blue">{row[1]}</StatusPill>
                      </td>
                      <td>
                        {i === 1 || i === 3
                          ? `${18 - i} discípulos`
                          : i === 2
                            ? "3 cursos"
                            : "Equipo MAI"}
                      </td>
                      <td>
                        {i === 0 ? "Acceso total" : `${14 + i * 3} permisos`}
                      </td>
                      <td>{row[4]}</td>
                      <td>
                        <StatusPill tone="pill-ok">{row[2]}</StatusPill>
                      </td>
                      <td>
                        <button className="icon-more">
                          <AIcon name="more" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {invite && <InviteModal close={() => setInvite(false)} />}
    </>
  )
}

function TeamPage({ leaders = false }: { leaders?: boolean }) {
  return (
    <>
      <PageHeader
        eyebrow={leaders ? "Estructura pastoral" : "Mi equipo"}
        title={leaders ? "Líderes" : "Mis discípulos"}
        copy={
          leaders
            ? "Acompaña equipos y visualiza la red de discipulado de MAI."
            : "Personas que caminan contigo y sus próximos pasos."
        }
        primary={leaders ? "Invitar líder" : "Agregar discípulo"}
      />
      {!leaders && <PersonalLinkCard />}
      <div className="module-stats">
        <div>
          <span>Total en mi equipo</span>
          <strong>18</strong>
          <small>16 activos</small>
        </div>
        <div>
          <span>Solicitudes nuevas</span>
          <strong>3</strong>
          <small>Esperando aprobación</small>
        </div>
        <div>
          <span>Pagos pendientes</span>
          <strong>4</strong>
          <small>$320.000 total</small>
        </div>
        <div>
          <span>En formación</span>
          <strong>12</strong>
          <small>Universidad + Destino</small>
        </div>
      </div>
      {!leaders && (
        <section className="panel new-requests">
          <PanelTitle
            kicker="Nuevos registros"
            title="Solicitudes de discípulos"
            action="Ver todas"
          />
          <div>
            {people.slice(1, 4).map((person, i) => (
              <article key={person.id}>
                <img src={person.img} alt="" />
                <p>
                  <strong>{person.name}</strong>
                  <span>Hace {[12, 38, 54][i]} minutos · Enlace personal</span>
                </p>
                <button>Ver</button>
                <button className="accept">Aceptar</button>
                <button>Rechazar</button>
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="disciples-grid">
        {people.slice(0, 4).map((p) => (
          <article className="panel disciple-card" key={p.id}>
            <img src={p.img} alt="" />
            <div>
              <StatusPill tone="pill-ok">{p.status}</StatusPill>
              <h3>{p.name}</h3>
              <p>{p.phone}</p>
            </div>
            <dl>
              <div>
                <dt>Encuentro</dt>
                <dd>{p.progress > 50 ? "Completado" : "Pendiente"}</dd>
              </div>
              <div>
                <dt>Pago</dt>
                <dd>{p.payment}</dd>
              </div>
              <div>
                <dt>Progreso</dt>
                <dd>{p.progress}%</dd>
              </div>
            </dl>
            <button>
              Ver proceso <AIcon name="arrow" />
            </button>
          </article>
        ))}
      </div>
    </>
  )
}

function GenericPage({ page }: { page: string }) {
  const configs: Record<string, [string, string, string, AdminIcon]> = {
    Líderes: [
      "Estructura pastoral",
      "Líderes",
      "Acompaña equipos y visualiza la red de discipulado de MAI.",
      "team",
    ],
    "Mis discípulos": [
      "Mi equipo",
      "Mis discípulos",
      "Personas que caminan contigo y sus próximos pasos.",
      "people",
    ],
    "Capacitación Destino": [
      "Formación",
      "Capacitación Destino",
      "Cursos, profesores, estudiantes y progreso académico.",
      "target",
    ],
    Reportes: [
      "Inteligencia MAI",
      "Reportes",
      "Indicadores conectados para tomar mejores decisiones.",
      "chart",
    ],
    Notificaciones: [
      "Centro de actividad",
      "Notificaciones",
      "Lo importante, en el momento correcto.",
      "bell",
    ],
    Auditoría: [
      "Seguridad",
      "Auditoría",
      "Trazabilidad de usuarios, acciones y registros afectados.",
      "shield",
    ],
    Configuración: [
      "Administración",
      "Configuración",
      "Usuarios, roles, permisos, plantillas y parámetros generales.",
      "settings",
    ],
  }
  const c = configs[page] || [
    "Módulo",
    page,
    "Gestión interna conectada con todo el proceso MAI.",
    "settings",
  ]
  const isTeam = page === "Mis discípulos" || page === "Líderes"
  const isNotification = page === "Notificaciones"
  const isAudit = page === "Auditoría"
  const isSettings = page === "Configuración"
  if (isTeam) return <TeamPage leaders={page === "Líderes"} />
  return (
    <>
      <PageHeader
        eyebrow={c[0]}
        title={c[1]}
        copy={c[2]}
        primary={
          isSettings
            ? "Guardar cambios"
            : isAudit
              ? "Exportar registro"
              : isNotification
                ? "Marcar todo como leído"
                : "Crear nuevo"
        }
      />
      {isTeam ? (
        <>
          <div className="module-stats">
            <div>
              <span>Total en mi equipo</span>
              <strong>18</strong>
              <small>16 activos</small>
            </div>
            <div>
              <span>Próximo encuentro</span>
              <strong>5</strong>
              <small>3 confirmados</small>
            </div>
            <div>
              <span>Pagos pendientes</span>
              <strong>4</strong>
              <small>$320.000 total</small>
            </div>
            <div>
              <span>En formación</span>
              <strong>12</strong>
              <small>Universidad + Destino</small>
            </div>
          </div>
          <div className="disciples-grid">
            {people.slice(0, 4).map((p) => (
              <article className="panel disciple-card" key={p.id}>
                <img src={p.img} alt="" />
                <div>
                  <StatusPill tone="pill-ok">{p.status}</StatusPill>
                  <h3>{p.name}</h3>
                  <p>{p.phone}</p>
                </div>
                <dl>
                  <div>
                    <dt>Encuentro</dt>
                    <dd>{p.progress > 50 ? "Completado" : "Pendiente"}</dd>
                  </div>
                  <div>
                    <dt>Pago</dt>
                    <dd>{p.payment}</dd>
                  </div>
                  <div>
                    <dt>Progreso</dt>
                    <dd>{p.progress}%</dd>
                  </div>
                </dl>
                <button>
                  Ver proceso <AIcon name="arrow" />
                </button>
              </article>
            ))}
          </div>
        </>
      ) : isNotification ? (
        <NotificationList />
      ) : isAudit ? (
        <AuditList />
      ) : isSettings ? (
        <SettingsPanel />
      ) : (
        <DestinationPage />
      )}
    </>
  )
}

function DestinationPage() {
  return (
    <>
      <div className="module-stats">
        <div>
          <span>Cursos activos</span>
          <strong>6</strong>
          <small>3 programas</small>
        </div>
        <div>
          <span>Estudiantes</span>
          <strong>86</strong>
          <small>78 activos</small>
        </div>
        <div>
          <span>Profesores</span>
          <strong>12</strong>
          <small>2 por asignar</small>
        </div>
        <div>
          <span>Promedio general</span>
          <strong>4.4</strong>
          <small>Sobre 5.0</small>
        </div>
      </div>
      <div className="course-grid">
        {[
          "Liderazgo Cristiano",
          "Fundamentos de servicio",
          "Comunicación con propósito",
        ].map((title, i) => (
          <article className="panel course-card" key={title}>
            <div className={`course-cover course-${i + 1}`}>
              <span>DESTINO · 2026</span>
              <AIcon name="target" />
            </div>
            <div>
              <StatusPill tone="pill-blue">En curso</StatusPill>
              <h3>{title}</h3>
              <p>
                {["Laura Martínez", "Carlos Rodríguez", "Andrés Moreno"][i]} ·{" "}
                {20 + i * 3} estudiantes
              </p>
              <div className="wide-progress">
                <i style={{ width: `${[72, 45, 88][i]}%` }} />
              </div>
              <span>{[72, 45, 88][i]}% completado</span>
              <button>
                Ver curso <AIcon name="arrow" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function NotificationList() {
  const list = [
    ["Tienes 3 discípulos con pagos pendientes.", "wallet"],
    ["Juan Pérez completó la clase 4.", "school"],
    ["Hay 5 estudiantes pendientes de asistencia.", "people"],
    ["Carlos Rodríguez está listo para graduarse.", "certificate"],
    ["Nuevo documento pendiente de aprobación.", "file"],
  ]
  return (
    <section className="panel notification-list">
      {list.map(([text, icon], i) => (
        <article className={i < 2 ? "unread" : ""} key={text}>
          <span>
            <AIcon name={icon as AdminIcon} />
          </span>
          <div>
            <h3>{text}</h3>
            <p>
              {
                [
                  "Hace 8 minutos",
                  "Hace 1 hora",
                  "Hace 3 horas",
                  "Ayer, 4:30 PM",
                  "Ayer, 11:20 AM",
                ][i]
              }
            </p>
          </div>
          <button>
            <AIcon name="more" />
          </button>
        </article>
      ))}
    </section>
  )
}

function AuditList() {
  return (
    <section className="panel table-panel">
      <div className="table-tools">
        <div className="admin-search">
          <AIcon name="search" />
          <input placeholder="Buscar usuario, acción o registro..." />
        </div>
        <button>
          <AIcon name="filter" /> Filtros
        </button>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Módulo</th>
              <th>Registro afectado</th>
              <th>Fecha y hora</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "Daniela Rojas",
                "Modificó información",
                "Personas",
                "Juan David Pérez",
              ],
              ["María Gómez", "Registró pago $100.000", "Pagos", "#MAI-00184"],
              [
                "Carlos Rodríguez",
                "Marcó asistencia",
                "Universidad",
                "Generación #12",
              ],
              [
                "Sistema MAI",
                "Generó certificado",
                "Certificados",
                "MAI-UV-2026-0184",
              ],
            ].map((r, i) => (
              <tr key={r[1]}>
                <td>
                  <strong>{r[0]}</strong>
                </td>
                <td>{r[1]}</td>
                <td>
                  <StatusPill tone="pill-blue">{r[2]}</StatusPill>
                </td>
                <td>{r[3]}</td>
                <td>
                  0{8 - i} jul · {9 + i}:24
                </td>
                <td>190.84.***.**</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SettingsPanel() {
  return (
    <div className="settings-grid">
      <aside className="panel settings-nav">
        {[
          "Información de Iglesia",
          "Usuarios",
          "Roles y permisos",
          "Programas",
          "Métodos de pago",
          "Plantillas de documentos",
          "Plantillas de certificados",
          "Notificaciones",
          "Almacenamiento",
          "Configuración general",
        ].map((x, i) => (
          <button className={i === 2 ? "active" : ""} key={x}>
            {x}
            <AIcon name="arrow" />
          </button>
        ))}
      </aside>
      <section className="panel permission-panel">
        <PanelTitle
          kicker="Acceso y seguridad"
          title="Roles y permisos"
          action="Nuevo rol"
        />
        <p>
          Define exactamente qué puede consultar, crear o modificar cada rol.
        </p>
        {[
          "Super administrador",
          "Administrador",
          "Pastor",
          "Líder",
          "Profesor",
          "Tesorería",
          "Consulta",
        ].map((role, i) => (
          <div className="permission-row" key={role}>
            <span className={`role-dot role-${i}`} />
            <div>
              <strong>{role}</strong>
              <p>
                {i === 0
                  ? "Acceso total al sistema"
                  : i === 3
                    ? "Personas asignadas, encuentros y pagos"
                    : i === 4
                      ? "Cursos, estudiantes y asistencia"
                      : "Permisos personalizados"}
              </p>
            </div>
            <StatusPill tone={i === 0 ? "pill-warn" : "pill-blue"}>
              {i === 0
                ? "Protegido"
                : `${[32, 28, 18, 14, 12, 8][i - 1] || 6} permisos`}
            </StatusPill>
            <button>
              <AIcon name="more" />
            </button>
          </div>
        ))}
        <div className="granular-permissions">
          <header>
            <div>
              <span>Personalización</span>
              <h3>Permisos del rol · Líder</h3>
            </div>
            <button>Guardar permisos</button>
          </header>
          <div className="permission-matrix">
            <div className="matrix-head">
              <span>Módulo</span>
              {[
                "Ver",
                "Crear",
                "Editar",
                "Eliminar",
                "Exportar",
                "Aprobar",
              ].map((x) => (
                <b key={x}>{x}</b>
              ))}
            </div>
            {[
              "Mis discípulos",
              "Encuentros",
              "Pagos",
              "Universidad",
              "Destino",
            ].map((module, i) => (
              <div className="matrix-row" key={module}>
                <span>{module}</span>
                {[0, 1, 2, 3, 4, 5].map((cell) => (
                  <label key={cell}>
                    <input
                      type="checkbox"
                      defaultChecked={cell < 3 || (cell === 4 && i < 3)}
                      disabled={cell === 3}
                    />
                    <i />
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function PageHeader({
  eyebrow,
  title,
  copy,
  primary,
  onPrimary,
}: {
  eyebrow: string
  title: string
  copy: string
  primary: string
  onPrimary?: () => void
}) {
  return (
    <header className="module-header">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      <div>
        <button className="secondary-action">
          <AIcon name="download" /> Exportar
        </button>
        <button className="admin-primary" onClick={onPrimary}>
          <AIcon name="plus" /> {primary}
        </button>
      </div>
    </header>
  )
}

function Sidebar({
  page,
  go,
  open,
  close,
  logout,
}: {
  page: string
  go: (x: string) => void
  open: boolean
  close: () => void
  logout: () => void
}) {
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
          {nav.map((item) => (
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
                {item.label === "Notificaciones" && <b>5</b>}
              </button>
              {item.children && (
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
          <img src={avatar(44)} alt="" />
          <div>
            <strong>Daniela Rojas</strong>
            <span>Super administradora</span>
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
}: {
  page: string
  menu: () => void
  go: (s: string) => void
}) {
  return (
    <header className="admin-topbar">
      <button className="mobile-menu-btn" onClick={menu}>
        <AIcon name="menu" />
      </button>
      <div className="global-search">
        <AIcon name="search" />
        <input placeholder="Buscar personas, pagos, cursos, documentos..." />
        <kbd>⌘ K</kbd>
      </div>
      <div className="top-actions">
        <button
          onClick={() => go("Notificaciones")}
          className="notification-button"
        >
          <AIcon name="bell" />
          <i />
        </button>
        <div className="top-user">
          <img src={avatar(44)} alt="" />
          <p>
            <strong>Daniela Rojas</strong>
            <span>Super administradora</span>
          </p>
          <AIcon name="more" />
        </div>
      </div>
      <span className="mobile-page-title">{page}</span>
    </header>
  )
}

function MobileNav({ page, go }: { page: string; go: (s: string) => void }) {
  const links: [string, AdminIcon][] = [
    ["Dashboard", "home"],
    ["Personas", "people"],
    ["Encuentros", "calendar"],
    ["Pagos", "wallet"],
    ["Más", "more"],
  ]
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
          onClick={() => go(label === "Más" ? "Configuración" : label)}
          key={label}
        >
          <AIcon name={icon} />
          <span>{label === "Dashboard" ? "Inicio" : label}</span>
        </button>
      ))}
    </nav>
  )
}

export default function AdminApp({ onExit }: { onExit: () => void }) {
  const [logged, setLogged] = useState(false)
  const [checking, setChecking] = useState(true)
  const [resetting] = useState(() => window.location.search.includes(RECOVERY_FLAG))
  useEffect(() => {
    // Reset links sign the person in first; they still have to choose a new password.
    if (resetting) return setChecking(false)
    currentStaff()
      .then((user) => setLogged(Boolean(user)))
      .finally(() => setChecking(false))
  }, [resetting])
  const [page, setPage] = useState("Dashboard")
  const [sidebar, setSidebar] = useState(false)
  const [personId, setPersonId] = useState<number | null>(null)
  const [route, setRoute] = useState(window.location.hash)
  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash)
    window.addEventListener("hashchange", updateRoute)
    return () => window.removeEventListener("hashchange", updateRoute)
  }, [])
  const content = useMemo(() => {
    if (personId)
      return <PersonProfile id={personId} back={() => setPersonId(null)} />
    if (page === "Dashboard") return <Dashboard go={setPage} />
    if (page === "Personas") return <PeoplePage openPerson={setPersonId} />
    if (page === "Sitio web") return <WebOverview go={setPage} />
    if (page === "Anuncios") return <AdminAnnouncements go={setPage} />
    if (webPages[page]) return <WebInbox kind={webPages[page]} />
    if (page === "Encuentros") return <EncountersPage />
    if (page === "Universidad de la Vida") return <UniversityPage />
    if (page === "Pagos") return <PaymentsPage />
    if (page === "Gastos") return <PaymentsPage expenses />
    if (page === "Documentos") return <DocumentsPage />
    if (page === "Certificados") return <DocumentsPage certificates />
    if (page === "Usuarios") return <UsersPage />
    if (page === "Invitaciones") return <UsersPage invitations />
    return <GenericPage page={page} />
  }, [page, personId])
  if (route.startsWith("#/registro/")) {
    return <RegistrationOnboarding onExit={onExit} />
  }
  if (route.startsWith("#/inscripcion/")) {
    return <RegistrationOnboarding disciple onExit={onExit} />
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
    <main className="admin-app">
      <Sidebar
        page={page}
        go={go}
        open={sidebar}
        close={() => setSidebar(false)}
        logout={() => signOut().finally(() => setLogged(false))}
      />
      <div className="admin-shell">
        <AdminTopbar page={page} menu={() => setSidebar(true)} go={go} />
        <div className="admin-content">{content}</div>
      </div>
      <MobileNav page={page} go={go} />
    </main>
  )
}
