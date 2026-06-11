import { currentPlayer } from "lib/server/auth"

export async function GET() {
  const player = await currentPlayer()
  return Response.json({ player })
}
