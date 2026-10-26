export interface AnchorPoint {
  x: number
  y: number
}

export function createVirtualAnchorFromRect(rect: DOMRect) {
  return {
    getBoundingClientRect() {
      return rect
    },
    getClientRects() {
      return {
        length: 1,
        item: () => rect,
        [Symbol.iterator]: function* iterator() {
          yield rect
        },
      } as DOMRectList
    },
  }
}

export function createVirtualAnchor(point: AnchorPoint) {
  const rect = {
    width: 0,
    height: 0,
    x: point.x,
    y: point.y,
    top: point.y,
    left: point.x,
    right: point.x,
    bottom: point.y,
  } as DOMRect

  return {
    getBoundingClientRect() {
      return rect
    },
    getClientRects() {
      return {
        length: 1,
        item: () => rect,
        [Symbol.iterator]: function* iterator() {
          yield rect
        },
      } as DOMRectList
    },
  }
}

export function getSelectionAnchorRect(selection: Selection | null): DOMRect | null {
  if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
    return null
  }

  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()

  if (rect.width === 0 && rect.height === 0) {
    return null
  }

  return rect
}
