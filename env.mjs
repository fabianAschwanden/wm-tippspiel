import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    ANALYZE: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
    /** Gehostete Postgres-DB (Neon via Vercel); lokal ohne diese Variable: PGlite in .data/pglite. */
    DATABASE_URL: z.string().url().optional(),
    /** API-Token für football-data.org (Resultat-Feed); ohne Token kein Import/Live. */
    FOOTBALL_DATA_TOKEN: z.string().min(1).optional(),
    /** Schützt /api/cron/results (Vercel Cron sendet "Authorization: Bearer <CRON_SECRET>"). */
    CRON_SECRET: z.string().min(1).optional(),
    /** Serverseitiger Cache für /api/live in Sekunden (Default 30). */
    LIVE_CACHE_SECONDS: z.coerce.number().int().positive().optional(),
    /** Google-Login (OAuth 2.0); ohne diese Werte wird der Button mit Hinweis abgewiesen. */
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    /** E-Mail-Versand (Verifikation/Passwort-Reset) via Resend; ohne Werte zeigt das UI den Link direkt an. */
    RESEND_API_KEY: z.string().min(1).optional(),
    MAIL_FROM: z.string().min(3).optional(),
    /** TippBot: Claude API-Key für automatische Tipps via Web-Suche; ohne Key bleibt der Bot inaktiv. */
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
  },
  client: {},
  runtimeEnv: {
    ANALYZE: process.env.ANALYZE,
    DATABASE_URL: process.env.DATABASE_URL,
    FOOTBALL_DATA_TOKEN: process.env.FOOTBALL_DATA_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
    LIVE_CACHE_SECONDS: process.env.LIVE_CACHE_SECONDS,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MAIL_FROM: process.env.MAIL_FROM,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
})
