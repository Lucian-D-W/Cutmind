export const PRESET_TIMER_MINUTES = [20, 30, 45, 60, 90]

export function normalizeCustomTimerMinutes(value: string): number | null {
  const parsed = Number.parseFloat(value.trim())
  if (!Number.isFinite(parsed)) return null
  const minutes = Math.floor(parsed)
  if (minutes <= 0) return null
  return minutes
}
