import { DEMO_TIPS } from "./data"
import type { Tips } from "./types"

const STORAGE_KEY = "wm-tippspiel.tips"

/** Nur im Client aufrufen (useEffect). Erststart wird mit Demo-Tipps befüllt. */
export function loadTips(): Tips {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as Tips
    }
  } catch {
    // defekter Storage-Inhalt -> mit Demo-Tipps neu beginnen
  }
  saveTips(DEMO_TIPS)
  return DEMO_TIPS
}

export function saveTips(tips: Tips): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tips))
  } catch {
    // Storage nicht verfügbar (z.B. Private Mode) -> Tipps gelten nur für die Sitzung
  }
}
