/**
 * TQQ Vault - Independent Card Artwork Verification Script
 * Validates that every card definition in src/config/cardsData.ts
 * points to a physical file in public/ with read permissions and non-zero size.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const cardsConfigFile = path.join(rootDir, 'src', 'config', 'cardsData.ts');
const publicDir = path.join(rootDir, 'public');

console.log('=================================================');
console.log('  TQQ VAULT - INDEPENDENT ASSET VERIFICATION');
console.log('=================================================');

if (!fs.existsSync(cardsConfigFile)) {
  console.error(`❌ Config file missing: ${cardsConfigFile}`);
  process.exit(1);
}

const configContent = fs.readFileSync(cardsConfigFile, 'utf-8');

// Parse all card definitions from CARDS_CATALOG
const cardRegex = /{\s*id:\s*['"]([^'"]+)['"][\s\S]*?name:\s*['"]([^'"]+)['"][\s\S]*?imageUrl:\s*['"]([^'"]+)['"]/g;
const cards = [];
let match;
while ((match = cardRegex.exec(configContent)) !== null) {
  cards.push({
    id: match[1],
    name: match[2],
    imageUrl: match[3],
  });
}

if (cards.length === 0) {
  console.error('❌ Failed to parse any card definitions from config.');
  process.exit(1);
}

let validCount = 0;
let missingCount = 0;
const failureDetails = [];

console.log(`\nAuditing ${cards.length} card artwork asset mappings...\n`);

for (const card of cards) {
  const cleanRelPath = card.imageUrl.startsWith('/')
    ? card.imageUrl.slice(1)
    : card.imageUrl;
  const fullDiskPath = path.join(publicDir, cleanRelPath);

  let isValid = false;
  let errorMsg = '';

  if (!fs.existsSync(fullDiskPath)) {
    errorMsg = 'File does not exist on disk';
  } else {
    try {
      fs.accessSync(fullDiskPath, fs.constants.R_OK);
      const stat = fs.statSync(fullDiskPath);
      if (stat.size <= 0) {
        errorMsg = 'File size is 0 bytes';
      } else {
        isValid = true;
      }
    } catch (err) {
      errorMsg = `Permission error: ${err.message}`;
    }
  }

  if (isValid) {
    validCount++;
  } else {
    missingCount++;
    failureDetails.push({
      id: card.id,
      name: card.name,
      path: card.imageUrl,
      error: errorMsg,
    });
  }
}

const validPct = ((validCount / cards.length) * 100).toFixed(0);
const missingPct = ((missingCount / cards.length) * 100).toFixed(0);

console.log('=================================================');
console.log('CARD IMAGE AUDIT SUMMARY');
console.log('=================================================');
console.log(`Total Cards in Config: ${cards.length}`);
console.log(`Found & Valid on Disk: ${validCount} (${validPct}%)`);
console.log(`Missing / Failed:       ${missingCount} (${missingPct}%)`);
console.log('=================================================');

if (failureDetails.length > 0) {
  console.error('\n❌ Failures detected:');
  console.table(failureDetails);
  process.exit(1);
} else {
  console.log('\n🎉 ALL CARD ARTWORKS ARE 100% VALID, ACCESSIBLE, AND READY FOR PRODUCTION!');
  process.exit(0);
}
