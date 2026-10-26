import { useState } from 'react'
import { normalizeTags } from '../lib/taskMeta'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  accentColor: string
  placeholder?: string
  inputPlaceholder?: string
  compact?: boolean
  textColor?: string
}

export function TaskTagEditor({
  tags,
  onChange,
  accentColor,
  placeholder = '输入标签后按 Enter',
  inputPlaceholder,
  compact = false,
  textColor = '#4b4035',
}: Props) {
  const [draft, setDraft] = useState('')

  const addDraftTag = () => {
    const nextTags = normalizeTags([...tags, draft])
    if (nextTags.length === tags.length) {
      setDraft('')
      return
    }

    onChange(nextTags)
    setDraft('')
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove))
  }

  return (
    <div style={editorWrapStyle(compact)}>
      <div style={pillListStyle}>
        {tags.map(tag => (
          <span key={tag} style={pillStyle(accentColor, compact, textColor)}>
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              style={pillRemoveStyle}
            >
              ×
            </button>
          </span>
        ))}

        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              addDraftTag()
            } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
              removeTag(tags[tags.length - 1])
            }
          }}
          onBlur={() => {
            if (draft.trim()) addDraftTag()
          }}
          placeholder={tags.length === 0 ? placeholder : (inputPlaceholder ?? placeholder)}
          style={tagInputStyle(compact, textColor)}
        />
      </div>
    </div>
  )
}

const editorWrapStyle = (compact: boolean): React.CSSProperties => ({
  width: '100%',
  minHeight: compact ? 40 : 46,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: compact ? 12 : 14,
  padding: compact ? '8px 10px' : '10px 12px',
})

const pillListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
}

const pillStyle = (accentColor: string, compact: boolean, textColor: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: compact ? '4px 8px' : '6px 10px',
  borderRadius: 999,
  background: `${accentColor}26`,
  border: `1px solid ${accentColor}55`,
  color: textColor,
  fontSize: compact ? 11 : 12,
  fontWeight: 600,
  lineHeight: 1,
})

const pillRemoveStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  padding: 0,
}

const tagInputStyle = (compact: boolean, textColor: string): React.CSSProperties => ({
  flex: '0 1 50%',
  width: compact ? 88 : 120,
  minWidth: compact ? 64 : 80,
  maxWidth: '50%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: textColor,
  fontSize: compact ? 12 : 13,
  padding: compact ? '2px 0' : '4px 0',
  boxSizing: 'border-box',
})
