import { useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Flame,
  Hand,
  Sword,
  Wind,
} from 'lucide-react';
import { ITEM_DEFINITIONS } from '../game/constants';
import { ItemId } from '../game/types';

export type MoveDirection = 'up' | 'down' | 'left' | 'right';

interface TouchControlsProps {
  visible: boolean;
  activeItemId: ItemId | null;
  contextHint: string | null;
  onDirectionChange: (dir: MoveDirection, pressed: boolean) => void;
  onAttackStart: () => void;
  onAttackEnd: () => void;
  onSprintChange: (sprinting: boolean) => void;
  onInteract: () => void;
}

export function TouchControls({
  visible,
  activeItemId,
  contextHint,
  onDirectionChange,
  onAttackStart,
  onAttackEnd,
  onSprintChange,
  onInteract,
}: TouchControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const padPointerId = useRef<number | null>(null);
  const activeDirsRef = useRef<Record<MoveDirection, boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const [pressedDirs, setPressedDirs] = useState<Record<MoveDirection, boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const [attackActive, setAttackActive] = useState(false);
  const [sprintActive, setSprintActive] = useState(false);

  if (!visible) return null;

  const activeDef = activeItemId ? ITEM_DEFINITIONS[activeItemId] : ITEM_DEFINITIONS.hand;
  const primaryLabel =
    activeDef.kind === 'structure'
      ? 'Kur'
      : activeDef.kind === 'consumable'
        ? 'Kullan'
        : 'Vur / Topla';

  const applyDirections = (next: Record<MoveDirection, boolean>) => {
    const prev = activeDirsRef.current;
    (['up', 'down', 'left', 'right'] as MoveDirection[]).forEach((d) => {
      if (prev[d] !== next[d]) {
        onDirectionChange(d, next[d]);
      }
    });
    activeDirsRef.current = next;
    setPressedDirs(next);
  };

  const updatePadFromPointer = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < 14) {
      applyDirections({ up: false, down: false, left: false, right: false });
      return;
    }

    // 8-sector directional detection (supports cardinal + all 4 diagonals)
    const nx = dx / dist;
    const ny = dy / dist;
    const threshold = 0.38; // ~22.5 deg sector boundary
    applyDirections({
      up: ny < -threshold,
      down: ny > threshold,
      left: nx < -threshold,
      right: nx > threshold,
    });
  };

  const releasePad = () => {
    padPointerId.current = null;
    applyDirections({ up: false, down: false, left: false, right: false });
  };

  const padCellClass = (isActive: boolean, isDiagonal = false) =>
    `pointer-events-none flex h-13 w-13 items-center justify-center rounded-xl border-2 transition-colors sm:h-14 sm:w-14 ${
      isActive
        ? 'border-amber-300 bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
        : isDiagonal
          ? 'border-slate-700/70 bg-slate-900/65 text-slate-300'
          : 'border-slate-600/80 bg-slate-900/80 text-slate-100'
    } backdrop-blur-sm`;

  const upLeftActive = pressedDirs.up && pressedDirs.left;
  const upRightActive = pressedDirs.up && pressedDirs.right;
  const downLeftActive = pressedDirs.down && pressedDirs.left;
  const downRightActive = pressedDirs.down && pressedDirs.right;
  const upOnlyActive = pressedDirs.up && !pressedDirs.left && !pressedDirs.right;
  const downOnlyActive = pressedDirs.down && !pressedDirs.left && !pressedDirs.right;
  const leftOnlyActive = pressedDirs.left && !pressedDirs.up && !pressedDirs.down;
  const rightOnlyActive = pressedDirs.right && !pressedDirs.up && !pressedDirs.down;

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {/* Left Thumb 8-Way Directional Pad (supports tap & slide across diagonals) */}
      <div
        ref={padRef}
        role="group"
        aria-label="8 Yönlü Hareket Tuşları"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          padPointerId.current = e.pointerId;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore if pointer capture is unavailable
          }
          updatePadFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (padPointerId.current !== e.pointerId) return;
          e.preventDefault();
          updatePadFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (padPointerId.current !== e.pointerId) return;
          e.preventDefault();
          releasePad();
        }}
        onPointerCancel={(e) => {
          if (padPointerId.current !== e.pointerId) return;
          releasePad();
        }}
        onLostPointerCapture={() => {
          releasePad();
        }}
        style={{ touchAction: 'none' }}
        className="pointer-events-auto fixed bottom-5 left-5 grid grid-cols-3 grid-rows-3 gap-1 sm:bottom-7 sm:left-7"
      >
        <div className={padCellClass(upLeftActive, true)} aria-hidden="true">
          <ArrowUpLeft className="h-5 w-5" />
        </div>
        <div className={padCellClass(upOnlyActive)} aria-hidden="true">
          <ChevronUp className="h-7 w-7" />
        </div>
        <div className={padCellClass(upRightActive, true)} aria-hidden="true">
          <ArrowUpRight className="h-5 w-5" />
        </div>

        <div className={padCellClass(leftOnlyActive)} aria-hidden="true">
          <ChevronLeft className="h-7 w-7" />
        </div>
        <div className="pointer-events-none flex h-13 w-13 items-center justify-center rounded-xl border border-slate-800/70 bg-slate-950/45 sm:h-14 sm:w-14">
          <div className="h-2.5 w-2.5 rounded-full bg-slate-600" />
        </div>
        <div className={padCellClass(rightOnlyActive)} aria-hidden="true">
          <ChevronRight className="h-7 w-7" />
        </div>

        <div className={padCellClass(downLeftActive, true)} aria-hidden="true">
          <ArrowDownLeft className="h-5 w-5" />
        </div>
        <div className={padCellClass(downOnlyActive)} aria-hidden="true">
          <ChevronDown className="h-7 w-7" />
        </div>
        <div className={padCellClass(downRightActive, true)} aria-hidden="true">
          <ArrowDownRight className="h-5 w-5" />
        </div>
      </div>

      {/* Right Thumb Action Cluster */}
      <div className="pointer-events-auto fixed right-5 bottom-6 flex items-end gap-3 sm:right-7 sm:bottom-8">
        <div className="flex flex-col items-end gap-3">
          {/* Context Interact Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onInteract();
            }}
            style={{ touchAction: 'none' }}
            aria-label="Etkileşim"
            className={`flex h-14 min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-3 text-[11px] font-semibold transition-colors ${
              contextHint
                ? 'border-amber-300 bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                : 'border-slate-600/80 bg-slate-900/80 text-slate-300'
            } backdrop-blur-sm`}
          >
            {contextHint ? <Flame className="h-4 w-4" /> : <Hand className="h-4 w-4" />}
            <span>Etkileş</span>
          </button>

          {/* Sprint Hold Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // ignore
              }
              setSprintActive(true);
              onSprintChange(true);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              setSprintActive(false);
              onSprintChange(false);
            }}
            onPointerCancel={() => {
              setSprintActive(false);
              onSprintChange(false);
            }}
            onLostPointerCapture={() => {
              setSprintActive(false);
              onSprintChange(false);
            }}
            style={{ touchAction: 'none' }}
            aria-label="Koş"
            className={`flex h-15 w-15 flex-col items-center justify-center gap-0.5 rounded-full border-2 text-[11px] font-semibold transition-colors ${
              sprintActive
                ? 'border-sky-300 bg-sky-500 text-slate-950'
                : 'border-slate-600/80 bg-slate-900/80 text-slate-200'
            } backdrop-blur-sm`}
          >
            <Wind className="h-4 w-4" />
            <span>Koş</span>
          </button>
        </div>

        {/* Primary Attack / Gather / Place / Use Button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // ignore
            }
            setAttackActive(true);
            onAttackStart();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            setAttackActive(false);
            onAttackEnd();
          }}
          onPointerCancel={() => {
            setAttackActive(false);
            onAttackEnd();
          }}
          onLostPointerCapture={() => {
            setAttackActive(false);
            onAttackEnd();
          }}
          style={{ touchAction: 'none' }}
          aria-label={primaryLabel}
          className={`flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full border-2 text-xs font-bold shadow-xl transition-transform ${
            attackActive
              ? 'scale-95 border-amber-200 bg-amber-400 text-slate-950'
              : 'border-amber-400/90 bg-amber-500/90 text-slate-950'
          }`}
        >
          <Sword className="h-6 w-6" />
          <span className="leading-none">{primaryLabel}</span>
        </button>
      </div>
    </div>
  );
}
