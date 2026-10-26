import { getRuntimeBridge, type WindowMonitor } from '../platform/runtime'
import type { IdeaBox } from '../types'
import { IDEA_WINDOW_DEFAULT_SIZE } from './windowSizes'
import { awaitWindowReady } from './windowReady'
import { restoredWindowSize } from './windowGeometry'

interface OpenIdeaWindowOptions {
  x?: number
  y?: number
}

interface PhysicalPosition {
  x: number
  y: number
}

interface PhysicalSize {
  width: number
  height: number
}

export interface IdeaTrayEntry {
  id: string
  title: string
  isVisible: boolean
}

export function getIdeaWindowLabel(ideaId: string) {
  return `idea-${ideaId}`
}

function clampIdeaWindowToMonitor(
  position: PhysicalPosition,
  monitor: WindowMonitor,
  windowSize: PhysicalSize = IDEA_WINDOW_DEFAULT_SIZE,
) {
  const scaleFactor = monitor.scaleFactor || 1
  const windowWidth = windowSize.width * scaleFactor
  const windowHeight = windowSize.height * scaleFactor
  const minX = monitor.workArea.position.x
  const minY = monitor.workArea.position.y
  const frameGap = 24 * scaleFactor
  const maxX = minX + Math.max(0, monitor.workArea.size.width - windowWidth - frameGap)
  const maxY = minY + Math.max(0, monitor.workArea.size.height - windowHeight - frameGap)

  return {
    x: Math.min(Math.max(position.x, minX), maxX),
    y: Math.min(Math.max(position.y, minY), maxY),
    scaleFactor,
  }
}

async function resolveIdeaWindowPositionWithSize(
  options: OpenIdeaWindowOptions,
  windowSize: PhysicalSize = IDEA_WINDOW_DEFAULT_SIZE,
  state?: IdeaBox['windowState'],
) {
  const runtimeBridge = getRuntimeBridge()
  const hasPosition = Number.isFinite(options.x) && Number.isFinite(options.y)
  const pointMonitor = hasPosition
    ? await runtimeBridge.windows.getMonitorFromPoint(options.x!, options.y!)
    : null
  const currentMonitorResult = await runtimeBridge.windows.getCurrentMonitor()
  const primaryMonitorResult = await runtimeBridge.windows.getPrimaryMonitor()
  const monitor = pointMonitor?.ok && pointMonitor.value
    ? pointMonitor.value
    : currentMonitorResult.ok && currentMonitorResult.value
    ? currentMonitorResult.value
    : primaryMonitorResult.ok
      ? primaryMonitorResult.value
      : null
  if (!monitor) {
    return {
      ...restoredWindowSize(state, windowSize, null),
      x: 240 + Math.random() * 320,
      y: 180 + Math.random() * 240,
    }
  }

  const scaleFactor = monitor.scaleFactor || 1
  const defaultPhysicalPosition = {
    x: monitor.workArea.position.x + (64 + Math.random() * 120) * scaleFactor,
    y: monitor.workArea.position.y + (64 + Math.random() * 120) * scaleFactor,
  }
  const size = restoredWindowSize(state, windowSize, monitor)
  const fitted = clampIdeaWindowToMonitor(
    hasPosition ? { x: options.x!, y: options.y! } : defaultPhysicalPosition,
    monitor,
    size,
  )

  return {
    ...size,
    x: fitted.x / fitted.scaleFactor,
    y: fitted.y / fitted.scaleFactor,
  }
}

export async function openIdeaWindow(idea: IdeaBox, options: OpenIdeaWindowOptions = {}) {
  const runtimeBridge = getRuntimeBridge()
  const label = getIdeaWindowLabel(idea.id)
  const existingResult = await runtimeBridge.windows.getWindowByLabel(label)
  if (!existingResult.ok) {
    throw new Error(existingResult.message)
  }

  const existing = existingResult.value
  if (existing) {
    await existing.show()
    await existing.unminimize()
    await existing.setAlwaysOnTop(idea.isPinned)
    await existing.setFocus()
    return existing
  }

  const position = await resolveIdeaWindowPositionWithSize({
    x: typeof options.x === 'number' ? options.x : idea.windowState?.x,
    y: typeof options.y === 'number' ? options.y : idea.windowState?.y,
  }, IDEA_WINDOW_DEFAULT_SIZE, idea.windowState)
  const createdResult = await runtimeBridge.windows.createWindow(label, {
    url: `/?view=idea&id=${idea.id}`,
    title: idea.title || 'Idea',
    width: position.width,
    height: position.height,
    x: position.x,
    y: position.y,
    decorations: false,
    transparent: true,
    alwaysOnTop: idea.isPinned,
    skipTaskbar: true,
    resizable: true,
    maximizable: false,
    preventOverflow: true,
  })
  if (!createdResult.ok) {
    throw new Error(createdResult.message)
  }

  return await awaitWindowReady(createdResult.value)
}

export async function closeIdeaWindow(ideaId: string) {
  const runtimeBridge = getRuntimeBridge()
  const existingResult = await runtimeBridge.windows.getWindowByLabel(getIdeaWindowLabel(ideaId))
  if (!existingResult.ok) {
    throw new Error(existingResult.message)
  }

  const existing = existingResult.value
  if (!existing) return
  await existing.destroy()
}

export async function syncIdeaTrayMenu(ideas: Record<string, IdeaBox>) {
  const runtimeBridge = getRuntimeBridge()
  const entries: IdeaTrayEntry[] = Object.values(ideas)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(idea => ({
      id: idea.id,
      title: idea.title || 'Untitled Idea',
      isVisible: idea.isVisible,
    }))

  const result = await runtimeBridge.backend.invoke<void>('sync_idea_tray_menu', { ideas: entries })
  if (!result.ok) {
    throw new Error(result.message)
  }
}
