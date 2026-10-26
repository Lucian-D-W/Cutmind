export type WindowCloseBehavior = 'close' | 'minimize'

interface WindowCloseTarget {
  label: string
  destroy: () => Promise<void>
}

interface WindowMinimizeTarget {
  minimize: () => Promise<void>
}

interface CloseRequestedLikeEvent {
  preventDefault: () => void
}

export function normalizeWindowCloseBehavior(value: unknown): WindowCloseBehavior {
  return value === 'minimize' ? 'minimize' : 'close'
}

export async function applyWindowCloseBehavior(
  behavior: WindowCloseBehavior,
  actions: {
    minimize: () => Promise<void>
    close: () => Promise<void>
  },
) {
  if (behavior === 'minimize') {
    await actions.minimize()
    return
  }

  await actions.close()
}

export async function handleWindowCloseRequested(
  event: CloseRequestedLikeEvent,
  options: {
    behavior: WindowCloseBehavior
    allowClose: boolean
    minimize: () => Promise<void>
    destroy: () => Promise<void>
    beforeClose?: () => void | Promise<void>
  },
) {
  if (options.allowClose) return

  if (options.behavior === 'minimize') {
    event.preventDefault()
    await options.minimize()
    return
  }

  // behavior='close': intercept the native event and handle it ourselves
  // to avoid async handler timing issues on Windows (Tauri v2)
  event.preventDefault()
  await options.beforeClose?.()
  await options.destroy()
}

export async function forceCloseWindow(
  target: WindowCloseTarget,
  beforeClose?: () => void | Promise<void>,
) {
  await beforeClose?.()
  await target.destroy()
}

export async function minimizeWindow(target: WindowMinimizeTarget) {
  await target.minimize()
}
