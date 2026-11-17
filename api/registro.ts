// Vercel Function for POST /api/registro: the invited person's side of an
// invitation link (supabase/accesos.sql).
//   { action: "ver", token }   → who the invitation is for, if it is still valid
//   { action: "crear", token, name, ..., username, password, photo? }
//       → creates their login (username@iglesiamai.com) and a staff row. A "persona"
//         invitation leaves it PENDING with no permissions until someone approves it;
//         a "lider" invitation activates it at once with the permissions chosen on the link.
//   { action: "unirse-ver", code }  → the leader behind a personal disciple link
//   { action: "unirse", code, name, ..., photo? } → a new disciple for that leader
//       (pending until the leader accepts, unless Configuración says otherwise).
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

const STAFF_EMAIL_DOMAIN = "iglesiamai.com"
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/
const DOC_TYPES = ["CC", "CE", "TI", "PA", "RC"]
const VALID_PERMISSIONS = ["solicitudes", "anuncios", "personas", "equipo", "encuentros", "universidad", "capacitacion", "pagos", "gastos", "documentos", "reportes"]

type Body = Record<string, unknown>

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const text = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const hash = (token: string) => createHash("sha256").update(token).digest("hex")

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new HttpError(500, "El registro no está configurado todavía. Avísale al administrador.")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

type InvitationRow = {
  id: string
  name: string
  email: string
  phone: string
  role_label: string
  kind: string
  auto_permissions: string[] | null
  created_by: string
  expires_at: string
  used_at: string | null
  revoked_at: string | null
}

async function findInvitation(db: ReturnType<typeof admin>, token: string) {
  if (token.length < 20 || token.length > 100) throw new HttpError(404, "Esta invitación no es válida.")
  const { data, error } = await db
    .from("invitations")
    .select("id,name,email,phone,role_label,kind,auto_permissions,created_by,expires_at,used_at,revoked_at")
    .eq("token_hash", hash(token))
    .maybeSingle<InvitationRow>()
  if (error) throw error
  if (!data || data.revoked_at) throw new HttpError(404, "Esta invitación no es válida o fue anulada.")
  if (data.used_at) throw new HttpError(410, "Esta invitación ya se usó. Si ya creaste tu cuenta, inicia sesión.")
  if (new Date(data.expires_at).getTime() < Date.now()) throw new HttpError(410, "Esta invitación venció. Pide un enlace nuevo.")
  return data
}

async function preview(body: Body) {
  const inv = await findInvitation(admin(), text(body.token))
  return { name: inv.name, email: inv.email, phone: inv.phone, roleLabel: inv.role_label, kind: inv.kind }
}

/** Stores a photo sent as a data URL in the private "fotos" bucket; returns its path or null. */
async function storePhoto(db: ReturnType<typeof admin>, dataUrl: unknown, folder: "personas" | "equipo") {
  if (typeof dataUrl !== "string" || !dataUrl) return null
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!match) throw new HttpError(400, "La foto no es válida. Prueba con otra imagen.")
  const bytes = Buffer.from(match[2], "base64")
  if (bytes.length > 3 * 1024 * 1024) throw new HttpError(400, "La foto es muy pesada. Prueba con otra.")
  const ext = match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg"
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await db.storage.from("fotos").upload(path, bytes, { contentType: match[1], upsert: false })
  if (error) {
    console.error("registro foto:", error)
    return null
  }
  return path
}

async function register(body: Body) {
  const db = admin()
  const token = text(body.token)
  const name = text(body.name, 120)
  const docType = text(body.docType, 4)
  const docNumber = text(body.docNumber, 30).replace(/[.\s]/g, "")
  const birthDate = text(body.birthDate, 10)
  const phone = text(body.phone, 30)
  const address = text(body.address, 200)
  const email = text(body.email, 120).toLowerCase()
  const username = text(body.username, 30).toLowerCase()
  const password = typeof body.password === "string" ? body.password : ""

  if (name.length < 3) throw new HttpError(400, "Escribe tu nombre completo.")
  if (!DOC_TYPES.includes(docType) || docNumber.length < 4) throw new HttpError(400, "Revisa tu documento.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new HttpError(400, "Revisa tu fecha de nacimiento.")
  if (phone.replace(/\D/g, "").length < 7) throw new HttpError(400, "Revisa tu teléfono.")
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Revisa tu correo.")
  if (!USERNAME_RE.test(username))
    throw new HttpError(400, "El usuario debe tener de 3 a 30 letras o números, sin espacios ni tildes (puedes usar . - _).")
  if (password.length < 8 || password.length > 72) throw new HttpError(400, "La contraseña debe tener al menos 8 caracteres.")

  const inv = await findInvitation(db, token)

  const { data: taken } = await db.from("staff").select("user_id").eq("username", username).maybeSingle()
  if (taken) throw new HttpError(409, "Ese usuario ya existe. Elige otro.")

  // Claim the invitation first so the same link can never create two accounts.
  const { data: claimed, error: claimError } = await db
    .from("invitations")
    .update({ used_at: new Date().toISOString() })
    .eq("id", inv.id)
    .is("used_at", null)
    .select("id")
  if (claimError) throw claimError
  if (!claimed?.length) throw new HttpError(410, "Esta invitación ya se usó.")
  const release = () => db.from("invitations").update({ used_at: null }).eq("id", inv.id)

  const { data: created, error: userError } = await db.auth.admin.createUser({
    email: `${username}@${STAFF_EMAIL_DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: { name },
  })
  if (userError || !created.user) {
    await release()
    const exists = /already|registered|exists/i.test(userError?.message ?? "")
    if (exists) throw new HttpError(409, "Ese usuario ya existe. Elige otro.")
    if (/password/i.test(userError?.message ?? "")) throw new HttpError(400, "Elige una contraseña más segura.")
    throw userError ?? new Error("createUser returned no user")
  }

  const userId = created.user.id
  const isLeader = inv.kind === "lider"
  const photoPath = await storePhoto(db, body.photo, "equipo").catch(() => null)
  const { error: staffError } = await db.from("staff").insert({
    user_id: userId,
    name,
    username,
    email,
    phone,
    doc_type: docType,
    doc_number: docNumber,
    birth_date: birthDate,
    address,
    role_label: inv.role_label,
    status: isLeader ? "activo" : "pendiente",
    permissions: isLeader ? (inv.auto_permissions ?? []).filter((p) => VALID_PERMISSIONS.includes(p)) : [],
    approved_by: isLeader ? inv.created_by : null,
    approved_at: isLeader ? new Date().toISOString() : null,
    photo_path: photoPath,
    is_owner: false,
    invitation_id: inv.id,
  })
  if (staffError) {
    if (photoPath) await db.storage.from("fotos").remove([photoPath])
    await db.auth.admin.deleteUser(userId)
    await release()
    if (staffError.code === "23505") throw new HttpError(409, "Ese usuario ya existe. Elige otro.")
    throw staffError
  }

  await db.from("invitations").update({ used_by: userId }).eq("id", inv.id)
  return { ok: true, username, active: isLeader }
}

/* A leader's personal link: new disciples sign themselves up */

async function findLeader(db: ReturnType<typeof admin>, code: string) {
  if (!/^[a-z0-9]{8,32}$/.test(code)) throw new HttpError(404, "Este enlace no es válido.")
  const { data, error } = await db.from("staff").select("user_id,name,status").eq("join_code", code).maybeSingle()
  if (error) throw error
  if (!data || data.status !== "activo") throw new HttpError(404, "Este enlace no es válido o ya no está activo.")
  return data as { user_id: string; name: string; status: string }
}

async function generalSettings(db: ReturnType<typeof admin>) {
  const { data } = await db.from("settings").select("value").eq("key", "general").maybeSingle()
  const value = (data?.value ?? {}) as { approveDisciples?: boolean; discipleWelcome?: string }
  return {
    approveDisciples: value.approveDisciples !== false,
    welcome: value.discipleWelcome || "Completa tus datos para empezar tu proceso en MAI. Tu líder te va a acompañar en cada paso.",
  }
}

async function leaderPreview(body: Body) {
  const db = admin()
  const leader = await findLeader(db, text(body.code, 40))
  const { welcome } = await generalSettings(db)
  return { leaderName: leader.name, welcome }
}

async function joinLeader(body: Body) {
  const db = admin()
  if (text(body.website)) return { ok: true, pending: true } // honeypot: bots fill every field
  const leader = await findLeader(db, text(body.code, 40))
  const name = text(body.name, 120)
  const docType = text(body.docType, 4)
  const docNumber = text(body.docNumber, 30).replace(/[.\s]/g, "")
  const birthDate = text(body.birthDate, 10)
  const phone = text(body.phone, 30)
  const email = text(body.email, 120).toLowerCase()

  if (name.length < 3) throw new HttpError(400, "Escribe tu nombre completo.")
  if (docType && !DOC_TYPES.includes(docType)) throw new HttpError(400, "Revisa tu documento.")
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new HttpError(400, "Revisa tu fecha de nacimiento.")
  if (phone.replace(/\D/g, "").length < 7) throw new HttpError(400, "Revisa tu teléfono.")
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Revisa tu correo.")

  // The same person sending the form twice to the same leader counts once.
  if (docNumber) {
    const { data: dup } = await db.from("people").select("id").eq("leader_id", leader.user_id).eq("doc_number", docNumber).maybeSingle()
    if (dup) throw new HttpError(409, "Ya estás inscrito con este líder. Pronto se comunicará contigo.")
  }

  const { approveDisciples } = await generalSettings(db)
  const photoPath = await storePhoto(db, body.photo, "personas").catch(() => null)
  const { error } = await db.from("people").insert({
    full_name: name,
    doc_type: docType || "CC",
    doc_number: docNumber,
    birth_date: birthDate || null,
    gender: text(body.gender, 20),
    phone,
    email,
    address: text(body.address, 200),
    emergency_contact: text(body.emergencyContact, 120),
    notes: text(body.notes, 1000),
    role: "Discípulo",
    leader_id: leader.user_id,
    status: approveDisciples ? "pendiente" : "activo",
    source: "enlace",
    photo_path: photoPath,
    created_by: null,
  })
  if (error) {
    if (photoPath) await db.storage.from("fotos").remove([photoPath])
    throw error
  }
  return { ok: true, pending: approveDisciples }
}

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return Response.json({ error: "Método no permitido" }, { status: 405 })
    try {
      const body = (await request.json()) as Body
      if (body.action === "ver") return Response.json(await preview(body))
      if (body.action === "crear") return Response.json(await register(body))
      if (body.action === "unirse-ver") return Response.json(await leaderPreview(body))
      if (body.action === "unirse") return Response.json(await joinLeader(body))
      return Response.json({ error: "Acción no válida" }, { status: 400 })
    } catch (err) {
      if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status })
      console.error("registro:", err)
      return Response.json({ error: "No pudimos completar el registro. Inténtalo de nuevo en unos minutos." }, { status: 500 })
    }
  },
}
