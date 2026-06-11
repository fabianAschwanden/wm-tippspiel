import { z } from "zod"
import { startSession } from "lib/server/auth"
import { registerPlayer } from "lib/server/db"

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name muss mindestens 2 Zeichen haben").max(30),
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse"),
})

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 })
  }
  const player = registerPlayer(parsed.data.name, parsed.data.email)
  if (!player) {
    return Response.json({ error: "Diese E-Mail ist bereits registriert — bitte anmelden." }, { status: 409 })
  }
  await startSession(player.id)
  return Response.json({ player }, { status: 201 })
}
