import {
  COLOR_PALETTE,
  DUNHUANG_COLOR_PALETTE,
  EARTH_COLOR_PALETTE,
  MACARON_COLOR_PALETTE,
  MORANDI_COLOR_PALETTE,
} from './colors'
import { describe, expect, it } from 'vitest'

describe('COLOR_PALETTE', () => {
  it('contains only the curated macaron, morandi, dunhuang, and earth presets', () => {
    expect(MACARON_COLOR_PALETTE).toHaveLength(5)
    expect(MORANDI_COLOR_PALETTE).toHaveLength(10)
    expect(DUNHUANG_COLOR_PALETTE).toHaveLength(7)
    expect(EARTH_COLOR_PALETTE).toHaveLength(7)
    expect(COLOR_PALETTE).toHaveLength(29)
  })

  it('does not include duplicate swatches across the curated groups', () => {
    expect(new Set(COLOR_PALETTE).size).toBe(COLOR_PALETTE.length)
  })

  it('removes the original vivid built-in colors from the background palette', () => {
    expect(COLOR_PALETTE).not.toEqual(expect.arrayContaining([
      '#e94560',
      '#ff6b6b',
      '#ffa502',
      '#ffd93d',
      '#6bcb77',
      '#4d96ff',
      '#9b59b6',
      '#1abc9c',
      '#2d3436',
      '#636e72',
    ]))
  })

  it('includes the requested macaron, morandi, dunhuang, and earth swatches', () => {
    expect(COLOR_PALETTE).toEqual(expect.arrayContaining([
      '#FFB7B2',
      '#C7CEEA',
      '#7E8D98',
      '#E8DED3',
      '#2B5E72',
      '#1B5E20',
      '#606C38',
      '#756F61',
    ]))
  })
})
