import type { RuntimeKind } from './types'

function runtimeHost() {
  return globalThis as typeof globalThis & {
    __TAURI_INTERNALS__?: unknown
    __TAURI__?: unknown
    isTauri?: unknown
  }
}

export function hasNativeTauriGlobals() {
  const host = runtimeHost()
  return Boolean(host.__TAURI_INTERNALS__ || host.__TAURI__ || host.isTauri)
}

export function detectRuntime(): RuntimeKind {
  return hasNativeTauriGlobals() ? 'tauri' : 'browser'
}

export async function waitForTauriRuntime(timeoutMs = 300, intervalMs = 25) {
  if (hasNativeTauriGlobals()) return true
  if (typeof window === 'undefined') return false

  const startedAt = Date.now()

  return await new Promise<boolean>(resolve => {
    const tick = () => {
      if (hasNativeTauriGlobals()) {
        resolve(true)
        return
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve(false)
        return
      }

      window.setTimeout(tick, intervalMs)
    }

    tick()
  })
}
