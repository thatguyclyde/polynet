import React from 'react'

function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 1.8, style = {} }) {
  const common = {
    width: size,
    height: size,
    stroke: color,
    strokeWidth,
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...style,
  }

  switch (name) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
        </svg>
      )
    case 'newspaper':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </svg>
      )
    case 'store':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M4 7h16l-1 13H5L4 7Z" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        </svg>
      )
    case 'user':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      )
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'x':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      )
    case 'camera':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <rect x="4" y="6" width="16" height="14" rx="3" />
          <circle cx="12" cy="13" r="4" />
          <path d="M8.5 6l1-2h5l1 2" />
        </svg>
      )
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M12 20s-6.5-4.35-8.5-8.2A4.9 4.9 0 0 1 7.2 5.5c1.7 0 2.8.9 3.8 2.2 1-1.3 2.1-2.2 3.8-2.2a4.9 4.9 0 0 1 3.7 6.3C18.5 15.65 12 20 12 20Z" />
        </svg>
      )
    case 'message-circle':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M7 18 4 20V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7Z" />
        </svg>
      )
    case 'send':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="m5 12 14-7-4 14-2.5-5.5L5 12Z" />
        </svg>
      )
    case 'share':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.6 6.8-3.2M8.6 13.4l6.8 3.2" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
          <path d="m19 14 0.8 2.2L22 17l-2.2 0.8L19 20l-0.8-2.2L16 17l2.2-0.8L19 14Z" />
        </svg>
      )
    case 'search':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.2-4.2" />
        </svg>
      )
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
      )
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.5-2.4 1a7.3 7.3 0 0 0-1.9-1.1L14 2h-4l-.6 2.8a7.3 7.3 0 0 0-1.9 1.1l-2.4-1-2 3.5 2 1.5A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.1l-2 1.5 2 3.5 2.4-1a7.3 7.3 0 0 0 1.9 1.1L10 22h4l.6-2.8a7.3 7.3 0 0 0 1.9-1.1l2.4 1 2-3.5-2-1.5c.1-.4.1-.7.1-1.1Z" />
        </svg>
      )
    case 'check':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="m5 13 4 4L19 7" />
        </svg>
      )
    case 'chevron-left':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      )
    case 'chevron-right':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      )
    case 'grid':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
      )
    case 'moon':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
        </svg>
      )
    case 'sun':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.4M12 19.1v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" />
        </svg>
      )
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M4 20.5 5.2 16A8 8 0 1 1 8.4 19l-4.4 1.5Z" />
          <path d="M8.7 9.4c-.2 1.6 1.1 3.9 2.2 5 1.2 1.2 3.4 2.5 5 2.2.6-.1 1.3-.7 1.5-1.3.1-.3 0-.6-.2-.8l-1.6-1.2c-.2-.2-.5-.2-.8-.1l-.8.4c-.5-.3-1.1-.7-1.6-1.2s-.9-1.1-1.2-1.6l.4-.8c.1-.3.1-.6-.1-.8L10.1 7.6c-.2-.2-.5-.3-.8-.2-.6.2-1.2.9-1.3 1.5Z" />
        </svg>
      )
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="16.7" cy="7.3" r="0.6" fill={color} stroke="none" />
        </svg>
      )
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M5 5 19 19M19 5 5 19" />
        </svg>
      )
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M14.5 21v-7.5h2.4l.4-3H14.5V8.6c0-.9.2-1.5 1.5-1.5h1.5V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10.5H8.5v3H11V21" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
          <path d="M8 10.5V17M8 7.3v.1M12 17v-4c0-1.4 1-2.5 2.3-2.5 1.3 0 2.2 1 2.2 2.5V17M12 13v4" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M13.5 3v11.2a2.8 2.8 0 1 1-2-2.7" />
          <path d="M13.5 3a5 5 0 0 0 5 5" />
        </svg>
      )
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <rect x="3.5" y="6" width="17" height="12" rx="4" />
          <path d="m10.5 9.5 4.5 2.5-4.5 2.5Z" />
        </svg>
      )
    case 'snapchat':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M12 4c-2.6 0-4 1.9-4 4.3 0 1 .1 1.8 0 2.3-.1.5-1.4 1-2.2 1.3-.5.2-.4.8 0 1 .5.3 1 .4 1.3.7.3.3-.1.9-.5 1.2-.4.3-.2.7.2.8.9.2 1.2.4 1.4.9.2.6 1 1.5 3.8 1.5s3.6-.9 3.8-1.5c.2-.5.5-.7 1.4-.9.4-.1.6-.5.2-.8-.4-.3-.8-.9-.5-1.2.3-.3.8-.4 1.3-.7.4-.2.5-.8 0-1-.8-.3-2.1-.8-2.2-1.3-.1-.5 0-1.3 0-2.3 0-2.4-1.4-4.3-4-4.3Z" />
        </svg>
      )
    case 'github':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M9 19c-4 1.2-4-2-5.5-2.5M17 21v-2.6c0-.7.2-1.2.6-1.6-2.1-.2-4.4-1-4.4-4.7 0-1 .4-1.9 1-2.6-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9 9 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.6 1 2.6 0 3.7-2.3 4.5-4.4 4.7.3.3.6.9.6 1.8V21" />
        </svg>
      )
    case 'globe':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <circle cx="12" cy="12" r="8.5" />
          <ellipse cx="12" cy="12" rx="3.6" ry="8.5" />
          <path d="M3.7 9h16.6M3.7 15h16.6" />
        </svg>
      )
    case 'inbox':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={common}>
          <path d="M4 12h4l1.5 2.5h5L16 12h4" />
          <path d="M5.5 5.5h13L20 12v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Z" />
        </svg>
      )
    default:
      return null
  }
}

export default Icon
