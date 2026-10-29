// Vercel Function for POST /api/oracion-pasos: the chosen guided prayer
// rewritten around what the person shared. Needs OPENROUTER_API_KEY.
import { openRouterKey, personalizePrayer } from "../server/oracion.js"

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return Response.json({ error: "Método no permitido" }, { status: 405 })
    const key = openRouterKey(process.env)
    if (!key) return Response.json({ error: "Falta OPENROUTER_API_KEY" }, { status: 500 })
    try {
      return Response.json(await personalizePrayer(await request.json(), key))
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      console.error("oracion-pasos:", err)
      return Response.json({ error: status === 400 ? (err as Error).message : "No pudimos preparar la oración" }, { status })
    }
  },
}
