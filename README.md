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
- **Card Prep & Restoration Workbench & Crack-to-Regrade System:** Physical multi-stage workshop allowing collectors to crack open graded slabs, swab blemishes under a 50x digital SVBONY microscope, clamp-press warp flat in a persistent 24-hour WORKPRO clamp press (with dynamic Stardust skip curve), buff 3D viscous balm droplets with microfiber cloth, and seal into semi-rigid card savers for paid Grade 7+ re-certification with amber restored slab badges.
- **42-Card Master Card-Dex:** Comprehensive completion catalog (35 Nakano Sisters + 7 unique Support artworks) with undiscovered silhouette shaders, 100% golden holographic aura, and highest finish / grade tracking.
- **Grand Binder & Collection Hub:** Filterable and sortable card collection with bulk liquidation and individual card inspection.
- **One-Time Patch Notes System:** Automatic one-time onboarding modal introducing major updates with on-demand header access.
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
- **Responsive Containment & 3D Tilt Cushions:** Features auto-scaling boundaries (`max-w-full`, `max-h-full`) with dedicated $16\text{px}$–$24\text{px}$ yaw cushions (`rotateY: \pm 12^\circ`), preventing horizontal truncation of acrylic bevels, sonic-welded corner screws, and gold header plates across modal inspection dialogs.
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
- **Compact Thumbnail Mode (`thumbnail?: boolean`):** High-density list and drawer mode stripping bulky BGS headers, subgrade grids, and heavy outer padding down to a sleek hair-thin acrylic rim (`p-0.5`, `border border-white/20 rounded-lg`). The inner card illustration spans 100% width and height matching raw cards 1:1, complemented by a tier-styled micro grade pill in the top-right corner (Slate for 7–8, Cyan glow for 9, Golden Amber for 10/Black Label).

### 🔬 4. Card Prep & Restoration Workbench & Crack-to-Regrade System
Directly accessible from the card inspection modal (`CardActionModal.tsx`), collectors can physically crack open graded acrylic slabs and perform professional multi-stage restoration prior to re-submitting to the Vault:
- **Stage 1: Acrylic Slab Depenetration & Crack:** Snip the 4 sonic-welded corner stress notches using wire pliers (triggering high-frequency shearing noise). Wedge a flat steel pry tool into the lateral weld seam and hold down tension until SVG fracture lines shoot across the top plate, popping the acrylic shell with acoustic shatter physics.
- **Stage 2: SVBONY 50X LCD Digital Microscope:** High-tech split-view inspection station featuring an LCD monitor housing with scanlines, crosshair, and live digital OSD (`CAM 1 [50X MAG]`). Players manipulate a precision cotton swab tool to clean finger grease, adhesive, and dust specks across the front and reverse sides.
- **Stage 3: Persistent 24-Hour Hard Press Station:** Sandwich cards between dual 12mm optical acrylic plates clamped with heavy-duty WORKPRO bar clamps. Features a persistent, offline/refresh-resilient 24-hour countdown timer (`clampingStartedAt`, `clampingDurationMs = 86,400,000`, live `HH:MM:SS` display). Clamped cards are locked against selling, dusting, and showcase mounting, while notification badges on the Vault logo and Collection tab alert collectors when pressing concludes. Players can dial in 150 PSI pressure with mechanical ratchets and pneumatic air hiss, or speed up the cure with a dynamic, time-discounted Stardust skip formula:
  $$\text{Skip Cost} = \max\left(50,\ \left\lceil 350 \times \left(1 - \frac{\Delta t}{86{,}400{,}000}\right)\right\rceil\right)$$
  (350 ★ fresh $\to$ 88 ★ at 18 hours $\to$ 50 ★ floor). Guarantees subgrades $\ge 8.5$ on Corners & Edges upon unclamping.
- **Stage 4: 3D Viscous Balm Droplets & Microfiber Buff:** Features high-visibility 3D gel droplets with radial gradient lighting and specular white shine dots, targeted by high-contrast rotating dashed ring reticles with glowing amber crosshairs and drop shadows (flawlessly visible against light backgrounds like Miku's sweater or Itsuki's shirt). Dabbing dispenses localized matte wax smear films (`mix-blend-mode: screen opacity-75 backdrop-blur-[1px]`), followed by tactile microfiber cloth drag buffing (0% to 100%) and an ultra-bright chromatic lens flare sweep (+1.5 Surface Subgrade boost, +15% Gem Mint 10 odds).
- **Stage 5: Semi-Rigid Card Saver & Post-It Checklist:** Encapsulate the card into an archival Card Saver 1 holder with a slapped-on yellow Post-it note animated with procedural ballpoint pen scribbling, certifying the card for grading lab submission.
- **Paid 50% Vault Re-Certification & Guaranteed Grade 7+ Floor:** To safeguard the economy against infinite-money exploits, re-submitting a Grade Prep Certified card requires a strict 50% certification fee:
  $$\text{Re-Grade Fee} = \text{round}\Big(0.5 \times \text{Base Value}(\text{Rarity}) \times \text{Multiplier}(\text{Finish})\Big)$$
  Includes a live liquidity check with clear deficit warnings (`⚠️ Insufficient Yen to certify. Deficit: -¥...`) and a secondary `Save & Return to Vault` button that preserves the card's certified prep status in the inventory until funds are available. Re-grading guarantees a Grade 7.0 (Crisp) minimum floor and stamps the newly issued slab with an authoritative amber `RE-CERTIFIED / RESTORED` certificate badge.
- **Strict 3-Tier Pinned Viewport Architecture & Concrete Aspect-Ratio Anchoring:** Outer workbench modal dialog and all 5 individual restoration steps (`CrackStep`, `MicroscopeStep`, `ClampPressStep`, `PolishStep`, `SleeveStep`) adhere to a strict 3-tier Flexbox layout (`max-h-[92vh] flex flex-col`, static `flex-shrink-0` header, flexible scaled workbench with `flex-1 min-h-0 overflow-y-auto`, and a strictly pinned action footer with `flex-shrink-0` and `pb-6` padding). Every interactive card stage enforces concrete responsive widths (`w-[260px] sm:w-[300px] md:w-[320px] aspect-[63/88] flex-shrink-0`), permanently eliminating 0px zero-size container collapse and button clipping across all aspect ratios.

### 🏛️ 5. 5-Slot Acrylic Showcase (Vitrine) & Support Altar
- **Dissolved Secondary Horizontal Bar & Genshin/WuWa Flank HUD Architecture:** Replaced the rigid ~80px full-width top status bar with two sleek glassmorphic HUD modules flanking the central Support Altar in the upper negative space:
  - **Left Flank (`VitrineResonancePanel.tsx`):** Displays total vault valuation with amber-gold gradient typography, real-time socket count, and the 3 core resonance synergies (Quintuplet Harmony, Mono-Waifu Obsession, Vault Excellence) with active glowing LED status orbs, live multiplier amplification indicators, and detailed tooltips.
  - **Right Flank (`VitrineHarvestConsole.tsx`):** Command module with real-time idle yield rate meter (`+X ¥/min`, `(Y ¥/s)`), animated 4-band audio-frequency streaming visualizer, recessed uncollected revenue pool counter (`12h Cap` indicator), and a tactile Genshin/WuWa Burst-style golden `CLAIM REVENUE` button with floating coin particles and procedural Web Audio chimes.
- **Recovered Vertical Clearance & Viewport Lock (`100vh`):** Purged vertical compression and locked the Showcase stage to `h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] overflow-hidden flex flex-col justify-between`. Calibrated vertical spacing (`pt-1 pb-2` for top flank HUD and `mb-4 pb-4` for sister pedestals) fits comfortably on standard 1080p and laptop screens with zero vertical scrollbars.
- **Semi-Circular 3D Acrylic Stage:** 5 vertical acrylic pedestals arranged along a curved perspective stage (`perspective: 1200px`) against deep Obsidian dark (`#08080a`) with frosted bases, reflection planes, and metallic edge brackets. Calibrated stage geometry (`max-w-7xl h-[420px] md:h-[460px] lg:h-[490px]`) accommodates high-impact card presentation without clipping.
- **Showcase Full-Art Expansion (`showcaseMode`):** Slotted graded slabs automatically engage `showcaseMode={true}`, suppressing the bulky BGS header, subgrade matrix, and multiplier banner to expand the inner card well to >92% of slab height. Certified grades are rendered via a single authoritative header grade badge in the top-right corner (eliminating duplicate badge collisions) with tier-specific styling:
  - *Grade 1–6:* Dark slate glass with zinc border (`bg-zinc-800/90 text-zinc-300 border-zinc-700`).
  - *Grade 7–8:* Silver frosted glass with steel border (`bg-slate-800/90 text-slate-200 border-slate-600`).
  - *Grade 9:* Deep cyan glass (`bg-cyan-950/90 text-cyan-300 border-cyan-500/50`) with cyan aura.
  - *Grade 10:* Golden amber glass (`bg-amber-950/90 text-amber-300 border-amber-400/60`) with golden halo.
  - *Black Label (Quad 10):* Obsidian black glass (`bg-black text-amber-400 border-amber-500`) with gold starlight halo.
- **Concentric Slab-to-Card Geometry & Authentic 63:88 Ratio:** Outer acrylic frame features `rounded-2xl` ($16\text{px}$) with uniform $8\text{px}$ transparent bezel padding (`p-2`, `border-white/15`, `ring-1 ring-inset ring-white/10`). The inner recessed card well mathematically follows the concentric curvature ($R_{\text{inner}} = R_{\text{outer}} - \text{Padding} = 16\text{px} - 8\text{px} = 8\text{px}$ / `rounded-lg`) with embedded depth shadow (`shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]`), permanently locking cards to their authentic $63:88$ ratio without vertical squashing or letterboxing.
- **Showcase Pedestal Alignment & Sizing:** Pedestals are calibrated to a uniform width of $220\text{px}$ with height derived dynamically from the $63:88$ card ratio, aligning cards flush above their frosted acrylic bases (`h-14 mt-3`) with equal vertical breathing room.
- **Subpixel Text & 1:1 Crisp Rendering:** Purged GPU rasterization blur caused by fractional CSS `scale(...)` and 3D perspective downsampling. Pedestals render at 1:1 pixel fidelity. Text elements are strictly isolated from `backdrop-filter: blur(...)` using decoupled background sibling layers and reinforced with `.crisp-render` hardware composition (`translateZ(0)`, `backface-visibility: hidden`). All character artwork uses `object-cover object-top` without residual dark overlay gradients.
- **Dynamic Character Overhead Spotlights:** Conical top-down light shafts (`h-[480px]`) casting authentic illumination matched to signature character colors:
  - **Ichika:** Warm Amber (`#F59E0B`) 💛
  - **Nino:** Vivid Magenta (`#EC4899`) 🦋
  - **Miku:** Cool Cyan (`#06B6D4`) 🎧
  - **Yotsuba:** Bright Emerald (`#10B981`) 🍀
  - **Itsuki:** Crimson Ruby (`#EF4444`) ⭐
  - **Support / Empty:** Mystic Violet (`#8B5CF6`) / Subtle Slate (`#475569`)
- **Hit-Testing & 3D Stacking Stabilization:** Outer pedestal wrappers utilize `transform-style: flat` with elevated card mount anchoring (`transform: translateZ(20px)`), purging intercepting pointer events from lighting cones, beam effects, ceiling fixtures, and pedestal footers. The entire $100\%$ surface area of slotted cards provides a stable, full-card hover hitbox with seamless Swap/Unmount action controls.
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
- **Unified Socket Pedestal Drawer (`SocketDrawer.tsx`):** Slide-over selection drawer matching the main Vitrine full-art showcase aesthetic. Features a responsive 3-column grid (`grid-cols-2 sm:grid-cols-3 gap-4 p-4`), smooth scrolling, real-time collection search, character and slab filters, suppressed bulky BGS headers, uncompressed `63:88` full character illustrations, single floating grade badge pills, and state-aware action buttons (`CURRENT`, `SOCKETED`, or glowing amber `MOUNT TO VITRINE`).

### 🏛️ 5. Support Altar & Dynamic Buff Engine (Tutor Dais)
- **Elevated Floating Tutor Dais:** An illuminated floating pedestal centered horizontally above the 5-slot acrylic vitrine stage with slate-gold trim (`border-amber-500/30`, `shadow-[0_0_25px_rgba(245,158,11,0.15)]`) and a downward-projecting ambient light cone softly illuminating the lower sister stations.
- **Master Support Registry & Account-Wide Economy Buffs:** Slotted mentors actively alter account-wide economy calculations, grading odds, and showcase yield:
  - **Fuutarou Uesugi (C):** Diligent drills granting a flat $1.25\times$ showcase yield multiplier.
  - **Fuutarou Uesugi (R):** Determined tutoring granting $1.50\times$ showcase yield and $-20\%$ quest threshold reduction.
  - **Fuutarou Uesugi (UR):** The fated groom granting $2.00\times$ showcase yield and amplifies **Quintuplet Harmony** synergy from $+50\%$ to $+100\%$ ($+1.0$).
  - **Raiha Uesugi (UC):** Lucky charm granting flat $15\%$ discount on all Grading Station certification fees and $+10\%$ finish upgrade luck on booster pulls.
  - **Raiha Uesugi (SR):** Festival sunshine granting $30\%$ discount on all grading fees and flat $+3\%$ bonus chance to roll Gem Mint 10 or Black Label slabs.
  - **Maruo Nakano (SEC):** Stern patriarch granting $+75\%$ Stardust from card dusting, $25\%$ discount in the Daily Singles Kiosk, and $+20\%$ market valuation for all 5 slotted sisters.
  - **Yusuke Takeda (R):** Aspiring rival cutting the Test-Sheet pack cooldown in half (from $4\text{h}$ down to $2\text{h}$) and granting $+15\%$ Team IQ.
- **Grade 9 & 10 Certified Slab Scaling (+20%):** Slotting a certified Mint 9, Gem Mint 10, or Black Label slab into the Support Altar automatically triggers a $+20\%$ scaling multiplier across all numeric effect values (e.g. Fuutarou UR scales to $2.40\times$ yield & $+120\%$ Harmony; Maruo SEC scales to $+90\%$ dust, $30\%$ Kiosk sale, and $+24\%$ sister valuation).
- **Zero-Clipping Intrinsic Aspect-Ratio Architecture:** The Support Altar card container is decoupled from fixed pixel heights (`w-48 md:w-52 aspect-[63/88] flex-shrink-0 my-2 overflow-visible`), ensuring both raw cards and full acrylic slabs render at authentic geometry without vertical squishing. The full-card hover controls (`Swap` / `Unmount`) are strictly bounded to the card frame, while character lore quotes float with bottom cushion (`bottom-2 inset-x-2 line-clamp-2`) without bleeding past card boundaries or overlapping active buff banners.
- **Altar Liquidation & Vaporization Immunity:** Slotted support cards are completely immune to accidental liquidation, individual dusting, or batch liquidation.
- **Dedicated Support Drawer (`SupportDrawer.tsx`):** Streamlined slide-over modal drawer filtering strictly to Support mentor characters (Fuutarou, Raiha, Maruo, Takeda) with single-row mentor and format pills, purged redundant search bar, condensed active mentor banner, and one-click socketing. Features enlarged full-art 3D card previews (`w-24 sm:w-28 aspect-[63/88] rounded-xl overflow-hidden shadow-lg border border-white/10`) with top-right micro grade pills, active buff callout boxes, and generous spacing.

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
- **`plastic_snip`:** High-Q resonant shearing impulse ($3200\text{Hz} \to 4800\text{Hz}$) simulating heavy wire pliers cutting through sonic-welded slab corners.
- **`plastic_crunch_shatter`:** Dense highpass acoustic noise burst with randomized dissonant sine pings ($1800\text{Hz} - 5200\text{Hz}$) capturing acrylic casing fracture and pop.
- **`cotton_swab_rub`:** Soft lowpass-filtered textured friction noise ($450\text{Hz}$, $90\text{ms}$) simulating cotton swab strokes lifting surface debris.
- **`clean_chime`:** Pristine high-frequency crystalline chime ($1760\text{Hz} \to 3520\text{Hz}$) signaling a completely purified card surface.
- **`clamp_ratchet`:** Sharp metallic latch click paired with pneumatic pressure hiss ($180\text{Hz} \to 75\text{Hz}$) simulating WORKPRO bar clamp torque.
- **`wax_buff_rub`:** Velvety filtered noise burst ($650\text{Hz}$) replicating microfiber cloth circular waxing and scratch-filling strokes.
- **`pen_scribble`:** Rapid alternating frequency clicks ($1200\text{Hz} \leftrightarrow 1600\text{Hz}$) replicating ballpoint pen nib writing on adhesive Post-it paper.

### 📖 9. Master Card-Dex & Discovery Engine
- **Master 42-Card Registry:** Complete catalog of cards `TQQ-001` through `TQQ-042` (35 Nakano Sisters: 5 sisters $\times$ 7 rarities + 7 unique Support cards: Fuutarou [3], Raiha [2], Maruo [1], Yusuke Takeda [1]) tracking global completion status across the entire collection.
- **Unified Single-Bar Controls & Viewport Clearance:** Dissolved the redundant dual-row upper header bar into a single, high-density toolbar (`CardDex.tsx`, `DexMicroProgress.tsx`, `DexFilterTabs.tsx`, `DexSearchBar.tsx`). Reclaims $\sim 75\text{px}$ of vertical screen real estate, displaying 2+ complete card rows above the fold on desktop viewports.
- **Micro Progress Ring (`DexMicroProgress`):** Streamlined SVG micro-ring with centered completion percentage, golden master completion crown, and dynamic collection status tooltip (`X of 42 Artworks Collected`).
- **High-Density Sister Filter Tabs (`DexFilterTabs`):** Character-badged filter pills with signature color dots and discovery ratios (`ALL`, `Ichika`, `Nino`, `Miku`, `Yotsuba`, `Itsuki`, `Support`).
- **Integrated Real-Time Search & Slabs-Only Toggle (`DexSearchBar`):** Quick-filter search bar matching card serials, names, titles, and quotes in real-time, paired with a one-click `Slabs Only` toggle and glowing monospace collection count badge.
- **Silhouette Mystery Shader:** Undiscovered cards render as matte pitch-black silhouettes (`#0c0c10`) with animated smoky particle shimmers, frosted borders, padlock icons, and hidden identity codes.
- **Highest Finish & Best BGS Grade Memory:** Discovered entries preserve the pinnacle state ever obtained across unboxings, kiosk buys, and grading certifications (even if the physical card is subsequently liquidated or dusted).
- **Full-Art Showcase Slab Integration:** Graded catalog entries automatically render in Full-Art Showcase Mode (`showcaseMode={true}`), suppressing bulky laboratory BGS headers, subgrade matrices, and barcodes from the catalog grid. Inner card illustrations expand to the full `aspect-[63/88]` ratio edge-to-edge with unified card heights across raw, discovered, undiscovered, and graded cards, complemented by a single color-coded floating grade pill in the top-right corner.
- **100% Golden Holographic Shimmer Aura:** Attaining full 42/42 completion permanently bathes the Card-Dex header and border frame in an animated rainbow prismatic gold aura.
- **Comprehensive Card Dossier Modal:** Detailed inspection modal featuring real-time 3D tilt, subgrade plate inspection, authenticated voice actress credentials, character quotes, and acquisition origins.

### 📜 10. Dynamic Single-Version Patch Notes Engine
- **Minecraft-Style Semantic Versioning (`APP_VERSION`):** Governed by `src/config/version.ts` with small patch increments (`MAJOR.MINOR.PATCH`) for visual tweaks and minor bumps, and minor increments for substantive features.
- **Single Latest Patchnote Policy:** Overwrites previous patchnotes (`CURRENT_PATCH_NOTE` in `src/config/version.ts` / `src/config/patchNotes.ts`). Presents only the active release in friendly, plain language without developer jargon:
  - **✨ What's New:** 1–3 bullet points highlighting noticeable collector features.
  - **🐛 Bug Fixes:** 1–3 bullet points clearly explaining quality-of-life fixes.
- **Automatic Version Detection & One-Time Auto-Popup:** On app launch, evaluates `localStorage.getItem('TQQ_LAST_SEEN_VERSION') !== APP_VERSION`. If a new version is detected, the modal pops up automatically and persists the seen version upon dismissal.
- **On-Demand Access:** Collectors can re-open the active release notes anytime directly from the top navigation bar via the glowing `vX.Y.Z Notes` button.
- **Modern Accessible Dialog Standards:** Fully keyboard navigable (`Escape` key dismiss), light-dismiss backdrop interaction, and fluid spring entrance/exit transitions with procedural Web Audio chimes.

### 🎨 11. Global Obsidian Dark Scrollbar Suite & Layout Containment
- **Full-Spectrum Dark Scrollbar Theming:** Native CSS `scrollbar-width: thin` and `scrollbar-color: #27272a #08080a` paired with WebKit pseudo-elements (`::-webkit-scrollbar`, `::-webkit-scrollbar-thumb`, `::-webkit-scrollbar-track`) across the root document, collection grids, modals, and slide-over drawers.
- **Sleek Horizontal Scroll Strips (`.scrollbar-thin-dark`):** Specialized horizontal track styling (`height: 4px`, transparent track, `#27272a` pill thumb) for touch and mouse scrollbars.
- **Card-Dex Horizontal Filter Scrubbing:** Enforces `overflow-x-auto overflow-y-hidden whitespace-nowrap` with `py-1.5 h-auto` clearance on sister filter buttons, purging light-gray up/down arrow buttons and accidental vertical jitter.
- **Viewport Height Containment:** Strict `100vh` viewport locking eliminates phantom scrollbars on the Showcase view while maintaining fluid internal scrolling for collections and catalogs.

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
| **Celestial God Pack** | $5{,}000{,}000\ \yen$ | $5$ | **★ 100% Ultra, Secret, and Master Rares only! Ultimate endgame currency sink.** |

### 5. Showcase Idle Revenue & Support Altar Engine
- **Master Dynamic Yield Formula:**
  $$\text{Slot Yield/Min}_i = 60\ \yen + \Big(\text{Market Value}_i \times (1.0 + \text{SisterMarketMultiplier}) \times 0.0002\Big)$$
  $$\text{Total Yield/Min} = \left(\sum_{i=1}^{5} \text{Slot Yield/Min}_i\right) \times \text{BaseSynergies} \times \text{SupportMultiplier}$$
- **Guaranteed Base Floor:** $1\ \yen/\text{sec}$ ($60\ \yen/\text{min}$) guaranteed per card slot.
- **Showcase Base Synergies (Additive):**
  - **Quintuplet Harmony:** $+50\%$ ($+0.5$, amplified to $+100\%$ / $+1.0$ by Fuutarou UR, or $+120\%$ / $+1.2$ by Grade 10 Fuutarou UR) when all 5 slots contain Ichika, Nino, Miku, Yotsuba, and Itsuki.
  - **Mono-Waifu Obsession:** $+30\%$ ($+0.3$) when all 5 slots contain the same sister.
  - **Vault Excellence:** $+100\%$ ($+1.0$) when all 5 slotted cards are Grade $\ge 9$ BGS Slabs (Mint 9, Gem Mint 10, or Black Label).
  - *Base Synergies stack additively onto $1.0$ (e.g. Harmony $+50\%$ + Excellence $+100\% \implies 2.5\times$ base synergy).*
- **Support Altar Multipliers (Multiplicative on Showcase Total):**
  - Fuutarou C: $1.25\times$ yield multiplier ($1.50\times$ if Grade 9/10 slab).
  - Fuutarou R: $1.50\times$ yield multiplier ($1.80\times$ if Grade 9/10 slab).
  - Fuutarou UR: $2.00\times$ yield multiplier ($2.40\times$ if Grade 9/10 slab).
  - Combined peak multiplier: $(\text{Base Harmony } 1.0 + 1.2 + 1.0) \times 2.40 = 3.20 \times 2.40 = 7.68\times$ yield!
- **Sister Market Value Multiplier:**
  - Maruo SEC slotted in Support Altar injects $+20\%$ ($+24\%$ if Grade 9/10 slab) directly into the market valuation of all 5 slotted sisters.
- **Offline Accrual Cap:** Strictly capped at 12 hours ($720\text{ minutes}$ / $43{,}200\text{ seconds}$).
- **Tab Throttling Safeguard:** Live time-delta calculation based on absolute wall-clock epoch timestamps prevents idle loss in throttled browser background tabs.

### 6. Card Prep & Restoration Workbench Formulas
- **Paid Re-Grading Certification Fee (Anti-Infinite-Money Sink):**
  $$\text{Re-Grade Fee} = \text{round}\Big(0.5 \times \text{Base Value}(\text{Rarity}) \times \text{Multiplier}(\text{Finish})\Big)$$
  Re-grading cracked cards requires paying an authentic 50% fee based on raw market valuation to eliminate infinite-money grading loops.
- **24-Hour WORKPRO Clamp Press Quick Skip Curve:**
  $$\text{Quick Press Cost} = \max\left(50,\ \left\lceil 350 \times \left(1 - \frac{\Delta t}{86{,}400{,}000}\right)\right\rceil\right)$$
  - Fresh clamp ($t = 0\text{h}$): $350\ ★$ Stardust.
  - Midpoint ($t = 12\text{h}$): $175\ ★$ Stardust.
  - Three-quarters ($t = 18\text{h}$): $88\ ★$ Stardust.
  - Minimum floor ($t \ge 24\text{h}$ or near-completion): $50\ ★$ Stardust (free manual unclamp once $t \ge 24\text{h}$).
- **Restoration Certification Floor:** Guaranteed Grade $\ge 7.0$ (Crisp) minimum upon re-grading, with amber `RE-CERTIFIED / RESTORED` slab badge.

### 7. Exam Showdown: Academic Combat Engine, Focus Stage & Command Tray (v2.5.0)
- **High-Stakes Tactical Battle Engine:** An academic battle system where a team of 5 Nakano sisters and 1 Support Tutor faces strict examiners (Maruo Nakano, School Board Proctor, Rival Takeda) across 5 academic rounds (Math $\to$ Science $\to$ History $\to$ Literature $\to$ English).
- **Core Victory Contract:** Achieve **100 Test Points** before team mental stamina (**Resolve**) drops to 0.
- **Permanent Purge of Hover Tooltips & Stacking Hierarchy (v2.5.0):**
  - **Click-to-Select / Field Locking Model:** Clicking a Sister card selects and locks it into the active "Focus Stage". The selected card smoothly raises up by $-24\text{px}$ with a glowing character aura, anchored quick stats, and elevated stacking order (`z-40 relative`).
  - **Dedicated Non-Floating Bottom Command Tray (`z-30 relative`):** Renders sister stats (Base IQ, Charm %, Resolve HP, Est. Points Yield) and interactive command buttons (`⚔️ Solve Problem ▶`, `✕ Unlock Focus`) directly inside a solid, docked command tray directly above the desk wells. Permanently purges CSS `:hover`-dependent action buttons, chalkboard clipping, and hover-tunnel dismissals.
  - **Strict Stacking Context Hierarchy:** Central Chalkboard uses `z-10 relative overflow-visible`, the active command tray and card play slots use `z-30 relative`, active focus cards elevate to `z-40 relative`, and floating Manga Cut-Ins / Hanko Victory Modals use `z-50 fixed inset-0`.
- **Central Exam Question Board (`src/config/examQuestions.ts`, `ExamQuestionCard.tsx`):**
  - Mounts in the central chalkboard zone between the Examiner and Sister desks on a semi-translucent dark slate chalkboard card (`bg-[#151b26]/85 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-2xl overflow-visible`).
  - Top-left authentic red Japanese Hanko stamp badge (`PROBLEM [X/5]`), subject badge (`ADVANCED MATHEMATICS`, `CELLULAR BIOPHYSICS`, `SENGOKU ERA HISTORY`, `CLASSICAL HEIAN LITERATURE`, `ACADEMIC ENGLISH`), target point yield, and difficulty rating (`Standard`, `Challenging`, `Patriarch Tier`).
  - Dedicated glowing code/formula callout box (`bg-[#0c1017]/80 border border-white/10 rounded-lg font-mono text-cyan-300`) with authentic subject equations:
    - **Round 1 (Math):** Gaussian Integral & Polar Convergence ($\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$).
    - **Round 2 (Science):** Cellular Thermodynamic Equilibrium ($\Delta G = \Delta H - T\Delta S < 0$).
    - **Round 3 (History):** Battle of Nagashino (1575) triple-volley tactics (triggers Miku's weakness exploit).
    - **Round 4 (Literature):** Heian court aesthetics & *Mono no aware* (5-7-5-7-7 Waka meter).
    - **Round 5 (English):** Inverted subjunctive and conditional syntax under time constraint.
  - Examiner Commentary: Italicized flavor commentary from Maruo Nakano below the problem text (*„Wer diese Gleichung nicht im Kopf löst, hat an einer Universität nichts verloren.“*).
- **Dedicated Interactive Turn Play Engine & Action Buttons (`TurnPhase`):**
  - Governed by state machine: `awaiting_start` $\to$ `question_revealed` $\to$ `sister_selected` $\to$ `executing_turn` $\to$ `round_complete`.
  - **State A (`awaiting_start`):** Centered golden action button `▶ BEGIN ROUND [X]: [SUBJECT]` (`from-amber-500 to-amber-600`), playing `chalk_scribble` SFX and unsealing the problem.
  - **State B (`question_revealed`):** Pulsing instruction banner `👇 SELECT A SISTER TO SOLVE THIS PROBLEM` with gentle card bounce animations prompting the player to pick a sister.
  - **State C (`sister_selected`):** Focused signature aura on the selected card with real-time estimated test points preview, dedicated non-floating command tray, and glowing button `⚔️ SOLVE WITH [SISTER NAME] (EST. [X] PTS) ▶` (`from-cyan-500 to-emerald-500`) triggering the 800ms Manga Cut-In and turn resolution.
- **Purge of Redundant Floating Bottom Dock:**
  - Completely removed the duplicate floating bottom pill bar (`BottomNavigation`) across all views, providing uninterrupted vertical clearance for the Sister Desk and collection grids without overlay collisions.
- **3-Phase Round Flow:**
  - **Step A: Examiner Pressure Phase:**
    $$\text{Damage} = \text{round}\Big(\text{rand}(\text{stressVariance}[0], \text{stressVariance}[1]) \times \text{DebuffMultiplier}\Big)$$
    - If `shieldActive === true`, damage is completely absorbed ($0$ damage) and the shield dissipates.
    - If `teamResolveCurrent \le 0`, triggers immediate Defeat (**F - Durchgefallen**).
  - **Step B: Player Action Phase:**
    - Active sister executes her signature skill.
    - Other 4 unpicked sisters contribute passive baseline assistance: $15\%$ of individual IQ ($\text{round}(\text{IQ}_i \times 0.15)$).
    - Charm Critical Strike Roll: if $\text{rand}(0, 1) < \text{EffectiveCharm}$, points double ($2\times$) accompanied by screen shake.
  - **Step C: Resolution Phase:**
    - If $\text{testProgress} \ge 100$, triggers immediate Victory (**100点 満点 - BESTANDEN!**).
    - If 5 rounds expire without reaching 100 points, triggers Defeat (**F - Durchgefallen**).
- **Combat Attribute Derivation:**
  - **IQ (Test Damage by Rarity):**
    $\text{C} = 12$, $\text{UC} = 18$, $\text{R} = 28$, $\text{SR} = 42$, $\text{UR} = 65$, $\text{SEC} = 80$, $\text{MR} = 95$.
    $$\text{Final IQ} = \text{round}\Big(\text{Base IQ} \times (1.0 + \text{TutorIQBuff})\Big)$$
  - **Charm (Critical Strike Probability by Surface Finish):**
    $\text{Raw} = 5\%$, $\text{Holo} = 15\%$, $\text{Sparkle} = 25\%$, $\text{Rainbow} = 40\%$, $\text{Gold-Etched} = 50\%$, $\text{Signed} = 65\%$.
  - **Resolve (Mental Stamina Contribution by BGS Grade):**
    $\text{Raw} = 120$, $\text{Grade 1–3} = 140$, $\text{Grade 4–6} = 200$, $\text{Crisp 7–8} = 280$, $\text{Mint 9} = 400$, $\text{Gem Mint 10} = 520$, $\text{Black Label} = 680$.
    $$\text{Team Resolve Max} = \sum_{i=1}^{5} \text{Resolve}_i$$
- **Nakano Sister Signature Skill Roster:**
  - **Ichika (*Actress Bluff*):** Activates a 2-round debuff reducing examiner pressure by $40\%$, generating base IQ.
  - **Nino (*Sharp Tongue*):** Converts $50\%$ of incoming examiner pressure into bonus test points, and raises team Charm by $+25\%$ for the remainder of the battle.
  - **Miku (*Sengoku Tactics*):** Triples IQ on History exams ($2\times$ otherwise). Guarantees an automatic $100\%$ Critical Strike if Fuutarou is equipped as Support Tutor.
  - **Yotsuba (*Full Effort*):** Restores $+35\%$ of maximum team Resolve and deploys a $100\%$ stress-absorption shield for the following round.
  - **Itsuki (*Brain-Food Appetite*):** Turn 1 eats Curry/Borgar (generates $0$ points, heals $+15\%$ Resolve, gains `isCharged = true`). Turn 2 releases Borgar Strike for $350\%$ base IQ.
- **Examiner Boss Roster:**
  - **Maruo Nakano (*The Unyielding Examiner*):** Base Pressure: $180$, Variance: $[160, 200]$, Weakness: History ($+25\%$ points). Penalty: Parental Intimidation ($-15\%$ team Charm). Reward: $4{,}500\ \yen$, $120\ ★$ Stardust, 1x Kiosk Voucher.
  - **School Board Proctor (*Standardized Testing Board*):** Base Pressure: $110$, Variance: $[95, 125]$, Weakness: Math. Reward: $2{,}000\ \yen$, $50\ ★$ Stardust.
  - **Yusuke Takeda (*Aspiring Top Student*):** Base Pressure: $140$, Variance: $[125, 155]$, Weakness: English. Penalty: Steals 10 test points if scoring under 20 in any round. Reward: $3{,}200\ \yen$, $80\ ★$ Stardust, 1x Test-Sheet Fast Pass.
- **Procedural Web Audio API Sound Effects:**
  - `chalk_scribble`: Filtered white noise with pitch modulation for chalkboard math writing.
  - `manga_slash`: High-frequency noise burst with fast exponential decay for anime cut-ins.
  - `crit_flash`: Shimmering high sine chords ($880\text{Hz} \to 1760\text{Hz}$) for critical hits.
  - `stress_impact`: Low resonant triangle boom ($80\text{Hz} \to 30\text{Hz}$) for examiner pressure.
  - `heartbeat_pulse`: Dual sub-bass thump ($55\text{Hz}$) triggering when team Resolve falls below $25\%$.
  - `hanko_slam`: Heavy transient woodblock thud with resonant decay for victory stamp.
- **Manga Cut-Ins & Hanko Victory Sequence:**
  - 800ms 15-degree diagonal anime action slash with character quote banners, speed lines, and signature colored aura.
  - Japanese lined test paper victory modal with authentic red Hanamaru flower stamp (**花丸 - 100点 満点 合格**), animated score counter, and persistent currency claim.
- **Slide-Over Deck-Builder:**
  - Sleek slide-over deck builder allowing assignment, replacement, and unmounting of 5 sister cards and 1 support tutor with real-time stats and auto-fill.
- **Automated Monte Carlo Audit (`scripts/test-battle-engine.ts`):**
  - Runs 1,000 automated simulated matches per deck tier against Maruo Nakano.
  - Mathematically verifies all-Common win rate ($15\% \dots 25\%$) and all-UR / Graded win rate ($75\% \dots 90\%$).
  - Guarantees zero division-by-zero, zero negative resolve crashes, and zero infinite loops.

### 8. v2.5.0 Arts-Card Combat Engine (Dragon Ball Legends / Pokémon TCG Style) & Arena Overhaul

- **Hover-Bug Purge & Click-to-Select Focus Stage:**
  - Permanently purged all CSS `:hover`-dependent interaction paths on the Sister Desk.
  - Replaced with an explicit Click-to-Select Focus Stage: selected cards elevate smoothly by $-24\text{px}$ with character-specific glowing auras and `z-40 relative`.
  - Non-floating bottom command tray displays sister lore, signature skills, real-time stats (Base IQ, Charm %, Resolve HP, Est. Yield), and tactical dispatch actions (`⚔️ Solve Problem ▶`, `✕ Unlock`).
- **Active Arts Hand Dock (`src/components/battle/ArtsHandDock.tsx`):**
  - Renders 4 horizontal action cards at the bottom center drawn dynamically from slotted Nakano sisters:
    - **Strike Card (Red Border `#EF4444` / 20 Focus):** *"Quick Answer"* — Rapid low-cost test points.
    - **Blast Card (Amber Border `#F59E0B` / 40 Focus):** *"Theorem Proof"* — Heavy test points scaling with sister IQ.
    - **Support Card (Green Border `#10B981` / 30 Focus):** *"Study Break / Note Pass"* — Heals team Resolve or deploys a $100\%$ stress-absorption shield.
    - **Ultimate Card (Cyan Border `#06B6D4` / 70 Focus):** *"Awakened Genius"* — Triggers the 800ms Manga Skill Cut-In and deals $50+$ test points.
  - Glowing top-left Focus orb: illuminates brightly with pulsing energy when `cost <= focusEnergy`, and dims when insufficient Ki.
  - Card launches dynamically onto the chalkboard problem with upward trajectory, impact flash, and Web Audio SFX.
- **Focus Energy Meter & Tactile Concentrate Mechanics (`src/components/battle/FocusEnergyMeter.tsx`):**
  - Left flank vertical Ki fluid cylinder gauge transitioning from deep blue (`#1e3a8a`) to electric cyan (`#06b6d4`) and radiant golden energy glow (`#f59e0b`) with digital readouts (`[ 75 / 100 ]`).
- **Focus Energy (Ki) System & Mathematical Formulas:**
  - Initial battle start: Focus Energy starts at $50 / 100\ \text{Ki}$.
  - Passive continuous regeneration formula ($+5\text{ Ki/sec}$):
    $$\text{Focus}(t + \Delta t) = \min\Big(\text{MaxFocus},\ \text{Focus}(t) + 5.0 \times \Delta t\Big)$$
  - Tactile Concentrate surge formula ($+40\text{ Ki}$ upon 1.0s hold):
    $$\text{Focus}_{\text{charged}} = \min\Big(\text{MaxFocus},\ \text{Focus} + 40\Big)$$
- **Arcade Combo Multiplier Chain:**
  - Cards played within $< 2.0\text{s}$ interval chain into combos with escalating score multipliers:
    $$M(\text{combo}) = \begin{cases} 1.00\times & \text{if } \text{combo} = 1 \\ 1.10\times & \text{if } \text{combo} = 2 \\ 1.25\times & \text{if } \text{combo} = 3 \\ 1.45\times & \text{if } \text{combo} = 4 \\ 1.70\times & \text{if } \text{combo} \ge 5 \end{cases}$$
  - Dynamic score yield calculation:
    $$\text{Points Dealt} = \text{round}\Big(\text{BasePoints} \times M(\text{combo}) \times \text{WeaknessMultiplier}\Big)$$
  - Floating arcade combo banner with 2.0s decay progress bar.
  - Chalkboard radiant impact flash displaying acquired test points, critical multipliers, and shield activations.
- **Examiner Counter-Pressure Bar & Attack Loop:**
  - High-visibility countdown timer on Maruo Nakano's portrait (`Prüfungsfrage in 4.2s!`) with dynamic shrinking gauge.
  - Flashes alarming crimson red with active pulse when under $1.5\text{s}$. Pauses while player concentrates/charges.
  - When timer hits 0, Maruo strikes, dealing stress damage to Resolve unless absorbed by an active academic shield (`executeExaminerAttack`).
- **Procedural Web Audio SFX Additions:**
  - `arts_strike`: Rapid swoosh + snappy chalk crack.
  - `arts_blast`: Energy beam sweep + resonant sub-bass thump.
  - `arts_support`: Soothing emerald chime arpeggio (C6, E6, G6, C7).
  - `arts_ultimate`: Power surge sub-drop + dramatic A-Major orchestral chord triad.
  - `focus_charge_hum`: 110Hz to 220Hz rising triangle wave charging hum.
  - `focus_charge_burst`: Golden dual-tone ping (1760Hz & 2637Hz) upon charge completion.

### 9. Native AAA 3D Booster Pack Opening Ceremony Engine (v2.6.0 - v2.6.1 Phase 1)

- **Decoupled 6-Phase Ceremony State Machine (`src/store/usePackCeremonyStore.ts`):**
  Governs the unboxing lifecycle across discrete physical states inspired by Pokémon TCG Pocket & Weiss Schwarz SP:
  $$\text{IDLE} \longrightarrow \text{INSPECTING\_PACK} \longrightarrow \text{TEARING\_CRIMP} \longrightarrow \text{EXTRACTING\_CARDS} \longrightarrow \text{PEELING\_REVEAL} \longrightarrow \text{CEREMONY\_SUMMARY}$$
- **3D Dual-Sided Booster Pack & Coordinate Hierarchy (`src/components/pack/BoosterPack3D.tsx`):**
  - **Tier 1: Outer Static Anchor:** Container dimensions `w-[320px] sm:w-[340px] h-[520px] sm:h-[550px]` with `perspective: 1200px` on a flat coordinate plane, permanently eliminating coordinate oscillations and `getBoundingClientRect()` feedback loops.
  - **Tier 2: Inertia Rotation Gimbal:** Driven by Framer Motion springs `{ damping: 30, stiffness: 100, mass: 0.8 }`. Dragging outside the tear zone allows free 360° horizontal rotation around the Y-axis (`rotateY: [-180deg, 180deg]`) and slight vertical tilt (`rotateX: [-15deg, 15deg]`).
  - **Tier 3: Physical Foil Volumes:**
    - **Front Shell:** Pack wrapper art with dynamic metallic foil gradient overlay:
      `background: linear-gradient(calc(var(--angle) + 45deg), transparent 20%, rgba(255,255,255,0.4) 50%, transparent 80%)`.
    - **Back Shell:** `rotateY(180deg) translateZ(1px)`. Displays authentic Japanese TCG pack back: JAN barcode (`4573414718820`), Kodansha copyright text, drop-rate distribution summary table, and center back-seal flap (`w-6 h-full bg-[#181820] shadow-md`).
    - **Corrugated Top & Bottom Crimps:** $28\text{px}$ high flaps with metallic crimp teeth pattern created via CSS:
      `repeating-linear-gradient(90deg, #1f242d 0px, #3a4252 2px, #0e1116 4px)`.
    - **Cylindrical Pillow Shading:** Radial vignette shadow along vertical edges simulating cylindrical volume:
      `box-shadow: inset 18px 0 25px -10px rgba(0,0,0,0.8), inset -18px 0 25px -10px rgba(0,0,0,0.8)`.
- **Vector Perforation Tear Crimp (`src/components/pack/FoilTearCrimp.tsx`):**
  - Sits along the top crimp boundary ($44\text{px}$ below the top edge of the pack).
  - **Visual Design:** Neon dashed laser perforation line across the foil (`stroke-dasharray: 4 4`, `#fbbf24`) with a floating golden chevron tab labeled `TEAR ▶` and expanding pulsing touch hitbox ($48\text{px} \times 48\text{px}$).
  - **Direct Window Pointer Capture:** Window-bound pointer tracking with `clientX` direct capture preventing dropped events on rapid thumb/mouse swipes.
  - **Dynamic Mesh & Jagged SVG Deformation:** As `tearProgress` advances from $0.0 \to 0.82$, the severed top flap rotates along the Z-axis by up to $18^\circ$ and pulls open upwards while an SVG jagged foil path (`d="M 0 0 L 12 3 L 24 -2 L 36 4 ... "`) unmasks progressively from left to right.
  - **Breach Execution ($\text{progress} \ge 0.82$):** Detaches the top crimp entirely with simulated gravity, rotation, and fading. Triggers tactile haptic feedback (`hapticTearCrimp` in `src/utils/haptics.ts`), screen shake animation ($8\text{px}$ displacement, 140ms duration), procedural Web Audio snap (`soundEngine.play('tear_pack', 0.9)`), and advances store state to `EXTRACTING_CARDS`.
- **Holographic Dynamic Refraction Angle:**
  $$H(\theta_x, \theta_y) = \left( \operatorname{atan2}(\theta_y, \theta_x) \times \frac{180}{\pi} + 360 \right) \bmod 360$$
- **Specular Hotspot Projection:**
  $$S_x(\theta_x) = \operatorname{clamp}\left(50 + (\theta_x \times 40), 0, 100\right)$$
  $$S_y(\theta_y) = \operatorname{clamp}\left(50 + (\theta_y \times 40), 0, 100\right)$$
- **Glare Intensity Envelope:**
  $$G(\theta_x, \theta_y) = \operatorname{clamp}\left(\sqrt{\theta_x^2 + \theta_y^2} \times 0.75, 0.0, 1.0\right)$$
- **Perforation Tear Breach Threshold:**
  $$\text{progress} = \operatorname{clamp}\left(\frac{\Delta x}{W_{\text{pack}} \times 0.85}, 0.0, 1.0\right)$$
  Perforation breach triggers strictly at $\text{progress} \ge 0.82$, locking progress to $1.0$ and immediately transitioning to card extraction.
- **Volumetric Suspense Edge Glow Profiles (`src/config/suspenseProfiles.ts`):**
  - **Standard (Common / Uncommon, Raw):** `#ffffff15`, secondary `#94a3b8`, blur 12px, spread 2px, pulse 2.4s, 0 particles.
  - **Rare (R / SR, Holo / Sparkle):** `#8b5cf6`, secondary `#3b82f6`, blur 24px, spread 6px, pulse 1.6s, 8 particles.
  - **Ultra (UR / SEC, Rainbow / Gold-Etched):** `#f59e0b`, secondary `#ec4899`, blur 38px, spread 12px, pulse 0.9s, 24 particles.
  - **God / Master / Signed SP (MR or Signed SP finish):** `#ffd700`, secondary `#06b6d4`, blur 52px, spread 20px, pulse 0.5s, 48 particles (with chromatic dispersion).

---

## 🏗️ Project Architecture

```
tqqtcg/
├── public/
│   ├── cards/                   # Master card illustration assets
│   │   ├── TQQ/                 # Dedicated The Quintessential Quintuplets franchise directory
│   │   │   ├── Ichika/
│   │   │   ├── Nino/
│   │   │   ├── Miku/
│   │   │   ├── Yotsuba/
│   │   │   ├── Itsuki/
│   │   │   ├── Futarou/
│   │   │   ├── Raiha/
│   │   │   ├── Maruo/
│   │   │   ├── isanari/
│   │   │   └── Yusuke/
│   │   └── MDUD/                # Multi-franchise asset space
│   └── packs/                   # High-resolution 3D booster foil pack wraps
├── rules.md                     # Strict development protocol & architectural standards
├── scripts/
│   ├── test-battle-engine.ts    # 1,000-match Monte Carlo battle audit verifying win rates & invariants
│   ├── test-engine.ts           # Comprehensive test suite (13 sections covering all game systems)
│   └── verify-tqq-assets.ts     # Strict Linux/Vercel case-sensitivity & asset taxonomy audit
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Global root HTML & font provider
│   │   ├── page.tsx             # Main entry point (renders GrandBinder view switcher)
│   │   └── showcase/page.tsx    # Interactive sandbox showcase & inspection playground
│   ├── components/
│   │   ├── battle/
│   │   │   ├── ArtsHandDock.tsx         # 4-card horizontal action dock with glowing Focus Ki orbs & launch FX
│   │   │   ├── BattleDeckDrawer.tsx     # Slide-over tactical deck builder with auto-fill & stat preview
│   │   │   ├── ExamQuestionCard.tsx     # Central chalkboard question card with formula container & taunts
│   │   │   ├── ExamShowdownArena.tsx    # Night chalkboard battlefield, dual gauges, combo HUD & pressure timer
│   │   │   ├── FocusEnergyMeter.tsx     # Vertical Ki gauge & tactile 1s concentrate hold-to-charge mechanics
│   │   │   ├── HankoVictoryModal.tsx    # Lined test paper modal with red Hanamaru stamp ceremony
│   │   │   └── MangaSkillCutin.tsx      # 800ms 15-degree diagonal anime action slash & quote banners
│   │   ├── binder/
│   │   │   ├── BinderGrid.tsx       # Collection card grid with view filters and stats
│   │   │   ├── CardActionModal.tsx  # Rebalanced two-column inspect modal with responsive unclipped slab stage
│   │   │   └── GrandBinder.tsx      # Main hub with Showcase / Collection / Card-Dex / Battle view switcher
│   │   ├── card/
│   │   │   ├── CardRenderer.tsx     # Holographic foil shader engine & card frame
│   │   │   └── GradingSlab.tsx      # Acrylic BGS-style grading slab with subgrade plates
│   │   ├── catalog/
│   │   │   ├── CardDex.tsx          # 42-card master catalog with unified single toolbar & silhouettes
│   │   │   ├── DexFilterTabs.tsx    # High-density sister filter tabs with character badges
│   │   │   ├── DexMicroProgress.tsx # Streamlined micro SVG completion progress ring
│   │   │   └── DexSearchBar.tsx     # Integrated real-time search bar for serial, name, and quote
│   │   ├── dusting/
│   │   │   └── DustingWorkshop.tsx  # Card vaporization and Stardust exchange station
│   │   ├── layout/
│   │   │   └── PatchNotesModal.tsx  # Accessible single-version patch notes modal with auto-popup & version tracking
│   │   ├── market/
│   │   │   └── SinglesMarket.tsx    # Brushed dark slate Singles Kiosk with 24h timer & reroll
│   │   ├── pack/
│   │   │   ├── BoosterPack3D.tsx    # 3D dual-sided foil booster with 360° gimbal & authentic Japanese back
│   │   │   ├── FoilTearCrimp.tsx    # Vector laser perforation tear crimp with jagged SVG foil physics
│   │   │   ├── PackOpeningModal.tsx # Ceremony modal: tear, suspense, peel & summary
│   │   │   ├── SelectBoosterModal.tsx # Portal-mounted pack kiosk with live drop odds & kiosk tab
│   │   │   └── TearMechanism.tsx    # Direct HTML5 window pointer tear engine
│   │   ├── showcase/
│   │   │   ├── SocketDrawer.tsx          # Full-art pedestal selection drawer with 3-col grid & status badges
│   │   │   ├── SupportAltar.tsx          # Floating tutor dais with downward ambient light cone & Grade 9/10 scaling
│   │   │   ├── SupportDrawer.tsx         # Slide-over tutor drawer with streamlined filters & enlarged previews
│   │   │   ├── Vitrine.tsx               # 5-slot acrylic pedestal stage with flank HUD & dynamic spotlights
│   │   │   ├── VitrineHarvestConsole.tsx # Right flank HUD: yield streaming visualizer & tactile claim button
│   │   │   └── VitrineResonancePanel.tsx # Left flank HUD: vault valuation & 3-way synergy resonance matrix
│   │   ├── vault/
│   │   │   ├── GradingScannerFX.tsx # Particle laser scanner visualizer
│   │   │   └── GradingStation.tsx   # Card submission hub & consumable tool equip
│   │   └── workshop/
│   │       ├── ClampPressStep.tsx            # Dual 12mm acrylic press & WORKPRO bar clamp station
│   │       ├── CrackStep.tsx                 # Sonic weld plier snip & pry-to-fracture acrylic cracking
│   │       ├── MicroscopeStep.tsx            # SVBONY 50X LCD digital microscope blemish swab station
│   │       ├── PolishStep.tsx                # Holographic balm & microfiber circular buffing station
│   │       ├── RestorationWorkbenchModal.tsx # Full-screen self-healing mat workbench container & glove vignette
│   │       └── SleeveStep.tsx                # Semi-rigid Card Saver 1 insertion & Post-it checklist seal
│   ├── config/
│   │   ├── artsCards.ts         # Master Arts Card templates (Strike, Blast, Support, Ultimate) & generator
│   │   ├── battleCalculations.ts # Base IQ, Charm crit probabilities, Resolve & Support scaling formulas
│   │   ├── cardsData.ts         # Catalog of 42 cards with metadata and quotes
│   │   ├── economy.ts           # Pricing matrices, valuation formulas, drop tables, pity, synergies
│   │   ├── examiners.ts         # Boss examiners: Maruo Nakano, School Board Proctor, Yusuke Takeda
│   │   ├── examQuestions.ts     # Subject exam questions catalog, formulas, and examiner taunts
│   │   ├── patchNotes.ts        # Active single-release patch notes configuration & re-exports
│   │   ├── supportBuffs.ts      # Support buff dictionary, Grade 9/10 scaling, & active buff resolver
│   │   ├── suspenseProfiles.ts  # Volumetric suspense edge-glow profiles & particle configurations
│   │   └── version.ts           # Semantic APP_VERSION and CURRENT_PATCH_NOTE contract
│   ├── hooks/
│   │   ├── useIdleRevenue.ts    # Background-safe idle yield calculator with 12h offline cap
│   │   └── useSmoothTilt.ts     # Overdamped 3D spring tilt hook with dynamic lighting
│   ├── store/
│   │   ├── useBattleStore.ts        # Battle store managing deck construction, combat turns & round flow
│   │   ├── useGameStore.ts          # Persistent Zustand store (currencies, inventory, showcase, dex, stats)
│   │   └── usePackCeremonyStore.ts  # 3D Pack Opening Ceremony state machine (Zustand)
│   ├── types/
│   │   ├── battle.ts            # Battle interfaces (SubjectType, BattleStats, Examiner, BattleDeck)
│   │   ├── card.ts              # Strict TypeScript interfaces, enums, and types
│   │   └── packCeremony.ts      # Ceremony phase, finish tiers, shader uniforms & session models
│   └── utils/
│       ├── audio.ts             # Native Web Audio API procedural synthesis engine (6 combat SFX)
│       ├── audioEngine.ts       # Sound synthesizer client instance with coin & receipt pulses
│       ├── battleEngine.ts      # 3-phase combat turn execution engine (Pressure, Action, Resolution)
│       ├── haptics.ts           # Tactile vibration API utility for tear friction & snaps
│       ├── shaderMath.ts        # Dynamic holographic refraction, specular hotspot & tear mathematics
│       └── tqqAssetResolver.ts  # Deterministic case mapper & self-healing legacy path migrator
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

The repository contains an automated Monte Carlo test suite (`scripts/test-engine.ts`) across 17 complete sections as well as the specialized 1,000-match combat audit (`scripts/test-battle-engine.ts`):

```bash
# Run the complete test suite (Sections 1 through 13 + 1,000-match Monte Carlo combat audit)
npm test

# Run only the 1,000-match Exam Showdown Monte Carlo combat audit
npm run test:battle

# Verify all card illustrations and case-sensitivity on disk
npm run verify:assets

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
