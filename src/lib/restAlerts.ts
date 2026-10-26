import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import type { AppSettings } from '../types'

let audioContext: AudioContext | null = null
let ringtoneInterval: number | null = null
let audioUnlockHandlersBound = false
let currentAlertKey: string | null = null
let unlockPromise: Promise<boolean> | null = null
let alertLoopVersion = 0
let audioUnlockCleanups: Array<() => void> = []

function getAudioContext() {
  if (audioContext) return audioContext
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return null
  audioContext = new AudioContextCtor()
  return audioContext
}

async function unlockAudioContext() {
  const context = getAudioContext()
  if (!context) return false
  if (context.state === 'running') return true
  if (!unlockPromise) {
    unlockPromise = context.resume()
      .then(() => context.state === 'running')
      .catch((error) => {
        console.warn('[restAlerts] failed to resume audio context:', error)
        return false
      })
      .finally(() => {
        unlockPromise = null
      })
  }
  return unlockPromise
}

function createToneProfile(tone: AppSettings['alertTone']) {
  switch (tone) {
    case 'soft':
      return {
        type: 'sine' as OscillatorType,
        notes: [523.25],
        duration: 0.22,
        gain: 0.5,
      }
    case 'bright':
      return {
        type: 'square' as OscillatorType,
        notes: [880, 988],
        duration: 0.16,
        gain: 0.35,
      }
    case 'chime':
    default:
      return {
        type: 'triangle' as OscillatorType,
        notes: [659.25, 783.99],
        duration: 0.2,
        gain: 0.45,
      }
  }
}

function scheduleBeep(context: AudioContext, settings: AppSettings) {
  const startAt = context.currentTime
  const profile = createToneProfile(settings.alertTone)
  const volumeScale = settings.alertVolume / 100

  const compressor = context.createDynamicsCompressor()
  compressor.connect(context.destination)

  profile.notes.forEach((note, index) => {
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    const noteStart = startAt + index * 0.12
    const noteEnd = noteStart + profile.duration

    oscillator.type = profile.type
    oscillator.frequency.setValueAtTime(note, noteStart)
    oscillator.connect(gainNode)
    gainNode.connect(compressor)

    gainNode.gain.setValueAtTime(0.0001, noteStart)
    gainNode.gain.exponentialRampToValueAtTime(profile.gain * volumeScale, noteStart + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEnd)

    oscillator.start(noteStart)
    oscillator.stop(noteEnd)
  })
}

async function playBeep(settings: AppSettings) {
  const context = getAudioContext()
  if (!context || settings.alertMuted) return false

  const unlocked = await unlockAudioContext()
  if (!unlocked || context.state !== 'running') return false

  scheduleBeep(context, settings)
  return true
}

export function initializeAlertAudio() {
  if (audioUnlockHandlersBound) return
  audioUnlockHandlersBound = true

  const tryUnlock = () => {
    getAudioContext()
    void unlockAudioContext()
  }

  const bindUnlock = (eventName: 'pointerdown' | 'click' | 'keydown') => {
    window.addEventListener(eventName, tryUnlock, { passive: true })
    audioUnlockCleanups.push(() => {
      window.removeEventListener(eventName, tryUnlock)
    })
  }

  bindUnlock('pointerdown')
  bindUnlock('click')
  bindUnlock('keydown')
}

export async function sendAlertNotification(title: string, body: string) {
  try {
    let permissionGranted = await isPermissionGranted()
    if (!permissionGranted) {
      permissionGranted = (await requestPermission()) === 'granted'
    }
    if (permissionGranted) {
      sendNotification({
        title,
        body,
      })
    }
  } catch (error) {
    console.warn('[restAlerts] notification failed:', error)
  }
}

export function startAlertLoop(alertKey: string, settings: AppSettings) {
  if (settings.alertMuted) return
  if (ringtoneInterval !== null && currentAlertKey === alertKey) return

  stopAlertLoop()
  currentAlertKey = alertKey
  const loopVersion = ++alertLoopVersion

  void playBeep(settings)
  ringtoneInterval = window.setInterval(() => {
    if (currentAlertKey !== alertKey || alertLoopVersion !== loopVersion) return
    void playBeep(settings)
  }, settings.alertRepeatSeconds * 1000)
}

export function stopAlertLoop() {
  alertLoopVersion += 1
  if (ringtoneInterval !== null) {
    window.clearInterval(ringtoneInterval)
    ringtoneInterval = null
  }
  currentAlertKey = null
}

export function resetAlertAudioForTests() {
  stopAlertLoop()
  audioUnlockCleanups.forEach(cleanup => cleanup())
  audioUnlockCleanups = []
  audioUnlockHandlersBound = false
  unlockPromise = null
  audioContext = null
}
