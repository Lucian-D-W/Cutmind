import { describe, expect, it } from 'vitest'
import { PRESET_TIMER_MINUTES, normalizeCustomTimerMinutes } from './taskTimer'

describe('taskTimer', () => {
  it('uses the updated preset timer options', () => {
    expect(PRESET_TIMER_MINUTES).toEqual([20, 30, 45, 60, 90])
  })

  it('normalizes custom timer values from text input', () => {
    expect(normalizeCustomTimerMinutes('')).toBeNull()
    expect(normalizeCustomTimerMinutes('0')).toBeNull()
    expect(normalizeCustomTimerMinutes('-5')).toBeNull()
    expect(normalizeCustomTimerMinutes(' 25 ')).toBe(25)
    expect(normalizeCustomTimerMinutes('90.8')).toBe(90)
    expect(normalizeCustomTimerMinutes('abc')).toBeNull()
  })
})
