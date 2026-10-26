import { useMemo } from 'react'
import type { ViewType } from '../types'

export function useWindowView(): { view: ViewType; id: string | null } {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const view = (params.get('view') ?? 'calendar') as ViewType
    const id = params.get('id')
    return { view, id }
  }, [])
}
