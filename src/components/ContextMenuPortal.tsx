import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ContextMenuPortalProps {
  x: number
  y: number
  children: ReactNode
  style?: CSSProperties
}

const VIEWPORT_MARGIN = 8

export function ContextMenuPortal({ x, y, children, style }: ContextMenuPortalProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    const { innerWidth, innerHeight } = window
    const rect = menu.getBoundingClientRect()

    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(x, innerWidth - rect.width - VIEWPORT_MARGIN),
    )
    const top = Math.max(
      VIEWPORT_MARGIN,
      Math.min(y, innerHeight - rect.height - VIEWPORT_MARGIN),
    )

    if (left !== position.left || top !== position.top) {
      setPosition({ left, top })
    }
  }, [x, y, position.left, position.top, children])

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        zIndex: 10000,
        ...style,
      }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  )
}
