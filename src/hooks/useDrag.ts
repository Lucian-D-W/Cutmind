import { useCallback } from 'react'
import { getRuntimeBridge } from '../platform/runtime'

export function useDrag() {
  const onMouseDown = useCallback(async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, button, select, [data-no-drag]')) return
    if (e.button !== 0) return

    const result = await getRuntimeBridge().windows.getCurrentWindow()
    if (!result.ok) return

    await result.value.startDragging()
  }, [])

  return { onMouseDown }
}
