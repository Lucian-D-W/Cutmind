// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest'
import { detectRuntime, hasNativeTauriGlobals } from './detectRuntime'

const host = globalThis as typeof globalThis & {
  __TAURI_INTERNALS__?: unknown
  __TAURI__?: unknown
  isTauri?: unknown
}

describe('detectRuntime', () => {
  const originalInternals = host.__TAURI_INTERNALS__
  const originalTauri = host.__TAURI__
  const originalIsTauri = host.isTauri

  afterEach(() => {
    host.__TAURI_INTERNALS__ = originalInternals
    host.__TAURI__ = originalTauri
    host.isTauri = originalIsTauri
    window.history.replaceState({}, '', '/')
  })

  it('returns browser when there are no Tauri globals', () => {
    delete host.__TAURI_INTERNALS__
    delete host.__TAURI__
    delete host.isTauri

    expect(hasNativeTauriGlobals()).toBe(false)
    expect(detectRuntime()).toBe('browser')
  })

  it('still returns browser for browser-opened desktop routes', () => {
    delete host.__TAURI_INTERNALS__
    delete host.__TAURI__
    delete host.isTauri
    window.history.replaceState({}, '', '/?view=settings')

    expect(detectRuntime()).toBe('browser')
  })

  it('returns tauri when runtime globals are available', () => {
    host.isTauri = true

    expect(hasNativeTauriGlobals()).toBe(true)
    expect(detectRuntime()).toBe('tauri')
  })
})
