import type { AppSettings } from '../types'

export type ShortcutSettings = AppSettings['shortcuts']
export type ShortcutField = keyof ShortcutSettings

export const DEFAULT_SHORTCUTS: ShortcutSettings = {
  newTask: 'ctrl+shift+t',
  newIdea: 'ctrl+shift+i',
  openCalendar: 'ctrl+alt+c',
}

const LEGACY_OPEN_CALENDAR_SHORTCUT = 'ctrl+shift+k'

const MODIFIER_LABELS: Record<string, string> = {
  ctrl: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
  super: 'Super',
}

const KEY_ALIASES: Record<string, string> = {
  control: 'ctrl',
  meta: 'super',
  command: 'super',
  commandorcontrol: 'ctrl',
  cmdorctrl: 'ctrl',
  // Normalize to the exact names tauri_plugin_global_shortcut expects
  escape: 'Escape',
  esc: 'Escape',
  ' ': 'Space',
  space: 'Space',
  enter: 'Return',
  return: 'Return',
  backspace: 'Backspace',
  delete: 'Delete',
  tab: 'Tab',
  arrowup: 'Up',
  arrowdown: 'Down',
  arrowleft: 'Left',
  arrowright: 'Right',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  home: 'Home',
  end: 'End',
  insert: 'Insert',
}

export function normalizeShortcutInput(input: string) {
  return input
    .split('+')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean)
    .map(part => KEY_ALIASES[part] ?? part)
    .join('+')
}

export function normalizeShortcutSettings(shortcuts: ShortcutSettings): ShortcutSettings {
  return {
    newTask: normalizeShortcutInput(shortcuts.newTask),
    newIdea: normalizeShortcutInput(shortcuts.newIdea),
    openCalendar: normalizeShortcutInput(shortcuts.openCalendar),
  }
}

export function migrateShortcutSettings(shortcuts: ShortcutSettings): ShortcutSettings {
  const normalized = normalizeShortcutSettings(shortcuts)
  if (normalized.openCalendar === LEGACY_OPEN_CALENDAR_SHORTCUT) {
    return {
      ...normalized,
      openCalendar: DEFAULT_SHORTCUTS.openCalendar,
    }
  }
  return normalized
}

export function formatShortcutLabel(shortcut: string) {
  return normalizeShortcutInput(shortcut)
    .split('+')
    .filter(Boolean)
    .map(part => MODIFIER_LABELS[part] ?? (part.length === 1 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join('+')
}

export function validateShortcutSettings(shortcuts: ShortcutSettings) {
  const normalized = normalizeShortcutSettings(shortcuts)
  const entries = Object.entries(normalized) as Array<[ShortcutField, string]>

  for (const [, shortcut] of entries) {
    if (!shortcut) {
      return 'All shortcuts need a key combination.'
    }
    if (!shortcut.includes('+')) {
      return 'Each shortcut needs at least one modifier key.'
    }
  }

  const distinct = new Set(entries.map(([, shortcut]) => shortcut))
  if (distinct.size !== entries.length) {
    return 'Shortcuts must be different from each other.'
  }

  return null
}

function normalizeEventKey(key: string) {
  const lowered = key.toLowerCase()
  if (['control', 'shift', 'alt', 'meta'].includes(lowered)) return null
  if (lowered.length === 1) return lowered
  // F-keys must be uppercase (F1..F12) as expected by the global shortcut plugin
  if (/^f\d{1,2}$/.test(lowered)) return lowered.toUpperCase()
  return KEY_ALIASES[lowered] ?? lowered
}

// Combinations that WebView2/Chrome intercept before they reach the OS hotkey
// registration layer. Allowing these causes guaranteed registration failures.
const BLOCKED_COMBOS = new Set([
  'ctrl+t',         // new tab
  'ctrl+n',         // new window
  'ctrl+w',         // close tab
  'ctrl+shift+i',   // DevTools
  'ctrl+shift+j',   // DevTools console
  'ctrl+shift+c',   // inspect element
  'ctrl+r',         // reload
  'ctrl+shift+r',   // hard reload
  'ctrl+l',         // address bar
  'ctrl+f',         // find
  'ctrl+p',         // print
  'alt+f4',         // close window (OS level)
])

export function shortcutFromKeyboardEvent(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>) {
  const key = normalizeEventKey(event.key)
  if (!key) return null

  const parts: string[] = []
  if (event.ctrlKey) parts.push('ctrl')
  if (event.altKey) parts.push('alt')
  if (event.shiftKey) parts.push('shift')
  if (event.metaKey) parts.push('super')
  parts.push(key)

  const combo = normalizeShortcutInput(parts.join('+'))
  if (BLOCKED_COMBOS.has(combo)) return null
  return combo
}
