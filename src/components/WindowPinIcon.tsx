import { useId } from 'react'

export function WindowPinIcon({ pinned }: { pinned: boolean }) {
  const gradientId = useId()
  const highlightId = useId()
  const metalId = useId()
  const shadowId = useId()

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      style={{
        display: 'block',
        transform: pinned ? 'rotate(-14deg) scale(1)' : 'rotate(10deg) scale(0.92)',
        opacity: pinned ? 1 : 0.78,
        filter: pinned
          ? 'drop-shadow(0 1px 1px rgba(113, 42, 0, 0.24))'
          : 'drop-shadow(0 1px 0 rgba(73, 52, 36, 0.1))',
        transition: 'transform 160ms ease, opacity 160ms ease, filter 160ms ease',
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="5" y1="3" x2="19" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={pinned ? '#ffb85c' : '#f4d7a8'} />
          <stop offset="0.52" stopColor={pinned ? '#ff7a59' : '#dbb98b'} />
          <stop offset="1" stopColor={pinned ? '#dd4d7a' : '#b89570'} />
        </linearGradient>
        <radialGradient id={highlightId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10.2 5.8) rotate(32) scale(7.1 5.1)">
          <stop offset="0" stopColor="rgba(255,255,255,0.96)" />
          <stop offset="0.42" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <linearGradient id={metalId} x1="10.6" y1="13.6" x2="14.2" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff7e6" />
          <stop offset="0.35" stopColor="#d7d9df" />
          <stop offset="0.7" stopColor="#8f96a3" />
          <stop offset="1" stopColor="#596273" />
        </linearGradient>
        <linearGradient id={shadowId} x1="6" y1="9.5" x2="18.8" y2="18.5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgba(102, 49, 20, 0.14)" />
          <stop offset="1" stopColor="rgba(55, 29, 18, 0.36)" />
        </linearGradient>
      </defs>
      <path
        d="M8 5v4.997a.3.3 0 0 1-.068.113c-.08.098-.213.207-.378.301c-.947.543-1.713 1.54-2.191 2.488A6.2 6.2 0 0 0 4.82 14.4c-.1.48-.138 1.031.018 1.539C5.12 16.846 6.02 17 6.414 17H11v3a1 1 0 1 0 2 0v-3h4.586c.395 0 1.295-.154 1.575-1.061c.156-.508.118-1.059.017-1.539a6.2 6.2 0 0 0-.541-1.5c-.479-.95-1.244-1.946-2.191-2.489a1.4 1.4 0 0 1-.378-.301a.3.3 0 0 1-.068-.113V5h1a1 1 0 1 0 0-2H7a1 1 0 1 0 0 2z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M8 5v4.997a.3.3 0 0 1-.068.113c-.08.098-.213.207-.378.301c-.947.543-1.713 1.54-2.191 2.488A6.2 6.2 0 0 0 4.82 14.4c-.1.48-.138 1.031.018 1.539C5.12 16.846 6.02 17 6.414 17H11v3a1 1 0 1 0 2 0v-3h4.586c.395 0 1.295-.154 1.575-1.061c.156-.508.118-1.059.017-1.539a6.2 6.2 0 0 0-.541-1.5c-.479-.95-1.244-1.946-2.191-2.489a1.4 1.4 0 0 1-.378-.301a.3.3 0 0 1-.068-.113V5h1a1 1 0 1 0 0-2H7a1 1 0 1 0 0 2z"
        fill={`url(#${shadowId})`}
        opacity={pinned ? 0.24 : 0.14}
      />
      <ellipse
        cx="11.1"
        cy="6.1"
        rx="4.9"
        ry="2.25"
        fill={`url(#${highlightId})`}
        opacity={pinned ? 0.92 : 0.7}
      />
      <path
        d="M12 16.55v4.55"
        stroke={`url(#${metalId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 21.1 11.2 22.7"
        stroke="#525b69"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  )
}
