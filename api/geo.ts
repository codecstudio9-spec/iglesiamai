// Vercel Function for GET /api/geo: the visitor's approximate city (from Vercel's
// IP headers), used only to label anonymous visits in the admin's Analítica.
export default {
  async fetch(request: Request) {
    const h = request.headers
    const city = h.get("x-vercel-ip-city") ?? ""
    let decoded = city
    try {
      decoded = decodeURIComponent(city)
    } catch {
      // Keep it as it came.
    }
    return Response.json(
      { city: decoded.slice(0, 80), region: (h.get("x-vercel-ip-country-region") ?? "").slice(0, 10), country: (h.get("x-vercel-ip-country") ?? "").slice(0, 8) },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  },
}
