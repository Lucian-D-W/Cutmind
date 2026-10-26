import { describe, expect, it } from 'vitest'
import { createVirtualAnchor, createVirtualAnchorFromRect, getSelectionAnchorRect } from './contextMenuAnchors'

describe('contextMenuAnchors', () => {
  it('creates a point anchor from client coordinates', () => {
    const anchor = createVirtualAnchor({ x: 120, y: 240 })
    const rect = anchor.getBoundingClientRect()

    expect(rect.left).toBe(120)
    expect(rect.top).toBe(240)
    expect(rect.right).toBe(120)
    expect(rect.bottom).toBe(240)
  })

  it('returns the selection rect when text is selected', () => {
    const selectionRect = {
      x: 20,
      y: 30,
      top: 30,
      left: 20,
      right: 90,
      bottom: 60,
      width: 70,
      height: 30,
      toJSON: () => ({}),
    } as DOMRect

    const selection = {
      rangeCount: 1,
      getRangeAt: () => ({
        getBoundingClientRect: () => selectionRect,
        getClientRects: () => ({
          length: 1,
          item: () => selectionRect,
          [Symbol.iterator]: function* iterator() {
            yield selectionRect
          },
        }),
      }),
      toString: () => 'selected text',
    } as unknown as Selection

    expect(getSelectionAnchorRect(selection)).toBe(selectionRect)
  })

  it('ignores empty selections', () => {
    const selection = {
      rangeCount: 1,
      toString: () => '   ',
    } as unknown as Selection

    expect(getSelectionAnchorRect(selection)).toBeNull()
  })

  it('creates a rect anchor for selection-based menus', () => {
    const rect = {
      x: 10,
      y: 15,
      top: 15,
      left: 10,
      right: 70,
      bottom: 45,
      width: 60,
      height: 30,
      toJSON: () => ({}),
    } as DOMRect

    const anchor = createVirtualAnchorFromRect(rect)

    expect(anchor.getBoundingClientRect()).toBe(rect)
    expect(Array.from(anchor.getClientRects())).toEqual([rect])
  })
})
