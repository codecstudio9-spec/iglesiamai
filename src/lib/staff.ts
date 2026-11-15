/**
 * Team accounts, permissions and invitation links (supabase/accesos.sql).
 * What each person can read or change is enforced by RLS and set_staff_access();
 * this file only reads and calls them.
 */
import { notifyChange, onTableChange, supabase } from "./supabase"

/** The modules a person can be given. Keep in sync with valid_permissions() in supabase/accesos.sql. */
export const PERMISSIONS = [
  { id: "solicitudes", label: "Solicitudes del sitio web", hint: "Oración, visitas, ujieres e inscripciones" },
  { id: "anuncios", label: "Anuncios del sitio", hint: "Ventana de eventos de la página" },
  { id: "personas", label: "Personas", hint: "Directorio de la iglesia" },
  { id: "equipo", label: "Líderes y discípulos", hint: "Mi equipo" },
  { id: "encuentros", label: "Encuentros", hint: "Eventos e inscritos" },
  { id: "universidad", label: "Universidad de la Vida", hint: "Cursos y estudiantes" },
  { id: "capacitacion", label: "Capacitación Destino", hint: "Formación de líderes" },
  { id: "pagos", label: "Pagos", hint: "Ingresos y comprobantes" },
  { id: "gastos", label: "Gastos", hint: "Egresos de la iglesia" },
  { id: "documentos", label: "Documentos y certificados", hint: "Archivo de MAI" },
  { id: "reportes", label: "Reportes", hint: "Indicadores y estadísticas" },
  { id: "usuarios", label: "Usuarios y permisos", hint: "Invitar personas y asignar permisos" },
] as const

export type Permission = (typeof PERMISSIONS)[number]["id"]
export type StaffStatus = "pendiente" | "activo" | "suspendido" | "rechazado"

export type StaffMember = {
  userId: string
  name: string
  username: string
  email: string
  phone: string
  docType: string
  docNumber: string
  birthDate: string | null
  address: string
  roleLabel: string
  status: StaffStatus
  permissions: Permission[]
  isOwner: boolean
  createdAt: string
  approvedAt: string | null
}

export type Invitation = {
  id: string
  name: string
  email: string
  phone: string
  roleLabel: string
  expiresAt: string
  createdByName: string
  createdAt: string
  usedAt: string | null
  revokedAt: string | null
}

type StaffRow = {
  user_id: string
  name: string
  username: string | null
  email: string
  phone: string
  doc_type: string
  doc_number: string
  birth_date: string | null
  address: string
  role_label: string
  status: StaffStatus
  permissions: Permission[]
  is_owner: boolean
  created_at: string
  approved_at: string | null
}

type InvitationRow = {
  id: string
  name: string
  email: string
  phone: string
  role_label: string
  expires_at: string
  created_by_name: string
  created_at: string
  used_at: string | null
  revoked_at: string | null
}

function toMember(r: StaffRow): StaffMember {
  return {
    userId: r.user_id,
    name: r.name,
    username: r.username ?? "",
    email: r.email,
    phone: r.phone,
    docType: r.doc_type,
    docNumber: r.doc_number,
    birthDate: r.birth_date,
    address: r.address,
    roleLabel: r.role_label,
    status: r.status,
    permissions: r.permissions ?? [],
    isOwner: r.is_owner,
    createdAt: r.created_at,
    approvedAt: r.approved_at,
  }
}

/** The signed-in person's own access (null if they are not on the team). */
export async function myAccess(): Promise<StaffMember | null> {
  const { data: session } = await supabase.auth.getSession()
  const id = session.session?.user.id
  if (!id) return null
  const { data } = await supabase.from("staff").select("*").eq("user_id", id).maybeSingle()
  return data ? toMember(data as StaffRow) : null
}

export function can(me: StaffMember | null, perm: Permission) {
  return Boolean(me && me.status === "activo" && (me.isOwner || me.permissions.includes(perm)))
}

export async function listStaff(): Promise<StaffMember[]> {
  const { data, error } = await supabase.from("staff").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data as StaffRow[]).map(toMember)
}

export async function setStaffAccess(userId: string, status: StaffStatus, permissions: Permission[]) {
  const { error } = await supabase.rpc("set_staff_access", {
    target: userId,
    new_status: status,
    new_permissions: permissions,
  })
  if (error) throw new Error(error.message || "No pudimos guardar los permisos.")
  notifyChange("staff")
}

export async function listInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select("id,name,email,phone,role_label,expires_at,created_by_name,created_at,used_at,revoked_at")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data as InvitationRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    roleLabel: r.role_label,
    expiresAt: r.expires_at,
    createdByName: r.created_by_name,
    createdAt: r.created_at,
    usedAt: r.used_at,
    revokedAt: r.revoked_at,
  }))
}

export function invitationState(inv: Invitation): "usada" | "revocada" | "expirada" | "vigente" {
  if (inv.usedAt) return "usada"
  if (inv.revokedAt) return "revocada"
  if (new Date(inv.expiresAt).getTime() < Date.now()) return "expirada"
  return "vigente"
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/** Same hash as api/registro.ts: only this is stored, the link itself is shown once. */
export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
}

export function invitationLink(token: string) {
  return `${window.location.origin}/#/registro/${token}`
}

export async function createInvitation(input: {
  name: string
  email: string
  phone: string
  roleLabel: string
  days: number
  createdByName: string
}) {
  const token = randomToken()
  const { error } = await supabase.from("invitations").insert({
    token_hash: await hashToken(token),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    role_label: input.roleLabel,
    expires_at: new Date(Date.now() + input.days * 86_400_000).toISOString(),
    created_by_name: input.createdByName,
  })
  if (error) throw new Error("No pudimos crear la invitación.")
  notifyChange("invitations")
  return invitationLink(token)
}

export async function revokeInvitation(id: string) {
  const { error } = await supabase.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", id)
  if (error) throw new Error("No pudimos anular la invitación.")
  notifyChange("invitations")
}

export const onStaffChange = (cb: () => void) => onTableChange("staff", cb)
export const onInvitationsChange = (cb: () => void) => onTableChange("invitations", cb)

/* ---------------------------------------------------------------- */
/* Public side: the invited person (no session yet)                  */
/* ---------------------------------------------------------------- */

export type InvitationPreview = { name: string; email: string; phone: string; roleLabel: string }

export async function readInvitation(token: string): Promise<InvitationPreview> {
  const res = await fetch("/api/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "ver", token }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || "Esta invitación no es válida.")
  return body as InvitationPreview
}

export type RegistrationData = {
  token: string
  name: string
  docType: string
  docNumber: string
  birthDate: string
  phone: string
  address: string
  email: string
  username: string
  password: string
}

export async function acceptInvitation(data: RegistrationData) {
  const res = await fetch("/api/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "crear", ...data }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || "No pudimos crear tu cuenta. Inténtalo de nuevo.")
}

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/
