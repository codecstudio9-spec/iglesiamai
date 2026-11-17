/**
 * Configuración: one JSON value per section in public.settings (supabase/personas.sql).
 * Everyone on the team reads it; only the owner writes it (RLS).
 */
import { createContext, useEffect, useState } from "react"
import type { Permission } from "./staff"
import { notifyChange, onTableChange, supabase } from "./supabase"

export type ChurchInfo = {
  name: string
  nit: string
  address: string
  area: string
  phone: string
  whatsapp: string
  email: string
  schedule: string
  website: string
  instagram: string
  facebook: string
  youtube: string
  tiktok: string
}

export type RolePreset = { id: string; name: string; description: string; permissions: Permission[] }

export type Program = {
  id: string
  name: string
  description: string
  steps: string[]
  cost: number
  active: boolean
  /** Encuentro, Misión 180 and Destino have their own page and permission. */
  base?: boolean
}

export type PaymentMethod = {
  id: string
  name: string
  type: string
  number: string
  holder: string
  instructions: string
  active: boolean
}

export type NotificationPrefs = {
  cuentas: boolean
  discipulos: boolean
  solicitudes: boolean
  invitaciones: boolean
  cumpleanos: boolean
}

export type GeneralSettings = {
  inviteDays: number
  leaderInviteDays: number
  approveDisciples: boolean
  discipleWelcome: string
}

export type DocTemplate = { id: string; name: string; category: string; body: string }

export type CertTemplate = {
  id: string
  name: string
  program: string
  title: string
  text: string
  signer1: string
  signer1Role: string
  signer2: string
  signer2Role: string
  color: string
}

export type Settings = {
  iglesia: ChurchInfo
  roles: RolePreset[]
  programas: Program[]
  metodos_pago: PaymentMethod[]
  notificaciones: NotificationPrefs
  general: GeneralSettings
  plantillas_documentos: DocTemplate[]
  plantillas_certificados: CertTemplate[]
}

export const DEFAULT_SETTINGS: Settings = {
  iglesia: {
    name: "Iglesia Cristiana MAI",
    nit: "900.332.947-9",
    address: "Avenida Boyacá #8-13",
    area: "Castilla · Bogotá, Colombia",
    phone: "",
    whatsapp: "",
    email: "",
    schedule: "Domingos · 8:00 y 10:00 AM",
    website: "https://www.iglesiamai.com",
    instagram: "https://www.instagram.com/iglesiamai/",
    facebook: "https://www.facebook.com/Iglesiamai/",
    youtube: "https://www.youtube.com/@IglesiaMAI",
    tiktok: "https://www.tiktok.com/@maiiglesia",
  },
  roles: [
    { id: "pastor", name: "Pastor", description: "Personas, equipo, procesos de formación y sitio web", permissions: ["personas", "equipo", "encuentros", "universidad", "capacitacion", "solicitudes", "anuncios", "reportes"] },
    { id: "lider", name: "Líder", description: "Sus discípulos y los encuentros", permissions: ["equipo", "encuentros"] },
    { id: "profesor", name: "Profesor", description: "Misión 180 y Capacitación Destino", permissions: ["universidad", "capacitacion"] },
    { id: "tesoreria", name: "Tesorería", description: "Pagos, gastos y reportes", permissions: ["pagos", "gastos", "reportes"] },
    { id: "servicio", name: "Servicio", description: "Solicitudes del sitio web (ujieres, visitas, oración)", permissions: ["solicitudes"] },
    { id: "comunicaciones", name: "Comunicaciones", description: "Anuncios y solicitudes del sitio web", permissions: ["anuncios", "solicitudes"] },
    { id: "consulta", name: "Consulta", description: "Solo ver reportes", permissions: ["reportes"] },
  ],
  programas: [
    { id: "encuentro", name: "Encuentro", description: "Un fin de semana para encontrarse con Dios.", steps: ["Pre-encuentro", "Encuentro", "Pos-encuentro"], cost: 0, active: true, base: true },
    { id: "mision180", name: "Misión 180", description: "Formación antes y después del encuentro para cada generación.", steps: ["Clase 1", "Clase 2", "Clase 3", "Clase 4", "Clase 5", "Clase 6", "Clase 7", "Clase 8", "Graduación"], cost: 0, active: true, base: true },
    { id: "destino", name: "Capacitación Destino", description: "Formación de líderes para servir y multiplicar.", steps: ["Módulo 1", "Módulo 2", "Módulo 3", "Graduación"], cost: 0, active: true, base: true },
  ],
  metodos_pago: [
    { id: "davivienda", name: "Davivienda", type: "Cuenta de ahorros", number: "003900109319", holder: "Iglesia Cristiana MAI · NIT 900.332.947-9", instructions: "Única cuenta oficial para ofrendas, diezmos y pagos.", active: true },
  ],
  notificaciones: { cuentas: true, discipulos: true, solicitudes: true, invitaciones: true, cumpleanos: true },
  general: {
    inviteDays: 7,
    leaderInviteDays: 7,
    approveDisciples: true,
    discipleWelcome: "Completa tus datos para empezar tu proceso en MAI. Tu líder te va a acompañar en cada paso.",
  },
  plantillas_documentos: [
    {
      id: "membresia",
      name: "Constancia de membresía",
      category: "Persona",
      body:
        "La {{iglesia}}, identificada con NIT {{nit}}, hace constar que {{nombre}}, identificado(a) con {{tipo_documento}} No. {{documento}}, es miembro activo de nuestra congregación y participa con fidelidad de nuestras reuniones y actividades.\n\nEsta constancia se expide a solicitud del interesado(a) en Bogotá, el {{fecha}}.",
    },
    {
      id: "recomendacion",
      name: "Carta de recomendación",
      category: "Persona",
      body:
        "A quien pueda interesar:\n\nLa {{iglesia}} se permite recomendar a {{nombre}}, identificado(a) con {{tipo_documento}} No. {{documento}}, quien hace parte de nuestra familia y es acompañado(a) por su líder {{lider}}.\n\nDurante este tiempo ha demostrado ser una persona responsable, respetuosa y comprometida, por lo que no dudamos en recomendarla.\n\nPara cualquier información adicional pueden comunicarse con nosotros en {{direccion_iglesia}}.\n\nBogotá, {{fecha}}.",
    },
    {
      id: "participacion",
      name: "Constancia de participación",
      category: "Formación",
      body:
        "La {{iglesia}} hace constar que {{nombre}}, identificado(a) con {{tipo_documento}} No. {{documento}}, participa en el proceso {{programa}} y actualmente se encuentra en la etapa: {{etapa}}.\n\nSe expide en Bogotá, el {{fecha}}.",
    },
  ],
  plantillas_certificados: [
    { id: "cert-encuentro", name: "Encuentro", program: "encuentro", title: "Certificado de Encuentro", text: "Por haber vivido el Encuentro con Dios y dar el primer paso de su proceso en MAI.", signer1: "", signer1Role: "Pastor principal", signer2: "", signer2Role: "Pastora", color: "#168c9c" },
    { id: "cert-mision180", name: "Misión 180", program: "mision180", title: "Certificado de Graduación", text: "Por haber culminado con éxito la formación Misión 180.", signer1: "", signer1Role: "Pastor principal", signer2: "", signer2Role: "Coordinador de formación", color: "#c8754e" },
    { id: "cert-destino", name: "Capacitación Destino", program: "destino", title: "Certificado de Capacitación", text: "Por haber completado la Capacitación Destino y estar listo(a) para servir y multiplicar.", signer1: "", signer1Role: "Pastor principal", signer2: "", signer2Role: "Coordinador de formación", color: "#123b4a" },
  ],
}

export type SettingsKey = keyof Settings

/** Provided once by AdminApp so every screen shares the same settings. */
export const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS)

export async function loadSettings(): Promise<Settings> {
  const { data, error } = await supabase.from("settings").select("key, value")
  if (error) throw error
  const out = structuredClone(DEFAULT_SETTINGS) as Record<string, unknown>
  for (const row of (data ?? []) as { key: string; value: unknown }[]) {
    if (!(row.key in out) || row.value == null) continue
    const base = out[row.key]
    out[row.key] = Array.isArray(base) ? row.value : { ...(base as object), ...(row.value as object) }
  }
  return out as Settings
}

export async function saveSetting<K extends SettingsKey>(key: K, value: Settings[K]) {
  const { error } = await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.code === "42501" ? "Solo el administrador principal puede cambiar la configuración." : "No pudimos guardar los cambios.")
  notifyChange("settings")
}

/** Settings kept fresh across tabs and devices (falls back to the defaults while loading).
 *  `who` reloads them when a different person signs in. */
export function useSettings(who = "") {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    const load = () =>
      loadSettings()
        .then((s) => alive && (setSettings(s), setReady(true)))
        .catch(() => alive && setReady(true))
    load()
    const off = onTableChange("settings", load)
    return () => {
      alive = false
      off()
    }
  }, [who])
  return { settings, ready }
}

export type StorageUsage = { bucket: string; files: number; bytes: number }

export async function storageUsage(): Promise<StorageUsage[]> {
  const { data, error } = await supabase.rpc("storage_usage")
  if (error) throw error
  return ((data ?? []) as { bucket: string; files: number; bytes: number }[]).map((r) => ({
    bucket: r.bucket,
    files: Number(r.files) || 0,
    bytes: Number(r.bytes) || 0,
  }))
}

export const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/-/g, "").slice(0, 12)
