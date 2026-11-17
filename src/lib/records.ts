/**
 * Fase 4 data: payments, expenses, documents, certificates, reports and audit
 * (supabase/finanzas.sql). Permissions are enforced by RLS.
 */
import { compressImage } from "./files"
import { notifyChange, onTableChange, supabase } from "./supabase"

export const money = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0)

export const todayIso = () => new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10)

/* ---------------------------------------------------------------- */
/* Files in the private "soportes" bucket                            */
/* ---------------------------------------------------------------- */

export type SupportFolder = "pagos" | "gastos" | "documentos"

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
}

export const ACCEPTED_FILES = Object.keys(EXT).join(",")

export async function uploadSupport(file: File, folder: SupportFolder) {
  if (!EXT[file.type]) throw new Error("Ese tipo de archivo no se puede subir. Usa PDF, foto, Word o Excel.")
  const blob = file.type.startsWith("image/") ? await compressImage(file, 1800, 0.84) : file
  if (blob.size > 10 * 1024 * 1024) throw new Error("El archivo pesa más de 10 MB.")
  const type = blob.type || file.type
  const path = `${folder}/${crypto.randomUUID?.() ?? Date.now()}.${EXT[type] ?? "bin"}`
  const { error } = await supabase.storage.from("soportes").upload(path, blob, { contentType: type, upsert: false })
  if (error) throw new Error("No pudimos subir el archivo.")
  return { path, type, size: blob.size }
}

export async function supportUrl(path: string, download?: string) {
  const { data } = await supabase.storage.from("soportes").createSignedUrl(path, 60 * 10, download ? { download } : undefined)
  return data?.signedUrl ?? null
}

export async function removeSupport(path: string | null | undefined) {
  if (path) await supabase.storage.from("soportes").remove([path])
}

export async function openSupport(path: string) {
  const url = await supportUrl(path)
  if (url) window.open(url, "_blank", "noopener")
}

/* ---------------------------------------------------------------- */
/* Payments and expenses                                              */
/* ---------------------------------------------------------------- */

export const PAYMENT_CONCEPTS = ["Ofrenda", "Diezmo", "Programa", "Encuentro", "Evento", "Donación", "Otro"] as const
export const EXPENSE_CATEGORIES = ["Alimentación", "Transporte", "Lugar / arriendo", "Servicios públicos", "Materiales", "Sonido y medios", "Ayuda social", "Mantenimiento", "Honorarios", "Otros"] as const

export type Payment = {
  id: string
  personId: string | null
  payerName: string
  concept: string
  program: string
  amount: number
  method: string
  paidAt: string
  reference: string
  notes: string
  receiptPath: string | null
  createdAt: string
}

export type Expense = {
  id: string
  concept: string
  category: string
  program: string
  amount: number
  provider: string
  method: string
  paidAt: string
  notes: string
  supportPath: string | null
  createdAt: string
}

type PaymentRow = {
  id: string
  person_id: string | null
  payer_name: string
  concept: string
  program: string
  amount: number
  method: string
  paid_at: string
  reference: string
  notes: string
  receipt_path: string | null
  created_at: string
}

type ExpenseRow = {
  id: string
  concept: string
  category: string
  program: string
  amount: number
  provider: string
  method: string
  paid_at: string
  notes: string
  support_path: string | null
  created_at: string
}

const toPayment = (r: PaymentRow): Payment => ({
  id: r.id,
  personId: r.person_id,
  payerName: r.payer_name,
  concept: r.concept,
  program: r.program,
  amount: Number(r.amount),
  method: r.method,
  paidAt: r.paid_at,
  reference: r.reference,
  notes: r.notes,
  receiptPath: r.receipt_path,
  createdAt: r.created_at,
})

const toExpense = (r: ExpenseRow): Expense => ({
  id: r.id,
  concept: r.concept,
  category: r.category,
  program: r.program,
  amount: Number(r.amount),
  provider: r.provider,
  method: r.method,
  paidAt: r.paid_at,
  notes: r.notes,
  supportPath: r.support_path,
  createdAt: r.created_at,
})

const denied = (e: { code?: string } | null, fallback: string) =>
  new Error(e?.code === "42501" ? "No tienes permiso para hacer esto." : fallback)

export async function listPayments(): Promise<Payment[]> {
  const { data, error } = await supabase.from("payments").select("*").order("paid_at", { ascending: false }).order("created_at", { ascending: false })
  if (error) throw error
  return (data as PaymentRow[]).map(toPayment)
}

export type PaymentInput = Omit<Payment, "id" | "createdAt">

export async function savePayment(p: PaymentInput, id?: string) {
  if (!(p.amount > 0)) throw new Error("Escribe un valor mayor a cero.")
  if (!p.personId && !p.payerName.trim()) throw new Error("Escribe quién hizo el pago o elige una persona.")
  const row = {
    person_id: p.personId || null,
    payer_name: p.payerName.trim(),
    concept: p.concept,
    program: p.program,
    amount: Math.round(p.amount),
    method: p.method,
    paid_at: p.paidAt,
    reference: p.reference.trim(),
    notes: p.notes.trim(),
    receipt_path: p.receiptPath,
  }
  const { error } = id ? await supabase.from("payments").update(row).eq("id", id) : await supabase.from("payments").insert(row)
  if (error) throw denied(error, "No pudimos guardar el pago.")
  notifyChange("payments")
}

export async function deletePayment(p: Payment) {
  const { error } = await supabase.from("payments").delete().eq("id", p.id)
  if (error) throw denied(error, "No pudimos eliminar el pago.")
  await removeSupport(p.receiptPath)
  notifyChange("payments")
}

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase.from("expenses").select("*").order("paid_at", { ascending: false }).order("created_at", { ascending: false })
  if (error) throw error
  return (data as ExpenseRow[]).map(toExpense)
}

export type ExpenseInput = Omit<Expense, "id" | "createdAt">

export async function saveExpense(e: ExpenseInput, id?: string) {
  if (!(e.amount > 0)) throw new Error("Escribe un valor mayor a cero.")
  if (!e.concept.trim()) throw new Error("Escribe el concepto del gasto.")
  const row = {
    concept: e.concept.trim(),
    category: e.category,
    program: e.program,
    amount: Math.round(e.amount),
    provider: e.provider.trim(),
    method: e.method,
    paid_at: e.paidAt,
    notes: e.notes.trim(),
    support_path: e.supportPath,
  }
  const { error } = id ? await supabase.from("expenses").update(row).eq("id", id) : await supabase.from("expenses").insert(row)
  if (error) throw denied(error, "No pudimos guardar el gasto.")
  notifyChange("expenses")
}

export async function deleteExpense(e: Expense) {
  const { error } = await supabase.from("expenses").delete().eq("id", e.id)
  if (error) throw denied(error, "No pudimos eliminar el gasto.")
  await removeSupport(e.supportPath)
  notifyChange("expenses")
}

export const onPaymentsChange = (cb: () => void) => onTableChange("payments", cb)
export const onExpensesChange = (cb: () => void) => onTableChange("expenses", cb)

/* ---------------------------------------------------------------- */
/* Documents                                                          */
/* ---------------------------------------------------------------- */

export const DOCUMENT_CATEGORIES = ["General", "Persona", "Legal", "Finanzas", "Encuentros", "Formación", "Actas"] as const

export type Doc = {
  id: string
  title: string
  category: string
  personId: string | null
  filePath: string | null
  fileType: string
  fileSize: number
  body: string | null
  notes: string
  createdAt: string
}

type DocRow = {
  id: string
  title: string
  category: string
  person_id: string | null
  file_path: string | null
  file_type: string
  file_size: number
  body: string | null
  notes: string
  created_at: string
}

const toDoc = (r: DocRow): Doc => ({
  id: r.id,
  title: r.title,
  category: r.category,
  personId: r.person_id,
  filePath: r.file_path,
  fileType: r.file_type,
  fileSize: Number(r.file_size),
  body: r.body,
  notes: r.notes,
  createdAt: r.created_at,
})

export async function listDocuments(): Promise<Doc[]> {
  const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data as DocRow[]).map(toDoc)
}

export async function saveDocument(d: Omit<Doc, "id" | "createdAt">, id?: string) {
  if (!d.title.trim()) throw new Error("Escribe el nombre del documento.")
  const row = {
    title: d.title.trim(),
    category: d.category,
    person_id: d.personId || null,
    file_path: d.filePath,
    file_type: d.fileType,
    file_size: d.fileSize,
    body: d.body,
    notes: d.notes.trim(),
  }
  const { error } = id ? await supabase.from("documents").update(row).eq("id", id) : await supabase.from("documents").insert(row)
  if (error) throw denied(error, "No pudimos guardar el documento.")
  notifyChange("documents")
}

export async function deleteDocument(d: Doc) {
  const { error } = await supabase.from("documents").delete().eq("id", d.id)
  if (error) throw denied(error, "No pudimos eliminar el documento.")
  await removeSupport(d.filePath)
  notifyChange("documents")
}

export const onDocumentsChange = (cb: () => void) => onTableChange("documents", cb)

/* ---------------------------------------------------------------- */
/* Certificates                                                       */
/* ---------------------------------------------------------------- */

export type Certificate = {
  id: string
  number: string
  personId: string | null
  personName: string
  personDoc: string
  program: string
  templateId: string
  title: string
  issuedAt: string
  createdAt: string
}

type CertRow = {
  id: string
  number: string
  person_id: string | null
  person_name: string
  person_doc: string
  program: string
  template_id: string
  title: string
  issued_at: string
  created_at: string
}

const toCert = (r: CertRow): Certificate => ({
  id: r.id,
  number: r.number,
  personId: r.person_id,
  personName: r.person_name,
  personDoc: r.person_doc,
  program: r.program,
  templateId: r.template_id,
  title: r.title,
  issuedAt: r.issued_at,
  createdAt: r.created_at,
})

export async function listCertificates(): Promise<Certificate[]> {
  const { data, error } = await supabase.from("certificates").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data as CertRow[]).map(toCert)
}

export async function issueCertificates(items: Omit<Certificate, "id" | "number" | "createdAt">[]): Promise<Certificate[]> {
  const rows = items.map((c) => ({
    person_id: c.personId,
    person_name: c.personName,
    person_doc: c.personDoc,
    program: c.program,
    template_id: c.templateId,
    title: c.title,
    issued_at: c.issuedAt,
  }))
  const { data, error } = await supabase.from("certificates").insert(rows).select("*")
  if (error) throw denied(error, "No pudimos emitir los certificados.")
  notifyChange("certificates")
  return (data as CertRow[]).map(toCert)
}

export async function deleteCertificate(id: string) {
  const { error } = await supabase.from("certificates").delete().eq("id", id)
  if (error) throw denied(error, "No pudimos anular el certificado.")
  notifyChange("certificates")
}

export const onCertificatesChange = (cb: () => void) => onTableChange("certificates", cb)

/* ---------------------------------------------------------------- */
/* Reports and audit                                                  */
/* ---------------------------------------------------------------- */

export type ReportSummary = {
  income_by_month: Record<string, number>
  expense_by_month: Record<string, number>
  income_by_concept: Record<string, number>
  expense_by_category: Record<string, number>
  people_by_program: Record<string, number>
  new_people_by_month: Record<string, number>
  people_active: number
  people_total: number
  leaders: number
  certificates: number
  payments_count: number
  expenses_count: number
}

export async function reportSummary(year: number): Promise<ReportSummary> {
  const { data, error } = await supabase.rpc("report_summary", { year })
  if (error) throw error
  return data as ReportSummary
}

export type AuditEntry = { id: number; at: string; userName: string; action: string; module: string; record: string; detail: string }

export async function listAudit(limit = 500): Promise<AuditEntry[]> {
  const { data, error } = await supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(limit)
  if (error) throw error
  return (data as { id: number; at: string; user_name: string; action: string; module: string; record: string; detail: string }[]).map((r) => ({
    id: r.id,
    at: r.at,
    userName: r.user_name,
    action: r.action,
    module: r.module,
    record: r.record,
    detail: r.detail,
  }))
}

export const onAuditChange = (cb: () => void) => {
  const offs = ["people", "payments", "expenses", "documents", "certificates", "staff", "invitations", "settings"].map((t) => onTableChange(t, cb))
  return () => offs.forEach((off) => off())
}

/* ---------------------------------------------------------------- */
/* Templates: {{placeholders}} filled with a person's data           */
/* ---------------------------------------------------------------- */

export const PLACEHOLDERS: [string, string][] = [
  ["nombre", "Nombre completo"],
  ["tipo_documento", "Tipo de documento"],
  ["documento", "Número de documento"],
  ["telefono", "Teléfono"],
  ["correo", "Correo"],
  ["direccion", "Dirección"],
  ["programa", "Proceso / programa"],
  ["etapa", "Etapa"],
  ["lider", "Líder"],
  ["fecha", "Fecha de hoy"],
  ["iglesia", "Nombre de la iglesia"],
  ["nit", "NIT de la iglesia"],
  ["direccion_iglesia", "Dirección de la iglesia"],
]

export function fillTemplate(text: string, values: Record<string, string>) {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => values[key] ?? "")
}

export const longDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
