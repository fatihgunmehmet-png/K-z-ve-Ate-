import { useCallback, useEffect, useRef, useState } from 'react';
import { CraftingDrawer } from './components/CraftingDrawer';
import { EndModal } from './components/EndModal';
import { GameHUD } from './components/GameHUD';
import { OfflineIndicator } from './components/OfflineIndicator';
import { TitleScreen } from './components/TitleScreen';
import { MoveDirection, TouchControls } from './components/TouchControls';
import { soundEngine } from './game/audio';
import {
  buildHudSnapshot,
  craftRecipe,
  InputState,
  performContextInteract,
  triggerPrimaryAction,
  updateGameWorld,
  useSelectedItem,
} from './game/engine';
import { renderGameWorld, renderMinimap } from './game/renderer';
import { Difficulty, GameMode, GameState, GameWorld, HudSnapshot } from './game/types';
import { createInitialWorld } from './game/worldGen';

const BEST_DAYS_KEY = 'koz_ve_golge_best_days';

function readBestDays(): number {
  try {
    const raw = localStorage.getItem(BEST_DAYS_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  } catch {
    return 1;
  }
}

function saveBestDays(days: number) {
  try {
    const prev = readBestDays();
    if (days > prev) {
      localStorage.setItem(BEST_DAYS_KEY, String(days));
    }
  } catch {
    // ignore storage errors
  }
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [mode, setMode] = useState<GameMode>('SURVIVAL');
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const [bestDays, setBestDays] = useState<number>(() => readBestDays());
  const [craftingOpen, setCraftingOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [touchControlsEnabled, setTouchControlsEnabled] = useState<boolean>(true);
  const [hud, setHud] = useState<HudSnapshot | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<GameWorld | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    joyX: 0,
    joyY: 0,
    sprint: false,
    attackHeld: false,
    touchAttackHeld: false,
    mouseScreenX: 0,
    mouseScreenY: 0,
    mouseMovedRecently: false,
  });

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const startNewGame = useCallback(
    (diff: Difficulty = difficulty, gameMode: GameMode = mode) => {
      soundEngine.unlock();
      const fresh = createInitialWorld(diff, gameMode);
      worldRef.current = fresh;
      inputRef.current.joyX = 0;
      inputRef.current.joyY = 0;
      inputRef.current.attackHeld = false;
      inputRef.current.touchAttackHeld = false;
      inputRef.current.sprint = false;
      setHud(buildHudSnapshot(fresh));
      setCraftingOpen(false);
      setGameState('PLAYING');
    },
    [difficulty, mode]
  );

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleCraft = useCallback((recipeId: string) => {
    const world = worldRef.current;
    if (!world) return;
    if (craftRecipe(world, recipeId)) {
      setHud(buildHudSnapshot(world));
    }
  }, []);

  const handleSelectSlot = useCallback((index: number) => {
    const world = worldRef.current;
    if (!world) return;
    world.selectedSlot = index;
    setHud(buildHudSnapshot(world));
  }, []);

  const handleUseSlot = useCallback((index: number) => {
    const world = worldRef.current;
    if (!world) return;
    world.selectedSlot = index;
    useSelectedItem(world);
    setHud(buildHudSnapshot(world));
  }, []);

  const handleDirectionChange = useCallback(
    (dir: MoveDirection, pressed: boolean) => {
      inputRef.current[dir] = pressed;
      if (pressed) {
        inputRef.current.mouseMovedRecently = false;
      }
    },
    []
  );

  const handleTouchAttackStart = useCallback(() => {
    if (gameStateRef.current !== 'PLAYING') return;
    soundEngine.unlock();
    inputRef.current.mouseMovedRecently = false;
    inputRef.current.touchAttackHeld = true;
    if (worldRef.current) {
      triggerPrimaryAction(worldRef.current, true);
      setHud(buildHudSnapshot(worldRef.current));
    }
  }, []);

  const handleTouchAttackEnd = useCallback(() => {
    inputRef.current.touchAttackHeld = false;
  }, []);

  const handleTouchSprintChange = useCallback((sprinting: boolean) => {
    inputRef.current.sprint = sprinting;
  }, []);

  const handleTouchInteract = useCallback(() => {
    if (gameStateRef.current !== 'PLAYING' || !worldRef.current) return;
    soundEngine.unlock();
    performContextInteract(worldRef.current);
    setHud(buildHudSnapshot(worldRef.current));
  }, []);

  // Keyboard Listeners (still fully supported on tablets with keyboards & desktop)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (state === 'TITLE_MENU') return;

      const key = e.key.toLowerCase();

      if (key === 'escape' || key === 'p') {
        if (state === 'PLAYING') {
          setGameState('PAUSED');
        } else if (state === 'PAUSED') {
          setGameState('PLAYING');
        }
        return;
      }

      if (state !== 'PLAYING') return;
      const world = worldRef.current;
      if (!world) return;

      if (key === 'w' || e.key === 'ArrowUp') inputRef.current.up = true;
      if (key === 's' || e.key === 'ArrowDown') inputRef.current.down = true;
      if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.left = true;
      if (key === 'd' || e.key === 'ArrowRight') inputRef.current.right = true;
      if (e.key === 'Shift') inputRef.current.sprint = true;

      if (key === ' ') {
        e.preventDefault();
        inputRef.current.attackHeld = true;
        triggerPrimaryAction(world);
        setHud(buildHudSnapshot(world));
      }

      if (key === 'e') {
        performContextInteract(world);
        setHud(buildHudSnapshot(world));
      }

      if (key === 'c' || e.key === 'Tab') {
        e.preventDefault();
        setCraftingOpen((prev) => !prev);
      }

      if (key >= '1' && key <= '8') {
        const idx = parseInt(key, 10) - 1;
        if (world.selectedSlot === idx) {
          useSelectedItem(world);
        } else {
          world.selectedSlot = idx;
        }
        setHud(buildHudSnapshot(world));
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') inputRef.current.up = false;
      if (key === 's' || e.key === 'ArrowDown') inputRef.current.down = false;
      if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.left = false;
      if (key === 'd' || e.key === 'ArrowRight') inputRef.current.right = false;
      if (e.key === 'Shift') inputRef.current.sprint = false;
      if (key === ' ') inputRef.current.attackHeld = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Main 60FPS Game Loop & Canvas Sizing
  useEffect(() => {
    if (gameState === 'TITLE_MENU') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const world = worldRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (world) {
        if (gameStateRef.current === 'PLAYING') {
          const outcome = updateGameWorld(world, dt, inputRef.current, w, h);
          if (outcome === 'GAME_OVER' || outcome === 'VICTORY') {
            saveBestDays(world.day);
            setBestDays(readBestDays());
            setHud(buildHudSnapshot(world));
            setGameState(outcome);
          }
        }

        renderGameWorld(ctx, world, w, h, now / 1000);

        hudSyncAccum += dt;
        if (hudSyncAccum >= 0.07) {
          hudSyncAccum = 0;
          setHud(buildHudSnapshot(world));
          const mini = minimapRef.current;
          if (mini) {
            const mctx = mini.getContext('2d');
            if (mctx) renderMinimap(mctx, world, mini.width);
          }
        }
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [gameState]);

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') return;
    inputRef.current.mouseScreenX = e.clientX;
    inputRef.current.mouseScreenY = e.clientY;
    inputRef.current.mouseMovedRecently = true;
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || gameStateRef.current !== 'PLAYING') return;
    soundEngine.unlock();

    if (e.pointerType === 'touch') {
      // Tap directly on world aims toward tapped point and performs action
      const world = worldRef.current;
      if (world) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const worldTapX = world.camera.x - w / 2 + e.clientX;
        const worldTapY = world.camera.y - h / 2 + e.clientY;
        world.player.angle = Math.atan2(
          worldTapY - world.player.y,
          worldTapX - world.player.x
        );
        inputRef.current.mouseMovedRecently = false;
        triggerPrimaryAction(world, false);
        setHud(buildHudSnapshot(world));
      }
      return;
    }

    inputRef.current.mouseScreenX = e.clientX;
    inputRef.current.mouseScreenY = e.clientY;
    inputRef.current.mouseMovedRecently = true;
    inputRef.current.attackHeld = true;
    if (worldRef.current) {
      triggerPrimaryAction(worldRef.current, false);
      setHud(buildHudSnapshot(worldRef.current));
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') return;
    inputRef.current.attackHeld = false;
  };

  if (gameState === 'TITLE_MENU') {
    return (
      <>
        <TitleScreen
          mode={mode}
          onSelectMode={setMode}
          difficulty={difficulty}
          onSelectDifficulty={setDifficulty}
          onStartGame={() => startNewGame(difficulty, mode)}
          bestDays={bestDays}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
        <OfflineIndicator />
      </>
    );
  }

  const activeItemId = hud?.hotbar[hud.selectedSlot]?.itemId ?? null;

  return (
    <main className="relative h-full w-full overflow-hidden bg-[#0b1017] select-none">
      <canvas
        ref={canvasRef}
        onPointerMove={handleCanvasPointerMove}
        onPointerDown={handleCanvasPointerDown}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        style={{ touchAction: 'none' }}
        className="block h-full w-full cursor-crosshair"
      />

      {hud && (
        <>
          <GameHUD
            hud={hud}
            minimapRef={minimapRef}
            craftingOpen={craftingOpen}
            onToggleCrafting={() => setCraftingOpen((prev) => !prev)}
            onSelectSlot={handleSelectSlot}
            onUseSlot={handleUseSlot}
            onPause={() =>
              setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'))
            }
            muted={muted}
            onToggleMute={handleToggleMute}
            touchControlsEnabled={touchControlsEnabled}
            onToggleTouchControls={() => setTouchControlsEnabled((prev) => !prev)}
          />

          <TouchControls
            visible={touchControlsEnabled && gameState === 'PLAYING' && !craftingOpen}
            activeItemId={activeItemId}
            contextHint={hud.contextHint}
            onDirectionChange={handleDirectionChange}
            onAttackStart={handleTouchAttackStart}
            onAttackEnd={handleTouchAttackEnd}
            onSprintChange={handleTouchSprintChange}
            onInteract={handleTouchInteract}
          />

          <CraftingDrawer
            open={craftingOpen}
            onClose={() => setCraftingOpen(false)}
            resources={hud.resources}
            nearFire={hud.nearFire}
            onCraft={handleCraft}
          />
        </>
      )}

      {(gameState === 'PAUSED' ||
        gameState === 'GAME_OVER' ||
        gameState === 'VICTORY') &&
        hud && (
          <EndModal
            gameState={gameState}
            day={hud.day}
            kills={hud.kills}
            gatheredTotal={hud.gatheredTotal}
            craftedTotal={hud.craftedTotal}
            causeOfDeath={hud.causeOfDeath}
            bestDays={bestDays}
            onResume={
              gameState === 'PAUSED' ? () => setGameState('PLAYING') : undefined
            }
            onRestart={() => startNewGame(difficulty, mode)}
            onMainMenu={() => setGameState('TITLE_MENU')}
          />
        )}

      <OfflineIndicator />
    </main>
  );
}
