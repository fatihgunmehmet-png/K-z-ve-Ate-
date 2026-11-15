import { useState } from 'react';
import { Check, Copy, Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'primary' | 'subtle';
}

declare const __IS_SINGLE_FILE__: boolean | undefined;

export function PWAInstallButton({ variant = 'subtle' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  const isStandaloneFile =
    (typeof __IS_SINGLE_FILE__ !== 'undefined' && __IS_SINGLE_FILE__) ||
    (typeof window !== 'undefined' && window.location.protocol === 'file:');

  if (isInstalled || isStandaloneFile) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked in some embedded contexts
    }
  };

  const buttonClass =
    variant === 'primary'
      ? 'flex min-h-[48px] items-center gap-2 rounded-lg border border-amber-400/50 bg-slate-900/90 px-5 py-3 text-sm font-semibold text-amber-300 transition-colors hover:border-amber-400 hover:bg-slate-800 whitespace-nowrap shrink-0'
      : 'flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/85 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-amber-500/60 hover:text-white whitespace-nowrap shrink-0';

  const label = isInstallable ? 'Cihaza Kur' : 'Uygulamayı Kur';

  return (
    <>
      <button type="button" onClick={handleClick} className={buttonClass}>
        <Download className="h-4 w-4 text-amber-400" />
        <span>{label}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0d141e] p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="pwa-install-title" className="font-display text-lg font-semibold text-white">
                    Ücretsiz Tablet / Telefon Kurulumu
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tam ekran ve çevrimdışı oynanabilir
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Kapat"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isInIframe && (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
                Önizleme penceresi içinde tarayıcılar doğrudan kurulum penceresi açmaz.
                Oyunu doğrudan kurabilmek için sağ üstteki <strong>Paylaş / Yeni Sekmede Aç</strong>{' '}
                bağlantısını tabletinin tarayıcısında aç.
              </div>
            )}

            {isIOS ? (
              <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-800 text-xs font-semibold text-amber-300">
                    1
                  </span>
                  <span>
                    Safari araç çubuğundaki <strong className="text-white">Paylaş</strong>{' '}
                    <Share className="inline h-3.5 w-3.5 text-sky-400" /> simgesine dokun.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-800 text-xs font-semibold text-amber-300">
                    2
                  </span>
                  <span>
                    Menüyü aşağı kaydırıp <strong className="text-white">Ana Ekrana Ekle</strong>{' '}
                    seçeneğine dokun ve <strong className="text-white">Ekle</strong> de.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-800 text-xs font-semibold text-amber-300">
                    1
                  </span>
                  <span>
                    Android tabletinde Chrome tarayıcısının sağ üstündeki{' '}
                    <strong className="text-white">⋮ Menü</strong> simgesine dokun.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono-tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-800 text-xs font-semibold text-amber-300">
                    2
                  </span>
                  <span>
                    <strong className="text-white">Uygulamayı yükle</strong> veya{' '}
                    <strong className="text-white">Ana ekrana ekle</strong> seçeneğine dokun.
                  </span>
                </li>
              </ol>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5">
              {!isInIframe && (
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-amber-500/60 hover:text-white"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-amber-400" />
                      <span>Bağlantıyı Kopyala</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
