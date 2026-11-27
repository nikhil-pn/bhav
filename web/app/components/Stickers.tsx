// Bhav's sticker set, drawn as inline SVG. One shared filter gives every sticker the die-cut look:
// the shape's alpha grows into a white border, with a soft drop shadow under it.
// Ink outlines, flat market colours. All decorative (aria-hidden).

type P = { className?: string; style?: React.CSSProperties };
const INK = "#16120e";

/** Put once per page, before any sticker. */
export function StickerDefs() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
      <defs>
        <filter id="diecut" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="grown" />
          <feFlood floodColor="#fff" result="white" />
          <feComposite in="white" in2="grown" operator="in" result="border" />
          <feGaussianBlur in="grown" stdDeviation="3.5" result="blur" />
          <feOffset in="blur" dx="0" dy="5" result="drop" />
          <feFlood floodColor="#000" floodOpacity="0.28" />
          <feComposite in2="drop" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="border" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

function Svg({ children, className, style, vb = "0 0 120 120" }: P & { children: React.ReactNode; vb?: string }) {
  return (
    <svg viewBox={vb} className={className} style={style} aria-hidden overflow="visible">
      <g filter="url(#diecut)" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

/** The Bhav price tag, with a rupee sign or a short label. */
export function PriceTag({ label, fill = "#ffc83d", ...p }: P & { label?: string; fill?: string }) {
  return (
    <Svg {...p} vb="0 0 140 110">
      <path d="M46 92 C26 80 18 50 34 30" fill="none" stroke={INK} strokeWidth="4" />
      <path d="M48 18 H118 Q130 18 130 30 V80 Q130 92 118 92 H48 L18 55 Z" fill={fill} stroke={INK} strokeWidth="5" />
      <path d="M56 30 H86" stroke="#fff6d0" strokeWidth="5" />
      <circle cx="38" cy="55" r="7" fill="#fff" stroke={INK} strokeWidth="4" />
      {label ? (
        <text x="86" y="64" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="24" fill={INK}>
          {label}
        </text>
      ) : (
        <path d="M68 36 H104 M68 48 H104 M68 36 H80 C98 36 98 64 80 64 H70 L100 80" fill="none" stroke={INK} strokeWidth="7" />
      )}
    </Svg>
  );
}

export function Onion(p: P) {
  return (
    <Svg {...p}>
      <path d="M60 22 C72 36 102 46 102 74 C102 98 82 110 60 110 C38 110 18 98 18 74 C18 46 48 36 60 22 Z" fill="#b8418f" stroke={INK} strokeWidth="5" />
      <path d="M60 32 C52 52 48 74 54 106 M60 32 C68 52 72 74 66 106" fill="none" stroke="#e59ac9" strokeWidth="4" />
      <path d="M34 62 C36 54 42 48 48 46" fill="none" stroke="#e59ac9" strokeWidth="5" />
      <path d="M60 24 L55 8 M60 24 L66 6" stroke={INK} strokeWidth="4.5" />
      <path d="M46 110 L42 116 M60 111 L60 118 M74 110 L78 116" stroke={INK} strokeWidth="3" />
    </Svg>
  );
}

/** A Kerala coconut, cut open. */
export function Coconut(p: P) {
  return (
    <Svg {...p}>
      <circle cx="60" cy="64" r="44" fill="#7a4a26" stroke={INK} strokeWidth="5" />
      <path d="M30 44 C34 38 40 34 46 32 M28 62 C30 56 32 52 36 48" fill="none" stroke="#a36a3d" strokeWidth="4" />
      <ellipse cx="66" cy="56" rx="26" ry="22" fill="#fffaf0" stroke={INK} strokeWidth="4.5" />
      <ellipse cx="66" cy="56" rx="16" ry="12" fill="#f1ead8" />
      <path d="M44 100 C52 104 70 104 80 99" fill="none" stroke="#a36a3d" strokeWidth="4" />
    </Svg>
  );
}

export function Banana(p: P) {
  return (
    <Svg {...p} vb="0 0 130 110">
      <path d="M20 26 C26 70 64 96 112 84 C104 78 98 76 92 76 C60 78 40 58 34 26 Z" fill="#ffd23f" stroke={INK} strokeWidth="5" />
      <path d="M30 24 C40 64 72 84 106 80" fill="none" stroke="#ffe98a" strokeWidth="4" />
      <path d="M22 26 L18 14 L32 12 L34 26" fill="#6f9a3a" stroke={INK} strokeWidth="4" />
      <path d="M112 84 L120 86" stroke={INK} strokeWidth="5" />
    </Svg>
  );
}

export function Egg(p: P) {
  return (
    <Svg {...p}>
      <path d="M60 12 C84 12 100 50 100 72 C100 96 82 110 60 110 C38 110 20 96 20 72 C20 50 36 12 60 12 Z" fill="#fffaf0" stroke={INK} strokeWidth="5" />
      <path d="M40 44 C44 32 50 26 56 24" fill="none" stroke="#ffe7b8" strokeWidth="6" />
      <circle cx="74" cy="82" r="5" fill="#f3d9a8" />
    </Svg>
  );
}

export function Chilli(p: P) {
  return (
    <Svg {...p} vb="0 0 120 120">
      <path d="M32 36 C52 32 66 46 76 66 C86 86 98 96 108 100 C88 108 64 100 48 80 C34 62 28 48 32 36 Z" fill="#e0402a" stroke={INK} strokeWidth="5" />
      <path d="M42 46 C48 54 54 64 60 74" fill="none" stroke="#ff8f7d" strokeWidth="5" />
      <path d="M32 36 C26 28 28 16 38 12" fill="none" stroke={INK} strokeWidth="9" />
      <path d="M32 36 C26 28 28 16 38 12" fill="none" stroke="#2f9e58" strokeWidth="4" />
    </Svg>
  );
}

/** A coin with a price on it. */
export function Coin({ label = "$0.01", ...p }: P & { label?: string }) {
  return (
    <Svg {...p}>
      <ellipse cx="60" cy="66" rx="44" ry="44" fill="#d08a1f" stroke={INK} strokeWidth="5" />
      <circle cx="60" cy="60" r="44" fill="#ffc83d" stroke={INK} strokeWidth="5" />
      <circle cx="60" cy="60" r="33" fill="none" stroke="#d08a1f" strokeWidth="4" strokeDasharray="2 7" />
      <path d="M34 42 C38 34 46 28 54 26" fill="none" stroke="#fff1b8" strokeWidth="5" />
      <text x="60" y="68" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize={label.length > 4 ? 21 : 24} fill={INK}>
        {label}
      </text>
    </Svg>
  );
}

/** The agent: a little robot holding up its ID card. */
export function AgentBot({ id = true, ...p }: P & { id?: boolean }) {
  return (
    <Svg {...p} vb="0 0 120 130">
      <path d="M60 14 V26" stroke={INK} strokeWidth="5" />
      <circle cx="60" cy="11" r="7" fill="#e0402a" stroke={INK} strokeWidth="4" />
      <rect x="22" y="26" width="76" height="58" rx="18" fill="#c9efd6" stroke={INK} strokeWidth="5" />
      <rect x="32" y="38" width="56" height="32" rx="12" fill="#103a2a" stroke={INK} strokeWidth="4" />
      <circle cx="47" cy="54" r="5" fill="#7df0a8" />
      <circle cx="73" cy="54" r="5" fill="#7df0a8" />
      <rect x="36" y="86" width="48" height="34" rx="10" fill="#c9efd6" stroke={INK} strokeWidth="5" />
      <path d="M14 56 H22 M98 56 H106" stroke={INK} strokeWidth="6" />
      {id && (
        <g transform="rotate(-10 92 100)">
          <rect x="70" y="86" width="44" height="30" rx="6" fill="#fff" stroke={INK} strokeWidth="4" />
          <circle cx="82" cy="98" r="5" fill="#ffc83d" stroke={INK} strokeWidth="2.5" />
          <path d="M92 95 H106 M92 103 H102 M76 110 H106" stroke={INK} strokeWidth="3" />
        </g>
      )}
    </Svg>
  );
}

/** A bot with no human behind it: red, crossed eyes. */
export function RogueBot(p: P) {
  return (
    <Svg {...p} vb="0 0 120 120">
      <path d="M60 14 V26" stroke={INK} strokeWidth="5" />
      <circle cx="60" cy="11" r="7" fill="#ffc83d" stroke={INK} strokeWidth="4" />
      <rect x="20" y="26" width="80" height="62" rx="18" fill="#f2b8a8" stroke={INK} strokeWidth="5" />
      <rect x="31" y="39" width="58" height="34" rx="12" fill="#2a241d" stroke={INK} strokeWidth="4" />
      <path d="M41 50 L51 60 M51 50 L41 60 M69 50 L79 60 M79 50 L69 60" stroke="#ff8f7d" strokeWidth="4" />
      <path d="M44 98 C52 92 68 92 76 98" fill="none" stroke={INK} strokeWidth="5" />
    </Svg>
  );
}

/** A round vault door with a lock dial. */
export function Vault(p: P) {
  return (
    <Svg {...p}>
      <rect x="14" y="18" width="92" height="86" rx="16" fill="#174c38" stroke={INK} strokeWidth="5" />
      <circle cx="60" cy="60" r="30" fill="#c9efd6" stroke={INK} strokeWidth="5" />
      <circle cx="60" cy="60" r="10" fill="#ffc83d" stroke={INK} strokeWidth="4" />
      <path d="M60 30 V40 M60 80 V90 M30 60 H40 M80 60 H90" stroke={INK} strokeWidth="4" />
      <path d="M22 104 V112 M98 104 V112" stroke={INK} strokeWidth="6" />
    </Svg>
  );
}

/** A tarazu: the market scale. */
export function Scale(p: P) {
  return (
    <Svg {...p} vb="0 0 140 120">
      <path d="M70 18 V96 M44 104 H96" stroke={INK} strokeWidth="6" />
      <path d="M22 34 H118" stroke={INK} strokeWidth="6" />
      <circle cx="70" cy="16" r="7" fill="#ffc83d" stroke={INK} strokeWidth="4" />
      <path d="M22 34 L8 70 M22 34 L36 70 M118 34 L104 70 M118 34 L132 70" stroke={INK} strokeWidth="2.5" />
      <path d="M4 70 H40 C38 84 6 84 4 70 Z" fill="#ff7a1a" stroke={INK} strokeWidth="4.5" />
      <path d="M100 70 H136 C134 84 102 84 100 70 Z" fill="#2f9e58" stroke={INK} strokeWidth="4.5" />
    </Svg>
  );
}

export function Sparkle({ color = "#ffc83d", ...p }: P & { color?: string }) {
  return (
    <svg viewBox="-32 -32 64 64" className={p.className} style={p.style} aria-hidden>
      <path d="M0 -28 C2 -10 6 -4 28 0 C6 4 2 10 0 28 C-2 10 -6 4 -28 0 C-6 -4 -2 -10 0 -28 Z" fill={color} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- small UI icons (stroke, currentColor) ---------- */

type I = { className?: string; title?: string };
function Icon({ children, className = "size-4", title }: I & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}
export const ArrowOut = (p: I) => (
  <Icon {...p}>
    <path d="M8 16 L16 8 M9 8 H16 V15" />
  </Icon>
);
export const ArrowDown = (p: I) => (
  <Icon {...p}>
    <path d="M12 5 V19 M6 13 L12 19 L18 13" />
  </Icon>
);
export const Check = (p: I) => (
  <Icon {...p}>
    <path d="M5 12.5 L10 17 L19 7" />
  </Icon>
);
export const CopyIcon = (p: I) => (
  <Icon {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8 V6 A2 2 0 0 0 14 4 H6 A2 2 0 0 0 4 6 V14 A2 2 0 0 0 6 16 H8" />
  </Icon>
);
export const GitHubIcon = ({ className = "size-4" }: I) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 1.5A10.5 10.5 0 0 0 8.68 22c.53.1.72-.23.72-.5v-1.8c-2.92.63-3.54-1.4-3.54-1.4-.48-1.22-1.17-1.54-1.17-1.54-.95-.65.08-.64.08-.64 1.05.08 1.6 1.08 1.6 1.08.94 1.6 2.46 1.14 3.06.87.1-.68.37-1.14.66-1.4-2.33-.27-4.78-1.17-4.78-5.2 0-1.15.41-2.08 1.08-2.82-.1-.27-.47-1.34.1-2.79 0 0 .88-.28 2.89 1.08a10 10 0 0 1 5.26 0c2-1.36 2.89-1.08 2.89-1.08.57 1.45.21 2.52.1 2.79.67.74 1.08 1.67 1.08 2.82 0 4.04-2.46 4.93-4.8 5.19.38.33.71.97.71 1.96v2.9c0 .28.19.61.73.5A10.5 10.5 0 0 0 12 1.5Z" />
  </svg>
);
