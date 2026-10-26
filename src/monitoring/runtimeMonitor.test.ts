// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearMonitorEntries,
  getMonitorEntries,
  monitorEvent,
} from './runtimeMonitor'

describe('runtimeMonitor', () => {
  beforeEach(() => {
    clearMonitorEntries()
    window.localStorage.clear()
  })

  it('records monitor events and persists them for later inspection', () => {
    monitorEvent('settings', 'panel-mounted', { view: 'settings' })

    const entries = getMonitorEntries()

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      scope: 'settings',
      event: 'panel-mounted',
      level: 'info',
    })
    expect(window.localStorage.getItem('cutbrain.runtime-monitor')).toContain('panel-mounted')
  })
})
