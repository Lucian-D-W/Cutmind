import { describe, expect, it } from 'vitest'
import { clampAlertRepeatSeconds, clampAlertVolume } from './alertSettings'

describe('alertSettings', () => {
  it('clamps repeat seconds into a sane range', () => {
    expect(clampAlertRepeatSeconds(0)).toBe(1)
    expect(clampAlertRepeatSeconds(2.4)).toBe(2)
    expect(clampAlertRepeatSeconds(45)).toBe(30)
  })

  it('clamps alert volume into the 0-100 range', () => {
    expect(clampAlertVolume(-10)).toBe(0)
    expect(clampAlertVolume(62.6)).toBe(63)
    expect(clampAlertVolume(140)).toBe(100)
  })
})
