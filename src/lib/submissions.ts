/**
 * Requests sent from the public site (prayer, visit invitations, usher signups,
 * event inscriptions), stored in Supabase (`submissions`, supabase/schema.sql).
 * Visitors can only insert; signed-in staff read and manage them.
 */
import { notifyChange, onTableChange, supabase } from "./supabase"

export const BACKEND_CONNECTED = true

export type SubmissionKind = "oracion" | "visita" | "ujier" | "inscripcion"
export type SubmissionStatus = "nueva" | "en_proceso" | "atendida"

export type PrayerData = {
  name: string
  contact: string
  request: string
  wantsCall: boolean
}

export type VisitData = {
  name: string
  phone: string
  service: string
  company: string
  message: string
}

export type UsherData = {
  name: string
  phone: string
  email: string
  availability: string
  attends: string
  notes: string
}

export type InscriptionData = {
  announcementId: string
  eventTitle: string
  name: string
  phone: string
  email: string
  attendees: string
  notes: string
  proofFileId: string | null
  proofName: string
}

type DataByKind = {
  oracion: PrayerData
  visita: VisitData
  ujier: UsherData
  inscripcion: InscriptionData
}

export type Submission<K extends SubmissionKind = SubmissionKind> = {
  id: string
  kind: K
  status: SubmissionStatus
  createdAt: string
  data: DataByKind[K]
}

type Row = { id: string; kind: SubmissionKind; status: SubmissionStatus; created_at: string; data: unknown }

const fromRow = (r: Row) => ({ id: r.id, kind: r.kind, status: r.status, createdAt: r.created_at, data: r.data }) as Submission

export async function saveSubmission<K extends SubmissionKind>(kind: K, data: DataByKind[K]) {
  const item: Submission<K> = {
    id: crypto.randomUUID?.() ?? String(Date.now()),
    kind,
    status: "nueva",
    createdAt: new Date().toISOString(),
    data,
  }
  // No .select(): visitors may insert but never read rows back.
  const { error } = await supabase.from("submissions").insert({ id: item.id, kind, status: "nueva", data })
  if (error) throw error
  notifyChange("submissions")
  return item
}

export async function listSubmissions<K extends SubmissionKind>(kind?: K) {
  let query = supabase.from("submissions").select("*").order("created_at", { ascending: false })
  if (kind) query = query.eq("kind", kind)
  const { data, error } = await query
  if (error) throw error
  return (data as Row[]).map(fromRow) as Submission<K>[]
}

export async function updateSubmission(id: string, status: SubmissionStatus) {
  const { error } = await supabase.from("submissions").update({ status }).eq("id", id)
  if (error) throw error
  notifyChange("submissions")
}

export async function deleteSubmission(id: string) {
  const { data } = await supabase.from("submissions").select("kind, data").eq("id", id).maybeSingle()
  const fileId = data?.kind === "inscripcion" ? (data.data as InscriptionData).proofFileId : null
  if (fileId) await import("./files").then((f) => f.deleteFile(fileId)).catch(() => undefined)
  const { error } = await supabase.from("submissions").delete().eq("id", id)
  if (error) throw error
  notifyChange("submissions")
}

/** Subscribe to changes (any device, via Supabase Realtime). Returns an unsubscribe function. */
export function onSubmissionsChange(callback: () => void) {
  return onTableChange("submissions", callback)
}
