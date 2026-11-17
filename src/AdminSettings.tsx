/**
 * Configuración (owner only): every section reads and saves public.settings
 * (src/lib/settings.ts). Plantillas are listed for the next phase.
 */
import { useContext, useEffect, useState } from "react"
import { AIcon, PageHeader, PanelTitle, StatusPill } from "./AdminApp"
import { MyAccess } from "./AdminUsers"
import { useLiveData } from "./AdminPeople"
import { CertificatePreview } from "./AdminRecords"
import { DOCUMENT_CATEGORIES, PLACEHOLDERS } from "./lib/records"
import {
  newId,
  saveSetting,
  SettingsContext,
  storageUsage,
  type CertTemplate,
  type ChurchInfo,
  type DocTemplate,
  type GeneralSettings,
  type NotificationPrefs,
  type PaymentMethod,
  type Program,
  type RolePreset,
  type Settings,
  type SettingsKey,
} from "./lib/settings"
import { invitationState, listInvitations, listStaff, onInvitationsChange, onStaffChange, PERMISSIONS, type Permission } from "./lib/staff"

const SECTIONS = [
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
] as const
type Section = (typeof SECTIONS)[number]

/** Local draft of one settings section + save button state. */
function useDraft<K extends SettingsKey>(key: K) {
  const settings = useContext(SettingsContext)
  const [draft, setDraft] = useState<Settings[K]>(() => structuredClone(settings[key]))
  const [state, setState] = useState<"" | "saving" | "saved">("")
  const [error, setError] = useState("")
  const saved = JSON.stringify(settings[key])
  useEffect(() => setDraft(structuredClone(JSON.parse(saved))), [saved])
  const dirty = JSON.stringify(draft) !== saved
  async function save(value = draft) {
    setState("saving")
    setError("")
    try {
      await saveSetting(key, value)
      setState("saved")
      window.setTimeout(() => setState(""), 2200)
    } catch (err) {
      setError((err as Error).message)
      setState("")
    }
  }
  return { draft, setDraft, save, dirty, state, error }
}

function SaveBar({ dirty, state, error, save, reset }: { dirty: boolean; state: string; error: string; save: () => void; reset?: () => void }) {
  return (
    <div className="settings-save">
      {error && <p className="users-error">{error}</p>}
      <div>
        {state === "saved" && !dirty && (
          <span className="saved-note">
            <AIcon name="check" /> Guardado
          </span>
        )}
        {dirty && reset && (
          <button className="secondary-action" onClick={reset}>
            Descartar
          </button>
        )}
        <button className="admin-primary" disabled={!dirty || state === "saving"} onClick={save}>
          {state === "saving" ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={full ? "field-full" : ""}>
      {label}
      {children}
    </label>
  )
}

/* ---------------------------------------------------------------- */

function ChurchSection() {
  const d = useDraft("iglesia")
  const set = (k: keyof ChurchInfo, v: string) => d.setDraft({ ...d.draft, [k]: v })
  const fields: [keyof ChurchInfo, string, string, boolean?][] = [
    ["name", "Nombre de la iglesia", "Iglesia Cristiana MAI", true],
    ["nit", "NIT", "900.000.000-0"],
    ["email", "Correo de contacto", "contacto@iglesiamai.com"],
    ["phone", "Teléfono", "601 000 0000"],
    ["whatsapp", "WhatsApp", "300 000 0000"],
    ["address", "Dirección", "Avenida Boyacá #8-13"],
    ["area", "Barrio y ciudad", "Castilla · Bogotá, Colombia"],
    ["schedule", "Horario de reuniones", "Domingos · 8:00 y 10:00 AM", true],
    ["website", "Sitio web", "https://www.iglesiamai.com", true],
    ["instagram", "Instagram", "https://instagram.com/..."],
    ["facebook", "Facebook", "https://facebook.com/..."],
    ["youtube", "YouTube", "https://youtube.com/..."],
    ["tiktok", "TikTok", "https://tiktok.com/..."],
  ]
  return (
    <section className="panel permission-panel">
      <PanelTitle kicker="Datos generales" title="Información de la iglesia" />
      <p>Datos oficiales de MAI para documentos, mensajes y contacto.</p>
      <div className="invite-fields settings-fields">
        {fields.map(([k, label, ph, full]) => (
          <Field key={k} label={label} full={full}>
            <input value={d.draft[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} />
          </Field>
        ))}
      </div>
      <SaveBar {...d} save={() => d.save()} />
    </section>
  )
}

function UsersSection({ go }: { go: (page: string) => void }) {
  const staff = useLiveData(listStaff, [onStaffChange])
  const invites = useLiveData(listInvitations, [onInvitationsChange])
  const list = staff.data ?? []
  return (
    <section className="panel permission-panel">
      <PanelTitle kicker="Acceso" title="Usuarios" action="Administrar usuarios" onAction={() => go("Usuarios")} />
      <p>Las cuentas del equipo y sus permisos se administran en Mi equipo → Usuarios.</p>
      <div className="module-stats settings-stats">
        <div>
          <span>Activos</span>
          <strong>{staff.data ? list.filter((s) => s.status === "activo").length : "—"}</strong>
        </div>
        <div>
          <span>Por aprobar</span>
          <strong>{staff.data ? list.filter((s) => s.status === "pendiente").length : "—"}</strong>
        </div>
        <div>
          <span>Suspendidos</span>
          <strong>{staff.data ? list.filter((s) => s.status === "suspendido").length : "—"}</strong>
        </div>
        <div>
          <span>Invitaciones vigentes</span>
          <strong>{invites.data ? invites.data.filter((i) => invitationState(i) === "vigente").length : "—"}</strong>
        </div>
      </div>
      <div className="settings-links">
        <button onClick={() => go("Usuarios")}>
          Ver usuarios y permisos <AIcon name="arrow" />
        </button>
        <button onClick={() => go("Invitaciones")}>
          Ver invitaciones <AIcon name="arrow" />
        </button>
        <button onClick={() => go("Líderes")}>
          Invitar un líder <AIcon name="arrow" />
        </button>
      </div>
    </section>
  )
}

function RolesSection() {
  const d = useDraft("roles")
  const [open, setOpen] = useState<string | null>(null)
  const roles = d.draft
  const update = (id: string, patch: Partial<RolePreset>) => d.setDraft(roles.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  function toggle(role: RolePreset, perm: Permission) {
    update(role.id, { permissions: role.permissions.includes(perm) ? role.permissions.filter((p) => p !== perm) : [...role.permissions, perm] })
  }
  function add() {
    const role: RolePreset = { id: newId(), name: "Nuevo rol", description: "", permissions: [] }
    d.setDraft([...roles, role])
    setOpen(role.id)
  }
  return (
    <section className="panel permission-panel">
      <PanelTitle kicker="Acceso y seguridad" title="Roles y permisos" action="Nuevo rol" onAction={add} />
      <p>
        Cada rol es un paquete de permisos. Se usa al invitar líderes (rol <strong>Líder</strong>) y para marcar los permisos de una persona de un clic en
        Usuarios.
      </p>
      <div className="permission-row">
        <span className="role-dot role-0" />
        <div>
          <strong>Administrador principal</strong>
          <p>Acceso total al sistema</p>
        </div>
        <StatusPill tone="pill-warn">Protegido</StatusPill>
      </div>
      {roles.map((role, i) => (
        <div key={role.id} className="role-block">
          <div className="permission-row">
            <span className={`role-dot role-${(i % 6) + 1}`} />
            <div>
              <strong>{role.name || "Sin nombre"}</strong>
              <p>{role.description || "Permisos personalizados"}</p>
            </div>
            <StatusPill tone="pill-blue">
              {role.permissions.length} {role.permissions.length === 1 ? "permiso" : "permisos"}
            </StatusPill>
            <button className="role-edit" onClick={() => setOpen(open === role.id ? null : role.id)}>
              {open === role.id ? "Cerrar" : "Editar"}
            </button>
          </div>
          {open === role.id && (
            <div className="role-editor">
              <div className="invite-fields">
                <Field label="Nombre del rol">
                  <input value={role.name} onChange={(e) => update(role.id, { name: e.target.value })} disabled={role.id === "lider"} />
                </Field>
                <Field label="Descripción">
                  <input value={role.description} onChange={(e) => update(role.id, { description: e.target.value })} />
                </Field>
              </div>
              <div className="access-grid">
                {PERMISSIONS.filter((p) => p.id !== "usuarios").map((p) => (
                  <label key={p.id} className={role.permissions.includes(p.id) ? "is-on" : ""}>
                    <input type="checkbox" checked={role.permissions.includes(p.id)} onChange={() => toggle(role, p.id)} />
                    <span>
                      <strong>{p.label}</strong>
                      <small>{p.hint}</small>
                    </span>
                  </label>
                ))}
              </div>
              {role.id !== "lider" && (
                <button className="access-reject" onClick={() => d.setDraft(roles.filter((r) => r.id !== role.id))}>
                  Eliminar este rol
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      <p className="muted-note">“Usuarios y permisos” no se incluye en los roles: solo el administrador principal lo da, persona por persona.</p>
      <SaveBar {...d} save={() => d.save()} />
    </section>
  )
}

function ProgramsSection() {
  const d = useDraft("programas")
  const [open, setOpen] = useState<string | null>(null)
  const list = d.draft
  const update = (id: string, patch: Partial<Program>) => d.setDraft(list.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  function add() {
    const p: Program = { id: newId(), name: "Nuevo programa", description: "", steps: ["Etapa 1"], cost: 0, active: true }
    d.setDraft([...list, p])
    setOpen(p.id)
  }
  return (
    <section className="panel permission-panel">
      <PanelTitle kicker="Formación" title="Programas" action="Nuevo programa" onAction={add} />
      <p>Los procesos que vive cada persona en MAI. Sus etapas aparecen en el perfil de cada persona y en la página del programa.</p>
      {list.map((p) => (
        <div key={p.id} className="role-block">
          <div className="permission-row">
            <span className="role-dot" style={{ background: p.active ? "#4c9b7a" : "#9aa3a5" }} />
            <div>
              <strong>{p.name}</strong>
              <p>
                {p.steps.length} etapas · {p.cost ? `$${p.cost.toLocaleString("es-CO")}` : "Sin costo"}
                {p.base ? " · Tiene su propia página" : ""}
              </p>
            </div>
            <StatusPill tone={p.active ? "pill-ok" : ""}>{p.active ? "Activo" : "Inactivo"}</StatusPill>
            <button className="role-edit" onClick={() => setOpen(open === p.id ? null : p.id)}>
              {open === p.id ? "Cerrar" : "Editar"}
            </button>
          </div>
          {open === p.id && (
            <div className="role-editor">
              <div className="invite-fields">
                <Field label="Nombre">
                  <input value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} />
                </Field>
                <Field label="Valor (COP)">
                  <input type="number" min={0} step={1000} value={p.cost} onChange={(e) => update(p.id, { cost: Math.max(0, Number(e.target.value) || 0) })} />
                </Field>
                <Field label="Descripción" full>
                  <input value={p.description} onChange={(e) => update(p.id, { description: e.target.value })} />
                </Field>
                <Field label="Etapas (una por línea, en orden)" full>
                  <textarea
                    rows={Math.min(10, Math.max(3, p.steps.length + 1))}
                    value={p.steps.join("\n")}
                    onChange={(e) => update(p.id, { steps: e.target.value.split("\n").map((s) => s.replace(/^\s+/, "")).filter((s, i, a) => s || i === a.length - 1) })}
                  />
                </Field>
              </div>
              <label className="toggle-row">
                <input type="checkbox" checked={p.active} onChange={(e) => update(p.id, { active: e.target.checked })} />
                <span>Programa activo (se puede inscribir gente)</span>
              </label>
              {!p.base && (
                <button className="access-reject" onClick={() => d.setDraft(list.filter((x) => x.id !== p.id))}>
                  Eliminar este programa
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      <SaveBar
        {...d}
        save={() => d.save(list.map((p) => ({ ...p, name: p.name.trim() || "Sin nombre", steps: p.steps.map((s) => s.trim()).filter(Boolean) })))}
      />
    </section>
  )
}

function PaymentsSection() {
  const d = useDraft("metodos_pago")
  const [open, setOpen] = useState<string | null>(null)
  const list = d.draft
  const update = (id: string, patch: Partial<PaymentMethod>) => d.setDraft(list.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  function add() {
    const m: PaymentMethod = { id: newId(), name: "", type: "Nequi", number: "", holder: "", instructions: "", active: true }
    d.setDraft([...list, m])
    setOpen(m.id)
  }
  return (
    <section className="panel permission-panel">
      <PanelTitle kicker="Finanzas" title="Métodos de pago" action="Agregar método" onAction={add} />
      <p>Cuentas y medios oficiales para ofrendas, diezmos, encuentros y programas.</p>
      {list.length === 0 && <p className="muted-note">Aún no hay métodos de pago.</p>}
      {list.map((m) => (
        <div key={m.id} className="role-block">
          <div className="permission-row">
            <span className="role-dot" style={{ background: m.active ? "#1b6f7b" : "#9aa3a5" }} />
            <div>
              <strong>{m.name || "Sin nombre"}</strong>
              <p>
                {m.type}
                {m.number ? ` · ${m.number}` : ""}
              </p>
            </div>
            <StatusPill tone={m.active ? "pill-ok" : ""}>{m.active ? "Activo" : "Inactivo"}</StatusPill>
            <button className="role-edit" onClick={() => setOpen(open === m.id ? null : m.id)}>
              {open === m.id ? "Cerrar" : "Editar"}
            </button>
          </div>
          {open === m.id && (
            <div className="role-editor">
              <div className="invite-fields">
                <Field label="Banco o plataforma">
                  <input value={m.name} onChange={(e) => update(m.id, { name: e.target.value })} placeholder="Davivienda, Nequi, Daviplata..." />
                </Field>
                <Field label="Tipo">
                  <select value={m.type} onChange={(e) => update(m.id, { type: e.target.value })}>
                    {["Cuenta de ahorros", "Cuenta corriente", "Nequi", "Daviplata", "Llave Bre-B", "Efectivo", "Datáfono", "Otro"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Número, llave o celular">
                  <input value={m.number} onChange={(e) => update(m.id, { number: e.target.value })} />
                </Field>
                <Field label="Titular">
                  <input value={m.holder} onChange={(e) => update(m.id, { holder: e.target.value })} placeholder="Nombre y NIT o cédula" />
                </Field>
                <Field label="Instrucciones" full>
                  <input value={m.instructions} onChange={(e) => update(m.id, { instructions: e.target.value })} placeholder="Ej: envía el comprobante a tu líder" />
                </Field>
              </div>
              <label className="toggle-row">
                <input type="checkbox" checked={m.active} onChange={(e) => update(m.id, { active: e.target.checked })} />
                <span>Método activo</span>
              </label>
              <button className="access-reject" onClick={() => d.setDraft(list.filter((x) => x.id !== m.id))}>
                Eliminar este método
              </button>
            </div>
          )}
        </div>
      ))}
      <SaveBar {...d} save={() => d.save()} />
    </section>
  )
}

function DocTemplatesSection() {
  const d = useDraft("plantillas_documentos")
  const [open, setOpen] = useState<string | null>(null)
  const list = d.draft
  const update = (id: string, patch: Partial<DocTemplate>) => d.setDraft(list.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  function add() {
    const t: DocTemplate = { id: newId(), name: "Nueva plantilla", category: "General", body: "La {{iglesia}} hace constar que {{nombre}}, identificado(a) con {{tipo_documento}} No. {{documento}}, ...\n\nBogotá, {{fecha}}." }
    d.setDraft([...list, t])
    setOpen(t.id)
  }
  function insert(id: string, key: string) {
    const area = document.getElementById(`tpl-${id}`) as HTMLTextAreaElement | null
    const t = list.find((x) => x.id === id)
    if (!t) return
    const at = area?.selectionStart ?? t.body.length
    update(id, { body: `${t.body.slice(0, at)}{{${key}}}${t.body.slice(area?.selectionEnd ?? at)}` })
  }
  return (
    <section className="panel permission-panel">
      <PanelTitle kicker="Documentos" title="Plantillas de documentos" action="Nueva plantilla" onAction={add} />
      <p>Cartas y constancias que se llenan solas con los datos de cada persona. Se generan desde Documentos o desde el perfil de la persona.</p>
      {list.map((t) => (
        <div key={t.id} className="role-block">
          <div className="permission-row">
            <span className="role-dot" />
            <div>
              <strong>{t.name}</strong>
              <p>{t.category}</p>
            </div>
            <button className="role-edit" onClick={() => setOpen(open === t.id ? null : t.id)}>
              {open === t.id ? "Cerrar" : "Editar"}
            </button>
          </div>
          {open === t.id && (
            <div className="role-editor">
              <div className="invite-fields">
                <Field label="Nombre">
                  <input value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} />
                </Field>
                <Field label="Categoría">
                  <select value={t.category} onChange={(e) => update(t.id, { category: e.target.value })}>
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Texto del documento" full>
                  <textarea id={`tpl-${t.id}`} rows={9} value={t.body} onChange={(e) => update(t.id, { body: e.target.value })} />
                </Field>
              </div>
              <p className="muted-note">Toca un dato para insertarlo donde está el cursor:</p>
              <div className="placeholder-chips">
                {PLACEHOLDERS.map(([k, label]) => (
                  <button key={k} type="button" onClick={() => insert(t.id, k)} title={`{{${k}}}`}>
                    {label}
                  </button>
                ))}
              </div>
              <button className="access-reject" onClick={() => d.setDraft(list.filter((x) => x.id !== t.id))}>
                Eliminar esta plantilla
              </button>
            </div>
          )}
        </div>
      ))}
      {list.length === 0 && <p className="muted-note">No hay plantillas. Crea la primera con “Nueva plantilla”.</p>}
      <SaveBar {...d} save={() => d.save()} />
    </section>
  )
}

function CertTemplatesSection() {
  const settings = useContext(SettingsContext)
  const d = useDraft("plantillas_certificados")
  const [open, setOpen] = useState<string | null>(null)
  const list = d.draft
  const update = (id: string, patch: Partial<CertTemplate>) => d.setDraft(list.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  function add() {
    const t: CertTemplate = { id: newId(), name: "Nuevo certificado", program: "", title: "Certificado", text: "Por su participación en ...", signer1: "", signer1Role: "Pastor principal", signer2: "", signer2Role: "", color: "#168c9c" }
    d.setDraft([...list, t])
    setOpen(t.id)
  }
  return (
    <section className="panel permission-panel">
      <PanelTitle kicker="Certificados" title="Plantillas de certificados" action="Nueva plantilla" onAction={add} />
      <p>Diseño, texto y firmas de cada certificado. Se emiten desde Certificados o desde el perfil de la persona.</p>
      {list.map((t) => (
        <div key={t.id} className="role-block">
          <div className="permission-row">
            <span className="role-dot" style={{ background: t.color }} />
            <div>
              <strong>{t.name}</strong>
              <p>
                {t.title}
                {t.program ? ` · ${settings.programas.find((p) => p.id === t.program)?.name ?? ""}` : ""}
              </p>
            </div>
            <button className="role-edit" onClick={() => setOpen(open === t.id ? null : t.id)}>
              {open === t.id ? "Cerrar" : "Editar"}
            </button>
          </div>
          {open === t.id && (
            <div className="role-editor">
              <CertificatePreview template={t} />
              <div className="invite-fields">
                <Field label="Nombre de la plantilla">
                  <input value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} />
                </Field>
                <Field label="Programa">
                  <select value={t.program} onChange={(e) => update(t.id, { program: e.target.value })}>
                    <option value="">Ninguno</option>
                    {settings.programas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Título">
                  <input value={t.title} onChange={(e) => update(t.id, { title: e.target.value })} />
                </Field>
                <Field label="Color">
                  <input type="color" value={t.color} onChange={(e) => update(t.id, { color: e.target.value })} />
                </Field>
                <Field label="Texto del reconocimiento" full>
                  <textarea rows={3} value={t.text} onChange={(e) => update(t.id, { text: e.target.value })} />
                </Field>
                <Field label="Firma 1 · nombre">
                  <input value={t.signer1} onChange={(e) => update(t.id, { signer1: e.target.value })} placeholder="Nombre del pastor" />
                </Field>
                <Field label="Firma 1 · cargo">
                  <input value={t.signer1Role} onChange={(e) => update(t.id, { signer1Role: e.target.value })} />
                </Field>
                <Field label="Firma 2 · nombre">
                  <input value={t.signer2} onChange={(e) => update(t.id, { signer2: e.target.value })} placeholder="Opcional" />
                </Field>
                <Field label="Firma 2 · cargo">
                  <input value={t.signer2Role} onChange={(e) => update(t.id, { signer2Role: e.target.value })} placeholder="Opcional" />
                </Field>
              </div>
              <button className="access-reject" onClick={() => d.setDraft(list.filter((x) => x.id !== t.id))}>
                Eliminar esta plantilla
              </button>
            </div>
          )}
        </div>
      ))}
      <SaveBar {...d} save={() => d.save()} />
    </section>
  )
}

function NotificationsSection() {
  const d = useDraft("notificaciones")
  const items: [keyof NotificationPrefs, string, string][] = [
    ["cuentas", "Cuentas por aprobar", "Cuando alguien crea su cuenta con una invitación normal"],
    ["discipulos", "Discípulos nuevos", "Cuando alguien se inscribe con el enlace de un líder"],
    ["solicitudes", "Solicitudes del sitio web", "Oración, visitas, ujieres e inscripciones a eventos"],
    ["invitaciones", "Invitaciones por vencer", "Enlaces que vencen en los próximos 2 días"],
    ["cumpleanos", "Cumpleaños", "Personas que cumplen años esta semana"],
  ]
  return (
    <section className="panel permission-panel">
      <PanelTitle kicker="Avisos" title="Notificaciones" />
      <p>Elige qué aparece en la campana y en Notificaciones. Cada persona solo ve lo de los módulos que tiene permitidos.</p>
      <div className="access-grid access-grid-one">
        {items.map(([k, label, hint]) => (
          <label key={k} className={d.draft[k] ? "is-on" : ""}>
            <input type="checkbox" checked={d.draft[k]} onChange={(e) => d.setDraft({ ...d.draft, [k]: e.target.checked })} />
            <span>
              <strong>{label}</strong>
              <small>{hint}</small>
            </span>
          </label>
        ))}
      </div>
      <SaveBar {...d} save={() => d.save()} />
    </section>
  )
}

const BUCKETS: Record<string, string> = {
  fotos: "Fotos de personas y del equipo",
  anuncios: "Imágenes de anuncios del sitio",
  comprobantes: "Comprobantes de inscripciones del sitio web",
  soportes: "Soportes de pagos, gastos y documentos",
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

function StorageSection() {
  const usage = useLiveData(storageUsage, [])
  const LIMIT = 1024 ** 3 // Supabase free plan: 1 GB of file storage
  const rows = Object.keys(BUCKETS).map((b) => usage.data?.find((u) => u.bucket === b) ?? { bucket: b, files: 0, bytes: 0 })
  const total = (usage.data ?? []).reduce((n, u) => n + u.bytes, 0)
  const pct = Math.min(100, (total / LIMIT) * 100)
  return (
    <section className="panel permission-panel">
      <PanelTitle kicker="Archivos" title="Almacenamiento" />
      <p>Espacio que ocupan las fotos, imágenes y comprobantes guardados en la plataforma.</p>
      {usage.error && <p className="users-error">No pudimos leer el almacenamiento.</p>}
      <div className="storage-total">
        <strong>{usage.data ? formatBytes(total) : "—"}</strong>
        <span>de 1 GB incluidos en el plan</span>
        <div className="wide-progress">
          <i style={{ width: `${Math.max(pct, total ? 1 : 0)}%` }} />
        </div>
      </div>
      {rows.map((r) => (
        <div className="permission-row" key={r.bucket}>
          <span className="role-dot" />
          <div>
            <strong>{BUCKETS[r.bucket]}</strong>
            <p>
              {r.files} {r.files === 1 ? "archivo" : "archivos"}
            </p>
          </div>
          <StatusPill tone="pill-blue">{formatBytes(r.bytes)}</StatusPill>
        </div>
      ))}
      <p className="muted-note">Las fotos se reducen automáticamente antes de subirlas para ahorrar espacio.</p>
    </section>
  )
}

function GeneralSection() {
  const d = useDraft("general")
  const set = <K extends keyof GeneralSettings>(k: K, v: GeneralSettings[K]) => d.setDraft({ ...d.draft, [k]: v })
  const days = [1, 7, 15, 30]
  return (
    <section className="panel permission-panel">
      <PanelTitle kicker="Parámetros" title="Configuración general" />
      <p>Cómo funcionan los enlaces de invitación y de inscripción.</p>
      <div className="invite-fields settings-fields">
        <Field label="Invitaciones normales vencen en">
          <select value={d.draft.inviteDays} onChange={(e) => set("inviteDays", Number(e.target.value))}>
            {days.map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "24 horas" : `${n} días`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Invitaciones de líder vencen en">
          <select value={d.draft.leaderInviteDays} onChange={(e) => set("leaderInviteDays", Number(e.target.value))}>
            {days.map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "24 horas" : `${n} días`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mensaje del enlace de discípulos" full>
          <textarea rows={3} value={d.draft.discipleWelcome} onChange={(e) => set("discipleWelcome", e.target.value)} />
        </Field>
      </div>
      <label className="toggle-row">
        <input type="checkbox" checked={d.draft.approveDisciples} onChange={(e) => set("approveDisciples", e.target.checked)} />
        <span>El líder debe aceptar a los discípulos que se inscriben con su enlace</span>
      </label>
      <dl className="access-facts">
        <div>
          <dt>Zona horaria</dt>
          <dd>Bogotá (UTC−5)</dd>
        </div>
        <div>
          <dt>Moneda</dt>
          <dd>Peso colombiano (COP)</dd>
        </div>
      </dl>
      <SaveBar {...d} save={() => d.save()} />
    </section>
  )
}

/* ---------------------------------------------------------------- */

export default function SettingsPage({ go }: { go: (page: string) => void }) {
  const me = useContext(MyAccess)
  const [section, setSection] = useState<Section>("Información de Iglesia")
  if (!me?.isOwner) {
    return (
      <section className="panel users-empty">
        <h2>Solo el administrador principal</h2>
        <p>La configuración la cambia el administrador principal.</p>
      </section>
    )
  }
  return (
    <>
      <PageHeader eyebrow="Administración" title="Configuración" copy="Datos de la iglesia, roles, programas, pagos y parámetros generales." />
      <div className="settings-grid">
        <aside className="panel settings-nav">
          {SECTIONS.map((x) => (
            <button className={section === x ? "active" : ""} key={x} onClick={() => setSection(x)}>
              {x}
              <AIcon name="arrow" />
            </button>
          ))}
        </aside>
        {section === "Información de Iglesia" && <ChurchSection />}
        {section === "Usuarios" && <UsersSection go={go} />}
        {section === "Roles y permisos" && <RolesSection />}
        {section === "Programas" && <ProgramsSection />}
        {section === "Métodos de pago" && <PaymentsSection />}
        {section === "Plantillas de documentos" && <DocTemplatesSection />}
        {section === "Plantillas de certificados" && <CertTemplatesSection />}
        {section === "Notificaciones" && <NotificationsSection />}
        {section === "Almacenamiento" && <StorageSection />}
        {section === "Configuración general" && <GeneralSection />}
      </div>
    </>
  )
}
