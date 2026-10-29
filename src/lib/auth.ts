/**
 * Staff sign-in for the internal panel (Supabase Auth, email + password).
 * Having an account is not enough: the user must also be listed in the
 * `staff` table, which is what RLS checks before showing any request.
 */
import { supabase } from "./supabase"

/** Where the "forgot password" email sends people back to. */
export const RECOVERY_FLAG = "acceso=recuperar"

async function isStaff(userId: string) {
  const { data } = await supabase.from("staff").select("user_id").eq("user_id", userId).maybeSingle()
  return Boolean(data)
}

export async function currentStaff() {
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  return user && (await isStaff(user.id)) ? user : null
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error || !data.user) throw new Error("Correo o contraseña incorrectos.")
  if (!(await isStaff(data.user.id))) {
    await supabase.auth.signOut()
    throw new Error("Tu cuenta no tiene acceso al panel. Pide a un administrador que te habilite.")
  }
  return data.user
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
