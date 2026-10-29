// Vercel Function for POST /api/oracion-entrega: a short written prayer over
// what the person handed to God, and the need it fits (its recorded prayer is
// what the voice plays). Needs OPENROUTER_API_KEY in the environment variables.
import { openRouterKey, prayOver } from "../server/oracion.js"

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return Response.json({ error: "Método no permitido" }, { status: 405 })
    const key = openRouterKey(process.env)
    if (!key) return Response.json({ error: "Falta OPENROUTER_API_KEY" }, { status: 500 })
    try {
      return Response.json(await prayOver(await request.json(), key))
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      console.error("oracion-entrega:", err)
      return Response.json({ error: status === 400 ? (err as Error).message : "No pudimos orar ahora" }, { status })
    }
  },
}
