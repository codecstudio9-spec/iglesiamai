/**
 * Fase 4: Pagos, Gastos, Documentos, Certificados, Reportes and Auditoría
 * with real data (src/lib/records.ts, supabase/finanzas.sql).
 * Receipts, documents and certificates print from the browser ("Guardar como PDF").
 */
import { FormEvent, useContext, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AIcon, PageHeader, PanelTitle, StatusPill } from "./AdminApp"
import { MyAccess } from "./AdminUsers"
import { formatDate, useLiveData } from "./AdminPeople"
import { listPeople, listTeam, onPeopleChange, type Person } from "./lib/people"
import {
  ACCEPTED_FILES,
  deleteCertificate,
  deleteDocument,
  deleteExpense,
  deletePayment,
  DOCUMENT_CATEGORIES,
  EXPENSE_CATEGORIES,
  fillTemplate,
  issueCertificates,
  listAudit,
  listCertificates,
  listDocuments,
  listExpenses,
  listPayments,
  longDate,
  money,
  onAuditChange,
  onCertificatesChange,
  onDocumentsChange,
  onExpensesChange,
  onPaymentsChange,
  openSupport,
  PAYMENT_CONCEPTS,
  removeSupport,
  reportSummary,
  saveDocument,
  saveExpense,
  savePayment,
  todayIso,
  uploadSupport,
  type Certificate,
  type Doc,
  type Expense,
  type ExpenseInput,
  type Payment,
  type PaymentInput,
  type SupportFolder,
} from "./lib/records"
import { SettingsContext, type CertTemplate, type DocTemplate, type Settings } from "./lib/settings"
import { can, onStaffChange } from "./lib/staff"

/* ---------------------------------------------------------------- */
/* Shared pieces                                                      */
/* ---------------------------------------------------------------- */

// Stable loaders (useLiveData reloads when the loader function changes).
const noPayments = async () => [] as Payment[]
const noCertificates = async () => [] as Certificate[]
const loadAudit = () => listAudit()

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n")
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }))
  a.download = filename
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

function usePeopleMap() {
  const people = useLiveData(listPeople, [onPeopleChange])
  const map = useMemo(() => Object.fromEntries((people.data ?? []).map((p) => [p.id, p])), [people.data])
  return { list: people.data ?? [], map }
}

function Modal({ kicker, title, close, children, wide }: { kicker: string; title: string; close: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="modal-layer">
      <button className="modal-scrim" onClick={close} aria-label="Cerrar" />
      <section className={`invite-modal ${wide ? "person-modal" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div>
            <span>{kicker}</span>
            <h2>{title}</h2>
          </div>
          <button onClick={close} aria-label="Cerrar">
            <AIcon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

/** Searchable person selector (only shows people the user may read). */
function PersonPicker({ people, value, onChange, placeholder = "Buscar persona..." }: { people: Person[]; value: string | null; onChange: (p: Person | null) => void; placeholder?: string }) {
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)
  const selected = people.find((p) => p.id === value)
  const matches = people
    .filter((p) => p.status !== "rechazado")
    .filter((p) => !q.trim() || `${p.fullName} ${p.docNumber} ${p.phone}`.toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 8)
  if (selected)
    return (
      <div className="picker-selected">
        <span>
          <strong>{selected.fullName}</strong>
          <small>{selected.docNumber ? `${selected.docType} ${selected.docNumber}` : selected.phone}</small>
        </span>
        <button type="button" onClick={() => onChange(null)}>
          Cambiar
        </button>
      </div>
    )
  return (
    <div className="picker">
      <input value={q} onChange={(e) => (setQ(e.target.value), setOpen(true))} onFocus={() => setOpen(true)} placeholder={placeholder} />
      {open && (
        <div className="picker-list">
          {matches.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => {
                onChange(p)
                setOpen(false)
                setQ("")
              }}
            >
              <strong>{p.fullName}</strong>
              <small>{p.docNumber || p.phone || ""}</small>
            </button>
          ))}
          {matches.length === 0 && <p>No hay coincidencias.</p>}
        </div>
      )}
    </div>
  )
}

function FileField({ folder, current, onChange, label }: { folder: SupportFolder; current: string | null; onChange: (file: { path: string; type: string; size: number } | null) => void; label: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [name, setName] = useState("")
  async function pick(file?: File) {
    if (!file) return
    setBusy(true)
    setError("")
    try {
      const up = await uploadSupport(file, folder)
      setName(file.name)
      onChange(up)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="file-field field-full">
      <span>{label}</span>
      {current ? (
        <div className="file-chip">
          <AIcon name="file" />
          <button type="button" onClick={() => openSupport(current)}>
            {name || "Ver archivo"}
          </button>
          <button type="button" className="file-remove" onClick={() => (setName(""), onChange(null))}>
            Quitar
          </button>
        </div>
      ) : (
        <label className="file-drop">
          <AIcon name="upload" />
          {busy ? "Subiendo..." : "Subir foto o PDF (desde el celular también)"}
          <input type="file" accept={ACCEPTED_FILES} hidden onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      )}
      {error && <small className="field-error">{error}</small>}
    </div>
  )
}

/** Shows the A4-landscape certificate scaled to the available width. */
function CertScale({ children, small }: { children: React.ReactNode; small?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1123))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className={`cert-scale ${small ? "cert-scale-small" : ""}`} style={{ "--s": scale } as React.CSSProperties}>
      {children}
    </div>
  )
}

/** Renders children into a print-only layer and opens the print dialog. */
function PrintLayer({ children, onDone }: { children: React.ReactNode; onDone: () => void }) {
  useEffect(() => {
    document.body.classList.add("is-printing")
    const after = () => onDone()
    window.addEventListener("afterprint", after)
    const id = window.setTimeout(() => window.print(), 250)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener("afterprint", after)
      document.body.classList.remove("is-printing")
    }
  }, [onDone])
  return createPortal(<div className="print-root">{children}</div>, document.body)
}

function PrintHeader({ church }: { church: Settings["iglesia"] }) {
  return (
    <header className="print-head">
      <img src="/logo-mai.png" alt="" />
      <div>
        <strong>{church.name}</strong>
        <span>
          NIT {church.nit} · {church.address} · {church.area}
        </span>
      </div>
    </header>
  )
}

function personValues(p: Person | undefined, settings: Settings, leaderName = "") {
  const program = settings.programas.find((x) => x.id === p?.program)
  const docTypes: Record<string, string> = { CC: "cédula de ciudadanía", CE: "cédula de extranjería", TI: "tarjeta de identidad", PA: "pasaporte", RC: "registro civil" }
  return {
    nombre: p?.fullName ?? "",
    tipo_documento: docTypes[p?.docType ?? "CC"] ?? p?.docType ?? "",
    documento: p?.docNumber ?? "",
    telefono: p?.phone ?? "",
    correo: p?.email ?? "",
    direccion: p?.address ?? "",
    programa: program?.name ?? "",
    etapa: p?.programStep ?? "",
    lider: leaderName,
    fecha: longDate(todayIso()),
    iglesia: settings.iglesia.name,
    nit: settings.iglesia.nit,
    direccion_iglesia: `${settings.iglesia.address}, ${settings.iglesia.area}`,
  }
}

/* ---------------------------------------------------------------- */
/* Pagos                                                              */
/* ---------------------------------------------------------------- */

const emptyPayment = (settings: Settings, patch: Partial<PaymentInput> = {}): PaymentInput => ({
  personId: null,
  payerName: "",
  concept: "Ofrenda",
  program: "",
  amount: 0,
  method: settings.metodos_pago.find((m) => m.active)?.name ?? "Efectivo",
  paidAt: todayIso(),
  reference: "",
  notes: "",
  receiptPath: null,
  ...patch,
})

export function PaymentModal({ payment, defaults, close }: { payment?: Payment; defaults?: Partial<PaymentInput>; close: () => void }) {
  const settings = useContext(SettingsContext)
  const { list } = usePeopleMap()
  const [form, setForm] = useState<PaymentInput>(() => (payment ? { ...payment } : emptyPayment(settings, defaults)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const set = <K extends keyof PaymentInput>(k: K, v: PaymentInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const methods = [...settings.metodos_pago.filter((m) => m.active).map((m) => m.name), "Efectivo", "Datáfono", "Otro"]

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await savePayment(form, payment?.id)
      if (payment?.receiptPath && payment.receiptPath !== form.receiptPath) await removeSupport(payment.receiptPath)
      close()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal kicker="Pagos" title={payment ? "Editar pago" : "Registrar pago"} close={close} wide>
      <form onSubmit={submit}>
        <div className="invite-fields">
          <label className="field-full">
            Persona
            <PersonPicker
              people={list}
              value={form.personId}
              onChange={(p) => setForm((f) => ({ ...f, personId: p?.id ?? null, payerName: p?.fullName ?? f.payerName, program: f.program || p?.program || "" }))}
              placeholder="Buscar en Personas (opcional)"
            />
          </label>
          {!form.personId && (
            <label className="field-full">
              Nombre de quien paga
              <input value={form.payerName} onChange={(e) => set("payerName", e.target.value)} placeholder="Si no está en Personas o es anónimo" />
            </label>
          )}
          <label>
            Valor (COP)
            <input required type="number" min={1} step={1} inputMode="numeric" value={form.amount || ""} onChange={(e) => set("amount", Number(e.target.value))} placeholder="50000" />
          </label>
          <label>
            Fecha
            <input required type="date" value={form.paidAt} onChange={(e) => set("paidAt", e.target.value)} />
          </label>
          <label>
            Concepto
            <select value={form.concept} onChange={(e) => set("concept", e.target.value)}>
              {PAYMENT_CONCEPTS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Programa
            <select value={form.program} onChange={(e) => set("program", e.target.value)}>
              <option value="">Ninguno</option>
              {settings.programas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Medio de pago
            <select value={form.method} onChange={(e) => set("method", e.target.value)}>
              {[...new Set([form.method, ...methods])].filter(Boolean).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            Referencia
            <input value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="N.º de transacción (opcional)" />
          </label>
          <FileField folder="pagos" label="Comprobante" current={form.receiptPath} onChange={(f) => set("receiptPath", f?.path ?? null)} />
          <label className="field-full">
            Observaciones
            <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </label>
        </div>
        {error && <p className="users-error">{error}</p>}
        <button className="modal-primary" type="submit" disabled={saving}>
          {saving ? "Guardando..." : payment ? "Guardar cambios" : "Registrar pago"} <AIcon name="check" />
        </button>
      </form>
    </Modal>
  )
}

export function ReceiptSheet({ payment, person, settings }: { payment: Payment; person?: Person; settings: Settings }) {
  const program = settings.programas.find((p) => p.id === payment.program)
  return (
    <article className="print-page receipt-sheet">
      <PrintHeader church={settings.iglesia} />
      <h1>Recibo de pago</h1>
      <p className="receipt-number">N.º {payment.id.slice(0, 8).toUpperCase()}</p>
      <dl>
        <div>
          <dt>Recibimos de</dt>
          <dd>{person?.fullName ?? payment.payerName}</dd>
        </div>
        {person?.docNumber && (
          <div>
            <dt>Documento</dt>
            <dd>
              {person.docType} {person.docNumber}
            </dd>
          </div>
        )}
        <div>
          <dt>La suma de</dt>
          <dd className="receipt-amount">{money(payment.amount)}</dd>
        </div>
        <div>
          <dt>Por concepto de</dt>
          <dd>
            {payment.concept}
            {program ? ` · ${program.name}` : ""}
          </dd>
        </div>
        <div>
          <dt>Medio de pago</dt>
          <dd>
            {payment.method}
            {payment.reference ? ` · Ref. ${payment.reference}` : ""}
          </dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{longDate(payment.paidAt)}</dd>
        </div>
      </dl>
      {payment.notes && <p className="receipt-notes">{payment.notes}</p>}
      <div className="print-sign">
        <span />
        <p>Recibido por · {settings.iglesia.name}</p>
      </div>
    </article>
  )
}

export function PaymentsPage() {
  const settings = useContext(SettingsContext)
  const payments = useLiveData(listPayments, [onPaymentsChange])
  const { map } = usePeopleMap()
  const [editing, setEditing] = useState<Payment | "new" | null>(null)
  const [printing, setPrinting] = useState<Payment | null>(null)
  const [query, setQuery] = useState("")
  const [concept, setConcept] = useState("")
  const [month, setMonth] = useState(todayIso().slice(0, 7))
  const [confirm, setConfirm] = useState<string | null>(null)
  const [error, setError] = useState("")
  const all = payments.data ?? []
  const shown = all.filter(
    (p) =>
      (!month || p.paidAt.startsWith(month)) &&
      (!concept || p.concept === concept) &&
      (!query.trim() || `${map[p.personId ?? ""]?.fullName ?? ""} ${p.payerName} ${p.reference} ${p.notes}`.toLowerCase().includes(query.trim().toLowerCase())),
  )
  const total = shown.reduce((n, p) => n + p.amount, 0)
  const thisMonth = all.filter((p) => p.paidAt.startsWith(todayIso().slice(0, 7))).reduce((n, p) => n + p.amount, 0)
  const thisYear = all.filter((p) => p.paidAt.startsWith(todayIso().slice(0, 4))).reduce((n, p) => n + p.amount, 0)
  const programName = (id: string) => settings.programas.find((x) => x.id === id)?.name ?? ""

  function exportCsv() {
    downloadCsv(`pagos-mai-${month || "todos"}.csv`, [
      ["Fecha", "Persona", "Concepto", "Programa", "Valor", "Medio", "Referencia", "Observaciones"],
      ...shown.map((p) => [p.paidAt, map[p.personId ?? ""]?.fullName ?? p.payerName, p.concept, programName(p.program), p.amount, p.method, p.reference, p.notes]),
    ])
  }

  return (
    <>
      <PageHeader eyebrow="Finanzas" title="Pagos" copy="Ofrendas, diezmos y pagos de programas, con su comprobante." primary="Registrar pago" onPrimary={() => setEditing("new")} onExport={shown.length ? exportCsv : undefined} />
      <div className="module-stats">
        <div>
          <span>Este mes</span>
          <strong>{payments.data ? money(thisMonth) : "—"}</strong>
          <small>Ingresos registrados</small>
        </div>
        <div>
          <span>Este año</span>
          <strong>{payments.data ? money(thisYear) : "—"}</strong>
          <small>{all.filter((p) => p.paidAt.startsWith(todayIso().slice(0, 4))).length} pagos</small>
        </div>
        <div>
          <span>Filtro actual</span>
          <strong>{payments.data ? money(total) : "—"}</strong>
          <small>{shown.length} pagos</small>
        </div>
        <div>
          <span>Sin comprobante</span>
          <strong>{payments.data ? shown.filter((p) => !p.receiptPath).length : "—"}</strong>
          <small>En el filtro actual</small>
        </div>
      </div>
      {error && <p className="users-error">{error}</p>}
      <section className="panel table-panel">
        <div className="table-tools people-tools">
          <div className="admin-search">
            <AIcon name="search" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por persona, referencia o nota..." />
          </div>
          <input type="month" className="month-input" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Mes" />
          <select value={concept} onChange={(e) => setConcept(e.target.value)} aria-label="Concepto">
            <option value="">Todos los conceptos</option>
            {PAYMENT_CONCEPTS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {month && (
            <button className="link-button" onClick={() => setMonth("")}>
              Ver todos los meses
            </button>
          )}
        </div>
        {payments.error && <p className="users-error">No pudimos cargar los pagos.</p>}
        {payments.data && shown.length === 0 ? (
          <div className="users-empty">
            <h2>{all.length ? "No hay pagos con este filtro" : "Aún no hay pagos registrados"}</h2>
            <p>Usa “Registrar pago” para agregar el primero.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Persona</th>
                  <th>Concepto</th>
                  <th>Medio</th>
                  <th>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.paidAt)}</td>
                    <td>
                      <strong>{map[p.personId ?? ""]?.fullName ?? (p.payerName || "Anónimo")}</strong>
                      {p.reference && <small>Ref. {p.reference}</small>}
                    </td>
                    <td>
                      {p.concept}
                      {p.program && <small className="cell-sub">{programName(p.program)}</small>}
                    </td>
                    <td>{p.method}</td>
                    <td>
                      <strong>{money(p.amount)}</strong>
                    </td>
                    <td>
                      <div className="inline-actions">
                        {p.receiptPath && <button onClick={() => openSupport(p.receiptPath!)}>Soporte</button>}
                        <button onClick={() => setPrinting(p)}>Recibo</button>
                        <button onClick={() => setEditing(p)}>Editar</button>
                        {confirm === p.id ? (
                          <button className="danger-text" onClick={() => deletePayment(p).then(() => setConfirm(null)).catch((e) => setError(e.message))}>
                            ¿Eliminar?
                          </button>
                        ) : (
                          <button onClick={() => setConfirm(p.id)}>Eliminar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editing && <PaymentModal payment={editing === "new" ? undefined : editing} close={() => setEditing(null)} />}
      {printing && (
        <PrintLayer onDone={() => setPrinting(null)}>
          <ReceiptSheet payment={printing} person={map[printing.personId ?? ""]} settings={settings} />
        </PrintLayer>
      )}
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Gastos                                                             */
/* ---------------------------------------------------------------- */

function ExpenseModal({ expense, close }: { expense?: Expense; close: () => void }) {
  const settings = useContext(SettingsContext)
  const [form, setForm] = useState<ExpenseInput>(() =>
    expense
      ? { ...expense }
      : { concept: "", category: "Otros", program: "", amount: 0, provider: "", method: settings.metodos_pago.find((m) => m.active)?.name ?? "Efectivo", paidAt: todayIso(), notes: "", supportPath: null },
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const set = <K extends keyof ExpenseInput>(k: K, v: ExpenseInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await saveExpense(form, expense?.id)
      if (expense?.supportPath && expense.supportPath !== form.supportPath) await removeSupport(expense.supportPath)
      close()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal kicker="Gastos" title={expense ? "Editar gasto" : "Registrar gasto"} close={close} wide>
      <form onSubmit={submit}>
        <div className="invite-fields">
          <label className="field-full">
            Concepto
            <input required value={form.concept} onChange={(e) => set("concept", e.target.value)} placeholder="Ej: Almuerzos del encuentro" />
          </label>
          <label>
            Valor (COP)
            <input required type="number" min={1} inputMode="numeric" value={form.amount || ""} onChange={(e) => set("amount", Number(e.target.value))} />
          </label>
          <label>
            Fecha
            <input required type="date" value={form.paidAt} onChange={(e) => set("paidAt", e.target.value)} />
          </label>
          <label>
            Categoría
            <select value={form.category} onChange={(e) => set("category", e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Programa
            <select value={form.program} onChange={(e) => set("program", e.target.value)}>
              <option value="">General de la iglesia</option>
              {settings.programas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Proveedor
            <input value={form.provider} onChange={(e) => set("provider", e.target.value)} placeholder="Opcional" />
          </label>
          <label>
            Medio de pago
            <select value={form.method} onChange={(e) => set("method", e.target.value)}>
              {[...new Set([form.method, ...settings.metodos_pago.filter((m) => m.active).map((m) => m.name), "Efectivo", "Transferencia", "Otro"])].filter(Boolean).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <FileField folder="gastos" label="Soporte (factura o recibo)" current={form.supportPath} onChange={(f) => set("supportPath", f?.path ?? null)} />
          <label className="field-full">
            Observaciones
            <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </label>
        </div>
        {error && <p className="users-error">{error}</p>}
        <button className="modal-primary" type="submit" disabled={saving}>
          {saving ? "Guardando..." : expense ? "Guardar cambios" : "Registrar gasto"} <AIcon name="check" />
        </button>
      </form>
    </Modal>
  )
}

export function ExpensesPage() {
  const settings = useContext(SettingsContext)
  const expenses = useLiveData(listExpenses, [onExpensesChange])
  const [editing, setEditing] = useState<Expense | "new" | null>(null)
  const [month, setMonth] = useState(todayIso().slice(0, 7))
  const [category, setCategory] = useState("")
  const [query, setQuery] = useState("")
  const [confirm, setConfirm] = useState<string | null>(null)
  const [error, setError] = useState("")
  const all = expenses.data ?? []
  const shown = all.filter(
    (e) =>
      (!month || e.paidAt.startsWith(month)) &&
      (!category || e.category === category) &&
      (!query.trim() || `${e.concept} ${e.provider} ${e.notes}`.toLowerCase().includes(query.trim().toLowerCase())),
  )
  const total = shown.reduce((n, e) => n + e.amount, 0)
  const byCategory = EXPENSE_CATEGORIES.map((c) => [c, shown.filter((e) => e.category === c).reduce((n, e) => n + e.amount, 0)] as const).filter(([, v]) => v > 0)
  const programName = (id: string) => settings.programas.find((x) => x.id === id)?.name ?? "General"

  function exportCsv() {
    downloadCsv(`gastos-mai-${month || "todos"}.csv`, [
      ["Fecha", "Concepto", "Categoría", "Programa", "Proveedor", "Medio", "Valor", "Observaciones"],
      ...shown.map((e) => [e.paidAt, e.concept, e.category, programName(e.program), e.provider, e.method, e.amount, e.notes]),
    ])
  }

  return (
    <>
      <PageHeader eyebrow="Finanzas" title="Gastos" copy="Egresos de la iglesia y de cada programa, con su soporte." primary="Registrar gasto" onPrimary={() => setEditing("new")} onExport={shown.length ? exportCsv : undefined} />
      <div className="module-stats">
        <div>
          <span>Total del filtro</span>
          <strong>{expenses.data ? money(total) : "—"}</strong>
          <small>{shown.length} gastos</small>
        </div>
        <div>
          <span>Este año</span>
          <strong>{expenses.data ? money(all.filter((e) => e.paidAt.startsWith(todayIso().slice(0, 4))).reduce((n, e) => n + e.amount, 0)) : "—"}</strong>
          <small>Egresos registrados</small>
        </div>
        <div>
          <span>Mayor categoría</span>
          <strong className="stat-text">{byCategory.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"}</strong>
          <small>{byCategory[0] ? money(byCategory[0][1]) : "Sin gastos"}</small>
        </div>
        <div>
          <span>Sin soporte</span>
          <strong>{expenses.data ? shown.filter((e) => !e.supportPath).length : "—"}</strong>
          <small>Pide la factura o el recibo</small>
        </div>
      </div>
      {error && <p className="users-error">{error}</p>}
      <section className="panel table-panel">
        <div className="table-tools people-tools">
          <div className="admin-search">
            <AIcon name="search" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por concepto o proveedor..." />
          </div>
          <input type="month" className="month-input" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Mes" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {month && (
            <button className="link-button" onClick={() => setMonth("")}>
              Ver todos los meses
            </button>
          )}
        </div>
        {expenses.error && <p className="users-error">No pudimos cargar los gastos.</p>}
        {expenses.data && shown.length === 0 ? (
          <div className="users-empty">
            <h2>{all.length ? "No hay gastos con este filtro" : "Aún no hay gastos registrados"}</h2>
            <p>Usa “Registrar gasto”. Puedes tomar la foto del recibo desde el celular.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Programa</th>
                  <th>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.paidAt)}</td>
                    <td>
                      <strong>{e.concept}</strong>
                      {e.provider && <small>{e.provider}</small>}
                    </td>
                    <td>{e.category}</td>
                    <td>{programName(e.program)}</td>
                    <td>
                      <strong>{money(e.amount)}</strong>
                    </td>
                    <td>
                      <div className="inline-actions">
                        {e.supportPath && <button onClick={() => openSupport(e.supportPath!)}>Soporte</button>}
                        <button onClick={() => setEditing(e)}>Editar</button>
                        {confirm === e.id ? (
                          <button className="danger-text" onClick={() => deleteExpense(e).then(() => setConfirm(null)).catch((err) => setError(err.message))}>
                            ¿Eliminar?
                          </button>
                        ) : (
                          <button onClick={() => setConfirm(e.id)}>Eliminar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editing && <ExpenseModal expense={editing === "new" ? undefined : editing} close={() => setEditing(null)} />}
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Documentos                                                         */
/* ---------------------------------------------------------------- */

export function DocumentSheet({ title, body, settings }: { title: string; body: string; settings: Settings }) {
  return (
    <article className="print-page doc-sheet">
      <PrintHeader church={settings.iglesia} />
      <h1>{title}</h1>
      {body.split(/\n{2,}/).map((para, i) => (
        <p key={i}>
          {para.split("\n").map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {line}
            </span>
          ))}
        </p>
      ))}
      <div className="print-sign">
        <span />
        <p>
          {settings.plantillas_certificados[0]?.signer1 || "Pastor principal"}
          <br />
          {settings.iglesia.name}
        </p>
      </div>
    </article>
  )
}

function UploadDocModal({ close }: { close: () => void }) {
  const { list } = usePeopleMap()
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("General")
  const [personId, setPersonId] = useState<string | null>(null)
  const [file, setFile] = useState<{ path: string; type: string; size: number } | null>(null)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!file) return setError("Sube el archivo.")
    setSaving(true)
    try {
      await saveDocument({ title, category, personId, filePath: file.path, fileType: file.type, fileSize: file.size, body: null, notes })
      close()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }
  return (
    <Modal kicker="Documentos" title="Subir documento" close={() => (file && !saving && removeSupport(file.path), close())} wide>
      <form onSubmit={submit}>
        <div className="invite-fields">
          <label className="field-full">
            Nombre del documento
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Acta de reunión de líderes" />
          </label>
          <label>
            Categoría
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Persona relacionada
            <PersonPicker people={list} value={personId} onChange={(p) => setPersonId(p?.id ?? null)} placeholder="Opcional" />
          </label>
          <FileField folder="documentos" label="Archivo" current={file?.path ?? null} onChange={setFile} />
          <label className="field-full">
            Notas
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        {error && <p className="users-error">{error}</p>}
        <button className="modal-primary" type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar documento"} <AIcon name="check" />
        </button>
      </form>
    </Modal>
  )
}

export function GenerateDocModal({ close, personId: initialPerson }: { close: () => void; personId?: string }) {
  const settings = useContext(SettingsContext)
  const { list, map } = usePeopleMap()
  const team = useLiveData(listTeam, [onStaffChange])
  const templates = settings.plantillas_documentos
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "")
  const [personId, setPersonId] = useState<string | null>(initialPerson ?? null)
  const [printing, setPrinting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const template = templates.find((t) => t.id === templateId)
  const person = personId ? map[personId] : undefined
  const leader = (team.data ?? []).find((t) => t.userId === person?.leaderId)?.name ?? ""
  const body = template ? fillTemplate(template.body, personValues(person, settings, leader)) : ""
  const title = template?.name ?? ""

  async function save() {
    setError("")
    try {
      await saveDocument({ title: `${title}${person ? ` · ${person.fullName}` : ""}`, category: template?.category ?? "General", personId, filePath: null, fileType: "generado", fileSize: 0, body, notes: "" })
      setSaved(true)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Modal kicker="Documentos" title="Generar documento" close={close} wide>
      {templates.length === 0 ? (
        <p className="muted-note">No hay plantillas. Créalas en Configuración → Plantillas de documentos.</p>
      ) : (
        <>
          <div className="invite-fields">
            <label>
              Plantilla
              <select value={templateId} onChange={(e) => (setTemplateId(e.target.value), setSaved(false))}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Persona
              <PersonPicker people={list} value={personId} onChange={(p) => (setPersonId(p?.id ?? null), setSaved(false))} />
            </label>
          </div>
          <div className="doc-preview">
            <h3>{title}</h3>
            {body.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {error && <p className="users-error">{error}</p>}
          <div className="modal-row">
            <button className="secondary-action" disabled={!person || saved} onClick={save}>
              {saved ? "Guardado en Documentos" : "Guardar en Documentos"}
            </button>
            <button className="modal-primary" disabled={!person} onClick={() => setPrinting(true)}>
              Imprimir o guardar PDF <AIcon name="download" />
            </button>
          </div>
        </>
      )}
      {printing && (
        <PrintLayer onDone={() => setPrinting(false)}>
          <DocumentSheet title={title} body={body} settings={settings} />
        </PrintLayer>
      )}
    </Modal>
  )
}

export function DocumentsPage() {
  const settings = useContext(SettingsContext)
  const docs = useLiveData(listDocuments, [onDocumentsChange])
  const { map } = usePeopleMap()
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [printing, setPrinting] = useState<Doc | null>(null)
  const [category, setCategory] = useState("")
  const [query, setQuery] = useState("")
  const [confirm, setConfirm] = useState<string | null>(null)
  const [error, setError] = useState("")
  const all = docs.data ?? []
  const shown = all.filter(
    (d) => (!category || d.category === category) && (!query.trim() || `${d.title} ${map[d.personId ?? ""]?.fullName ?? ""} ${d.notes}`.toLowerCase().includes(query.trim().toLowerCase())),
  )
  return (
    <>
      <PageHeader eyebrow="Archivo" title="Documentos" copy="Sube archivos de la iglesia o genera cartas y constancias con los datos de cada persona." primary="Subir documento" onPrimary={() => setUploading(true)} />
      <div className="doc-actions">
        <button onClick={() => setGenerating(true)}>
          <AIcon name="file" />
          <span>
            <strong>Generar desde plantilla</strong>
            <small>{settings.plantillas_documentos.length} plantillas: constancias, cartas y más</small>
          </span>
          <AIcon name="arrow" />
        </button>
        <button onClick={() => setUploading(true)}>
          <AIcon name="upload" />
          <span>
            <strong>Subir un archivo</strong>
            <small>PDF, foto, Word o Excel · hasta 10 MB</small>
          </span>
          <AIcon name="arrow" />
        </button>
      </div>
      {error && <p className="users-error">{error}</p>}
      <section className="panel table-panel">
        <div className="table-tools people-tools">
          <div className="admin-search">
            <AIcon name="search" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar documento o persona..." />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {docs.data && shown.length === 0 ? (
          <div className="users-empty">
            <h2>{all.length ? "No hay documentos con este filtro" : "Aún no hay documentos"}</h2>
            <p>Sube el primero o genera uno desde una plantilla.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Categoría</th>
                  <th>Persona</th>
                  <th>Fecha</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.title}</strong>
                      <small>{d.filePath ? `${d.fileType.split("/").pop()?.toUpperCase()} · ${Math.max(1, Math.round(d.fileSize / 1024))} KB` : "Generado desde plantilla"}</small>
                    </td>
                    <td>{d.category}</td>
                    <td>{map[d.personId ?? ""]?.fullName ?? "—"}</td>
                    <td>{formatDate(d.createdAt)}</td>
                    <td>
                      <div className="inline-actions">
                        {d.filePath ? <button onClick={() => openSupport(d.filePath!)}>Abrir</button> : <button onClick={() => setPrinting(d)}>Imprimir</button>}
                        {confirm === d.id ? (
                          <button className="danger-text" onClick={() => deleteDocument(d).then(() => setConfirm(null)).catch((e) => setError(e.message))}>
                            ¿Eliminar?
                          </button>
                        ) : (
                          <button onClick={() => setConfirm(d.id)}>Eliminar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {uploading && <UploadDocModal close={() => setUploading(false)} />}
      {generating && <GenerateDocModal close={() => setGenerating(false)} />}
      {printing && (
        <PrintLayer onDone={() => setPrinting(null)}>
          <DocumentSheet title={printing.title.split(" · ")[0]} body={printing.body ?? ""} settings={settings} />
        </PrintLayer>
      )}
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Certificados                                                       */
/* ---------------------------------------------------------------- */

export function CertificateSheet({ cert, template, settings }: { cert: Certificate; template?: CertTemplate; settings: Settings }) {
  const color = template?.color || "#168c9c"
  const signers = [
    [template?.signer1, template?.signer1Role],
    [template?.signer2, template?.signer2Role],
  ].filter(([n, r]) => n || r)
  return (
    <article className="print-page cert-print" style={{ "--cert": color } as React.CSSProperties}>
      <div className="cert-frame">
        <img src="/logo-mai.png" alt="" className="cert-print-logo" />
        <p className="cert-church">{settings.iglesia.name}</p>
        <h1>{cert.title || template?.title || "Certificado"}</h1>
        <p className="cert-otorga">Otorga el presente reconocimiento a</p>
        <h2>{cert.personName}</h2>
        {cert.personDoc && <p className="cert-doc">{cert.personDoc}</p>}
        <p className="cert-text">{template?.text ?? ""}</p>
        <p className="cert-date">Bogotá, {longDate(cert.issuedAt)}</p>
        <div className="cert-signs">
          {signers.map(([n, r], i) => (
            <div key={i}>
              <span />
              <strong>{n || " "}</strong>
              <small>{r}</small>
            </div>
          ))}
        </div>
        <p className="cert-number">Certificado N.º {cert.number}</p>
      </div>
    </article>
  )
}

function IssueModal({ close, onIssued, personId }: { close: () => void; onIssued: (c: Certificate[]) => void; personId?: string }) {
  const settings = useContext(SettingsContext)
  const { list } = usePeopleMap()
  const templates = settings.plantillas_certificados
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "")
  const template = templates.find((t) => t.id === templateId)
  const program = settings.programas.find((p) => p.id === template?.program)
  const [mode, setMode] = useState<"una" | "etapa">("una")
  const [chosen, setChosen] = useState<string | null>(personId ?? null)
  const [step, setStep] = useState("")
  const [date, setDate] = useState(todayIso())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => setStep(program?.steps[program.steps.length - 1] ?? ""), [program])
  const group = list.filter((p) => p.status === "activo" && program && p.program === program.id && (!step || p.programStep === step))
  const targets = mode === "una" ? list.filter((p) => p.id === chosen) : group

  async function issue() {
    if (!template) return
    if (!targets.length) return setError(mode === "una" ? "Elige la persona." : "No hay personas en esa etapa.")
    setSaving(true)
    setError("")
    try {
      const certs = await issueCertificates(
        targets.map((p) => ({
          personId: p.id,
          personName: p.fullName,
          personDoc: p.docNumber ? `${p.docType} ${p.docNumber}` : "",
          program: template.program,
          templateId: template.id,
          title: template.title,
          issuedAt: date,
        })),
      )
      onIssued(certs)
      close()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <Modal kicker="Certificados" title="Emitir certificado" close={close} wide>
      {templates.length === 0 ? (
        <p className="muted-note">No hay plantillas de certificado. Créalas en Configuración → Plantillas de certificados.</p>
      ) : (
        <>
          <div className="invite-fields">
            <label>
              Plantilla
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fecha de expedición
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            {!personId && program && (
              <label className="field-full">
                ¿A quién?
                <select value={mode} onChange={(e) => setMode(e.target.value as "una" | "etapa")}>
                  <option value="una">A una persona</option>
                  <option value="etapa">A todos los de una etapa de {program.name}</option>
                </select>
              </label>
            )}
            {mode === "una" ? (
              <label className="field-full">
                Persona
                <PersonPicker people={list} value={chosen} onChange={(p) => setChosen(p?.id ?? null)} />
              </label>
            ) : (
              program && (
                <label className="field-full">
                  Etapa
                  <select value={step} onChange={(e) => setStep(e.target.value)}>
                    {program.steps.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <small>{group.length} personas activas en esta etapa</small>
                </label>
              )
            )}
          </div>
          {error && <p className="users-error">{error}</p>}
          <button className="modal-primary" onClick={issue} disabled={saving}>
            {saving ? "Emitiendo..." : `Emitir ${targets.length > 1 ? `${targets.length} certificados` : "certificado"}`} <AIcon name="certificate" />
          </button>
        </>
      )}
    </Modal>
  )
}

export function CertificatesPage() {
  const settings = useContext(SettingsContext)
  const certs = useLiveData(listCertificates, [onCertificatesChange])
  const [issuing, setIssuing] = useState(false)
  const [printing, setPrinting] = useState<Certificate[] | null>(null)
  const [program, setProgram] = useState("")
  const [query, setQuery] = useState("")
  const [confirm, setConfirm] = useState<string | null>(null)
  const [error, setError] = useState("")
  const all = certs.data ?? []
  const shown = all.filter((c) => (!program || c.program === program) && (!query.trim() || `${c.personName} ${c.number} ${c.personDoc}`.toLowerCase().includes(query.trim().toLowerCase())))
  const template = (id: string) => settings.plantillas_certificados.find((t) => t.id === id)
  const year = todayIso().slice(0, 4)
  const last = all[0]
  return (
    <>
      <PageHeader eyebrow="Documentos" title="Certificados" copy="Emite certificados de Encuentro, Misión 180 y Destino, uno por uno o a toda una etapa." primary="Emitir certificado" onPrimary={() => setIssuing(true)} />
      <div className="module-stats">
        <div>
          <span>Emitidos este año</span>
          <strong>{certs.data ? all.filter((c) => c.issuedAt.startsWith(year)).length : "—"}</strong>
          <small>Total histórico: {all.length}</small>
        </div>
        {settings.programas
          .filter((p) => p.base)
          .map((p) => (
            <div key={p.id}>
              <span>{p.name}</span>
              <strong>{certs.data ? all.filter((c) => c.program === p.id).length : "—"}</strong>
              <small>Certificados</small>
            </div>
          ))}
      </div>
      {last && (
        <section className="cert-preview-real">
          <CertScale>
            <CertificateSheet cert={last} template={template(last.templateId)} settings={settings} />
          </CertScale>
          <div className="cert-copy">
            <span>Último emitido</span>
            <h2>{last.personName}</h2>
            <p>
              {last.title} · {formatDate(last.issuedAt)} · N.º {last.number}
            </p>
            <button className="admin-primary" onClick={() => setPrinting([last])}>
              Imprimir o guardar PDF
            </button>
          </div>
        </section>
      )}
      {error && <p className="users-error">{error}</p>}
      <section className="panel table-panel">
        <div className="table-tools people-tools">
          <div className="admin-search">
            <AIcon name="search" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, documento o número..." />
          </div>
          <select value={program} onChange={(e) => setProgram(e.target.value)} aria-label="Programa">
            <option value="">Todos los programas</option>
            {settings.programas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {shown.length > 1 && (
            <button className="link-button" onClick={() => setPrinting(shown)}>
              Imprimir los {shown.length}
            </button>
          )}
        </div>
        {certs.data && shown.length === 0 ? (
          <div className="users-empty">
            <h2>{all.length ? "No hay certificados con este filtro" : "Aún no hay certificados"}</h2>
            <p>Usa “Emitir certificado”. Las firmas y textos se editan en Configuración → Plantillas de certificados.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Persona</th>
                  <th>Certificado</th>
                  <th>Fecha</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.number}</strong>
                    </td>
                    <td>
                      <strong>{c.personName}</strong>
                      {c.personDoc && <small>{c.personDoc}</small>}
                    </td>
                    <td>{c.title}</td>
                    <td>{formatDate(c.issuedAt)}</td>
                    <td>
                      <div className="inline-actions">
                        <button onClick={() => setPrinting([c])}>Imprimir</button>
                        {confirm === c.id ? (
                          <button className="danger-text" onClick={() => deleteCertificate(c.id).then(() => setConfirm(null)).catch((e) => setError(e.message))}>
                            ¿Anular?
                          </button>
                        ) : (
                          <button onClick={() => setConfirm(c.id)}>Anular</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {issuing && <IssueModal close={() => setIssuing(false)} onIssued={(c) => setPrinting(c)} />}
      {printing && (
        <PrintLayer onDone={() => setPrinting(null)}>
          {printing.map((c) => (
            <CertificateSheet key={c.id} cert={c} template={template(c.templateId)} settings={settings} />
          ))}
        </PrintLayer>
      )}
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Person profile: their payments, documents and certificates        */
/* ---------------------------------------------------------------- */

export function PersonRecords({ person }: { person: Person }) {
  const me = useContext(MyAccess)
  const settings = useContext(SettingsContext)
  const canPay = can(me, "pagos")
  const canDocs = can(me, "documentos")
  const payments = useLiveData(canPay ? listPayments : noPayments, [onPaymentsChange])
  const certs = useLiveData(canDocs ? listCertificates : noCertificates, [onCertificatesChange])
  const [paying, setPaying] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [printing, setPrinting] = useState<Certificate[] | null>(null)
  if (!canPay && !canDocs) return null
  const mine = (payments.data ?? []).filter((p) => p.personId === person.id)
  const myCerts = (certs.data ?? []).filter((c) => c.personId === person.id)
  const program = settings.programas.find((p) => p.id === person.program)
  const paidProgram = mine.filter((p) => p.program && p.program === person.program).reduce((n, p) => n + p.amount, 0)
  return (
    <section className="profile-summary person-records">
      {canPay && (
        <article className="panel">
          <span>Pagos</span>
          <h3>{money(mine.reduce((n, p) => n + p.amount, 0))}</h3>
          {program && program.cost > 0 && (
            <>
              <div className="wide-progress">
                <i style={{ width: `${Math.min(100, (paidProgram / program.cost) * 100)}%` }} />
              </div>
              <p>
                {program.name}: {money(paidProgram)} de {money(program.cost)}
              </p>
            </>
          )}
          <ul className="mini-list">
            {mine.slice(0, 4).map((p) => (
              <li key={p.id}>
                <span>
                  {formatDate(p.paidAt)} · {p.concept}
                </span>
                <b>{money(p.amount)}</b>
              </li>
            ))}
          </ul>
          <button className="link-button" onClick={() => setPaying(true)}>
            Registrar pago
          </button>
        </article>
      )}
      {canDocs && (
        <article className="panel">
          <span>Certificados</span>
          <h3>{myCerts.length}</h3>
          <ul className="mini-list">
            {myCerts.slice(0, 4).map((c) => (
              <li key={c.id}>
                <span>{c.title}</span>
                <button className="link-button" onClick={() => setPrinting([c])}>
                  Imprimir
                </button>
              </li>
            ))}
          </ul>
          <button className="link-button" onClick={() => setIssuing(true)}>
            Emitir certificado
          </button>
        </article>
      )}
      {canDocs && (
        <article className="panel">
          <span>Documentos</span>
          <h3>Cartas y constancias</h3>
          <p>Genera una constancia o carta con sus datos, lista para imprimir.</p>
          <button className="link-button" onClick={() => setGenerating(true)}>
            Generar documento
          </button>
        </article>
      )}
      {paying && <PaymentModal defaults={{ personId: person.id, payerName: person.fullName, program: person.program, concept: person.program ? "Programa" : "Ofrenda" }} close={() => setPaying(false)} />}
      {generating && <GenerateDocModal personId={person.id} close={() => setGenerating(false)} />}
      {issuing && <IssueModal personId={person.id} close={() => setIssuing(false)} onIssued={(c) => setPrinting(c)} />}
      {printing && (
        <PrintLayer onDone={() => setPrinting(null)}>
          {printing.map((c) => (
            <CertificateSheet key={c.id} cert={c} template={settings.plantillas_certificados.find((t) => t.id === c.templateId)} settings={settings} />
          ))}
        </PrintLayer>
      )}
    </section>
  )
}

/* ---------------------------------------------------------------- */
/* Reportes                                                           */
/* ---------------------------------------------------------------- */

export function ReportsPage() {
  const settings = useContext(SettingsContext)
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<Awaited<ReturnType<typeof reportSummary>> | null>(null)
  const [error, setError] = useState("")
  useEffect(() => {
    let alive = true
    setData(null)
    reportSummary(year)
      .then((d) => alive && (setData(d), setError("")))
      .catch(() => alive && setError("No pudimos cargar los reportes."))
    const offs = [onPaymentsChange, onExpensesChange, onPeopleChange].map((s) => s(() => reportSummary(year).then((d) => alive && setData(d))))
    return () => {
      alive = false
      offs.forEach((o) => o())
    }
  }, [year])

  const income = MONTHS.map((_, i) => Number(data?.income_by_month[String(i + 1)] ?? 0))
  const expense = MONTHS.map((_, i) => Number(data?.expense_by_month[String(i + 1)] ?? 0))
  const newPeople = MONTHS.map((_, i) => Number(data?.new_people_by_month[String(i + 1)] ?? 0))
  const totalIn = income.reduce((a, b) => a + b, 0)
  const totalOut = expense.reduce((a, b) => a + b, 0)
  const max = Math.max(1, ...income, ...expense)
  const maxPeople = Math.max(1, ...newPeople)
  const programName = (id: string) => (id ? settings.programas.find((p) => p.id === id)?.name ?? id : "Sin proceso")
  const entries = (o: Record<string, number> | undefined) => Object.entries(o ?? {}).sort((a, b) => Number(b[1]) - Number(a[1]))

  function exportCsv() {
    downloadCsv(`reporte-mai-${year}.csv`, [
      ["Mes", "Ingresos", "Egresos", "Balance", "Personas nuevas"],
      ...MONTHS.map((m, i) => [m, income[i], expense[i], income[i] - expense[i], newPeople[i]]),
      ["Total", totalIn, totalOut, totalIn - totalOut, newPeople.reduce((a, b) => a + b, 0)],
    ])
  }

  const Bars = ({ rows, total }: { rows: [string, number][]; total: number }) => (
    <div className="report-bars">
      {rows.length === 0 && <p className="muted-note">Sin datos este año.</p>}
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <div className="wide-progress">
            <i style={{ width: `${(value / Math.max(1, total)) * 100}%` }} />
          </div>
          <b>{money(value)}</b>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <PageHeader eyebrow="Inteligencia MAI" title="Reportes" copy="Ingresos, egresos y crecimiento de la iglesia, mes a mes." onExport={data ? exportCsv : undefined} />
      <div className="report-year">
        {[0, 1, 2].map((d) => {
          const y = new Date().getFullYear() - d
          return (
            <button key={y} className={year === y ? "active" : ""} onClick={() => setYear(y)}>
              {y}
            </button>
          )
        })}
      </div>
      {error && <p className="users-error">{error}</p>}
      <section className="stat-grid">
        <article className="admin-stat">
          <div>
            <p>Ingresos {year}</p>
            <strong>{data ? money(totalIn) : "—"}</strong>
          </div>
          <span>{data?.payments_count ?? 0} pagos</span>
        </article>
        <article className="admin-stat">
          <div>
            <p>Egresos {year}</p>
            <strong>{data ? money(totalOut) : "—"}</strong>
          </div>
          <span>{data?.expenses_count ?? 0} gastos</span>
        </article>
        <article className="admin-stat">
          <div>
            <p>Balance</p>
            <strong className={totalIn - totalOut < 0 ? "negative" : ""}>{data ? money(totalIn - totalOut) : "—"}</strong>
          </div>
          <span>Ingresos menos egresos</span>
        </article>
        <article className="admin-stat stat-accent">
          <div>
            <p>Personas activas</p>
            <strong>{data?.people_active ?? "—"}</strong>
          </div>
          <span>
            {data?.leaders ?? 0} líderes · {data?.certificates ?? 0} certificados
          </span>
        </article>
      </section>
      <section className="dashboard-grid">
        <article className="panel finance-chart">
          <PanelTitle kicker="Finanzas" title="Ingresos vs. egresos" />
          <div className="bar-chart">
            <div className="bar-y">
              <span>{money(max).replace(/\s/g, "")}</span>
              <span>{money(max / 2).replace(/\s/g, "")}</span>
              <span>$0</span>
            </div>
            <div className="bars">
              {MONTHS.map((m, i) => (
                <div key={m} className="bar-column" title={`${m}: ${money(income[i])} / ${money(expense[i])}`}>
                  <div className="bar-pair">
                    <i style={{ height: `${(income[i] / max) * 100}%` }} />
                    <i style={{ height: `${(expense[i] / max) * 100}%` }} />
                  </div>
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-legend">
            <span>
              <i /> Ingresos <b>{money(totalIn)}</b>
            </span>
            <span>
              <i /> Egresos <b>{money(totalOut)}</b>
            </span>
          </div>
        </article>
        <article className="panel people-stage">
          <PanelTitle kicker="Crecimiento" title="Personas nuevas por mes" />
          <div className="bar-chart">
            <div className="bar-y">
              <span>{maxPeople}</span>
              <span>{Math.round(maxPeople / 2)}</span>
              <span>0</span>
            </div>
            <div className="bars">
              {MONTHS.map((m, i) => (
                <div key={m} className="bar-column" title={`${m}: ${newPeople[i]}`}>
                  <div className="bar-pair">
                    <i style={{ height: `${(newPeople[i] / maxPeople) * 100}%` }} />
                  </div>
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="muted-note">
            {newPeople.reduce((a, b) => a + b, 0)} personas registradas en {year} · {data?.people_total ?? 0} en total
          </p>
        </article>
      </section>
      <section className="report-grid">
        <article className="panel">
          <PanelTitle kicker="Ingresos" title="Por concepto" />
          <Bars rows={entries(data?.income_by_concept)} total={totalIn} />
        </article>
        <article className="panel">
          <PanelTitle kicker="Egresos" title="Por categoría" />
          <Bars rows={entries(data?.expense_by_category)} total={totalOut} />
        </article>
        <article className="panel">
          <PanelTitle kicker="Procesos" title="Personas activas por proceso" />
          <div className="report-bars">
            {entries(data?.people_by_program).map(([id, n]) => (
              <div key={id}>
                <span>{programName(id)}</span>
                <div className="wide-progress">
                  <i style={{ width: `${(Number(n) / Math.max(1, data?.people_active ?? 1)) * 100}%` }} />
                </div>
                <b>{n}</b>
              </div>
            ))}
            {data && entries(data.people_by_program).length === 0 && <p className="muted-note">Aún no hay personas activas.</p>}
          </div>
        </article>
      </section>
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Auditoría                                                          */
/* ---------------------------------------------------------------- */

const MODULES: Record<string, string> = {
  people: "Personas",
  payments: "Pagos",
  expenses: "Gastos",
  documents: "Documentos",
  certificates: "Certificados",
  staff: "Usuarios",
  invitations: "Invitaciones",
  settings: "Configuración",
  announcements: "Anuncios",
}

const FIELD_NAMES: Record<string, string> = {
  status: "estado",
  permissions: "permisos",
  program_step: "etapa",
  program: "programa",
  leader_id: "líder",
  photo_path: "foto",
  full_name: "nombre",
  phone: "teléfono",
  amount: "valor",
  value: "valores",
  used_at: "uso",
  revoked_at: "anulación",
}

export function AuditPage() {
  const log = useLiveData(loadAudit, [onAuditChange])
  const [query, setQuery] = useState("")
  const [module, setModule] = useState("")
  const all = log.data ?? []
  const shown = all.filter((a) => (!module || a.module === module) && (!query.trim() || `${a.userName} ${a.record} ${a.action}`.toLowerCase().includes(query.trim().toLowerCase())))
  const detail = (d: string) =>
    d
      .split(", ")
      .filter(Boolean)
      .map((f) => FIELD_NAMES[f] ?? f.replace(/_/g, " "))
      .join(", ")
  function exportCsv() {
    downloadCsv("auditoria-mai.csv", [["Fecha", "Usuario", "Acción", "Módulo", "Registro", "Campos"], ...shown.map((a) => [new Date(a.at).toLocaleString("es-CO"), a.userName, a.action, MODULES[a.module] ?? a.module, a.record, detail(a.detail)])])
  }
  return (
    <>
      <PageHeader eyebrow="Seguridad" title="Auditoría" copy="Quién creó, cambió o eliminó cada registro, y cuándo." onExport={shown.length ? exportCsv : undefined} />
      <section className="panel table-panel">
        <div className="table-tools people-tools">
          <div className="admin-search">
            <AIcon name="search" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar usuario o registro..." />
          </div>
          <select value={module} onChange={(e) => setModule(e.target.value)} aria-label="Módulo">
            <option value="">Todos los módulos</option>
            {Object.entries(MODULES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {log.error && <p className="users-error">No pudimos cargar la auditoría.</p>}
        {log.data && shown.length === 0 ? (
          <div className="users-empty">
            <h2>Sin movimientos todavía</h2>
            <p>Desde ahora cada cambio en personas, pagos, gastos, documentos, certificados, usuarios y configuración queda registrado aquí.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Módulo</th>
                  <th>Registro</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.at).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</td>
                    <td>
                      <strong>{a.userName}</strong>
                    </td>
                    <td>
                      <StatusPill tone={a.action === "Eliminó" ? "pill-warn" : a.action === "Creó" ? "pill-ok" : "pill-blue"}>{a.action}</StatusPill>
                    </td>
                    <td>{MODULES[a.module] ?? a.module}</td>
                    <td>
                      {a.record || "—"}
                      {a.detail && <small className="cell-sub">Cambió: {detail(a.detail)}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Template editors (Configuración)                                  */
/* ---------------------------------------------------------------- */

export function CertificatePreview({ template }: { template: CertTemplate }) {
  const settings = useContext(SettingsContext)
  const cert: Certificate = {
    id: "preview",
    number: "MAI-0000-0000",
    personId: null,
    personName: "Nombre de la persona",
    personDoc: "CC 0.000.000.000",
    program: template.program,
    templateId: template.id,
    title: template.title,
    issuedAt: todayIso(),
    createdAt: "",
  }
  return (
    <CertScale small>
      <CertificateSheet cert={cert} template={template} settings={settings} />
    </CertScale>
  )
}

export type { DocTemplate }
