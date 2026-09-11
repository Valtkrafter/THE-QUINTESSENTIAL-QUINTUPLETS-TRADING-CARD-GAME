# 🌸 The Quintessential Quintuplets: Trading Card Game (TQQ Vault)

<div align="center">

![Next.js 15](https://img.shields.io/badge/Next.js-15.2.1-black?style=for-the-badge&logo=next.js)
![React 19](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react)
![TypeScript 5.7](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS 3.4](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css)
![Framer Motion 13](https://img.shields.io/badge/Framer_Motion-13.2.0-EA4C89?style=for-the-badge&logo=framer)
![Zustand 5](https://img.shields.io/badge/Zustand-5.0.3-brown?style=for-the-badge)
![Web Audio API](https://img.shields.io/badge/Web_Audio_API-Procedural-brightgreen?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-Passing_100%25-success?style=for-the-badge)

**A high-fidelity, physically interactive collectible card game simulator and vault for *The Quintessential Quintuplets* (*Go-Tōbun no Hanayome*).**

[Live Showcase Demo](#-interactive-showcase-playground) • [Features](#-key-features) • [Card Catalog & Economy](#-card-catalog--economy-system) • [Architecture](#-project-architecture) • [Getting Started](#-getting-started)

</div>

---

## 📖 Overview

**TQQ Vault** is a state-of-the-art web-based trading card game simulator engineered with **Next.js 15 (App Router)**, **React 19**, **Framer Motion**, and **Tailwind CSS**. It replicates the authentic, tactile thrill of real-world trading card collecting:

- **Physically Interactive 3D Booster Packs:** Real-time 3D gyro tilt with metallic crimp textures, Euro-hole punch, and a custom flat-plane pointer tear mechanism across foil perforations.
- **Holographic Foil Shader Engine:** Dynamic angle-based light reflections, glitter sheens, prismatic rainbow gradients, gold etching, and voice actress signatures.
- **BGS-Style Grading Slabs:** Subgrade inspection (Centering, Surface, Corners, Edges) with gold foil headers, acrylic frosted borders, authentic `82:130` BGS geometry, responsive container-query scaling, and the elusive **Black Label (Quad 10)**.
- **5-Slot Acrylic Showcase (Vitrine):** Semi-circular 3D acrylic pedestal stage with dynamic overhead character spotlights, live $\yen$ revenue ticker, and team synergy multipliers. Serves as the **exclusive source of passive idle revenue** (legacy binder yields purged).
- **42-Card Master Card-Dex:** Comprehensive completion catalog (35 Nakano Sisters + 7 unique Support artworks) with undiscovered silhouette shaders, 100% golden holographic aura, and highest finish / grade tracking.
- **Grand Binder & Collection Hub:** Filterable and sortable card collection with bulk liquidation and individual card inspection.
- **Pure Procedural Web Audio API Engine:** 100% synthesizer-driven procedural sound design. Zero external `.mp3` dependencies for lightning-fast, zero-latency, zero-bandwidth pack opening ceremonies.

---

## ✨ Key Features

### 🎴 1. 3D Booster Packs & Tear Ceremony Engine
- **Decoupled 3-Tier Coordinate Hierarchy:** The static outer 2D wrapper (`320px × 520px`), the inner 3D interactive stage, and the flat 2D tear mechanism are mathematically decoupled. This eliminates coordinate shift oscillations and prevents `getBoundingClientRect()` feedback loops during 3D rotations.
- **Overdamped Spring Tilt Physics:** Spring dynamics calibrated to `{ damping: 45, stiffness: 120, mass: 1, restDelta: 0.001 }` for smooth, zero-oscillation, zero-bounce cursor tracking.
- **Direct HTML5 Window Pointer Tear Engine:** Window-bound pointer tracking ensures 1:1 cursor synchronization with 0% dropped events even on rapid swipes.
- **85% Breach Threshold:** Pulling the yellow `TEAR ▶` notch past 85% ($231.2\text{px}$) triggers an immediate top crimp detachment animation, screen shake, and anticipation sequence.
- **Multi-Tier Anticipation FX:**
  - **God Pack:** Celestial golden spinning vortex flare and fanfare.
  - **Ultra-Tier (UR / SEC / MR):** Screen dimming with high-voltage lightning flashes and sub-bass rumble.
  - **Super-Tier (SR):** Violet pulse aura and chiming arpeggios.
- **Deterministic Drag & Peel Architecture:** Presentation cards render at $360\text{px} \times 502\text{px}$ (63:88 aspect ratio) with tight $2\text{px}$ vertical stacking offsets. Dragging is bounded to `dragConstraints={{ left: 0, right: 600 }}` and `dragElastic={0.2}`. A peel is deterministically triggered when `offset.x > 120px` or `velocity.x > 400px/s`, immediately disengaging drag (`drag={false}`), smoothly animating the peeled card off-screen (`0.28s, easeIn`), and synchronizing summary transition only after card 5 completely unmounts.
- **Instant Pre-Roll "Open Another" Reset:** Pre-rolls subsequent card batches directly on button click, eliminating micro-stutters upon tear breach and resetting the ceremony cleanly to Frame 0.

### 💎 2. Holographic Foil Shaders & Card Renderer
Every card rendered through `CardRenderer.tsx` supports dynamic multi-layer foil effects calculated from normalized 3D tilt vectors:
- **Raw:** Matte printing with authentic paper grain and subtle ambient shadows.
- **Holo:** Reflective silver metallic sheen shifting across the artwork.
- **Sparkle:** Concentrated starlight twinkle particle reflections.
- **Rainbow:** Full-spectrum prismatic chromatic aberration gradient shifting with viewing angle.
- **Gold-Etched:** Textured gold-leaf stamping on borders, names, and character crests ($5\times$ value boost).
- **Signed:** Metallic gold-foil reproduction of the official character voice actress signature ($40\times$ value boost):
  - **Ichika:** 花澤 香菜 (*Kana Hanazawa*) 💛
  - **Nino:** 竹達 彩奈 (*Ayana Taketatsu*) 🦋
  - **Miku:** 伊藤 美来 (*Miku Itō*) 🎧
  - **Yotsuba:** 佐倉 綾音 (*Ayane Sakura*) 🍀
  - **Itsuki:** 水瀬 いのり (*Inori Minase*) ⭐

### 🛡️ 3. BGS-Style Acrylic Grading Slabs & Grading Lab
Submit raw cards to the **Grading Station** to be certified in heavy acrylic slabs:
- **Authentic BGS Geometry & Container Queries:** Built to exact $82\text{mm} \times 130\text{mm}$ aspect ratio (`aspect-[82/130]`) with CSS container queries (`container-type: inline-size`) and fluid typography (`clamp()`, `cqi`), ensuring proportional headers, subgrades, and uncompressed inner card wells (`aspect-[63/88]`) in both full-screen inspection and compact grid drawers.
- **4 Numerical Subgrades:** Centering, Surface, Corners, and Edges (evaluated from 1.0 to 10.0).
- **Certified Grade Tiers:**
  - `POOR_1_3` (Grade 1–3, $0.5\times$ multiplier)
  - `USED_4_6` (Grade 4–6, $0.85\times$ multiplier)
  - `CRISP_7_8` (Grade 7–8, $1.25\times$ multiplier)
  - `MINT_9` (Grade 9, $2.0\times$ multiplier)
  - `GEM_MINT_10` (Grade 10, $5.0\times$ multiplier)
  - `BLACK_LABEL` (Quad 10.0 Subgrades, $25.0\times$ multiplier — The holy grail of grading)
- **Consumable Tools & Lab Buffs:**
  - **Microfiber Cloth:** Eliminates Poor grades 1–3.
  - **Centering Laser:** Doubles the chance of rolling a Gem Mint 10 Centering subgrade.
  - **Vault Insurance:** Guarantees a free automatic re-roll if a card scores below Grade 7.

### 🏛️ 4. 5-Slot Acrylic Showcase (Vitrine) & Idle Revenue Engine
- **Semi-Circular 3D Acrylic Stage:** 5 vertical acrylic pedestals arranged along a curved perspective stage (`perspective: 1200px`) against deep Obsidian dark (`#08080a`) with frosted bases, reflection planes, and metallic edge brackets.
- **Dynamic Character Overhead Spotlights:** Conical top-down light shafts casting authentic illumination matched to signature character colors:
  - **Ichika:** Warm Amber (`#F59E0B`) 💛
  - **Nino:** Vivid Magenta (`#EC4899`) 🦋
  - **Miku:** Cool Cyan (`#06B6D4`) 🎧
  - **Yotsuba:** Bright Emerald (`#10B981`) 🍀
  - **Itsuki:** Crimson Ruby (`#EF4444`) ⭐
  - **Support / Empty:** Mystic Violet (`#8B5CF6`) / Subtle Slate (`#475569`)
- **Idle Yield Formula:**
  $$\text{Yield/Min} = \sum_{i=1}^{5} \left( 60\ \yen + (\text{Market Value}_i \times 0.0002) \right) \times \text{Synergy Multiplier}$$
- **Guaranteed Base Floor:** Every slotted card generates a guaranteed baseline of $1\ \yen/\text{sec}$ ($60\ \yen/\text{min}$), ensuring newly acquired cards contribute immediate value.
- **Team Synergy Multipliers:**
  - **Quintuplet Harmony (+50%):** Slotting all 5 sisters (Ichika, Nino, Miku, Yotsuba, Itsuki) activates a $+50\%$ bonus ($1.5\times$).
  - **Mono-Waifu Obsession (+30%):** Slotting 5 copies of the same sister activates a $+30\%$ bonus ($1.3\times$).
  - **Vault Excellence (+100%):** Slotting 5 Grade $\ge 9$ slabs (Mint 9, Gem Mint 10, or Black Label) doubles total showcase yield ($+100\%$ / $2.0\times$).
  - *Multipliers stack additively onto base $1.0$ (e.g. Harmony + Excellence = $2.5\times$).*
- **12-Hour Offline Yield Cap:** Revenue accrues continuously up to a strict 12-hour ($720\text{ minutes}$) ceiling while away.
- **Background Tab Throttling Protection:** Employs `document.visibilitychange` and `window.focus` listeners with wall-clock epoch timestamp reconciliation (`Date.now() - showcaseLastClaimedTimestamp`), completely preventing browser JavaScript timer throttling from shortchanging yield.
- **Live Revenue Ticker & Particle Claim:** Real-time ticking counter with glowing neon indicators, active synergy chips, and a golden "Claim Vault Revenue" action firing coin bursts and synthesizer pulses.
- **Interactive Socketing Drawer:** Modal drawer with real-time collection search, character filters, and instant mount/unmount operations.

### 💰 5. Direct Sell System & Bulk Liquidation
- **Instant Liquid Sales:** Liquidate raw, holo, or graded cards directly for instant $\yen$ currency from the unified `CardActionModal`.
- **Dynamic Particle FX & Audio:** Features 18 golden coin particles exploding outward and arcing towards the HUD currency counter accompanied by procedural metallic coin chime audio.
- **High-Value Guardrail Dialog:** Liquidating high-tier assets ($\ge \text{UR}$ or Grade $\ge 9$) prompts a cautionary shake-animated confirmation modal with a 3-second countdown to prevent accidental sales.
- **Bulk Liquidation Modal:** One-click bulk sale for Common (C) and Uncommon (UC) inventory cards directly from the Grand Binder, detailing exact quantities, average values, and total payouts.
- **Showcase & Lock Protection:** Cards locked manually or actively slotted in the 5-slot Acrylic Showcase are strictly immune to liquidation and vaporization.

### 🏪 6. Daily Rotating Singles Kiosk
- **Curated Rotating Market:** A brushed dark slate (`#111116`) kiosk offering 4 direct-purchase singles, available via the Grand Binder and Booster Pack modal tabs.
- **Deterministic 24-Hour Rotation:** Automatic daily stock rotation with real-time countdown timer (`HH:MM:SS`).
- **Targeted Acquisition & Currency Sink:** Raw single cards priced at a fixed $2.5\times$ base market valuation to serve as an authentic economic sink.
- **Manual Stardust Reroll:** Instantly reroll the kiosk lineup at any time for $100\ ★$ Stardust.

### ♻️ 7. Dusting Workshop & Stardust Alchemy
- Convert unwanted or duplicate cards into **Stardust (★)**.
- Quick Dust non-rares (C & UC) directly on the pack opening ceremony summary screen.
- Spend Stardust in the shop to purchase grading consumables (Microfiber Cloth, Centering Laser, Vault Insurance) or reroll the Singles Kiosk.

### 🔊 8. Procedural Web Audio API Sound Engine
Zero external `.mp3` or `.wav` files. All audio is synthesized procedurally in real time using native browser `AudioContext`:
- **`tear_pack`:** Resonant bandpass-filtered noise ($1200\text{Hz} \to 3600\text{Hz}$, $Q = 2.5$) with amplitude crackle modulation and an $85\text{Hz} \to 35\text{Hz}$ mechanical foil snap pop.
- **`card_slide`:** Highpass-filtered white noise ($2800\text{Hz}$, $80\text{ms}$) simulating card sleeve friction.
- **`sub_bass_pulse`:** Deep exponential sine sweep ($72\text{Hz} \to 30\text{Hz}$, $380\text{ms}$) for rare card anticipation.
- **`reveal_rare`:** 4-voice chime arpeggio (E6: $1318.5\text{Hz}$, G#6: $1661.2\text{Hz}$, B6: $1975.5\text{Hz}$, E7: $2637.0\text{Hz}$).
- **`godpack_fanfare`:** 4-voice detuned sawtooth triad through an automated resonant lowpass filter sweep ($400\text{Hz} \to 2800\text{Hz Warwick}$ sweep).
- **`coin_pulse`:** Metallic multi-frequency chime ($987.77\text{Hz} \to 1318.5\text{Hz}$) with harmonic sparkle decay for direct sales.
- **`receipt_register`:** Dual mechanical cash register latch click followed by a high-frequency ($2489\text{Hz}$) purchase ping for market transactions.

### 📖 9. Master Card-Dex & Discovery Engine
- **Master 42-Card Registry:** Complete catalog of cards `TQQ-001` through `TQQ-042` (35 Nakano Sisters: 5 sisters $\times$ 7 rarities + 7 unique Support cards: Fuutarou [3], Raiha [2], Maruo [1], Yusuke Takeda [1]) tracking global completion status across the entire collection.
- **Silhouette Mystery Shader:** Undiscovered cards render as matte pitch-black silhouettes (`#0c0c10`) with animated smoky particle shimmers, frosted borders, padlock icons, and hidden identity codes.
- **Highest Finish & Best BGS Grade Memory:** Discovered entries preserve the pinnacle state ever obtained across unboxings, kiosk buys, and grading certifications (even if the physical card is subsequently liquidated or dusted).
- **Circular SVG Completion Tracker:** Dynamic progress ring visualizing exact collection percentage (`X / 42 Collected (Y%)`).
- **100% Golden Holographic Shimmer Aura:** Attaining full 42/42 completion permanently bathes the Card-Dex header and border frame in an animated rainbow prismatic gold aura.
- **Comprehensive Card Dossier Modal:** Detailed inspection modal featuring real-time 3D tilt, subgrade plate inspection, authenticated voice actress credentials, character quotes, and acquisition origins.

---

## 📊 Card Catalog & Economy System

### 1. Card Valuation Formula
The total market value of any card is calculated deterministically via:
$$\text{Market Value} = \text{Base Value}(\text{Rarity}) \times \text{Multiplier}(\text{Finish}) \times \text{Multiplier}(\text{Grade})$$

| Rarity | Base Value ($\yen$) | Base Dust (★) |
| :--- | :---: | :---: |
| **Common (C)** | $10\ \yen$ | $1\ ★$ |
| **Uncommon (UC)** | $30\ \yen$ | $3\ ★$ |
| **Rare (R)** | $100\ \yen$ | $10\ ★$ |
| **Super Rare (SR)** | $500\ \yen$ | $35\ ★$ |
| **Ultra Rare (UR)** | $2{,}500\ \yen$ | $120\ ★$ |
| **Secret Rare (SEC)** | $12{,}000\ \yen$ | $500\ ★$ |
| **Master Rare (MR)** | $50{,}000\ \yen$ | $2{,}000\ ★$ |

### 2. Surface Finish Multipliers

| Finish | Probability | Multiplier | Visual Description |
| :--- | :---: | :---: | :--- |
| **Raw** | $74.0\%$ | $1.0\times$ | Standard matte cardstock |
| **Holo** | $15.0\%$ | $1.5\times$ | Specular metallic foil reflection |
| **Sparkle** | $6.5\%$ | $2.5\times$ | Starry holographic glitter finish |
| **Rainbow** | $3.0\%$ | $5.0\times$ | Prismatic angle-dependent iridescent sheen |
| **Gold-Etched** | $1.2\%$ | $12.0\times$ | Embossed gold leaf foil borders |
| **Signed** | $0.3\%$ | $40.0\times$ | Gold-foil stamped voice actress signature |

### 3. Singles Kiosk Pricing & Liquidation Formulas
- **Direct Sell Valuation:**
  $$\text{Sell Value} = \text{round}\Big(\text{Base Value}(\text{Rarity}) \times \text{Multiplier}(\text{Finish}) \times \text{Multiplier}(\text{Grade})\Big)$$
- **Singles Kiosk Premium Price (Sink):**
  $$\text{Kiosk Price} = \text{round}\Big(\text{Base Value}(\text{Rarity}) \times 2.5\Big)$$
- **Manual Kiosk Reroll:** $100\ ★$ Stardust.
- **Bulk Liquidation:** Sums the exact calculated Sell Value for all unlocked, unslotted matching cards in a single atomic transaction.

### 4. Booster Pack Tiers & Drop Rates

| Booster Pack | Cost | Cards | Key Mechanics & Guarantees |
| :--- | :---: | :---: | :--- |
| **Test Sheet** | **FREE** | $3$ | 4-hour cooldown ($2\text{h}$ with Takeda). Intro pack. |
| **Kiosk Booster** | $150\ \yen$ | $5$ | Standard base odds. Entry level set. |
| **Lernsession** | $450\ \yen$ | $5$ | Boosted Rare and Super Rare odds. |
| **Sommerfeuerwerk** | $1{,}200\ \yen$ | $5$ | Premium summer edition; enhanced finish chances. |
| **Schulfest** | $3{,}000\ \yen$ | $5$ | High-tier festival pack with boosted Ultra Rare odds. |
| **Klassenfahrt Kyoto** | $8{,}500\ \yen$ | $5$ | **No Commons.** Minimum Uncommon (UC) in every slot. |
| **Braut des Schicksals** | $25{,}000\ \yen$ | $5$ | **No Commons or Uncommons.** Guaranteed Rare (R) or higher in every slot. |
| **Celestial God Pack** | $100{,}000\ \yen$ | $5$ | **★ 100% Ultra, Secret, and Master Rares only!** |

### 5. Showcase Idle Revenue & Synergies
- **Yield Calculation:**
  $$\text{Slot Yield/Min} = 60\ \yen + (\text{Market Value} \times 0.0002)$$
  $$\text{Total Yield/Min} = \left(\sum_{i=1}^{5} \text{Slot Yield/Min}_i\right) \times (1.0 + \sum \text{Synergy Bonuses})$$
- **Base Yield Guarantee:** $1\ \yen/\text{sec}$ ($60\ \yen/\text{min}$) guaranteed per card slot.
- **Synergy Multipliers:**
  - **Quintuplet Harmony:** $+50\%$ ($+0.5$) when all 5 slots contain Ichika, Nino, Miku, Yotsuba, and Itsuki.
  - **Mono-Waifu Obsession:** $+30\%$ ($+0.3$) when all 5 slots contain the same sister.
  - **Vault Excellence:** $+100\%$ ($+1.0$) when all 5 slotted cards are Grade $\ge 9$ BGS Slabs (Mint 9, Gem Mint 10, or Black Label).
  - *Additively stacked (e.g. Harmony $+50\%$ + Excellence $+100\% \implies 2.5\times$ total multiplier).*
- **Offline Accrual Cap:** Strictly capped at 12 hours ($720\text{ minutes}$ / $43{,}200\text{ seconds}$).
- **Tab Throttling Safeguard:** Live time-delta calculation based on absolute wall-clock epoch timestamps prevents idle loss in throttled browser background tabs.

---

## 🏗️ Project Architecture

```
tqqtcg/
├── public/
│   ├── cards/                   # Master card illustration assets (42 high-res artworks)
│   │   ├── Ichika/
│   │   ├── Nino/
│   │   ├── Miku/
│   │   ├── Yotsuba/
│   │   ├── Itsuki/
│   │   ├── Futarou/
│   │   ├── Raiha/
│   │   ├── Maruo/
│   │   └── Yusuke/
│   └── packs/                   # High-resolution 3D booster foil pack wraps
├── rules.md                     # Strict development protocol & architectural standards
├── scripts/
│   └── test-engine.ts           # Comprehensive test suite (10,000-roll Monte Carlo audit & Stage 1/2 tests)
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Global root HTML & font provider
│   │   ├── page.tsx             # Main entry point (renders GrandBinder view switcher)
│   │   └── showcase/page.tsx    # Interactive sandbox showcase & inspection playground
│   ├── components/
│   │   ├── binder/
│   │   │   ├── BinderGrid.tsx       # Collection card grid with view filters and stats
│   │   │   ├── CardActionModal.tsx  # Unified card inspect, slot, grade, sell, and dust modal
│   │   │   └── GrandBinder.tsx      # Main hub with Showcase / Collection / Card-Dex view switcher
│   │   ├── card/
│   │   │   ├── CardRenderer.tsx     # Holographic foil shader engine & card frame
│   │   │   └── GradingSlab.tsx      # Acrylic BGS-style grading slab with subgrade plates
│   │   ├── catalog/
│   │   │   └── CardDex.tsx          # 42-card master catalog with silhouettes & 100% gold shimmer
│   │   ├── dusting/
│   │   │   └── DustingWorkshop.tsx  # Card vaporization and Stardust exchange station
│   │   ├── market/
│   │   │   └── SinglesMarket.tsx    # Brushed dark slate Singles Kiosk with 24h timer & reroll
│   │   ├── pack/
│   │   │   ├── BoosterPack3D.tsx    # 3D foil booster with cylindrical pillow shading
│   │   │   ├── PackOpeningModal.tsx # Ceremony modal: tear, suspense, peel & summary
│   │   │   ├── SelectBoosterModal.tsx # Portal-mounted pack kiosk with live drop odds & kiosk tab
│   │   │   └── TearMechanism.tsx    # Direct HTML5 window pointer tear engine
│   │   ├── showcase/
│   │   │   └── Vitrine.tsx          # 5-slot acrylic pedestal stage with dynamic spotlights & idle claim
│   │   └── vault/
│   │       ├── GradingScannerFX.tsx # Particle laser scanner visualizer
│   │       └── GradingStation.tsx   # Card submission hub & consumable tool equip
│   ├── config/
│   │   ├── cardsData.ts         # Catalog of 42 cards with metadata and quotes
│   │   └── economy.ts           # Pricing matrices, valuation formulas, drop tables, pity, synergies
│   ├── hooks/
│   │   ├── useIdleRevenue.ts    # Background-safe idle yield calculator with 12h offline cap
│   │   └── useSmoothTilt.ts     # Overdamped 3D spring tilt hook with dynamic lighting
│   ├── store/
│   │   └── useGameStore.ts      # Persistent Zustand store (currencies, inventory, showcase, dex, stats)
│   ├── types/
│   │   └── card.ts              # Strict TypeScript interfaces, enums, and types
│   └── utils/
│       ├── audio.ts             # Native Web Audio API procedural synthesis engine
│       └── audioEngine.ts       # Sound synthesizer client instance with coin & receipt pulses
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** `v18.18.0` or higher (Node `v20.x` or `v22.x` recommended)
- **Package Manager:** `npm`, `pnpm`, or `yarn`

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Valtkrafter/THE-QUINTESSENTIAL-QUINTUPLETS-TRADING-CARD-GAME.git
   cd THE-QUINTESSENTIAL-QUINTUPLETS-TRADING-CARD-GAME
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 🧪 Verification & Testing

The repository contains an automated Monte Carlo test suite (`scripts/test-engine.ts`) that runs 10,000 iterations to verify drop distributions, pity thresholds, grading probabilities, and store mutations.

```bash
# Run the complete test suite
npm test

# Run strict TypeScript type verification (0 errors)
npm run typecheck

# Run production Next.js build
npm run build
```

---

## 🎮 Interactive Showcase Playground

Access the full development sandbox by navigating to:
```
http://localhost:3000/showcase
```

The Showcase allows you to:
- Inspect every card across all 7 rarities and 6 surface finishes with real-time 3D tilt.
- Test BGS grading slabs across all grade tiers, including the ultra-rare **Black Label**.
- Test 3D booster pack tearing with customizable odds.
- Add test currency ($\yen$ / ★) to test late-game economies and God Pack drops.

---

## 🕹️ Controls & Interaction Guide

| Action | Mouse (Desktop) | Touch (Mobile / Tablet) |
| :--- | :--- | :--- |
| **3D Tilt Card / Pack** | Move cursor across element | Touch and drag across surface |
| **Tear Booster Pack** | Click & drag yellow `TEAR ▶` notch to the right | Touch & swipe `TEAR ▶` notch past 85% |
| **Peel Card from Deck** | Drag top card right ($> 120\text{px}$ or $> 400\text{px/s}$) | Swipe top card right to peel & discard |
| **Quick Discard / Summary** | Click `Peel Card` / `View Summary` button | Tap `Peel Card` / `View Summary` button |
| **Skip Ceremony** | Click `Skip All` button (instant summary transition) | Tap `Skip All` button |
| **Inspect Card** | Click on any card in binder grid | Tap on any card in binder grid |

---

## 📜 License & Legal Disclaimer

This project is a non-commercial, open-source fan creation celebrating *The Quintessential Quintuplets* (*Go-Tōbun no Hanayome* / 五等分の花嫁).

- All character designs, names, and illustrations are the intellectual property of **Negi Haruba**, **Kodansha Ltd.**, and the **Bibury Animation Studios / Tezuka Productions** production committees.
- No commercial monetization or microtransactions are incorporated. All in-game currency ($\yen$ and ★) is strictly virtual and earned through gameplay simulation.

---

<div align="center">
  <sub>Built with ❤️ for quintuplet enthusiasts. May the celestial God Pack bless your pulls! 🌸</sub>
</div>
