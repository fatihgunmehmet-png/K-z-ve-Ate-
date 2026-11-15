import { useState } from 'react';
import { Hammer, Flame, HeartPulse, X } from 'lucide-react';
import { CRAFT_RECIPES, RESOURCE_META } from '../game/constants';
import { CraftCategory, ResourceId } from '../game/types';

interface CraftingDrawerProps {
  open: boolean;
  onClose: () => void;
  resources: Record<ResourceId, number>;
  nearFire: boolean;
  onCraft: (recipeId: string) => void;
}

const CATEGORIES: { id: CraftCategory; label: string }[] = [
  { id: 'TOOLS', label: 'Alet ve Silah' },
  { id: 'STRUCTURES', label: 'Yapı ve Ateş' },
  { id: 'SUPPLIES', label: 'Erzak' },
];

export function CraftingDrawer({
  open,
  onClose,
  resources,
  nearFire,
  onCraft,
}: CraftingDrawerProps) {
  const [category, setCategory] = useState<CraftCategory>('TOOLS');

  if (!open) return null;

  const filtered = CRAFT_RECIPES.filter((r) => r.category === category);

  return (
    <aside
      aria-label="Üretim Menüsü"
      className="fixed top-20 left-3 z-40 flex max-h-[calc(100vh-195px)] w-[min(23rem,calc(100vw-1.5rem))] flex-col rounded-xl border border-slate-800 bg-[#0f1620]/95 shadow-2xl backdrop-blur-md sm:left-4"
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Hammer className="h-4 w-4 text-amber-400" />
          <h2 className="font-display text-base font-semibold text-slate-100">
            Üretim Tezgahı
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Üretim menüsünü kapat"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-3 gap-1 border-b border-slate-800/80 bg-slate-950/50 p-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`min-h-[44px] rounded-md px-2 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              category === cat.id
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Recipe List */}
      <div className="custom-scroll flex-1 divide-y divide-slate-800/70 overflow-y-auto px-4 py-2">
        {filtered.map((recipe) => {
          const entries = Object.entries(recipe.costs) as [ResourceId, number][];
          const hasResources = entries.every(
            ([res, amt]) => (resources[res] || 0) >= amt
          );
          const fireOk = !recipe.requiresNearFire || nearFire;
          const canCraft = hasResources && fireOk;

          return (
            <div key={recipe.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
                    <span>{recipe.name}</span>
                    {recipe.requiresNearFire && (
                      <Flame
                        className={`h-3.5 w-3.5 ${
                          nearFire ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-slate-400">
                    {recipe.description}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!canCraft}
                  onClick={() => onCraft(recipe.id)}
                  className={`min-h-[44px] min-w-[68px] rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    canCraft
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'cursor-not-allowed bg-slate-800 text-slate-500'
                  }`}
                >
                  Üret
                </button>
              </div>

              {/* Cost breakdown */}
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                {entries.map(([res, amt]) => {
                  const owned = resources[res] || 0;
                  const enough = owned >= amt;
                  return (
                    <span
                      key={res}
                      className={`font-mono-tabular ${
                        enough ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {RESOURCE_META[res].short}: {owned}/{amt}
                    </span>
                  );
                })}
                {recipe.requiresNearFire && !nearFire && (
                  <span className="text-amber-400/90">· Ateş başında olmalısın</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2.5 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <HeartPulse className="h-3.5 w-3.5 text-emerald-400" />
          <span>İstediğin zaman kapatabilirsin</span>
        </span>
      </div>
    </aside>
  );
}
