import { describe, expect, it } from 'vitest'
import type { WindowMonitor } from '../platform/runtime/types'
import { fitWindowSize, logicalWorkArea, restoredWindowSize } from './windowGeometry'

const monitor = (scaleFactor: number): WindowMonitor => ({
  name: 'Windows monitor',
  scaleFactor,
  position: { x: 0, y: 0 },
  size: { width: 3072, height: 1920 },
  workArea: { position: { x: 0, y: 0 }, size: { width: 3072, height: 1824 } },
})

describe('DPI-aware window geometry', () => {
  it.each([1, 1.25, 1.5, 2])('converts the screen work area at scale %s', scale => {
    const area = logicalWorkArea(monitor(scale))
    expect(area.width * scale).toBe(3072)
    expect(area.height * scale).toBe(1824)
  })

  it('restores old physical sizes once, without growing after another hide and reopen', () => {
    const fallback = { width: 442, height: 374 }
    const oldState = { x: 100, y: 100, width: 884, height: 748 }
    const first = restoredWindowSize(oldState, fallback, monitor(2))
    expect(first).toEqual(fallback)
    const saved = { ...oldState, ...first, sizeUnit: 'logical' as const }
    expect(restoredWindowSize(saved, fallback, monitor(2))).toEqual(first)
    expect(restoredWindowSize(saved, fallback, monitor(1.25))).toEqual(first)
  })

  it('does not divide default sizes when an old record has no valid bounds', () => {
    const fallback = { width: 442, height: 374 }
    expect(restoredWindowSize(null, fallback, monitor(2))).toEqual(fallback)
    expect(restoredWindowSize({ x: 0, y: 0, width: NaN, height: -1 }, fallback, monitor(2)))
      .toEqual(fallback)
  })

  it('fits a decorated settings window inside a small high-DPI work area', () => {
    const screen = monitor(2)
    screen.workArea.size = { width: 1366, height: 768 }
    const size = fitWindowSize({ width: 960, height: 820 }, screen, { width: 16, height: 40 })
    expect(size).toEqual({ width: 643, height: 320 })
    expect((size.height + 40 + 24) * 2).toBeLessThanOrEqual(768)
  })

  it('retains negative screen origins in logical coordinates', () => {
    const screen = monitor(1.5)
    screen.workArea.position = { x: -1920, y: -300 }
    expect(logicalWorkArea(screen)).toMatchObject({ x: -1280, y: -200 })
  })
})
