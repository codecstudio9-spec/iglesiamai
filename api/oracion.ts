// Vercel Function for POST /api/oracion. Set OPENROUTER_API_KEY in the
// project's environment variables; locally Vite serves the same handler.
import { answerPrayer, openRouterKey } from "../server/oracion.js"

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return Response.json({ error: "Método no permitido" }, { status: 405 })
    const key = openRouterKey(process.env)
    if (!key) return Response.json({ error: "Falta OPENROUTER_API_KEY" }, { status: 500 })
    try {
      return Response.json(await answerPrayer(await request.json(), key))
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      console.error("oracion:", err)
      return Response.json({ error: status === 400 ? (err as Error).message : "No pudimos responder ahora" }, { status })
    }
  },
}
