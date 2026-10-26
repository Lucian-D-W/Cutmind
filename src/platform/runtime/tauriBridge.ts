import { monitorError, monitorEvent } from '../../monitoring/runtimeMonitor'
import { waitForTauriRuntime } from './detectRuntime'
import {
  capabilityFailure,
  capabilitySuccess,
  type CapabilityResult,
  type CreateWindowOptions,
  type CurrentWindowHandle,
  type ManagedWindowHandle,
  type RuntimeBridge,
  type WindowMonitor,
} from './types'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return String(error)
}

function normalizeMonitor(monitor: any): WindowMonitor {
  return {
    name: monitor?.name ?? null,
    position: {
      x: monitor?.position?.x ?? 0,
      y: monitor?.position?.y ?? 0,
    },
    size: {
      width: monitor?.size?.width ?? 0,
      height: monitor?.size?.height ?? 0,
    },
    workArea: {
      position: {
        x: monitor?.workArea?.position?.x ?? 0,
        y: monitor?.workArea?.position?.y ?? 0,
      },
      size: {
        width: monitor?.workArea?.size?.width ?? 0,
        height: monitor?.workArea?.size?.height ?? 0,
      },
    },
    scaleFactor: monitor?.scaleFactor ?? 1,
  }
}

function wrapManagedWindow(windowHandle: any): ManagedWindowHandle {
  return {
    label: windowHandle.label,
    show: () => windowHandle.show(),
    unminimize: () => windowHandle.unminimize(),
    setFocus: () => windowHandle.setFocus(),
    setAlwaysOnTop: (alwaysOnTop: boolean) => windowHandle.setAlwaysOnTop(alwaysOnTop),
    close: () => windowHandle.close(),
    destroy: () => windowHandle.destroy(),
    once: (event, handler) => windowHandle.once(event, handler),
  }
}

function wrapCurrentWindow(windowHandle: any, webviewHandle: any): CurrentWindowHandle {
  return {
    label: windowHandle.label,
    minimize: () => windowHandle.minimize(),
    close: () => windowHandle.close(),
    destroy: () => windowHandle.destroy(),
    setAlwaysOnTop: (alwaysOnTop: boolean) => windowHandle.setAlwaysOnTop(alwaysOnTop),
    setTitle: (title: string) => windowHandle.setTitle(title),
    startDragging: () => windowHandle.startDragging(),
    outerPosition: async () => {
      const position = await windowHandle.outerPosition()
      return { x: position.x, y: position.y }
    },
    outerSize: async () => {
      const size = await windowHandle.outerSize()
      return { width: size.width, height: size.height }
    },
    innerSize: async () => {
      const size = await windowHandle.innerSize()
      return { width: size.width, height: size.height }
    },
    scaleFactor: () => windowHandle.scaleFactor(),
    onCloseRequested: (handler) =>
      windowHandle.onCloseRequested(async (event: { preventDefault: () => void }) => {
        await handler({
          preventDefault: () => event.preventDefault(),
        })
      }),
    applyGlassSurface: async (opacity: number) => {
      if (opacity <= 0) {
        await webviewHandle.setBackgroundColor(null)
        try {
          await windowHandle.setEffects({ effects: ['blur'] as const })
        } catch {
          try {
            await windowHandle.setEffects({ effects: ['acrylic'] as const })
          } catch {
            await windowHandle.setEffects({ effects: ['mica'] as const })
          }
        }
        await windowHandle.setShadow(true)
        return
      }

      await webviewHandle.setBackgroundColor({
        red: 255,
        green: 255,
        blue: 255,
        alpha: 255,
      })
      await windowHandle.clearEffects()
      await windowHandle.setShadow(true)
    },
  }
}

async function runCapability<T>(
  capability: string,
  action: () => Promise<T>,
  slowMs = 1600,
): Promise<CapabilityResult<T>> {
  const startedAt = Date.now()
  monitorEvent('runtime', `${capability}:start`, {
    runtime: 'tauri',
  })

  const runtimeReady = await waitForTauriRuntime()
  if (!runtimeReady) {
    const message = `${capability} requires the Cutmind desktop runtime.`
    monitorEvent('runtime', `${capability}:runtime-unavailable`, {
      runtime: 'tauri',
      durationMs: Date.now() - startedAt,
    }, 'warn')
    return capabilityFailure<T>('requires_desktop_runtime', message)
  }

  let slowTimer: number | null = null

  try {
    slowTimer = window.setTimeout(() => {
      monitorEvent('runtime', `${capability}:slow`, {
        runtime: 'tauri',
        durationMs: Date.now() - startedAt,
      }, 'warn')
    }, slowMs)

    const value = await action()
    if (slowTimer !== null) {
      window.clearTimeout(slowTimer)
    }

    monitorEvent('runtime', `${capability}:success`, {
      runtime: 'tauri',
      durationMs: Date.now() - startedAt,
    })
    return capabilitySuccess(value)
  } catch (error) {
    if (slowTimer !== null) {
      window.clearTimeout(slowTimer)
    }

    monitorError('runtime', error, {
      capability,
      runtime: 'tauri',
      durationMs: Date.now() - startedAt,
    })
    return capabilityFailure<T>('native_api_failed', getErrorMessage(error))
  }
}

export function createTauriBridge(): RuntimeBridge {
  return {
    kind: 'tauri',
    dialog: {
      openDirectory: async (options) =>
        runCapability('dialog.openDirectory', async () => {
          const { open } = await import('@tauri-apps/plugin-dialog')
          const selected = await open({
            directory: true,
            multiple: false,
            defaultPath: options?.defaultPath,
          })

          if (Array.isArray(selected)) {
            return selected[0] ?? null
          }

          return selected ?? null
        }),
      saveFile: async (options) =>
        runCapability('dialog.saveFile', async () => {
          const { save } = await import('@tauri-apps/plugin-dialog')
          return await save({
            defaultPath: options?.defaultPath,
            filters: options?.filters,
          })
        }),
    },
    files: {
      writeTextFile: async (path, content) =>
        runCapability('files.writeTextFile', async () => {
          const { writeTextFile } = await import('@tauri-apps/plugin-fs')
          await writeTextFile(path, content)
        }),
    },
    backend: {
      invoke: async <T>(command: string, args?: Record<string, unknown>) =>
        runCapability(`backend.invoke:${command}`, async () => {
          const { invoke } = await import('@tauri-apps/api/core')
          return await invoke<T>(command, args)
        }),
    },
    events: {
      listen: async <T>(event: string, handler: (payload: T) => void | Promise<void>) =>
        runCapability('events.listen', async () => {
          const { listen } = await import('@tauri-apps/api/event')
          return await listen<T>(event, async ({ payload }) => {
            await handler(payload)
          })
        }),
    },
    windows: {
      getCurrentWindow: async () =>
        runCapability('windows.getCurrentWindow', async () => {
          const [{ getCurrentWindow }, { getCurrentWebview }] = await Promise.all([
            import('@tauri-apps/api/window'),
            import('@tauri-apps/api/webview'),
          ])
          return wrapCurrentWindow(getCurrentWindow(), getCurrentWebview())
        }),
      getWindowByLabel: async (label) =>
        runCapability('windows.getWindowByLabel', async () => {
          const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
          const existing = await WebviewWindow.getByLabel(label)
          return existing ? wrapManagedWindow(existing) : null
        }),
      createWindow: async (label, options: CreateWindowOptions) =>
        runCapability('windows.createWindow', async () => {
          const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
          const created = new WebviewWindow(label, options)
          return wrapManagedWindow(created)
        }),
      getCurrentMonitor: async () =>
        runCapability('windows.getCurrentMonitor', async () => {
          const { currentMonitor } = await import('@tauri-apps/api/window')
          const monitor = await currentMonitor()
          return monitor ? normalizeMonitor(monitor) : null
        }),
      getPrimaryMonitor: async () =>
        runCapability('windows.getPrimaryMonitor', async () => {
          const { primaryMonitor } = await import('@tauri-apps/api/window')
          const monitor = await primaryMonitor()
          return monitor ? normalizeMonitor(monitor) : null
        }),
      getMonitorFromPoint: async (x, y) =>
        runCapability('windows.getMonitorFromPoint', async () => {
          const { monitorFromPoint } = await import('@tauri-apps/api/window')
          const monitor = await monitorFromPoint(x, y)
          return monitor ? normalizeMonitor(monitor) : null
        }),
    },
  }
}
