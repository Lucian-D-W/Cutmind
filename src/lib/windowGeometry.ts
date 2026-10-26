import type { WindowMonitor } from '../platform/runtime/types'
import type { WindowState } from '../types'

export interface LogicalWindowSize {
  width: number
  height: number
}

export function monitorScale(monitor: WindowMonitor | null | undefined) {
  const scale = monitor?.scaleFactor
  return typeof scale === 'number' && Number.isFinite(scale) && scale > 0 ? scale : 1
}

export function logicalWorkArea(monitor: WindowMonitor) {
  const scale = monitorScale(monitor)
  return {
    x: monitor.workArea.position.x / scale,
    y: monitor.workArea.position.y / scale,
    width: monitor.workArea.size.width / scale,
    height: monitor.workArea.size.height / scale,
  }
}

export function fitWindowSize(
  size: LogicalWindowSize,
  monitor: WindowMonitor | null,
  frame = { width: 0, height: 0 },
) {
  if (!monitor) return size
  const area = logicalWorkArea(monitor)
  return {
    width: Math.min(size.width, Math.max(1, area.width - 24 - frame.width)),
    height: Math.min(size.height, Math.max(1, area.height - 24 - frame.height)),
  }
}

export function restoredWindowSize(
  state: WindowState | null | undefined,
  fallback: LogicalWindowSize,
  monitor: WindowMonitor | null,
) {
  // Earlier releases saved physical bounds. Positions remain physical; only
  // dimensions are converted for Tauri's logical window-constructor options.
  const divisor = state?.sizeUnit === 'logical' ? 1 : monitorScale(monitor)
  const validDimension = (value: number | undefined, defaultValue: number) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0
      ? value / divisor
      : defaultValue
  return fitWindowSize({
    width: validDimension(state?.width, fallback.width),
    height: validDimension(state?.height, fallback.height),
  }, monitor)
}
