// The market run: an agent with its ID card, an onion with a price tag and a rolling coin cross the hero.
// Pure CSS, composite-only: each lane moves with translateX, legs and arms swing with rotate.
// Everything stands still for prefers-reduced-motion (globals.css).
const INK = "#16120e";

function Legs({ x, y, shoe }: { x: number; y: number; shoe: string }) {
  return (
    <g>
      {[
        ["leg leg-a", x - 6, x - 3],
        ["leg leg-b", x + 6, x + 9],
      ].map(([cls, lx, fx]) => (
        <g key={cls as string} className={cls as string} style={{ transformOrigin: `${lx}px ${y}px` }}>
          <path d={`M${lx} ${y} V${y + 15}`} stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <ellipse cx={fx as number} cy={y + 17} rx="6" ry="3.4" fill={shoe} stroke={INK} strokeWidth="2" />
        </g>
      ))}
    </g>
  );
}

function Arms({ lx, rx, y }: { lx: number; rx: number; y: number }) {
  return (
    <g stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none">
      <path className="arm arm-a" style={{ transformOrigin: `${lx}px ${y}px` }} d={`M${lx} ${y} q-8 6 -9 14`} />
      <path className="arm arm-b" style={{ transformOrigin: `${rx}px ${y}px` }} d={`M${rx} ${y} q8 6 9 14`} />
    </g>
  );
}

function BotRunner() {
  return (
    <svg viewBox="0 0 90 96" className="h-full w-auto overflow-visible" aria-hidden>
      <g filter="url(#diecut)">
        <Legs x={42} y={68} shoe="#ff7a1a" />
        <g className="run-body">
          <Arms lx={20} rx={64} y={48} />
          <path d="M42 8 V16" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="42" cy="7" r="4.5" fill="#e0402a" stroke={INK} strokeWidth="2.5" />
          <rect x="18" y="16" width="48" height="36" rx="12" fill="#c9efd6" stroke={INK} strokeWidth="4" />
          <rect x="25" y="24" width="34" height="19" rx="7" fill="#103a2a" />
          <circle cx="35" cy="33" r="3.2" fill="#7df0a8" />
          <circle cx="50" cy="33" r="3.2" fill="#7df0a8" />
          <rect x="27" y="52" width="30" height="17" rx="6" fill="#c9efd6" stroke={INK} strokeWidth="4" />
          <g transform="rotate(-12 70 60)">
            <rect x="58" y="50" width="26" height="18" rx="4" fill="#fff" stroke={INK} strokeWidth="3" />
            <circle cx="65" cy="59" r="3" fill="#ffc83d" stroke={INK} strokeWidth="1.8" />
            <path d="M71 56 H79 M71 62 H77" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          </g>
        </g>
      </g>
    </svg>
  );
}

function OnionRunner({ say }: { say?: string }) {
  return (
    <svg viewBox="0 0 90 96" className="h-full w-auto overflow-visible" aria-hidden>
      {say && (
        <g className="say">
          <rect x="34" y="-24" width="86" height="22" rx="8" fill="#fff" stroke={INK} strokeWidth="2.5" />
          <path d="M48 -2 L44 6 L56 -2" fill="#fff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <text x="77" y="-9" textAnchor="middle" fontFamily="var(--font-code), monospace" fontSize="9" fontWeight="700" fill={INK}>
            {say}
          </text>
        </g>
      )}
      <g filter="url(#diecut)">
        <Legs x={44} y={70} shoe="#2f9e58" />
        <g className="run-body">
          <Arms lx={20} rx={68} y={50} />
          <path d="M44 14 C52 24 72 32 72 50 C72 66 58 74 44 74 C30 74 16 66 16 50 C16 32 36 24 44 14 Z" fill="#b8418f" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M44 22 C40 36 38 52 42 72" fill="none" stroke="#e59ac9" strokeWidth="3" strokeLinecap="round" />
          <path d="M44 15 L41 4 M44 15 L48 3" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="38" cy="48" rx="2.4" ry="3.2" fill={INK} />
          <ellipse cx="52" cy="48" rx="2.4" ry="3.2" fill={INK} />
          <path d="M40 57 Q45 61 50 57" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

function CoinRoller() {
  return (
    <svg viewBox="0 0 60 60" className="h-full w-auto overflow-visible" aria-hidden>
      <g filter="url(#diecut)">
        <g className="roll">
          <circle cx="30" cy="30" r="25" fill="#ffc83d" stroke={INK} strokeWidth="3.5" />
          <circle cx="30" cy="30" r="18" fill="none" stroke="#d08a1f" strokeWidth="2.5" strokeDasharray="2 5" />
          <path d="M22 22 H38 M22 28 H38 M22 22 H27 C35 22 35 34 27 34 H23 L36 41" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  );
}

export default function RunnerTrack({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-28 overflow-hidden md:h-32 ${className}`} aria-hidden>
      <div className="absolute inset-x-0 bottom-3 border-t-[3px] border-dashed border-on-mandi/25" />
      <div className="lane" style={{ ["--dur" as string]: "17s", ["--delay" as string]: "-4.2s", ["--x" as string]: "62%" }}>
        <div className="absolute bottom-3 left-0 h-[5.2rem] md:h-24">
          <BotRunner />
        </div>
      </div>
      <div className="lane" style={{ ["--dur" as string]: "17s", ["--delay" as string]: "-2s", ["--x" as string]: "40%" }}>
        <div className="absolute bottom-3 left-0 h-[5rem] md:h-[5.8rem]">
          <OnionRunner say="what's the bhav?" />
        </div>
      </div>
      <div className="lane" style={{ ["--dur" as string]: "17s", ["--delay" as string]: "0s", ["--x" as string]: "18%" }}>
        <div className="absolute bottom-3 left-0 h-10 md:h-11">
          <CoinRoller />
        </div>
      </div>
    </div>
  );
}
