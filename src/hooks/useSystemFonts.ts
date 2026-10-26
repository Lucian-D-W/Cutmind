import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

const FALLBACK_FONTS = [
  'Arial', 'Calibri', 'Cambria', 'Cascadia Code', 'Comic Sans MS',
  'Consolas', 'Courier New', 'Georgia', 'Impact', 'Lucida Console',
  'Microsoft YaHei', 'Microsoft YaHei UI', 'Noto Sans SC', 'Noto Serif SC',
  'Segoe UI', 'SimHei', 'SimSun', 'Tahoma', 'Times New Roman',
  'Trebuchet MS', 'Verdana',
]

export function useSystemFonts(): string[] {
  const [fonts, setFonts] = useState<string[]>(FALLBACK_FONTS)

  useEffect(() => {
    async function detect() {
      try {
        const systemFonts = await invoke<string[]>('list_system_fonts')
        const sorted = Array.from(new Set(systemFonts)).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: 'base' })
        )
        if (sorted.length > 0) {
          setFonts(sorted)
          return
        }
      } catch {
        // Fall through to browser/local fallback.
      }

      // queryLocalFonts is available in Chromium-based browsers (Tauri uses WebView2)
      if ('queryLocalFonts' in window) {
        try {
          const localFonts = await (window as any).queryLocalFonts()
          const familySet = new Set<string>()
          for (const font of localFonts) {
            familySet.add(font.family)
          }
          const sorted = Array.from(familySet).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
          )
          if (sorted.length > 0) {
            setFonts(sorted)
          }
        } catch {
          // Permission denied or API unavailable, use fallback
        }
      }
    }
    detect()
  }, [])

  return fonts
}
