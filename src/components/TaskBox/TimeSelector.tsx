import { useEffect, useState } from 'react'
import { PRESET_TIMER_MINUTES, normalizeCustomTimerMinutes } from './taskTimer'
import { useSettingsStore } from '../../stores/settingsStore'
import { getLocaleCopy } from '../../lib/i18n'

interface Props {
  selected: number
  onSelect: (minutes: number) => void
}

export function TimeSelector({ selected, onSelect }: Props) {
  const [customValue, setCustomValue] = useState('')
  const language = useSettingsStore(s => s.settings.language)
  const copy = getLocaleCopy(language)

  useEffect(() => {
    if (PRESET_TIMER_MINUTES.includes(selected)) {
      setCustomValue('')
    } else if (selected > 0) {
      setCustomValue(String(selected))
    }
  }, [selected])

  const commitCustomValue = () => {
    const nextMinutes = normalizeCustomTimerMinutes(customValue)
    if (nextMinutes === null) {
      if (PRESET_TIMER_MINUTES.includes(selected)) {
        setCustomValue('')
      } else if (selected > 0) {
        setCustomValue(String(selected))
      } else {
        setCustomValue('')
      }
      return
    }
    onSelect(nextMinutes)
    setCustomValue(String(nextMinutes))
  }

  return (
    <div data-no-drag style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
      {PRESET_TIMER_MINUTES.map(m => (
        <button
          key={m}
          onClick={() => onSelect(m)}
          style={{
            padding: '2px 8px',
            borderRadius: 4,
            border: 'none',
            background: m === selected ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)',
            color: 'inherit',
            fontSize: 11,
            fontWeight: m === selected ? 700 : 400,
            cursor: 'pointer',
          }}
        >
          {m}m
        </button>
      ))}
      <input
        type="number"
        min={1}
        step={1}
        value={customValue}
        onChange={e => setCustomValue(e.target.value)}
        onBlur={commitCustomValue}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commitCustomValue()
          }
        }}
        placeholder={copy.timeSelector.customPlaceholder}
        style={{
          width: 72,
          padding: '2px 8px',
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(0,0,0,0.15)',
          color: 'inherit',
          fontSize: 11,
          outline: 'none',
        }}
      />
    </div>
  )
}
