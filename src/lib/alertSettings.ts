import type { AppSettings } from '../types'

export function clampAlertRepeatSeconds(value: number): number {
  if (!Number.isFinite(value)) return 2
  return Math.min(30, Math.max(1, Math.round(value)))
}

export function clampAlertVolume(value: number): number {
  if (!Number.isFinite(value)) return 70
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function normalizeAlertSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    alertRepeatSeconds: clampAlertRepeatSeconds(settings.alertRepeatSeconds),
    alertVolume: clampAlertVolume(settings.alertVolume),
  }
}
