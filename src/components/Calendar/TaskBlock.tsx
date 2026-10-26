import { Task } from '../../types'

interface Props {
  task: Task
  onClick: () => void
  untitledLabel: string
  compact?: boolean
}

export function TaskBlock({ task, onClick, untitledLabel, compact = false }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        background: task.color,
        opacity: task.isCompleted ? 0.7 : 1,
        borderRadius: compact ? 10 : 14,
        padding: compact ? '6px 9px' : '8px 12px',
        fontSize: 12,
        color: '#2e241c',
        cursor: 'pointer',
        boxShadow: compact ? '0 6px 12px rgba(84,58,28,0.10)' : '0 10px 18px rgba(84,58,28,0.12)',
        transition: 'transform 0.1s ease, box-shadow 0.12s ease',
        border: '1px solid rgba(84,58,28,0.08)',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = compact
          ? '0 10px 18px rgba(84,58,28,0.14)'
          : '0 14px 24px rgba(84,58,28,0.16)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = compact
          ? '0 6px 12px rgba(84,58,28,0.10)'
          : '0 10px 18px rgba(84,58,28,0.12)'
      }}
    >
      <div style={{
        fontWeight: 700,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textDecoration: task.isCompleted ? 'line-through' : 'none',
        fontSize: compact ? 13 : 14,
        lineHeight: compact ? 1.2 : 1.3,
      }}>
        {task.title || untitledLabel}
      </div>
    </div>
  )
}
