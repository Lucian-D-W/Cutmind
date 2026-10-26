import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHORTCUTS,
  formatShortcutLabel,
  migrateShortcutSettings,
  normalizeShortcutInput,
  normalizeShortcutSettings,
  shortcutFromKeyboardEvent,
  validateShortcutSettings,
} from './shortcuts'

describe('shortcuts', () => {
  it('normalizes shortcut strings into a stable format', () => {
    expect(normalizeShortcutInput(' Ctrl + Shift + T ')).toBe('ctrl+shift+t')
    expect(normalizeShortcutInput('CommandOrControl+K')).toBe('ctrl+k')
  })

  it('formats shortcuts for display', () => {
    expect(formatShortcutLabel('ctrl+shift+t')).toBe('Ctrl+Shift+T')
  })

  it('captures keyboard events into canonical shortcuts', () => {
    expect(shortcutFromKeyboardEvent({
      key: 'T',
      ctrlKey: true,
      altKey: false,
      shiftKey: true,
      metaKey: false,
    } as KeyboardEvent)).toBe('ctrl+shift+t')
  })

  it('validates duplicates and missing modifiers', () => {
    expect(validateShortcutSettings(normalizeShortcutSettings({
      newTask: 'ctrl+t',
      newIdea: 'ctrl+t',
      openCalendar: 'ctrl+k',
    }))).toBe('Shortcuts must be different from each other.')

    expect(validateShortcutSettings(normalizeShortcutSettings({
      newTask: 't',
      newIdea: 'ctrl+i',
      openCalendar: 'ctrl+k',
    }))).toBe('Each shortcut needs at least one modifier key.')
  })

  it('migrates the old open calendar default away from a known conflict', () => {
    expect(migrateShortcutSettings({
      newTask: 'ctrl+shift+t',
      newIdea: 'ctrl+shift+i',
      openCalendar: 'ctrl+shift+k',
    })).toEqual(DEFAULT_SHORTCUTS)
  })
})
