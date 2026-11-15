import { RefObject } from 'react';
import {
  Axe,
  Compass,
  Droplets,
  Flame,
  Gamepad2,
  Hammer,
  Heart,
  Home,
  Pause,
  Pickaxe,
  Shield,
  Sparkles,
  Sun,
  Moon,
  CloudRain,
  CloudFog,
  Sword,
  Target,
  Thermometer,
  Utensils,
  Volume2,
  VolumeX,
  Zap,
  Hand,
  Cherry,
  Beef,
  FlaskConical,
} from 'lucide-react';
import { ITEM_DEFINITIONS, RESOURCE_META } from '../game/constants';
import { HudSnapshot, ItemId, ResourceId } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  minimapRef: RefObject<HTMLCanvasElement | null>;
  craftingOpen: boolean;
  onToggleCrafting: () => void;
  onSelectSlot: (index: number) => void;
  onUseSlot: (index: number) => void;
  onPause: () => void;
  muted: boolean;
  onToggleMute: () => void;
  touchControlsEnabled: boolean;
  onToggleTouchControls: () => void;
}

function renderItemIcon(itemId: ItemId | null, className = 'h-5 w-5') {
  if (!itemId) return null;
  switch (itemId) {
    case 'hand':
      return <Hand className={`${className} text-slate-300`} />;
    case 'axe':
      return <Axe className={`${className} text-amber-300`} />;
    case 'pickaxe':
      return <Pickaxe className={`${className} text-sky-300`} />;
    case 'spear':
    case 'iron_spear':
      return (
        <Sword
          className={`${className} ${
            itemId === 'iron_spear' ? 'text-blue-300' : 'text-amber-200'
          }`}
        />
      );
    case 'bow':
      return <Target className={`${className} text-amber-400`} />;
    case 'torch':
      return <Flame className={`${className} text-orange-400`} />;
    case 'campfire_kit':
      return <Flame className={`${className} text-amber-500`} />;
    case 'wall_kit':
      return <Shield className={`${className} text-amber-600`} />;
    case 'torch_post_kit':
      return <Zap className={`${className} text-yellow-400`} />;
    case 'shelter_kit':
      return <Home className={`${className} text-emerald-400`} />;
    case 'beacon_kit':
      return <Sparkles className={`${className} text-amber-300`} />;
    case 'berries':
      return <Cherry className={`${className} text-rose-400`} />;
    case 'cooked_meat':
      return <Beef className={`${className} text-orange-400`} />;
    case 'herbal_salve':
      return <FlaskConical className={`${className} text-emerald-400`} />;
    case 'water_flask':
      return <Droplets className={`${className} text-sky-400`} />;
    default:
      return <Compass className={`${className} text-slate-300`} />;
  }
}

const PHASE_LABELS = {
  DAWN: 'Şafak',
  DAY: 'Gündüz',
  DUSK: 'Alacakaranlık',
  NIGHT: 'Gece',
};

const WEATHER_LABELS = {
  CLEAR: 'Açık Hava',
  FOG: 'Sisli',
  RAIN: 'Yağmurlu',
};

const DISPLAY_RESOURCES: ResourceId[] = [
  'wood',
  'stone',
  'fiber',
  'iron',
  'raw_meat',
  'herbs',
  'ember_shard',
];

export function GameHUD({
  hud,
  minimapRef,
  craftingOpen,
  onToggleCrafting,
  onSelectSlot,
  onUseSlot,
  onPause,
  muted,
  onToggleMute,
  touchControlsEnabled,
  onToggleTouchControls,
}: GameHUDProps) {
  const activeItem = hud.hotbar[hud.selectedSlot]?.itemId
    ? ITEM_DEFINITIONS[hud.hotbar[hud.selectedSlot].itemId!]
    : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-4">
      {/* Top Row: Vitals (Left), Day/Phase (Center), Minimap & Controls (Right) */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        {/* Compact Vitals & Resources Panel */}
        <div className="pointer-events-auto w-36 rounded-lg border border-slate-800/90 bg-[#0b1017]/80 p-2 backdrop-blur-md sm:w-44">
          <div className="space-y-1">
            <VitalRow
              icon={<Heart className="h-3 w-3 text-rose-400" />}
              label="Can"
              value={hud.hp}
              max={hud.maxHp}
              barColor={hud.hp < 30 ? 'bg-rose-500' : 'bg-emerald-500'}
            />
            <VitalRow
              icon={<Utensils className="h-3 w-3 text-amber-400" />}
              label="Açlık"
              value={hud.hunger}
              max={hud.maxHunger}
              barColor={hud.hunger < 25 ? 'bg-rose-500' : 'bg-amber-500'}
            />
            <VitalRow
              icon={<Droplets className="h-3 w-3 text-sky-400" />}
              label="Su"
              value={hud.thirst}
              max={hud.maxThirst}
              barColor={hud.thirst < 25 ? 'bg-rose-500' : 'bg-sky-500'}
            />
            <VitalRow
              icon={<Thermometer className="h-3 w-3 text-orange-400" />}
              label="Isı"
              value={hud.warmth}
              max={hud.maxWarmth}
              barColor={hud.warmth < 25 ? 'bg-cyan-400' : 'bg-orange-500'}
            />
            <VitalRow
              icon={<Zap className="h-3 w-3 text-yellow-300" />}
              label="Enerji"
              value={hud.stamina}
              max={hud.maxStamina}
              barColor="bg-yellow-400"
            />
          </div>

          {/* Compact Resource Inventory Strip */}
          <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 border-t border-slate-800/80 pt-1.5 text-[10px]">
            {DISPLAY_RESOURCES.map((res) => (
              <div key={res} className="flex items-center justify-between text-slate-300">
                <span className="truncate">{RESOURCE_META[res].short}</span>
                <span
                  className="font-mono-tabular font-semibold"
                  style={{ color: RESOURCE_META[res].color }}
                >
                  {hud.resources[res]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Center Day, Time & Weather Line */}
        <div className="hidden flex-col items-center gap-2 md:flex">
          <div className="rounded-xl border border-slate-800/90 bg-[#0b1017]/85 px-4 py-2 text-center backdrop-blur-md">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-200">
              {hud.phase === 'NIGHT' ? (
                <Moon className="h-3.5 w-3.5 text-indigo-300" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span className="font-mono-tabular font-semibold text-amber-300">
                {hud.day}. Gün
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>{PHASE_LABELS[hud.phase]}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="flex items-center gap-1 text-slate-300">
                {hud.weather === 'RAIN' && <CloudRain className="h-3.5 w-3.5 text-sky-400" />}
                {hud.weather === 'FOG' && <CloudFog className="h-3.5 w-3.5 text-slate-400" />}
                {WEATHER_LABELS[hud.weather]}
              </span>
            </div>

            <div className="mt-1.5 h-1 w-48 overflow-hidden rounded-full bg-slate-800 lg:w-56">
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${Math.round(hud.timeOfDay * 100)}%` }}
              />
            </div>

            <div className="mt-1.5 text-[11px] text-slate-400">
              {hud.mode === 'CREATIVE' ? (
                <span className="font-medium text-emerald-400">
                  Yaratıcı Mod · Sınırsız Kaynak
                </span>
              ) : hud.beaconLit ? (
                <span className="font-mono-tabular font-semibold text-amber-400">
                  Kurtuluş Kulesini Savun: {hud.beaconDefenseTimer} sn
                </span>
              ) : hud.beaconBuilt ? (
                <span className="text-amber-300">
                  Kule kuruldu — yanına gidip ateşi yak
                </span>
              ) : (
                <span className="font-mono-tabular">
                  Hedef: Köz Kristali ({hud.resources.ember_shard}/3)
                </span>
              )}
            </div>
          </div>

          {hud.phaseBannerTimer > 0 && hud.phaseBannerText && (
            <div className="rounded-lg border border-amber-500/30 bg-[#0b1017]/90 px-4 py-1.5 font-display text-sm font-semibold text-amber-200 shadow-lg">
              {hud.phaseBannerText}
            </div>
          )}
        </div>

        {/* Top-Right Minimap & Touch-Sized Action Controls */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onToggleCrafting}
              className={`flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                craftingOpen
                  ? 'border-amber-500 bg-amber-500 text-slate-950'
                  : 'border-slate-700/80 bg-[#0b1017]/85 text-slate-200 hover:border-amber-500/60 hover:text-white'
              }`}
            >
              <Hammer className="h-4 w-4" />
              <span>Üretim</span>
            </button>

            <button
              type="button"
              onClick={onToggleTouchControls}
              aria-label={touchControlsEnabled ? 'Dokunmatik Kontrolleri Gizle' : 'Dokunmatik Kontrolleri Aç'}
              title={touchControlsEnabled ? 'Dokunmatik Kontroller Açık' : 'Dokunmatik Kontroller Kapalı'}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                touchControlsEnabled
                  ? 'border-amber-500/70 bg-amber-500/20 text-amber-300'
                  : 'border-slate-700/80 bg-[#0b1017]/85 text-slate-300 hover:border-slate-500'
              }`}
            >
              <Gamepad2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Sesi Aç' : 'Sesi Kapat'}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-700/80 bg-[#0b1017]/85 text-slate-200 transition-colors hover:border-amber-500/60 hover:text-white"
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-slate-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-amber-400" />
              )}
            </button>

            <button
              type="button"
              onClick={onPause}
              aria-label="Oyunu Duraklat"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-700/80 bg-[#0b1017]/85 text-slate-200 transition-colors hover:border-amber-500/60 hover:text-white"
            >
              <Pause className="h-4 w-4" />
            </button>
          </div>

          {/* Compact Mobile/Small Tablet Day Line */}
          <div className="rounded-lg border border-slate-800/90 bg-[#0b1017]/85 px-2.5 py-1 text-[11px] font-medium text-slate-200 md:hidden">
            <span className="font-mono-tabular text-amber-300">{hud.day}. Gün</span>
            <span aria-hidden="true" className="mx-1 text-slate-600">·</span>
            <span>{PHASE_LABELS[hud.phase]}</span>
            <span aria-hidden="true" className="mx-1 text-slate-600">·</span>
            <span className="font-mono-tabular text-amber-400">
              {hud.resources.ember_shard}/3 Kristal
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#0b1017]/90 p-1.5 shadow-lg">
            <canvas
              ref={minimapRef}
              width={104}
              height={104}
              className="block rounded-lg sm:h-[116px] sm:w-[116px]"
            />
            <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-slate-400">
              <span>Harita</span>
              <span className="text-amber-400">Sarı: Harabe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Context Prompt + 8-Slot Hotbar (lifted above thumb controls on small screens) */}
      <div
        className={`flex flex-col items-center gap-1.5 ${
          touchControlsEnabled ? 'mb-28 md:mb-1' : 'mb-1'
        }`}
      >
        {(hud.contextHint || hud.nearFire || hud.nearShelter || hud.inShelter) && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-lg border border-slate-800 bg-[#0b1017]/90 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-sm">
            {hud.inShelter ? (
              <span className="text-emerald-400">Barakanın İçindesin · Güvendesin</span>
            ) : (
              hud.nearShelter && <span className="text-emerald-400">Baraka Yakınında</span>
            )}
            {hud.nearFire && (
              <span className="text-amber-400">Ateş Başındasın</span>
            )}
            {hud.contextHint && (
              <span className="font-semibold text-white">{hud.contextHint}</span>
            )}
          </div>
        )}

        {activeItem && (
          <div className="hidden text-xs font-medium text-slate-300 drop-shadow md:block">
            <span className="text-amber-300">{activeItem.name}</span>
            <span aria-hidden="true" className="mx-1.5 text-slate-500">·</span>
            <span className="text-slate-300">{activeItem.description}</span>
          </div>
        )}

        {/* 8-Slot Interactive Hotbar with >=44px touch targets */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-800/90 bg-[#0b1017]/90 p-1.5 backdrop-blur-md sm:gap-1.5">
          {hud.hotbar.map((slot, idx) => {
            const isSelected = idx === hud.selectedSlot;
            const def = slot.itemId ? ITEM_DEFINITIONS[slot.itemId] : null;
            const badgeText =
              slot.itemId === 'water_flask'
                ? `${hud.flaskCharges}/${hud.maxFlaskCharges}`
                : def && (def.kind === 'consumable' || def.kind === 'structure') && slot.count > 0
                  ? `${slot.count}`
                  : null;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelectSlot(idx);
                  if (def && (def.kind === 'consumable' || def.kind === 'structure')) {
                    onUseSlot(idx);
                  }
                }}
                title={def ? def.name : `Boş Yuva ${idx + 1}`}
                className={`relative flex h-11 w-11 items-center justify-center rounded-lg border transition-colors sm:h-12 sm:w-12 ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/25'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-600'
                }`}
              >
                <span className="font-mono-tabular absolute top-0.5 left-1 text-[9px] text-slate-500 sm:text-[10px]">
                  {idx + 1}
                </span>
                {renderItemIcon(slot.itemId, 'h-5 w-5')}
                {badgeText && (
                  <span className="font-mono-tabular absolute right-1 bottom-0.5 text-[10px] font-semibold text-slate-200">
                    {badgeText}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function VitalRow({
  icon,
  label,
  value,
  max,
  barColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  barColor: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-1.5">
      <span className="shrink-0">{icon}</span>
      <span className="w-10 shrink-0 truncate text-[10px] font-medium text-slate-300">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full transition-all duration-150 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono-tabular w-6 shrink-0 text-right text-[10px] font-semibold text-slate-300">
        {value}
      </span>
    </div>
  );
}
