import { useUiFeedbackStore } from '../stores/uiFeedbackStore'

export function UiFeedbackHost() {
  const items = useUiFeedbackStore(s => s.items)
  const removeFeedback = useUiFeedbackStore(s => s.removeFeedback)

  if (items.length === 0) return null

  return (
    <div style={hostStyle}>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => removeFeedback(item.id)}
          style={toastStyle[item.kind]}
          title={item.message}
        >
          {item.message}
        </button>
      ))}
    </div>
  )
}

const hostStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 3000,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 8,
  pointerEvents: 'none',
}

const baseToastStyle: React.CSSProperties = {
  maxWidth: 360,
  border: 'none',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 12,
  lineHeight: 1.45,
  textAlign: 'left',
  boxShadow: '0 16px 36px rgba(70, 50, 32, 0.18)',
  cursor: 'pointer',
  pointerEvents: 'auto',
}

const toastStyle: Record<'info' | 'success' | 'error', React.CSSProperties> = {
  info: {
    ...baseToastStyle,
    background: 'rgba(255, 253, 250, 0.98)',
    color: '#60574c',
    border: '1px solid rgba(126, 113, 95, 0.12)',
  },
  success: {
    ...baseToastStyle,
    background: 'rgba(237, 249, 240, 0.98)',
    color: '#32653a',
    border: '1px solid rgba(107, 203, 119, 0.24)',
  },
  error: {
    ...baseToastStyle,
    background: 'rgba(253, 239, 236, 0.98)',
    color: '#a34835',
    border: '1px solid rgba(231, 128, 108, 0.24)',
  },
}
