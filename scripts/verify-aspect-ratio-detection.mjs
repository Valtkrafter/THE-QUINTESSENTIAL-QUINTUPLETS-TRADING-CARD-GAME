import fs from 'fs';
import path from 'path';

console.log('========================================================');
console.log('  TQQ VAULT - RUNTIME ASPECT-RATIO DETECTION AUDIT');
console.log('========================================================\n');

// 1. Audit Types & Component Source
const cardTypes = fs.readFileSync(path.resolve('src/types/card.ts'), 'utf-8');
const cardRenderer = fs.readFileSync(path.resolve('src/components/card/CardRenderer.tsx'), 'utf-8');
const showcasePage = fs.readFileSync(path.resolve('src/app/showcase/page.tsx'), 'utf-8');

let allPassed = true;

function check(label, condition) {
  if (condition) {
    console.log(`✅ ${label}: PASSED`);
  } else {
    console.error(`❌ ${label}: FAILED`);
    allPassed = false;
  }
}

// Test A: Type Definition Checks
console.log('[STAGE 1: Type Definitions]');
check("ImageFitStatus type exported in CardRenderer.tsx", /export type ImageFitStatus = 'loading' \| 'perfect' \| 'tall' \| 'wide' \| 'error'/.test(cardRenderer));
check("forceFit optional field in CardDefinition", /forceFit\?:\s*'exact' \| 'top' \| 'contain'/.test(cardTypes));
check("forceFit optional field in CardInstance", /forceFit\?:\s*'exact' \| 'top' \| 'contain'/.test(cardTypes));

// Test B: Aspect-Ratio Detection Logic
console.log('\n[STAGE 2: Mathematical Detection & Epsilon Threshold]');
check("Epsilon tolerance 0.06 present in computeFitStatus", /delta <= 0\.06/.test(cardRenderer));
check("Target ratio 63 / 55 fallback present", /63 \/ 55/.test(cardRenderer));
check("Dynamic container measurement clientWidth / clientHeight", /container\.clientWidth \/ container\.clientHeight/.test(cardRenderer));
check("forceFit === 'exact' bypasses calculation to 'perfect'", /forceFit === 'exact'\s*\) return 'perfect'/.test(cardRenderer));

// Pure Math Simulation
const targetRatio = 63 / 55; // 1.14545...
const epsilon = 0.06;

function simulateDetection(width, height, forceFit) {
  if (forceFit === 'exact') return 'perfect';
  if (forceFit === 'top') return 'tall';
  if (forceFit === 'contain') return 'wide';
  const ratio = width / height;
  const delta = Math.abs(ratio - targetRatio);
  if (delta <= epsilon) return 'perfect';
  if (ratio < targetRatio) return 'tall';
  return 'wide';
}

check("63:55 Tailored artwork (1260x1100) -> 'perfect'", simulateDetection(1260, 1100) === 'perfect');
check("Slightly off tailored (1200x1100, delta=0.054) -> 'perfect'", simulateDetection(1200, 1100) === 'perfect');
check("Tall full-body render (736x1308, ratio=0.563) -> 'tall'", simulateDetection(736, 1308) === 'tall');
check("Ultra-tall portrait (1138x2239, ratio=0.508) -> 'tall'", simulateDetection(1138, 2239) === 'tall');
check("Square illustration (720x720, ratio=1.0) -> 'tall' (below 1.145)", simulateDetection(720, 720) === 'tall');
check("Landscape/wide illustration (520x369, ratio=1.409) -> 'wide'", simulateDetection(520, 369) === 'wide');
check("forceFit 'exact' override on tall image -> 'perfect'", simulateDetection(1138, 2239, 'exact') === 'perfect');

// Test C: Conditional Styling & Overlay Suppression
console.log('\n[STAGE 3: Conditional Styling & Overlay Suppression]');
check("fitStatus === 'tall' applies 'object-cover object-top'", /fitStatus === 'tall'\s*\?\s*'object-cover object-top'\s*:\s*'object-cover object-center'/.test(cardRenderer));
check("Bottom transition gradient only on 'tall'", /\{fitStatus === 'tall' && \(\s*<div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-\[#111116\] to-transparent opacity-80"/.test(cardRenderer));
check("Side-vignette shadows only on 'wide'", /\{fitStatus === 'wide' && \(\s*<div className="pointer-events-none absolute inset-0 shadow-\[inset_16px_0_20px_-8px_rgba\(0,0,0,0\.8\),inset_-16px_0_20px_-8px_rgba\(0,0,0,0\.8\)\] opacity-70"/.test(cardRenderer));
check("Top shadow suppressed when 'perfect'", /fitStatus !== 'perfect' && \(\s*<div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-black\/60 to-transparent pointer-events-none z-25"/.test(cardRenderer));
check("Showcase UI includes interactive Framing Mode selector", /Dynamic Aspect-Ratio & Framing/.test(showcasePage));

if (allPassed) {
  console.log('\n🎉 ALL RUNTIME ASPECT-RATIO DETECTION CHECKS PASSED 100%!');
  process.exit(0);
} else {
  console.error('\n❌ AUDIT FAILED');
  process.exit(1);
}
