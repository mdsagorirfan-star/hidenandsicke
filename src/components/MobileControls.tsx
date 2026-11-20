import { useRef, useState } from 'react';

interface MobileControlsProps {
  onMove: (x: number, y: number, sprint: boolean) => void;
  onJump: () => void;
  onTag: () => void;
  isSeeker: boolean;
}

export function MobileControls({ onMove, onJump, onTag, isSeeker }: MobileControlsProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [sprint, setSprint] = useState(false);

  const handleTouch = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.4;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / maxR, dy / maxR, sprint);
  };

  const resetStick = () => {
    setKnob({ x: 0, y: 0 });
    onMove(0, 0, sprint);
  };

  return (
    <div className="md:hidden fixed inset-x-0 bottom-20 px-5 flex items-end justify-between pointer-events-none z-20">
      {/* Virtual Thumbstick */}
      <div
        ref={baseRef}
        onTouchStart={(e) => handleTouch(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleTouch(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={resetStick}
        className="w-28 h-28 rounded-full bg-slate-900/70 border border-white/20 relative flex items-center justify-center pointer-events-auto touch-none"
      >
        <div
          className="w-11 h-11 rounded-full bg-cyan-400/90 shadow-lg"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <button
          onClick={() => {
            const next = !sprint;
            setSprint(next);
            onMove(knob.x / 40, knob.y / 40, next);
          }}
          className={`w-12 h-12 rounded-full border text-xs font-bold ${
            sprint
              ? 'bg-amber-500 text-slate-950 border-amber-300'
              : 'bg-slate-900/80 text-slate-200 border-white/20'
          }`}
        >
          RUN
        </button>
        <button
          onClick={onJump}
          className="w-14 h-14 rounded-full bg-cyan-500/90 text-slate-950 font-bold text-xs border border-cyan-300 active:scale-95"
        >
          JUMP
        </button>
        {isSeeker && (
          <button
            onClick={onTag}
            className="w-14 h-14 rounded-full bg-rose-500/95 text-white font-bold text-xs border border-rose-300 active:scale-95"
          >
            TAG
          </button>
        )}
      </div>
    </div>
  );
}
