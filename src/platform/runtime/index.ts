import { createBrowserBridge } from './browserBridge'
import { detectRuntime } from './detectRuntime'
import { createTauriBridge } from './tauriBridge'

const browserBridge = createBrowserBridge()
const tauriBridge = createTauriBridge()

export function getRuntimeBridge() {
  return detectRuntime() === 'tauri' ? tauriBridge : browserBridge
}

export function getRuntimeKind() {
  return detectRuntime()
}

export * from './types'
export * from './detectRuntime'
