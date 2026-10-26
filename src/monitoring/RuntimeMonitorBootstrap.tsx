import { useEffect } from 'react'
import { installGlobalMonitor, monitorEvent } from './runtimeMonitor'

export function RuntimeMonitorBootstrap({ view }: { view: string }) {
  useEffect(() => {
    installGlobalMonitor()
    monitorEvent('app', 'monitor-bootstrap', {
      href: window.location.href,
      view,
    })
  }, [view])

  return null
}
