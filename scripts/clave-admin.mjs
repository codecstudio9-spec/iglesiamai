// Changes the password of a panel account (default: "admin") from this computer.
// The password is typed here, hidden, and goes straight to Supabase: it is never saved.
//   node scripts/clave-admin.mjs            → cuenta "admin"
//   node scripts/clave-admin.mjs juan.perez → otra cuenta
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")
  process.exit(1)
}

const login = (process.argv[2] || "admin").toLowerCase()
const email = login.includes("@") ? login : `${login}@iglesiamai.com`

function askHidden(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process
    stdout.write(question)
    stdin.setRawMode?.(true)
    stdin.resume()
    stdin.setEncoding("utf8")
    let value = ""
    const onData = (ch) => {
      if (ch === "\r" || ch === "\n" || ch === "\u0004") {
        stdin.setRawMode?.(false)
        stdin.pause()
        stdin.off("data", onData)
        stdout.write("\n")
        resolve(value)
      } else if (ch === "\u0003") {
        stdout.write("\n")
        process.exit(1)
      } else if (ch === "\u007f" || ch === "\b") {
        value = value.slice(0, -1)
      } else {
        value += ch
      }
    }
    stdin.on("data", onData)
  })
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

let page = 1
let user = null
while (!user) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
  if (error) throw error
  user = data.users.find((u) => u.email?.toLowerCase() === email)
  if (data.users.length < 200) break
  page += 1
}
if (!user) {
  console.error(`No existe la cuenta ${email}`)
  process.exit(1)
}

const password = await askHidden(`Nueva contraseña para "${login}": `)
const again = await askHidden("Repítela: ")
if (password !== again) {
  console.error("Las contraseñas no coinciden. No se cambió nada.")
  process.exit(1)
}
if (password.length < 8) {
  console.error("Usa al menos 8 caracteres. No se cambió nada.")
  process.exit(1)
}

const { error } = await db.auth.admin.updateUserById(user.id, { password })
if (error) {
  console.error("Supabase no aceptó la contraseña:", error.message)
  process.exit(1)
}
console.log(`Listo: la contraseña de "${login}" quedó cambiada. Entra con el usuario "${login}".`)
