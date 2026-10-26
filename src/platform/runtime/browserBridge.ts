import { monitorEvent } from '../../monitoring/runtimeMonitor'
import { waitForTauriRuntime } from './detectRuntime'
import { createTauriBridge } from './tauriBridge'
import {
  type CapabilityResult,
  capabilityFailure,
  type OpenDirectoryOptions,
  type RuntimeBridge,
  type SaveFileOptions,
} from './types'

function unsupportedMessage(action: string) {
  return `${action} requires the Cutmind desktop window.`
}

function unsupported<T>(action: string) {
  monitorEvent('runtime', `${action}:unsupported-in-browser`, {
    runtime: 'browser',
    href: typeof window === 'undefined' ? '' : window.location.href,
  }, 'warn')

  return capabilityFailure<T>('requires_desktop_runtime', unsupportedMessage(action))
}

async function delegateIfTauriReady<T>(
  action: string,
  runInTauri: () => Promise<CapabilityResult<T>>,
): Promise<CapabilityResult<T> | null> {
  const runtimeReady = await waitForTauriRuntime()
  if (!runtimeReady) return null

  monitorEvent('runtime', `${action}:promoted-to-tauri`, {
    runtime: 'browser',
  }, 'warn')
  return await runInTauri()
}

export function createBrowserBridge(): RuntimeBridge {
  return {
    kind: 'browser',
    dialog: {
      openDirectory: async (options?: OpenDirectoryOptions) => {
        const delegated = await delegateIfTauriReady('dialog.openDirectory', () =>
          createTauriBridge().dialog.openDirectory(options),
        )
        return delegated ?? unsupported<string | null>('dialog.openDirectory')
      },
      saveFile: async (options?: SaveFileOptions) => {
        const delegated = await delegateIfTauriReady('dialog.saveFile', () =>
          createTauriBridge().dialog.saveFile(options),
        )
        return delegated ?? unsupported<string | null>('dialog.saveFile')
      },
    },
    files: {
      writeTextFile: async (path: string, content: string) => {
        const delegated = await delegateIfTauriReady('files.writeTextFile', () =>
          createTauriBridge().files.writeTextFile(path, content),
        )
        return delegated ?? unsupported<void>('files.writeTextFile')
      },
    },
    backend: {
      invoke: async <T>(command: string, args?: Record<string, unknown>) => {
        const delegated = await delegateIfTauriReady('backend.invoke', () =>
          createTauriBridge().backend.invoke<T>(command, args),
        )
        return delegated ?? unsupported<T>('backend.invoke')
      },
    },
    events: {
      listen: async <T>(event: string, handler: (payload: T) => void | Promise<void>) => {
        const delegated = await delegateIfTauriReady('events.listen', () =>
          createTauriBridge().events.listen<T>(event, handler),
        )
        return delegated ?? unsupported<() => void>('events.listen')
      },
    },
    windows: {
      getCurrentWindow: async () => {
        const delegated = await delegateIfTauriReady('windows.getCurrentWindow', () =>
          createTauriBridge().windows.getCurrentWindow(),
        )
        return delegated ?? unsupported('windows.getCurrentWindow')
      },
      getWindowByLabel: async (label: string) => {
        const delegated = await delegateIfTauriReady('windows.getWindowByLabel', () =>
          createTauriBridge().windows.getWindowByLabel(label),
        )
        return delegated ?? unsupported('windows.getWindowByLabel')
      },
      createWindow: async (label, options) => {
        const delegated = await delegateIfTauriReady('windows.createWindow', () =>
          createTauriBridge().windows.createWindow(label, options),
        )
        return delegated ?? unsupported('windows.createWindow')
      },
      getCurrentMonitor: async () => {
        const delegated = await delegateIfTauriReady('windows.getCurrentMonitor', () =>
          createTauriBridge().windows.getCurrentMonitor(),
        )
        return delegated ?? unsupported('windows.getCurrentMonitor')
      },
      getPrimaryMonitor: async () => {
        const delegated = await delegateIfTauriReady('windows.getPrimaryMonitor', () =>
          createTauriBridge().windows.getPrimaryMonitor(),
        )
        return delegated ?? unsupported('windows.getPrimaryMonitor')
      },
      getMonitorFromPoint: async (x: number, y: number) => {
        const delegated = await delegateIfTauriReady('windows.getMonitorFromPoint', () =>
          createTauriBridge().windows.getMonitorFromPoint(x, y),
        )
        return delegated ?? unsupported('windows.getMonitorFromPoint')
      },
    },
  }
}
