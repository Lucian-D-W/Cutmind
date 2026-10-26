import { useCallback, useEffect, useRef } from 'react'
import {
  applyWindowCloseBehavior,
  forceCloseWindow,
  handleWindowCloseRequested,
  type WindowCloseBehavior,
} from '../lib/windowCloseBehavior'
import { getRuntimeBridge, type CurrentWindowHandle } from '../platform/runtime'
import { monitorError, monitorEvent } from '../monitoring/runtimeMonitor'

export function useWindowCloseBehavior(
  behavior: WindowCloseBehavior,
  beforeClose?: () => void | Promise<void>,
) {
  const windowRef = useRef<CurrentWindowHandle | null>(null)
  const behaviorRef = useRef(behavior)
  const beforeCloseRef = useRef(beforeClose)
  const windowUnavailableLoggedRef = useRef(false)

  const resolveCurrentWindow = useCallback(async () => {
    if (windowRef.current) return windowRef.current

    const result = await getRuntimeBridge().windows.getCurrentWindow()
    if (result.ok) {
      windowRef.current = result.value
      monitorEvent('window-close', 'window-resolved', {
        label: result.value.label,
      })
      return result.value
    }

    if (!windowUnavailableLoggedRef.current) {
      windowUnavailableLoggedRef.current = true
      monitorEvent('window-close', 'window-unavailable', {
        stage: 'resolve-current-window',
        reason: result.reason,
        message: result.message,
      }, 'warn')
    }
    return null
  }, [])

  useEffect(() => {
    behaviorRef.current = behavior
  }, [behavior])

  useEffect(() => {
    beforeCloseRef.current = beforeClose
  }, [beforeClose])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    let disposed = false
    let resolvedWindowLabel: string | null = null
    void (async () => {
      const currentWindow = await resolveCurrentWindow()
      if (!currentWindow || disposed) return
      resolvedWindowLabel = currentWindow.label

      monitorEvent('window-close', 'listener-attached', {
        label: currentWindow.label,
        behavior: behaviorRef.current,
      })

      const stopListening = await currentWindow.onCloseRequested(async (event) => {
        monitorEvent('window-close', 'native-close-requested', {
          label: currentWindow.label,
          behavior: behaviorRef.current,
        })
        await handleWindowCloseRequested(event, {
          behavior: behaviorRef.current,
          allowClose: false,
          minimize: () => currentWindow.minimize(),
          destroy: () => currentWindow.destroy(),
          beforeClose: beforeCloseRef.current,
        })
      })

      if (disposed) {
        stopListening()
        return
      }
      unlisten = stopListening
    })().catch(error => {
      monitorError('window-close', error, {
        stage: 'attach-listener',
      })
    })

    return () => {
      disposed = true
      unlisten?.()
      monitorEvent('window-close', 'listener-detached', {
        label: resolvedWindowLabel ?? 'unresolved-window',
      })
    }
  }, [resolveCurrentWindow])

  const requestUserClose = useCallback(async () => {
    const currentWindow = await resolveCurrentWindow()
    if (!currentWindow) {
      monitorEvent('window-close', 'request-user-close-skipped', {
        reason: 'window-unavailable',
      }, 'warn')
      return
    }

    monitorEvent('window-close', 'request-user-close', {
      label: currentWindow.label,
      behavior: behaviorRef.current,
    })
    await applyWindowCloseBehavior(behaviorRef.current, {
      minimize: () => currentWindow.minimize(),
      close: () => forceCloseWindow(currentWindow, beforeCloseRef.current),
    })
  }, [resolveCurrentWindow])

  const forceClose = useCallback(async () => {
    const currentWindow = await resolveCurrentWindow()
    if (!currentWindow) {
      monitorEvent('window-close', 'force-close-skipped', {
        reason: 'window-unavailable',
      }, 'warn')
      return
    }

    monitorEvent('window-close', 'force-close', {
      label: currentWindow.label,
    })
    await forceCloseWindow(currentWindow, beforeCloseRef.current)
  }, [resolveCurrentWindow])

  return {
    requestUserClose,
    forceClose,
  }
}
