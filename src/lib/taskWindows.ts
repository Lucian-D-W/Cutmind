import { getRuntimeBridge, type WindowMonitor } from '../platform/runtime'
import { useTaskStore } from '../stores/taskStore'
import { TASK_WINDOW_DEFAULT_SIZE } from './windowSizes'
import { awaitWindowReady } from './windowReady'
import { fitWindowSize } from './windowGeometry'

interface OpenTaskWindowOptions {
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

export function clampTaskWindowToMonitor(
  position: PhysicalPosition,
  monitor: WindowMonitor,
  windowSize: PhysicalSize = TASK_WINDOW_DEFAULT_SIZE,
) {
  const scaleFactor = monitor.scaleFactor || 1
  const windowWidth = windowSize.width * scaleFactor
  const windowHeight = windowSize.height * scaleFactor
  const minX = monitor.workArea.position.x
  const minY = monitor.workArea.position.y
  // Constructor sizes describe the client area. Leave room for the native
  // resize frame, including the invisible Windows border on undecorated windows.
  const frameGap = 24 * scaleFactor
  const maxX = minX + Math.max(0, monitor.workArea.size.width - windowWidth - frameGap)
  const maxY = minY + Math.max(0, monitor.workArea.size.height - windowHeight - frameGap)

  return {
    x: Math.min(Math.max(position.x, minX), maxX),
    y: Math.min(Math.max(position.y, minY), maxY),
    scaleFactor,
  }
}

async function resolveWindowPosition(options: OpenTaskWindowOptions) {
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
      ...TASK_WINDOW_DEFAULT_SIZE,
      x: 200 + Math.random() * 400,
      y: 200 + Math.random() * 300,
    }
  }

  const scaleFactor = monitor.scaleFactor || 1
  const defaultPhysicalPosition = {
    x: monitor.workArea.position.x + 48 * scaleFactor,
    y: monitor.workArea.position.y + 48 * scaleFactor,
  }
  const size = fitWindowSize(TASK_WINDOW_DEFAULT_SIZE, monitor)
  const clamped = clampTaskWindowToMonitor(
    hasPosition ? { x: options.x!, y: options.y! } : defaultPhysicalPosition,
    monitor,
    size,
  )

  return {
    ...size,
    x: clamped.x / clamped.scaleFactor,
    y: clamped.y / clamped.scaleFactor,
  }
}

function resolveTaskPinnedState(taskId: string) {
  return useTaskStore.getState().tasks[taskId]?.isPinned ?? true
}

export async function openTaskWindow(taskId: string, options: OpenTaskWindowOptions = {}) {
  const runtimeBridge = getRuntimeBridge()
  const label = `task-${taskId}`
  const isPinned = resolveTaskPinnedState(taskId)
  const existingResult = await runtimeBridge.windows.getWindowByLabel(label)
  if (!existingResult.ok) {
    throw new Error(existingResult.message)
  }

  const existing = existingResult.value
  if (existing) {
    await existing.show()
    await existing.unminimize()
    await existing.setAlwaysOnTop(isPinned)
    await existing.setFocus()
    return existing
  }

  const position = await resolveWindowPosition(options)
  const createdResult = await runtimeBridge.windows.createWindow(label, {
    url: `/?view=task&id=${taskId}`,
    title: 'Task',
    width: position.width,
    height: position.height,
    x: position.x,
    y: position.y,
    decorations: false,
    transparent: true,
    alwaysOnTop: isPinned,
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
