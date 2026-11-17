/**
 * People the church accompanies, the team as everyone sees it, and photos
 * (supabase/personas.sql). Who can read or change each person is enforced by RLS.
 */
import { compressImage } from "./files"
import { notifyChange, onTableChange, supabase } from "./supabase"

export type PersonStatus = "pendiente" | "activo" | "inactivo" | "rechazado"

export const PERSON_ROLES = ["Visitante", "Nuevo creyente", "Discípulo", "Miembro", "Servidor"] as const

export type Person = {
  id: string
  fullName: string
  docType: string
  docNumber: string
  birthDate: string | null
  gender: string
  phone: string
  email: string
  address: string
  emergencyContact: string
  role: string
  program: string
  programStep: string
  leaderId: string | null
  status: PersonStatus
  source: string
  notes: string
  photoPath: string | null
  createdAt: string
  updatedAt: string
}

export type PersonInput = Omit<Person, "id" | "createdAt" | "updatedAt" | "source"> & { source?: string }

type PersonRow = {
  id: string
  full_name: string
  doc_type: string
  doc_number: string
  birth_date: string | null
  gender: string
  phone: string
  email: string
  address: string
  emergency_contact: string
  role: string
  program: string
  program_step: string
  leader_id: string | null
  status: PersonStatus
  source: string
  notes: string
  photo_path: string | null
  created_at: string
  updated_at: string
}

const toPerson = (r: PersonRow): Person => ({
  id: r.id,
  fullName: r.full_name,
  docType: r.doc_type,
  docNumber: r.doc_number,
  birthDate: r.birth_date,
  gender: r.gender,
  phone: r.phone,
  email: r.email,
  address: r.address,
  emergencyContact: r.emergency_contact,
  role: r.role,
  program: r.program,
  programStep: r.program_step,
  leaderId: r.leader_id,
  status: r.status,
  source: r.source,
  notes: r.notes,
  photoPath: r.photo_path,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const toRow = (p: Partial<PersonInput>) => {
  const row: Record<string, unknown> = {}
  if (p.fullName !== undefined) row.full_name = p.fullName.trim()
  if (p.docType !== undefined) row.doc_type = p.docType
  if (p.docNumber !== undefined) row.doc_number = p.docNumber.replace(/[.\s]/g, "")
  if (p.birthDate !== undefined) row.birth_date = p.birthDate || null
  if (p.gender !== undefined) row.gender = p.gender
  if (p.phone !== undefined) row.phone = p.phone.trim()
  if (p.email !== undefined) row.email = p.email.trim().toLowerCase()
  if (p.address !== undefined) row.address = p.address.trim()
  if (p.emergencyContact !== undefined) row.emergency_contact = p.emergencyContact.trim()
  if (p.role !== undefined) row.role = p.role
  if (p.program !== undefined) row.program = p.program
  if (p.programStep !== undefined) row.program_step = p.programStep
  if (p.leaderId !== undefined) row.leader_id = p.leaderId || null
  if (p.status !== undefined) row.status = p.status
  if (p.source !== undefined) row.source = p.source
  if (p.notes !== undefined) row.notes = p.notes.trim()
  if (p.photoPath !== undefined) row.photo_path = p.photoPath
  return row
}

export const emptyPerson = (patch: Partial<PersonInput> = {}): PersonInput => ({
  fullName: "",
  docType: "CC",
  docNumber: "",
  birthDate: null,
  gender: "",
  phone: "",
  email: "",
  address: "",
  emergencyContact: "",
  role: "Discípulo",
  program: "",
  programStep: "",
  leaderId: null,
  status: "activo",
  notes: "",
  photoPath: null,
  ...patch,
})

export async function listPeople(): Promise<Person[]> {
  const { data, error } = await supabase.from("people").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data as PersonRow[]).map(toPerson)
}

export async function getPerson(id: string): Promise<Person | null> {
  const { data, error } = await supabase.from("people").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data ? toPerson(data as PersonRow) : null
}

export async function savePerson(input: PersonInput, id?: string): Promise<Person> {
  if (input.fullName.trim().length < 2) throw new Error("Escribe el nombre completo.")
  const query = id
    ? supabase.from("people").update(toRow(input)).eq("id", id)
    : supabase.from("people").insert(toRow(input))
  const { data, error } = await query.select("*").single()
  if (error) throw new Error(error.code === "42501" ? "No tienes permiso para guardar esta persona." : "No pudimos guardar la persona.")
  notifyChange("people")
  return toPerson(data as PersonRow)
}

export async function updatePerson(id: string, patch: Partial<PersonInput>) {
  const { error } = await supabase.from("people").update(toRow(patch)).eq("id", id)
  if (error) throw new Error("No pudimos guardar el cambio.")
  notifyChange("people")
}

export async function deletePerson(person: Person) {
  const { error } = await supabase.from("people").delete().eq("id", person.id)
  if (error) throw new Error("No pudimos eliminar la persona.")
  if (person.photoPath) await supabase.storage.from("fotos").remove([person.photoPath])
  notifyChange("people")
}

export const onPeopleChange = (cb: () => void) => onTableChange("people", cb)

/* ---------------------------------------------------------------- */
/* Team (everyone active on the panel)                               */
/* ---------------------------------------------------------------- */

export type TeamMember = {
  userId: string
  name: string
  roleLabel: string
  phone: string
  email: string
  photoPath: string | null
  createdAt: string
  disciples: number
}

export async function listTeam(): Promise<TeamMember[]> {
  const { data, error } = await supabase.rpc("list_team")
  if (error) throw error
  return (data as { user_id: string; name: string; role_label: string; phone: string; email: string; photo_path: string | null; created_at: string; disciples: number }[]).map(
    (r) => ({
      userId: r.user_id,
      name: r.name,
      roleLabel: r.role_label,
      phone: r.phone,
      email: r.email,
      photoPath: r.photo_path,
      createdAt: r.created_at,
      disciples: Number(r.disciples) || 0,
    }),
  )
}

export const isLeaderRole = (role: string) => /^l[ií]der/i.test(role.trim())

export async function setStaffPhoto(userId: string, path: string | null) {
  const { error } = await supabase.rpc("set_staff_photo", { target: userId, path })
  if (error) throw new Error(error.message || "No pudimos guardar la foto.")
  notifyChange("staff")
}

/* ---------------------------------------------------------------- */
/* Photos (private "fotos" bucket)                                   */
/* ---------------------------------------------------------------- */

/** Square-ish, light JPEG: enough for avatars and profiles. */
export async function preparePhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Elige una imagen (JPG o PNG).")
  if (file.size > 15 * 1024 * 1024) throw new Error("La foto es muy pesada (máximo 15 MB).")
  return compressImage(file, 720, 0.84)
}

export async function uploadPhoto(blob: Blob, folder: "personas" | "equipo") {
  const path = `${folder}/${crypto.randomUUID?.() ?? Date.now()}.jpg`
  const { error } = await supabase.storage.from("fotos").upload(path, blob, { contentType: "image/jpeg", upsert: false })
  if (error) throw new Error("No pudimos subir la foto.")
  return path
}

export async function removePhoto(path: string | null) {
  if (path) await supabase.storage.from("fotos").remove([path])
}

/** Data URL for the public forms (the API stores it with the service role). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

const photoCache = new Map<string, { url: string; until: number }>()

export async function photoUrls(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const now = Date.now()
  const wanted = [...new Set(paths.filter((p): p is string => Boolean(p)))]
  const missing = wanted.filter((p) => (photoCache.get(p)?.until ?? 0) <= now)
  if (missing.length) {
    const { data } = await supabase.storage.from("fotos").createSignedUrls(missing, 60 * 60)
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) photoCache.set(item.path, { url: item.signedUrl, until: now + 50 * 60 * 1000 })
    }
  }
  const out: Record<string, string> = {}
  for (const p of wanted) {
    const hit = photoCache.get(p)
    if (hit) out[p] = hit.url
  }
  return out
}

/* ---------------------------------------------------------------- */
/* Public side: a leader's personal link (#/inscripcion/<code>)      */
/* ---------------------------------------------------------------- */

export function discipleLink(code: string) {
  return `${window.location.origin}/#/inscripcion/${code}`
}

async function callApi<T>(payload: Record<string, unknown>, fallback: string): Promise<T> {
  const res = await fetch("/api/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || fallback)
  return body as T
}

export type LeaderPreview = { leaderName: string; welcome: string }

export const readLeaderLink = (code: string) =>
  callApi<LeaderPreview>({ action: "unirse-ver", code }, "Este enlace no es válido.")

export const joinLeader = (data: Record<string, string>) =>
  callApi<{ ok: true; pending: boolean }>({ action: "unirse", ...data }, "No pudimos enviar tu inscripción. Inténtalo de nuevo.")
