/**
 * Announcements shown as a popup when the public site opens, stored in
 * Supabase (`announcements`, supabase/schema.sql). Everyone reads the active
 * ones; signed-in staff manage them. Images live in the "anuncios" bucket.
 */

import { deleteFile } from "./files"
import { notifyChange, onTableChange, supabase } from "./supabase"

export type CtaType = "inscripcion" | "enlace" | "ninguno"

export type Announcement = {
  id: string
  kicker: string
  title: string
  description: string
  imageId: string | null
  eventDate: string
  eventTime: string
  location: string
  ctaType: CtaType
  ctaLabel: string
  ctaUrl: string
  requiresPayment: boolean
  price: string
  paymentInfo: string
  active: boolean
  showFrom: string
  showUntil: string
  createdAt: string
  updatedAt: string
}

export type AnnouncementDraft = Omit<Announcement, "id" | "createdAt" | "updatedAt">

export const emptyAnnouncement: AnnouncementDraft = {
  kicker: "Próximo evento",
  title: "",
  description: "",
  imageId: null,
  eventDate: "",
  eventTime: "",
  location: "",
  ctaType: "inscripcion",
  ctaLabel: "Inscríbete aquí",
  ctaUrl: "",
  requiresPayment: false,
  price: "",
  paymentInfo: "",
  active: true,
  showFrom: "",
  showUntil: "",
}

type Row = {
  id: string
  kicker: string
  title: string
  description: string
  image_path: string | null
  event_date: string | null
  event_time: string
  location: string
  cta_type: CtaType
  cta_label: string
  cta_url: string
  requires_payment: boolean
  price: string
  payment_info: string
  active: boolean
  show_from: string | null
  show_until: string | null
  created_at: string
  updated_at: string
}

const fromRow = (r: Row): Announcement => ({
  id: r.id,
  kicker: r.kicker,
  title: r.title,
  description: r.description,
  imageId: r.image_path,
  eventDate: r.event_date ?? "",
  eventTime: r.event_time,
  location: r.location,
  ctaType: r.cta_type,
  ctaLabel: r.cta_label,
  ctaUrl: r.cta_url,
  requiresPayment: r.requires_payment,
  price: r.price,
  paymentInfo: r.payment_info,
  active: r.active,
  showFrom: r.show_from ?? "",
  showUntil: r.show_until ?? "",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const toRow = (d: AnnouncementDraft) => ({
  kicker: d.kicker,
  title: d.title,
  description: d.description,
  image_path: d.imageId,
  event_date: d.eventDate || null,
  event_time: d.eventTime,
  location: d.location,
  cta_type: d.ctaType,
  cta_label: d.ctaLabel,
  cta_url: d.ctaUrl,
  requires_payment: d.requiresPayment,
  price: d.price,
  payment_info: d.paymentInfo,
  active: d.active,
  show_from: d.showFrom || null,
  show_until: d.showUntil || null,
})

/** Staff get every announcement; visitors only the active ones (RLS). */
export async function listAnnouncements() {
  const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data as Row[]).map(fromRow)
}

export async function getAnnouncement(id: string) {
  const { data } = await supabase.from("announcements").select("*").eq("id", id).maybeSingle()
  return data ? fromRow(data as Row) : null
}

export async function saveAnnouncement(draft: AnnouncementDraft, id?: string) {
  const row = { ...toRow(draft), updated_at: new Date().toISOString() }
  if (id) {
    const { error } = await supabase.from("announcements").update(row).eq("id", id)
    if (error) throw error
    notifyChange("announcements")
    return id
  }
  const newId = crypto.randomUUID?.() ?? String(Date.now())
  const { error } = await supabase.from("announcements").insert({ ...row, id: newId })
  if (error) throw error
  notifyChange("announcements")
  return newId
}

export async function setAnnouncementActive(id: string, active: boolean) {
  const { error } = await supabase.from("announcements").update({ active, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) throw error
  notifyChange("announcements")
}

export async function deleteAnnouncement(id: string) {
  const item = await getAnnouncement(id)
  if (item?.imageId) await deleteFile(item.imageId).catch(() => undefined)
  const { error } = await supabase.from("announcements").delete().eq("id", id)
  if (error) throw error
  notifyChange("announcements")
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Announcements that should be visible on the public site today. */
export async function activeAnnouncements() {
  const today = todayKey()
  return (await listAnnouncements()).filter(
    (a) =>
      a.active &&
      a.title.trim() &&
      (!a.showFrom || a.showFrom <= today) &&
      (!a.showUntil || a.showUntil >= today),
  )
}

export function onAnnouncementsChange(callback: () => void) {
  return onTableChange("announcements", callback)
}

export function formatEventDate(date: string, time: string) {
  if (!date) return ""
  const [y, m, d] = date.split("-").map(Number)
  const label = new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  return time ? `${label} · ${time}` : label
}
