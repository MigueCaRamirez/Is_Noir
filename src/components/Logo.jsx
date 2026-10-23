import { useId } from 'react'
import { assetUrl } from '../lib/format'

export function Butterfly({ className = '' }) {
  const rawId = useId()
  const gradientId = `butterfly-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <svg
      viewBox="0 0 140 112"
      role="presentation"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="18" y1="12" x2="116" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8DDF4" />
          <stop offset=".32" stopColor="#B9A0D9" />
          <stop offset=".68" stopColor="#7B547A" />
          <stop offset="1" stopColor="#2A1720" />
        </linearGradient>
      </defs>
      <g className="butterfly__wings" fill={`url(#${gradientId})`} stroke="currentColor" strokeWidth="1.1">
        <path d="M67 48C53 15 20 5 10 21c-11 18 19 34 53 35" opacity=".96" />
        <path d="M73 48c14-33 47-43 57-27 11 18-19 34-53 35" opacity=".96" />
        <path d="M66 57C44 55 22 65 26 82c3 14 27 16 42-6" opacity=".9" />
        <path d="M74 57c22-2 44 8 40 25-3 14-27 16-42-6" opacity=".9" />
      </g>
      <g stroke="currentColor" strokeWidth=".85" opacity=".55">
        <path d="M62 42C46 29 27 18 16 18M60 51C42 48 28 51 20 59" />
        <path d="M78 42c16-13 35-24 46-24M80 51c18-3 32 0 40 8" />
        <path d="M58 60c-12 1-22 7-25 15M82 60c12 1 22 7 25 15" />
      </g>
      <path
        d="M70 36c-2 15-2 34 0 52M67 34c-5-8-11-13-18-17M73 34c5-8 11-13 18-17"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="47" cy="15" r="1.7" fill="currentColor" />
      <circle cx="93" cy="15" r="1.7" fill="currentColor" />
      <circle cx="42" cy="73" r="1.25" fill="currentColor" opacity=".65" />
      <circle cx="98" cy="73" r="1.25" fill="currentColor" opacity=".65" />
    </svg>
  )
}

export function Sparkle({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M12 1.5c.45 6.25 4.25 10.05 10.5 10.5-6.25.45-10.05 4.25-10.5 10.5C11.55 16.25 7.75 12.45 1.5 12 7.75 11.55 11.55 7.75 12 1.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

/**
 * Logotipo oficial IS NOIR. Se usa siempre el archivo original para conservar
 * el trazo, el monograma y la firma. En fondos oscuros se aclara con un filtro
 * que respeta la transparencia del PNG.
 */
export default function Logo({
  size = 'md',
  tone = 'auto',
  className = '',
}) {
  return (
    <span className={`brand brand--${size} brand--${tone} ${className}`.trim()}>
      <img
        src={assetUrl('logo-is-noir.png')}
        alt="IS NOIR, boutique y accesorios"
        className="brand__logo"
        draggable="false"
        decoding="async"
      />
    </span>
  )
}
