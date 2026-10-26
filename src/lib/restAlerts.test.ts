// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: vi.fn(async () => true),
  requestPermission: vi.fn(async () => 'granted'),
  sendNotification: vi.fn(),
}))

import { initializeAlertAudio, resetAlertAudioForTests, startAlertLoop, stopAlertLoop } from './restAlerts'
import { DEFAULT_SETTINGS } from '../types'

const defaultSettings = DEFAULT_SETTINGS

class FakeGainParam {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class FakeGainNode {
  gain = new FakeGainParam()
  connect() {}
}

class FakeDynamicsCompressorNode {
  connect() {}
}

class FakeOscillatorNode {
  frequency = {
    setValueAtTime: () => {},
  }
  type: OscillatorType = 'sine'
  connect() {}
  start() {}
  stop() {}
}

class FakeAudioContext {
  state: AudioContextState = 'suspended'
  currentTime = 0
  destination = {}
  createOscillator = vi.fn(() => new FakeOscillatorNode())
  createGain = vi.fn(() => new FakeGainNode())
  createDynamicsCompressor = vi.fn(() => new FakeDynamicsCompressorNode())
  resume = vi.fn(async () => {
    this.state = 'running'
  })
}

describe('restAlerts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    stopAlertLoop()
    resetAlertAudioForTests()
    vi.useRealTimers()
    vi.restoreAllMocks()
    Reflect.deleteProperty(globalThis, 'AudioContext')
  })

  it('waits for the audio context to resume before scheduling tones', async () => {
    let resolveResume: (() => void) | null = null
    let fakeContext: FakeAudioContext | null = null
    class MockAudioContext extends FakeAudioContext {
      constructor() {
        super()
        fakeContext = this
        this.resume.mockImplementation(() => new Promise<void>((resolve) => {
          resolveResume = () => {
            this.state = 'running'
            resolve()
          }
        }))
      }
    }

    ;(globalThis as typeof globalThis & { AudioContext?: typeof AudioContext }).AudioContext =
      MockAudioContext as unknown as typeof AudioContext

    startAlertLoop('task-finished:test', defaultSettings)
    await Promise.resolve()

    expect(fakeContext).not.toBeNull()
    expect(fakeContext!.createOscillator).not.toHaveBeenCalled()

    expect(resolveResume).not.toBeNull()
    resolveResume!()
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(0)

    expect(fakeContext!.createOscillator).toHaveBeenCalled()
  })

  it('unlocks audio on click inside the current window runtime', async () => {
    let fakeContext: FakeAudioContext | null = null
    class MockAudioContext extends FakeAudioContext {
      constructor() {
        super()
        fakeContext = this
      }
    }

    ;(globalThis as typeof globalThis & { AudioContext?: typeof AudioContext }).AudioContext =
      MockAudioContext as unknown as typeof AudioContext

    initializeAlertAudio()
    expect(fakeContext).toBeNull()
    window.dispatchEvent(new MouseEvent('click'))
    await Promise.resolve()

    expect(fakeContext).not.toBeNull()
    expect(fakeContext!.resume).toHaveBeenCalledTimes(1)
  })
})
