import { getRuntimeBridge, type ManagedWindowHandle, type WindowMonitor } from '../platform/runtime'
import { awaitWindowReady } from './windowReady'
import { fitWindowSize, logicalWorkArea } from './windowGeometry'

const SETTINGS_WINDOW_LABEL = 'settings'
const SETTINGS_WINDOW_SIZE = {
  width: 960,
  height: 820,
} as const
const SETTINGS_WINDOW_FALLBACK_POSITION = {
  x: 240,
  y: 120,
} as const

let pendingSettingsWindowRequest: Promise<ManagedWindowHandle> | null = null

function centerWindowInMonitor(monitor: WindowMonitor) {
  const area = logicalWorkArea(monitor)
  // Reserve space for the native Windows frame and title bar as well as the
  // page itself. Monitor bounds are physical pixels; constructor values are logical.
  const frame = { width: 16, height: 40 }
  const { width, height } = fitWindowSize(SETTINGS_WINDOW_SIZE, monitor, frame)

  return {
    width,
    height,
    x: area.x + Math.max(0, Math.round((area.width - width - frame.width) / 2)),
    y: area.y + Math.max(0, Math.round((area.height - height - frame.height) / 2)),
  }
}

async function resolveSettingsWindowPlacement() {
  const runtimeBridge = getRuntimeBridge()
  const currentMonitorResult = typeof runtimeBridge.windows.getCurrentMonitor === 'function'
    ? await runtimeBridge.windows.getCurrentMonitor()
    : null
  const primaryMonitorResult = typeof runtimeBridge.windows.getPrimaryMonitor === 'function'
    ? await runtimeBridge.windows.getPrimaryMonitor()
    : null
  const monitor = currentMonitorResult?.ok && currentMonitorResult.value
    ? currentMonitorResult.value
    : primaryMonitorResult?.ok && primaryMonitorResult.value
      ? primaryMonitorResult.value
      : null

  if (!monitor) {
    return {
      ...SETTINGS_WINDOW_SIZE,
      ...SETTINGS_WINDOW_FALLBACK_POSITION,
    }
  }

  return centerWindowInMonitor(monitor)
}

export async function openSettingsWindow(title: string) {
  if (pendingSettingsWindowRequest) {
    return await pendingSettingsWindowRequest
  }

  const openRequest = (async () => {
    const runtimeBridge = getRuntimeBridge()
    const existingResult = await runtimeBridge.windows.getWindowByLabel(SETTINGS_WINDOW_LABEL)
    if (!existingResult.ok) {
      throw new Error(existingResult.message)
    }

    const existing = existingResult.value
    if (existing) {
      await existing.show()
      await existing.unminimize()
      await existing.setFocus()
      return existing
    }

    const placement = await resolveSettingsWindowPlacement()
    const createdResult = await runtimeBridge.windows.createWindow(SETTINGS_WINDOW_LABEL, {
      url: '/?view=settings',
      title,
      width: placement.width,
      height: placement.height,
      x: placement.x,
      y: placement.y,
      decorations: true,
      transparent: false,
      alwaysOnTop: false,
      skipTaskbar: false,
      resizable: true,
    })
    if (!createdResult.ok) {
      throw new Error(createdResult.message)
    }

    return await awaitWindowReady(createdResult.value)
  })()

  pendingSettingsWindowRequest = openRequest

  try {
    return await openRequest
  } finally {
    if (pendingSettingsWindowRequest === openRequest) {
      pendingSettingsWindowRequest = null
    }
  }
}
