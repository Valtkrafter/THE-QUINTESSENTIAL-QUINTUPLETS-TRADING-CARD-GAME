'use client';

import React, { useState, useMemo } from 'react';
import {
  CharacterId,
  Finish,
  GradeResult,
  GradeTier,
  Rarity,
  CardInstance,
} from '../../types/card.js';
import {
  CARDS_CATALOG,
  getCardsByCharacter,
} from '../../config/cardsData.js';
import {
  calculateRawCardValue,
  calculateCardMarketValue,
  FINISH_MULTIPLIERS,
  GRADE_TIER_CONFIG,
  RARITY_BASE_VALUES,
} from '../../config/economy.js';
import { CardRenderer, CHARACTER_THEMES, FINISH_LABELS } from '../../components/card/CardRenderer';
import { GradingSlab } from '../../components/card/GradingSlab';
import { Sparkles, Layers, Award, Eye } from 'lucide-react';

type SlabViewMode = 'raw' | 'poor' | 'used' | 'crisp' | 'mint9' | 'gem10' | 'black_label';

export default function ShowcasePage() {
  const [selectedChar, setSelectedChar] = useState<CharacterId>('miku');
  const [selectedRarity, setSelectedRarity] = useState<Rarity>('UR');
  const [selectedFinish, setSelectedFinish] = useState<Finish>('holo');
  const [slabMode, setSlabMode] = useState<SlabViewMode>('gem10');
  const [cardScale, setCardScale] = useState<'sm' | 'md' | 'lg'>('md');

  // Find candidate card from catalog matching character and rarity
  const candidateCards = useMemo(() => {
    return getCardsByCharacter(selectedChar);
  }, [selectedChar]);

  const activeCardDef = useMemo(() => {
    const matched = candidateCards.find((c) => c.rarity === selectedRarity);
    return matched ?? candidateCards[0] ?? CARDS_CATALOG[0];
  }, [candidateCards, selectedRarity]);

  // Construct mock GradeResult based on current slabMode
  const activeMockGrade: GradeResult | undefined = useMemo(() => {
    if (slabMode === 'raw') return undefined;

    const tierMap: Record<
      Exclude<SlabViewMode, 'raw'>,
      { tier: GradeTier; num: number; isBlack: boolean }
    > = {
      poor: { tier: 'POOR_1_3', num: 2, isBlack: false },
      used: { tier: 'USED_4_6', num: 5, isBlack: false },
      crisp: { tier: 'CRISP_7_8', num: 8, isBlack: false },
      mint9: { tier: 'MINT_9', num: 9, isBlack: false },
      gem10: { tier: 'GEM_MINT_10', num: 10, isBlack: false },
      black_label: { tier: 'BLACK_LABEL', num: 10, isBlack: true },
    };

    const config = tierMap[slabMode];
    const tierConfig = GRADE_TIER_CONFIG[config.tier];

    return {
      tier: config.tier,
      tierLabel: tierConfig.tierLabel,
      numericGrade: config.num,
      isBlackLabel: config.isBlack,
      multiplier: tierConfig.multiplier,
      subgrades: config.isBlack
        ? { centering: 10.0, surface: 10.0, corners: 10.0, edges: 10.0 }
        : config.num === 10
        ? { centering: 10.0, surface: 9.5, corners: 10.0, edges: 10.0 }
        : { centering: 9.0, surface: 9.0, corners: 9.0, edges: 9.0 },
      gradedAt: 1726000000000,
    };
  }, [slabMode]);

  // Active simulated CardInstance
  const activeCardInstance: CardInstance = useMemo(() => {
    return {
      id: 'showcase-card-instance',
      cardDefId: activeCardDef.id,
      characterId: activeCardDef.characterId,
      rarity: activeCardDef.rarity,
      finish: selectedFinish,
      obtainedAt: Date.now(),
      grade: activeMockGrade,
    };
  }, [activeCardDef, selectedFinish, activeMockGrade]);

  const baseVal = RARITY_BASE_VALUES[activeCardInstance.rarity];
  const finishMult = FINISH_MULTIPLIERS[selectedFinish];
  const rawVal = calculateRawCardValue(activeCardInstance.rarity, selectedFinish);
  const totalVal = calculateCardMarketValue(activeCardInstance);

  const characterList: CharacterId[] = [
    'ichika',
    'nino',
    'miku',
    'yotsuba',
    'itsuki',
    'fuutarou',
    'raiha',
    'maruo',
    'isanari',
    'takeda',
  ];

  const rarityList: Rarity[] = ['C', 'UC', 'R', 'SR', 'UR', 'SEC', 'MR'];
  const finishList: Finish[] = ['raw', 'holo', 'sparkle', 'rainbow', 'gold_etched', 'signed'];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8 flex flex-col items-center">
      {/* HEADER */}
      <header className="max-w-6xl w-full mb-8 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          TQQ Vault Physical Renderer Lab
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-zinc-100 via-amber-200 to-yellow-500 bg-clip-text text-transparent">
          3D Card Shaders & Acrylic Slabs
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mt-2">
          Experience real-world TCG physics with interactive cursor pitch & yaw, dynamic specular
          glare, multi-layered iridescent foils, and museum-grade acrylic grading slabs.
        </p>
      </header>

      {/* MAIN SHOWCASE INTERACTIVE CONTAINER */}
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT / CENTER: THE CARD STAGE */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 sm:p-10 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl relative overflow-hidden shadow-2xl min-h-[580px]">
          {/* Ambient Glow Backdrop */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none transition-colors duration-500"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${
                CHARACTER_THEMES[selectedChar].accent
              } 0%, transparent 70%)`,
            }}
          />

          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* The 3D Rendered Card / Slab */}
            <GradingSlab
              card={activeCardInstance}
              mockGrade={activeMockGrade}
              size={cardScale}
              interactive={true}
              showMarketValue={true}
            />

            {/* Hint Badge */}
            <div className="mt-8 flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 border border-zinc-700/80 text-zinc-400 text-xs shadow-lg backdrop-blur">
              <Eye className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Hover or touch to tilt in 3D and test laminate specular reflection</span>
            </div>

            {/* Live Valuation Breakdown Banner */}
            <div className="mt-4 grid grid-cols-3 gap-3 w-full max-w-md text-center">
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] uppercase text-zinc-500 font-mono">Base Value</span>
                <div className="text-xs sm:text-sm font-bold text-zinc-200">
                  {baseVal.toLocaleString()} ¥
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] uppercase text-zinc-500 font-mono">
                  Finish ({finishMult}x)
                </span>
                <div className="text-xs sm:text-sm font-bold text-zinc-200">
                  {rawVal.toLocaleString()} ¥
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                <span className="text-[10px] uppercase text-amber-400 font-mono">Total Market</span>
                <div className="text-xs sm:text-sm font-black text-amber-300">
                  {totalVal.toLocaleString()} ¥
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: CONTROL PANEL & CUSTOMIZATION MATRIX */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* PRESETS QUICK-SWITCH */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Signature Collector Presets
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  setSelectedChar('yotsuba');
                  setSelectedRarity('MR');
                  setSelectedFinish('signed');
                  setSlabMode('black_label');
                }}
                className="p-2.5 rounded-xl bg-zinc-950 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-800 transition text-left flex flex-col"
              >
                <span className="font-extrabold text-amber-300">The Chosen Bride</span>
                <span className="text-[10px] text-zinc-400">Black Label • Signed MR</span>
              </button>

              <button
                onClick={() => {
                  setSelectedChar('miku');
                  setSelectedRarity('UR');
                  setSelectedFinish('gold_etched');
                  setSlabMode('gem10');
                }}
                className="p-2.5 rounded-xl bg-zinc-950 border border-cyan-500/40 hover:border-cyan-400 hover:bg-zinc-800 transition text-left flex flex-col"
              >
                <span className="font-extrabold text-cyan-300">Matcha Master</span>
                <span className="text-[10px] text-zinc-400">Gem Mint 10 • Gold Etched UR</span>
              </button>

              <button
                onClick={() => {
                  setSelectedChar('nino');
                  setSelectedRarity('SR');
                  setSelectedFinish('rainbow');
                  setSlabMode('mint9');
                }}
                className="p-2.5 rounded-xl bg-zinc-950 border border-pink-500/40 hover:border-pink-400 hover:bg-zinc-800 transition text-left flex flex-col"
              >
                <span className="font-extrabold text-pink-300">Locomotive Confession</span>
                <span className="text-[10px] text-zinc-400">Mint 9 • Rainbow Prism SR</span>
              </button>

              <button
                onClick={() => {
                  setSelectedChar('fuutarou');
                  setSelectedRarity('UR');
                  setSelectedFinish('sparkle');
                  setSlabMode('crisp');
                }}
                className="p-2.5 rounded-xl bg-zinc-950 border border-slate-500/40 hover:border-slate-400 hover:bg-zinc-800 transition text-left flex flex-col"
              >
                <span className="font-extrabold text-slate-300">Determined Groom</span>
                <span className="text-[10px] text-zinc-400">Grade 8.0 • Starlight Sparkle</span>
              </button>
            </div>
          </div>

          {/* 1. CHARACTER SELECTOR */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              1. Character & Ambient Glow
            </h3>
            <div className="grid grid-cols-5 gap-1.5">
              {characterList.map((cId) => {
                const theme = CHARACTER_THEMES[cId];
                const isSelected = selectedChar === cId;
                return (
                  <button
                    key={cId}
                    onClick={() => setSelectedChar(cId)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                      isSelected
                        ? 'border-white bg-zinc-800 shadow-md scale-105'
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:bg-zinc-800/60'
                    }`}
                    style={{
                      borderColor: isSelected ? theme.accent : undefined,
                    }}
                  >
                    <span className="text-base">{theme.symbol}</span>
                    <span className="text-[10px] truncate max-w-full">
                      {theme.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. RARITY SELECTOR */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              2. Base Rarity Tier
            </h3>
            <div className="grid grid-cols-7 gap-1">
              {rarityList.map((r) => {
                const isSelected = selectedRarity === r;
                return (
                  <button
                    key={r}
                    onClick={() => setSelectedRarity(r)}
                    className={`py-1.5 rounded-lg text-xs font-black border transition ${
                      isSelected
                        ? 'bg-amber-500 text-black border-amber-300 shadow-md'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. SURFACE FINISH SHADER SELECTOR */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
              <span>3. Surface Finish Shader</span>
              <span className="text-amber-400 text-[10px] font-mono">
                {FINISH_MULTIPLIERS[selectedFinish]}x Multiplier
              </span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {finishList.map((f) => {
                const isSelected = selectedFinish === f;
                return (
                  <button
                    key={f}
                    onClick={() => setSelectedFinish(f)}
                    className={`p-2 rounded-xl text-left border transition text-xs flex flex-col ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/15 text-amber-200 shadow-sm'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800/80'
                    }`}
                  >
                    <span className="font-bold">{FINISH_LABELS[f]}</span>
                    <span className="text-[10px] text-zinc-500">
                      {FINISH_MULTIPLIERS[f]}x Value
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. GRADING SLAB & CASING SELECTOR */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              4. Acrylic Slab & Vault Tier
            </h3>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              <button
                onClick={() => setSlabMode('raw')}
                className={`p-2 rounded-xl border text-center font-bold transition ${
                  slabMode === 'raw'
                    ? 'border-white bg-zinc-800 text-white'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Raw Card
              </button>

              <button
                onClick={() => setSlabMode('crisp')}
                className={`p-2 rounded-xl border text-center font-bold transition ${
                  slabMode === 'crisp'
                    ? 'border-zinc-300 bg-zinc-300 text-zinc-900'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Grade 8 (Silver)
              </button>

              <button
                onClick={() => setSlabMode('mint9')}
                className={`p-2 rounded-xl border text-center font-bold transition ${
                  slabMode === 'mint9'
                    ? 'border-cyan-400 bg-cyan-950 text-cyan-200'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Grade 9 (Platinum)
              </button>

              <button
                onClick={() => setSlabMode('gem10')}
                className={`p-2 rounded-xl border text-center font-bold transition ${
                  slabMode === 'gem10'
                    ? 'border-yellow-400 bg-yellow-500 text-zinc-950'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Grade 10 (Gold)
              </button>
            </div>

            <button
              onClick={() => setSlabMode('black_label')}
              className={`w-full mt-2 p-2.5 rounded-xl border text-center font-extrabold transition flex items-center justify-center gap-2 ${
                slabMode === 'black_label'
                  ? 'border-amber-400 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <span>★</span>
              <span>Black Label ("THE CHOSEN ONE" • 50.0x)</span>
              <span>★</span>
            </button>
          </div>
        </div>
      </div>

      {/* ALL 6 FINISHES COMPARISON GALLERY */}
      <section className="max-w-7xl w-full mt-16 pt-12 border-t border-zinc-800/80">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Side-by-Side Surface Finish Comparison
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Inspect how the light reflects across all 6 finishes for {activeCardDef.name}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {finishList.map((f) => {
            const cardVariant: CardInstance = {
              ...activeCardInstance,
              id: `gallery-${f}`,
              finish: f,
              grade: undefined, // show raw card finish comparison
            };
            return (
              <div
                key={f}
                className="flex flex-col items-center p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/60"
              >
                <span className="text-[11px] font-bold text-amber-400 mb-2 uppercase tracking-wide">
                  {FINISH_LABELS[f]}
                </span>
                <CardRenderer
                  card={cardVariant}
                  size="sm"
                  interactive={true}
                  showMarketValue={false}
                />
                <span className="text-[10px] text-zinc-500 mt-2 font-mono">
                  {FINISH_MULTIPLIERS[f]}x Multiplier
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-6xl w-full mt-16 pt-8 border-t border-zinc-900 text-center text-xs text-zinc-500 font-mono">
        TQQ VAULT • 3D CARD RENDERER ENGINE & ACRYLIC SLAB SYSTEM • 2026
      </footer>
    </main>
  );
}
