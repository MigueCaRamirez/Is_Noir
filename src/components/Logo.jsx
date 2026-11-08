import { assetUrl } from '../lib/format'

export function Butterfly({ className = '' }) {
  return (
    <svg
      viewBox="0 0 200 200"
      role="presentation"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <linearGradient id="wingGrad" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="#A02A2A" />
          <stop offset="0.45" stopColor="#C44E4E" />
          <stop offset="1" stopColor="#7B1E1E" />
        </linearGradient>
        <filter id="wingSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
          <feOffset in="blur" dx="0" dy="4" result="offsetBlur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.35" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Cuerpo central */}
      <path
        d="M100 40 Q100 100 100 160"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        opacity="0.9"
      />

      {/* Ala superior izquierda */}
      <path
        d="M100 55 C60 20 20 30 25 70 C30 90 70 95 100 60"
        fill="url(#wingGrad)"
        opacity="0.92"
        filter="url(#wingSoft)"
      />
      <path
        d="M100 55 C80 35 40 40 35 75 C45 95 85 90 100 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.7"
      />

      {/* Ala superior derecha */}
      <path
        d="M100 55 C140 20 180 30 175 70 C170 90 130 95 100 60"
        fill="url(#wingGrad)"
        opacity="0.92"
        filter="url(#wingSoft)"
      />
      <path
        d="M100 55 C120 35 160 40 165 75 C155 95 115 90 100 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.7"
      />

      {/* Ala inferior izquierda */}
      <path
        d="M100 60 C70 80 40 110 45 140 C50 170 90 150 100 110"
        fill="url(#wingGrad)"
        opacity="0.88"
        filter="url(#wingSoft)"
      />
      <path
        d="M100 60 C80 75 55 100 50 135 C55 160 85 145 100 110"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.65"
      />

      {/* Ala inferior derecha */}
      <path
        d="M100 60 C130 80 160 110 155 140 C150 170 110 150 100 110"
        fill="url(#wingGrad)"
        opacity="0.88"
        filter="url(#wingSoft)"
      />
      <path
        d="M100 60 C120 75 145 100 150 135 C145 160 115 145 100 110"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.65"
      />

      {/* Antenas */}
      <path d="M96 45 Q85 25 75 15" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
      <path d="M104 45 Q115 25 125 15" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />

      {/* Detalles de venas */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.5">
        <path d="M100 60 Q85 50 70 55M100 60 Q115 50 130 55" />
        <path d="M100 75 Q90 85 80 95M100 75 Q110 85 120 95" />
        <path d="M100 95 Q95 115 90 130M100 95 Q105 115 110 130" />
      </g>
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
