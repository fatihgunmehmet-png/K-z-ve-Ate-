import { GameState } from '../game/types';

interface EndModalProps {
  gameState: Extract<GameState, 'PAUSED' | 'GAME_OVER' | 'VICTORY'>;
  day: number;
  kills: number;
  gatheredTotal: number;
  craftedTotal: number;
  causeOfDeath: string;
  bestDays: number;
  onResume?: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export function EndModal({
  gameState,
  day,
  kills,
  gatheredTotal,
  craftedTotal,
  causeOfDeath,
  bestDays,
  onResume,
  onRestart,
  onMainMenu,
}: EndModalProps) {
  const isPaused = gameState === 'PAUSED';
  const isVictory = gameState === 'VICTORY';

  const title = isPaused
    ? 'Oyun Duraklatıldı'
    : isVictory
      ? 'Kurtuluş İşareti Ulaştı'
      : 'Ormanda Kayboldun';

  const subtitle = isPaused
    ? 'Kısa bir mola verdin. Hazır olduğunda hayatta kalmaya devam edebilirsin.'
    : isVictory
      ? 'İşaret kulesinin alevleri gökyüzünü deldi ve kurtarma ekibi seni buldu. Vahşi doğaya meydan okudun!'
      : causeOfDeath || 'Karanlık ormanın soğuğuna ve vahşi doğasına yenik düştün.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#111822] p-6 shadow-2xl">
        <div className="text-xs font-medium text-amber-400">
          <span>{isVictory ? 'Zafer' : isPaused ? 'Duraklatma' : 'Yolculuk Sona Erdi'}</span>
          <span aria-hidden="true" className="mx-2 text-slate-600">·</span>
          <span className="font-mono-tabular text-slate-400">Rekor: {bestDays} Gün</span>
        </div>

        <h2 className="font-display mt-2 text-3xl font-bold text-slate-50 [text-wrap:balance]">
          {title}
        </h2>

        <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{subtitle}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-800/80 py-4">
          <div>
            <div className="text-xs text-slate-400">Hayatta Kalınan</div>
            <div className="font-mono-tabular mt-0.5 text-lg font-semibold text-slate-100">
              {day} Gün
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Alt Edilen Yaratık</div>
            <div className="font-mono-tabular mt-0.5 text-lg font-semibold text-slate-100">
              {kills}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Toplanan Kaynak</div>
            <div className="font-mono-tabular mt-0.5 text-lg font-semibold text-slate-100">
              {gatheredTotal}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Üretilen Eşya</div>
            <div className="font-mono-tabular mt-0.5 text-lg font-semibold text-slate-100">
              {craftedTotal}
            </div>
          </div>
        </div>

        {isPaused && (
          <div className="mt-4 text-xs leading-relaxed text-slate-400">
            Dokunmatik: Sol yön tuşları ile yürü, sağ tuşlarla topla, saldır, koş ve etkileş.{' '}
            Klavye: <span className="text-slate-200">WASD</span> ·{' '}
            <span className="text-slate-200">Shift</span> ·{' '}
            <span className="text-slate-200">E</span> ·{' '}
            <span className="text-slate-200">C</span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {isPaused && onResume && (
            <button
              type="button"
              onClick={onResume}
              className="min-h-[44px] flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
            >
              Devam Et
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            className={`min-h-[44px] flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
              isPaused
                ? 'border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            Yeniden Başla
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="min-h-[44px] rounded-lg border border-slate-700 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0"
          >
            Ana Menü
          </button>
        </div>
      </div>
    </div>
  );
}
