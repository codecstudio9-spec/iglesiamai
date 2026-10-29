/**
 * Browser Supabase client. Uses only the public anon key: what each visitor
 * can read or write is enforced by Row Level Security (supabase/schema.sql).
 * The service-role key stays in .env.local and never reaches the bundle.
 */
import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY")

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "missing", {
  // PKCE puts the reset-link code in "?code=", so it never clashes with the site's "#/" routes.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
})

/** Tells this tab's screens that `table` changed, without waiting for Realtime. */
export function notifyChange(table: string) {
  window.dispatchEvent(new Event(`mai:${table}`))
}

/** Calls `callback` when rows of `table` change here or on any other device (Supabase Realtime). */
export function onTableChange(table: string, callback: () => void) {
  const local = () => callback()
  window.addEventListener(`mai:${table}`, local)
  const channel = supabase
    .channel(`${table}-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => callback())
    .subscribe()
  return () => {
    window.removeEventListener(`mai:${table}`, local)
    supabase.removeChannel(channel)
  }
}
