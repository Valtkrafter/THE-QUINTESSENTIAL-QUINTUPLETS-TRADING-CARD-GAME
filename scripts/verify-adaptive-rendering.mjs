import fs from 'fs';
import path from 'path';

function getJpegDimensions(buffer) {
  let i = 2;
  while (i < buffer.length - 8) {
    if (buffer[i] === 0xFF) {
      const marker = buffer[i + 1];
      // SOF0, SOF1, SOF2 markers
      if (marker >= 0xC0 && marker <= 0xC3 && marker !== 0xC4) {
        const height = buffer.readUInt16BE(i + 5);
        const width = buffer.readUInt16BE(i + 7);
        return { width, height, ratio: Number((width / height).toFixed(3)) };
      }
      const len = buffer.readUInt16BE(i + 2);
      i += 2 + len;
    } else {
      i++;
    }
  }
  return null;
}

console.log('========================================================');
console.log('  TQQ VAULT - ADAPTIVE ARTWORK & SHADER AUDIT');
console.log('========================================================\n');

// 1. Audit Test Assets
const nino7Path = path.resolve('public/cards/Nino/nino 7.jpg');
const nino1Path = path.resolve('public/cards/Nino/Nino 1.jpg');

const nino7Buf = fs.readFileSync(nino7Path);
const nino1Buf = fs.readFileSync(nino1Path);

const nino7Dim = getJpegDimensions(nino7Buf);
const nino1Dim = getJpegDimensions(nino1Buf);

console.log(`[TEST 1: Image Dimensions & Aspect Ratios]`);
console.log(`- nino 7.jpg (Square crop): ${nino7Dim.width}x${nino7Dim.height} (Aspect Ratio: ${nino7Dim.ratio})`);
console.log(`- Nino 1.jpg (Portrait render): ${nino1Dim.width}x${nino1Dim.height} (Aspect Ratio: ${nino1Dim.ratio})`);

if (Math.abs(nino7Dim.ratio - 1.0) < 0.1) {
  console.log(`✅ nino 7.jpg verified as ~1:1 square illustration.`);
} else {
  console.log(`ℹ️ nino 7.jpg aspect ratio: ${nino7Dim.ratio}`);
}

if (nino1Dim.ratio < 0.72) {
  console.log(`✅ Nino 1.jpg verified as tall portrait render (height > width).`);
}

// 2. Audit CardRenderer Implementation
console.log(`\n[TEST 2: CardRenderer.tsx Dual-Layer Implementation]`);
const cardRendererSrc = fs.readFileSync(path.resolve('src/components/card/CardRenderer.tsx'), 'utf-8');

const checks = [
  { name: 'Ambient blurred background fill', pattern: /scale-125 blur-xl opacity-40 brightness-75/ },
  { name: 'Uncompromised foreground art with object-contain', pattern: /object-contain object-center/ },
  { name: 'Foreground drop-shadow', pattern: /drop-shadow-\[0_12px_24px_rgba\(0,0,0,0\.7\)\]/ },
  { name: 'Vignette inner shadow overlay', pattern: /shadow-\[inset_0_0_25px_rgba\(0,0,0,0\.85\)\]/ },
  { name: 'Foil shader overlays at z-20+', pattern: /finish-holo-overlay absolute inset-0 pointer-events-none z-20/ },
  { name: 'Sparkle shader overlay at z-20', pattern: /finish-sparkle-overlay absolute inset-0 pointer-events-none z-20/ },
  { name: 'Rainbow shader overlay at z-20', pattern: /finish-rainbow-overlay absolute inset-0 pointer-events-none z-20/ },
  { name: 'Gold etched relief overlay at z-20', pattern: /finish-gold-etched-relief absolute inset-0 pointer-events-none z-20/ },
  { name: 'Art contrast top shadow at z-25', pattern: /absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-black\/60 to-transparent pointer-events-none z-25/ },
  { name: 'Lore quote overlay at z-30', pattern: /z-30 shadow-lg/ },
];

let allPassed = true;
for (const check of checks) {
  if (check.pattern.test(cardRendererSrc)) {
    console.log(`✅ ${check.name}: FOUND`);
  } else {
    console.error(`❌ ${check.name}: NOT FOUND`);
    allPassed = false;
  }
}

// 3. Audit Tailwind zIndex configuration
console.log(`\n[TEST 3: Tailwind Config zIndex Extension]`);
const tailwindConfig = fs.readFileSync(path.resolve('tailwind.config.ts'), 'utf-8');
if (tailwindConfig.includes("'15': '15'") && tailwindConfig.includes("'25': '25'") && tailwindConfig.includes("'35': '35'")) {
  console.log(`✅ Tailwind config extended with z-15, z-25, and z-35.`);
} else {
  console.error(`❌ Tailwind config missing zIndex extensions.`);
  allPassed = false;
}

if (allPassed) {
  console.log(`\n🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!`);
  process.exit(0);
} else {
  console.error(`\n❌ VERIFICATION FAILED`);
  process.exit(1);
}
