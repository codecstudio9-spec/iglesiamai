/**
 * Staff sign-in for the internal panel (Supabase Auth, username or email + password).
 * Having an account is not enough: the user must also be listed in the
 * `staff` table, which is what RLS checks before showing any request.
 */
import type { User } from "@supabase/supabase-js"
import { supabase } from "./supabase"

/** Where the "forgot password" email sends people back to. */
export const RECOVERY_FLAG = "acceso=recuperar"

const STAFF_EMAIL_DOMAIN = "iglesiamai.com"

/** The person's account status on the team, or null if they are not on it. */
async function staffStatus(userId: string): Promise<string | null> {
  const { data } = await supabase.from("staff").select("status").eq("user_id", userId).maybeSingle()
  return data ? ((data as { status?: string }).status ?? "activo") : null
}

export async function currentStaff() {
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  return user && (await staffStatus(user.id)) === "activo" ? user : null
}

/** Staff may type a short username ("Admin"); Supabase Auth signs in by email. */
function toEmail(login: string) {
  const value = login.trim().toLowerCase()
  return value.includes("@") ? value : `${value}@${STAFF_EMAIL_DOMAIN}`
}

export async function signIn(login: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: toEmail(login), password })
  if (error || !data.user) throw new Error("Usuario o contraseña incorrectos.")
  const status = await staffStatus(data.user.id)
  if (status !== "activo") {
    await supabase.auth.signOut()
    throw new Error(
      status === "pendiente"
        ? "Tu cuenta está pendiente de aprobación. Te avisaremos cuando un administrador te dé acceso."
        : status === "suspendido" || status === "rechazado"
          ? "Tu cuenta no está activa. Habla con el administrador de MAI."
          : "Tu cuenta no tiene acceso al panel. Pide a un administrador que te habilite.",
    )
  }
  return data.user
}

/** Name shown in the panel: the account's name, else the part before the "@". */
export function staffName(user: User) {
  const name = user.user_metadata?.name as string | undefined
  return name || user.email?.split("@")[0] || "Equipo MAI"
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/?${RECOVERY_FLAG}`,
  })
  if (error) throw new Error("No pudimos enviar el correo. Inténtalo de nuevo en unos minutos.")
}

export async function setNewPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message.includes("different") ? "Usa una contraseña distinta a la anterior." : "No pudimos guardar la contraseña.")
}
