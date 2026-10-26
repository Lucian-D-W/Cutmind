import type { ManagedWindowHandle } from '../platform/runtime'

function getWindowErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'payload' in error) {
    const payload = (error as { payload?: unknown }).payload
    if (typeof payload === 'string') return payload
  }
  return 'unknown window error'
}

export async function awaitWindowReady(webview: ManagedWindowHandle, fallbackMs = 1200) {
  return await new Promise<ManagedWindowHandle>((resolve, reject) => {
    let settled = false
    const timeoutId = window.setTimeout(() => {
      if (settled) return
      settled = true
      resolve(webview)
    }, fallbackMs)

    webview.once('tauri://created', () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      resolve(webview)
    })

    webview.once('tauri://error', (event) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      reject(new Error(getWindowErrorMessage(event)))
    })
  })
}
