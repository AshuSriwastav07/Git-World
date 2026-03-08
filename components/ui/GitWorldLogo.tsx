// GitWorldLogo — Reusable brand logo with pixel building icon + wordmark
'use client';

const SIZES = {
  sm: { icon: 20, fontSize: '10px', gap: 4 },
  md: { icon: 28, fontSize: '14px', gap: 6 },
  lg: { icon: 48, fontSize: '24px', gap: 10 },
} as const;

interface GitWorldLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

export function GitWorldLogo({ size = 'md', showWordmark = true }: GitWorldLogoProps) {
  const s = SIZES[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        userSelect: 'none',
      }}
    >
      {/* Logo image */}
      <img
        src="/Logo.png"
        alt="Git World"
        width={s.icon}
        height={s.icon}
        style={{ flexShrink: 0, borderRadius: 4 }}
      />

      {showWordmark && (
        <span style={{ fontSize: s.fontSize, fontFamily: "'Press Start 2P', monospace", letterSpacing: '1px', lineHeight: 1 }}>
          <span style={{ color: '#f5c518', fontWeight: 700 }}>GIT</span>
          <span style={{ color: '#ffffff', fontWeight: 700, marginLeft: 4 }}>WORLD</span>
        </span>
      )}
    </span>
  );
}
