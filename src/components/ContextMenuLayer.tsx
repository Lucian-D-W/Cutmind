import { useLayoutEffect, type CSSProperties } from 'react'
import {
  autoUpdate,
  flip,
  FloatingPortal,
  inline,
  offset,
  shift,
  useFloating,
  type Placement,
} from '@floating-ui/react'
import { ContextMenuPortal } from './ContextMenuPortal'
import { USE_FLOATING_UI_CONTEXT_MENU } from './contextMenuConfig'
import { createVirtualAnchor, createVirtualAnchorFromRect } from './contextMenuAnchors'

interface ContextMenuLayerProps {
  x: number
  y: number
  anchorRect?: DOMRect | null
  children: React.ReactNode
  style?: React.CSSProperties
  placement?: Placement
}

export function ContextMenuLayer({
  x,
  y,
  anchorRect,
  children,
  style,
  placement = 'bottom-start',
}: ContextMenuLayerProps) {
  const { refs, floatingStyles, update } = useFloating({
    placement,
    strategy: 'fixed',
    middleware: [offset(8), inline(), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  useLayoutEffect(() => {
    if (!USE_FLOATING_UI_CONTEXT_MENU) return

    const anchor = anchorRect
      ? createVirtualAnchorFromRect(anchorRect)
      : createVirtualAnchor({ x, y })

    refs.setPositionReference(anchor)
    void update()
  }, [anchorRect, refs, update, x, y])

  if (!USE_FLOATING_UI_CONTEXT_MENU) {
    return (
      <ContextMenuPortal x={x} y={y} style={{ ...defaultContextMenuViewportStyle, ...style }}>
        {children}
      </ContextMenuPortal>
    )
  }

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={{ ...floatingStyles, zIndex: 10000, ...defaultContextMenuViewportStyle, ...style }}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
      >
        {children}
      </div>
    </FloatingPortal>
  )
}

const defaultContextMenuViewportStyle: CSSProperties = {
  maxWidth: 'min(360px, calc(100vw - 16px))',
  maxHeight: 'min(315px, calc(75vh - 16px))',
  overflowX: 'hidden',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  scrollbarWidth: 'thin',
}
