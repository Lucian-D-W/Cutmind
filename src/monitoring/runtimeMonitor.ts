export type MonitorLevel = 'info' | 'warn' | 'error'

export interface MonitorEntry {
  id: string
  timestamp: string
  level: MonitorLevel
  scope: string
  event: string
  detail: string
}

const STORAGE_KEY = 'cutbrain.runtime-monitor'
const MAX_ENTRIES = 200

let entries: MonitorEntry[] = loadMonitorEntries()
const listeners = new Set<(entries: MonitorEntry[]) => void>()
let globalMonitorInstalled = false

function safeStringify(data: unknown) {
  if (data === undefined) return ''
  if (typeof data === 'string') return data

  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

function loadMonitorEntries() {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as MonitorEntry[] : []
  } catch {
    return []
  }
}

function persistMonitorEntries() {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Ignore storage failures; the in-memory monitor still works.
  }
}

function emitMonitorEntries() {
  const snapshot = [...entries]
  listeners.forEach(listener => listener(snapshot))
}

function createMonitorEntry(
  scope: string,
  event: string,
  detail: string,
  level: MonitorLevel,
): MonitorEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    level,
    scope,
    event,
    detail,
  }
}

export function monitorEvent(
  scope: string,
  event: string,
  data?: unknown,
  level: MonitorLevel = 'info',
) {
  const entry = createMonitorEntry(scope, event, safeStringify(data), level)
  entries = [...entries, entry].slice(-MAX_ENTRIES)
  persistMonitorEntries()
  emitMonitorEntries()
}

export function monitorError(scope: string, error: unknown, data?: unknown) {
  const detail = safeStringify({
    error: error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : error,
    context: data,
  })

  const entry = createMonitorEntry(scope, 'error', detail, 'error')
  entries = [...entries, entry].slice(-MAX_ENTRIES)
  persistMonitorEntries()
  emitMonitorEntries()
}

export function getMonitorEntries() {
  return [...entries]
}

export function clearMonitorEntries() {
  entries = []
  persistMonitorEntries()
  emitMonitorEntries()
}

export function subscribeMonitorEntries(listener: (entries: MonitorEntry[]) => void) {
  listeners.add(listener)
  listener([...entries])
  return () => {
    listeners.delete(listener)
  }
}

export function installGlobalMonitor() {
  if (globalMonitorInstalled || typeof window === 'undefined') return
  globalMonitorInstalled = true

  window.addEventListener('error', event => {
    monitorError('window', event.error ?? event.message, {
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', event => {
    monitorError('promise', event.reason, {
      type: 'unhandledrejection',
    })
  })

  ;(window as typeof window & {
    __CUTBRAIN_MONITOR__?: {
      getEntries: typeof getMonitorEntries
      clear: typeof clearMonitorEntries
    }
  }).__CUTBRAIN_MONITOR__ = {
    getEntries: getMonitorEntries,
    clear: clearMonitorEntries,
  }
}
