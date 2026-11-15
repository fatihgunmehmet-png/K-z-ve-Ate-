import { useState } from 'react';
import { FileDown, Flame, Compass, ShieldAlert, Volume2, VolumeX } from 'lucide-react';
import titleCampfireImg from '../assets/images/survival_title_campfire_1794751291644.jpg';
import { Difficulty, GameMode } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

declare const __IS_SINGLE_FILE__: boolean | undefined;

interface TitleScreenProps {
  mode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  difficulty: Difficulty;
  onSelectDifficulty: (diff: Difficulty) => void;
  onStartGame: () => void;
  bestDays: number;
  muted: boolean;
  onToggleMute: () => void;
}

export function TitleScreen({
  mode,
  onSelectMode,
  difficulty,
  onSelectDifficulty,
  onStartGame,
  bestDays,
  muted,
  onToggleMute,
}: TitleScreenProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadNote, setDownloadNote] = useState<string | null>(null);

  const isStandaloneFile =
    (typeof __IS_SINGLE_FILE__ !== 'undefined' && __IS_SINGLE_FILE__) ||
    (typeof window !== 'undefined' && window.location.protocol === 'file:');

  const handleDownloadFile = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadNote(null);
    try {
      const res = await fetch('/koz-ve-golge.html', { credentials: 'same-origin' });
      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }
      const html = await res.text();
      if (!html.includes('Köz ve Gölge') || html.length < 50_000) {
        setDownloadNote(
          'Tarayıcı önizlemesi indirmeyi engelledi. Oyunu doğrudan kendi tarayıcında (Paylaşım bağlantısı ile) açıp tekrar dene.'
        );
        return;
      }

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'koz-ve-golge.html';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15_000);
      setDownloadNote('Dosya indiriliyor (koz-ve-golge.html). İndirilenler klasöründen açabilirsin.');
    } catch {
      setDownloadNote(
        'Önizleme penceresi çerez/indirme izni vermiyor. Paylaşım bağlantısını doğrudan Chrome veya Safari ile açıp indir.'
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-y-auto bg-[#0b1017]">
      {/* Atmospheric generated key art background with safe fallback */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0f172a] via-[#0b1017] to-[#1e120b]">
        <img
          src={titleCampfireImg}
          alt="Karanlık çam ormanında kamp ateşi başında hayatta kalan gezgin"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover opacity-55"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1017]/95 via-[#0b1017]/75 to-[#0b1017]/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1017] via-transparent to-[#0b1017]/60" />
      </div>

      {/* Top right sound control */}
      <button
        type="button"
        onClick={onToggleMute}
        className="fixed top-5 right-5 z-20 flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-amber-500/60 hover:text-white whitespace-nowrap shrink-0"
      >
        {muted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-amber-400" />}
        <span>{muted ? 'Ses Kapalı' : 'Ses Açık'}</span>
      </button>

      {/* Main Content Container */}
      <div className="relative z-10 mx-auto my-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 px-6 py-14 lg:grid-cols-12 lg:gap-10">
        {/* Left Hero Column */}
        <div className="lg:col-span-7">
          <div className="mb-3 flex items-center gap-2.5 text-xs font-medium tracking-wide text-amber-400/90">
            <span>Vahşi Doğa Hayatta Kalma</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono-tabular text-slate-300">
              En İyi Rekor: {bestDays} Gün
            </span>
          </div>

          <h1 className="font-display text-5xl font-bold tracking-tight text-slate-50 sm:text-6xl [text-wrap:balance]">
            Köz ve Gölge
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
            Gündüz ormanı keşfet, odun ve taş topla, barakanı kur. Gece çöktüğünde kurtlar ve
            gölge yaratıkları ortaya çıkar; ateşinin başında veya barakanın içinde güvende kal.
          </p>

          {/* Game Mode Selector */}
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium text-slate-400">Oyun Modu</p>
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900/90 p-1">
              <button
                type="button"
                onClick={() => onSelectMode('SURVIVAL')}
                className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'SURVIVAL'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Hayatta Kalma
              </button>
              <button
                type="button"
                onClick={() => onSelectMode('CREATIVE')}
                className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'CREATIVE'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Yaratıcı Mod
              </button>
            </div>
            {mode === 'CREATIVE' && (
              <p className="mt-2 text-xs text-emerald-300/90">
                Sınırsız kaynak, ölümsüzlük, tek vuruşta toplama ve serbest üs inşa etme.
              </p>
            )}
          </div>

          {/* Difficulty Selector (shown in Survival Mode) */}
          {mode === 'SURVIVAL' && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-slate-400">Zorluk Seviyesi</p>
              <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900/90 p-1">
                <button
                  type="button"
                  onClick={() => onSelectDifficulty('NORMAL')}
                  className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    difficulty === 'NORMAL'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Keşifçi (Normal)
                </button>
                <button
                  type="button"
                  onClick={() => onSelectDifficulty('HARD')}
                  className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    difficulty === 'HARD'
                      ? 'bg-rose-700 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Vahşi Doğa (Zor)
                </button>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onStartGame}
              className="min-h-[48px] rounded-lg bg-amber-500 px-7 py-3.5 text-base font-semibold text-slate-950 transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 whitespace-nowrap shrink-0"
            >
              Oyuna Başla
            </button>
            <PWAInstallButton variant="primary" />
            {!isStandaloneFile && (
              <button
                type="button"
                onClick={handleDownloadFile}
                disabled={downloading}
                className="flex min-h-[48px] items-center gap-2 rounded-lg border border-emerald-500/45 bg-emerald-950/50 px-5 py-3 text-sm font-semibold text-emerald-300 transition-colors hover:border-emerald-400 hover:bg-emerald-900/60 disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <FileDown className="h-4 w-4 text-emerald-400" />
                <span>{downloading ? 'Hazırlanıyor...' : 'Dosyayı İndir (.html)'}</span>
              </button>
            )}
            {downloadNote && (
              <p className="w-full rounded-lg border border-emerald-500/30 bg-slate-900/90 px-3 py-2 text-xs leading-relaxed text-emerald-200">
                {downloadNote}
              </p>
            )}
            <span className="w-full text-xs leading-relaxed text-slate-400">
              Dokunmatik: Sol Yön Tuşları &amp; Sağ Eylem Tuşları · Klavye: WASD, E, C, Boşluk
            </span>
          </div>
        </div>

        {/* Right Survival Guide Panel */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-slate-800/90 bg-slate-950/80 p-6 backdrop-blur-sm">
            <h2 className="font-display text-xl font-semibold text-slate-100">
              Hayatta Kalma Rehberi
            </h2>

            <div className="mt-5 space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Ateşi Canlı Tut</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Gece ve yağmur vücut ısısını hızla düşürür. Kamp ateşine [E] ile odun ekle
                    ve etlerini ateş başında pişir.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Harabeleri Keşfet</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Haritanın dört köşesindeki eski harabelerde sarı Köz Kristalleri ve demir
                    damarları bulunur. Mini haritadan takip et.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Kurtuluş Kulesini Kur</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    3 Köz Kristali ile Kurtuluş İşaret Kulesini üret, etrafını barikatlarla çevir
                    ve ateşi yaktıktan sonra 35 saniye savun.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
