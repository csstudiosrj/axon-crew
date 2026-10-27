// Símbolos dos produtos da família ARXUM (os mesmos de cada produto).
const props = { width: 14, height: 14, fill: "none", "aria-hidden": true } as const;

export const SIMBOLOS: Record<string, (cor: string) => React.ReactNode> = {
  fest: (c) => (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 7.5a1.5 1.5 0 0 1 1.5-1.5h13a1.5 1.5 0 0 1 1.5 1.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2a2.5 2.5 0 0 0 0-5Z" fill={c} fillOpacity="0.12" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m12 9 .9 1.85 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3Z" fill={c} />
    </svg>
  ),
  edu: (c) => (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M12 7.2C10.2 5.7 7.3 5.2 3.5 5.6v12.6c3.8-.4 6.7.1 8.5 1.6 1.8-1.5 4.7-2 8.5-1.6V5.6c-3.8-.4-6.7.1-8.5 1.6Z" fill={c} fillOpacity="0.12" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 7.2v12.6" stroke={c} strokeWidth="1.8" />
      <circle cx="12" cy="3" r="1.2" fill={c} />
    </svg>
  ),
  studio: (c) => (
    <svg viewBox="0 0 40 40" {...props}>
      <rect x="5.5" y="5.5" width="22" height="7" rx="3.5" stroke={c} strokeWidth="3" />
      <rect x="11" y="15" width="24.5" height="10" rx="5" fill={c} />
      <rect x="5.5" y="27.5" width="22" height="7" rx="3.5" stroke={c} strokeWidth="3" />
    </svg>
  ),
  suite: (c) => (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" fill={c} />
      {[[13, 3.5], [3.5, 13], [13, 13]].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="7.5" height="7.5" rx="2" fill={c} fillOpacity="0.12" stroke={c} strokeWidth="1.8" />
      ))}
    </svg>
  ),
};
