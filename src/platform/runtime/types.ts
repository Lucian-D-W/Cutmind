export type RuntimeKind = 'tauri' | 'browser'

export type CapabilityFailureReason =
  | 'requires_desktop_runtime'
  | 'window_unavailable'
  | 'native_api_failed'
  | 'dialog_cancelled'
  | 'unsupported_in_browser'

export type CapabilityResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: CapabilityFailureReason; message: string }

export interface DialogFilter {
  name: string
  extensions: string[]
}

export interface OpenDirectoryOptions {
  defaultPath?: string
}

export interface SaveFileOptions {
  defaultPath?: string
  filters?: DialogFilter[]
}

export interface PhysicalPosition {
  x: number
  y: number
}

export interface PhysicalSize {
  width: number
  height: number
}

export interface WindowMonitor {
  name: string | null
  position: PhysicalPosition
  size: PhysicalSize
  workArea: {
    position: PhysicalPosition
    size: PhysicalSize
  }
  scaleFactor: number
}

export interface CloseRequestedLikeEvent {
  preventDefault: () => void
}

export interface CurrentWindowHandle {
  label: string
  minimize: () => Promise<void>
  close: () => Promise<void>
  destroy: () => Promise<void>
  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>
  setTitle: (title: string) => Promise<void>
  startDragging: () => Promise<void>
  outerPosition: () => Promise<PhysicalPosition>
  outerSize?: () => Promise<PhysicalSize>
  innerSize?: () => Promise<PhysicalSize>
  scaleFactor?: () => Promise<number>
  onCloseRequested: (handler: (event: CloseRequestedLikeEvent) => void | Promise<void>) => Promise<() => void>
  applyGlassSurface: (opacity: number) => Promise<void>
}

export interface ManagedWindowHandle {
  label: string
  show: () => Promise<void>
  unminimize: () => Promise<void>
  setFocus: () => Promise<void>
  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>
  close: () => Promise<void>
  destroy: () => Promise<void>
  once: (event: 'tauri://created' | 'tauri://error', handler: (event?: unknown) => void) => void
}

export interface CreateWindowOptions {
  url: string
  title: string
  width: number
  height: number
  x: number
  y: number
  decorations: boolean
  transparent: boolean
  alwaysOnTop: boolean
  skipTaskbar: boolean
  resizable?: boolean
  maximizable?: boolean
  preventOverflow?: boolean
}

export interface RuntimeBridge {
  kind: RuntimeKind
  dialog: {
    openDirectory: (options?: OpenDirectoryOptions) => Promise<CapabilityResult<string | null>>
    saveFile: (options?: SaveFileOptions) => Promise<CapabilityResult<string | null>>
  }
  files: {
    writeTextFile: (path: string, content: string) => Promise<CapabilityResult<void>>
  }
  backend: {
    invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<CapabilityResult<T>>
  }
  events: {
    listen: <T>(event: string, handler: (payload: T) => void | Promise<void>) => Promise<CapabilityResult<() => void>>
  }
  windows: {
    getCurrentWindow: () => Promise<CapabilityResult<CurrentWindowHandle>>
    getWindowByLabel: (label: string) => Promise<CapabilityResult<ManagedWindowHandle | null>>
    createWindow: (label: string, options: CreateWindowOptions) => Promise<CapabilityResult<ManagedWindowHandle>>
    getCurrentMonitor: () => Promise<CapabilityResult<WindowMonitor | null>>
    getPrimaryMonitor: () => Promise<CapabilityResult<WindowMonitor | null>>
    getMonitorFromPoint: (x: number, y: number) => Promise<CapabilityResult<WindowMonitor | null>>
  }
}

export function capabilitySuccess<T>(value: T): CapabilityResult<T> {
  return { ok: true, value }
}

export function capabilityFailure<T>(
  reason: CapabilityFailureReason,
  message: string,
): CapabilityResult<T> {
  return { ok: false, reason, message }
}
