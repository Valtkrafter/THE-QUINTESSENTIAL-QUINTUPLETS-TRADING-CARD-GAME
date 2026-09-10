/**
 * TQQ Vault - Filesystem Audit & Auto-Mapping Script
 * Scans public/cards/ recursively, captures exact directory/file casing,
 * matches against src/config/cardsData.ts, and syncs exact on-disk paths.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const publicCardsDir = path.join(rootDir, 'public', 'cards');
const cardsConfigFile = path.join(rootDir, 'src', 'config', 'cardsData.ts');

console.log('=================================================');
console.log('  TQQ VAULT - FILESYSTEM AUDIT & AUTO-MAPPING');
console.log('=================================================');

// 1. Recursively scan public/cards
const diskFiles = [];

function scanDir(currentDir, relativePrefix = '') {
  if (!fs.existsSync(currentDir)) return;
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.join(relativePrefix, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      scanDir(fullPath, relPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        const stats = fs.statSync(fullPath);
        diskFiles.push({
          relPath: `/cards/${relPath}`,
          fullPath,
          sizeBytes: stats.size,
          filename: entry.name,
          ext,
        });
      }
    }
  }
}

scanDir(publicCardsDir);
console.log(`\n📁 Total card artwork files found on disk: ${diskFiles.length}`);

// 2. Read src/config/cardsData.ts
if (!fs.existsSync(cardsConfigFile)) {
  console.error(`❌ Config file not found: ${cardsConfigFile}`);
  process.exit(1);
}

let cardsContent = fs.readFileSync(cardsConfigFile, 'utf-8');

// Parse cards from config
const cardRegex = /id:\s*['"]([^'"]+)['"][\s\S]*?imageUrl:\s*['"]([^'"]+)['"]/g;
const cardsInConfig = [];
let match;
while ((match = cardRegex.exec(cardsContent)) !== null) {
  cardsInConfig.push({
    id: match[1],
    imageUrl: match[2],
  });
}

console.log(`📋 Total cards configured in cardsData.ts: ${cardsInConfig.length}`);

// 3. Compare and Auto-Sync
let updatedCount = 0;
let matchedCount = 0;
const unmatchedCards = [];

const resultsTable = [];

for (const card of cardsInConfig) {
  const currentPath = card.imageUrl;
  // Exact match
  const exactMatch = diskFiles.find((f) => f.relPath === currentPath);

  if (exactMatch) {
    matchedCount++;
    resultsTable.push({
      CardId: card.id,
      ConfigPath: currentPath,
      DiskPath: exactMatch.relPath,
      Status: 'EXACT MATCH',
      Size: `${(exactMatch.sizeBytes / 1024).toFixed(1)} KB`,
    });
  } else {
    // Case-insensitive / normalized match
    const normalizedMatch = diskFiles.find(
      (f) =>
        f.relPath.toLowerCase() === currentPath.toLowerCase() ||
        f.relPath.toLowerCase().replace(/\s+/g, '') === currentPath.toLowerCase().replace(/\s+/g, '')
    );

    if (normalizedMatch) {
      console.log(`🔄 Updating ${card.id}: "${currentPath}" -> "${normalizedMatch.relPath}"`);
      // Replace in cardsContent
      cardsContent = cardsContent.replace(
        `imageUrl: '${currentPath}'`,
        `imageUrl: '${normalizedMatch.relPath}'`
      );
      updatedCount++;
      matchedCount++;
      resultsTable.push({
        CardId: card.id,
        ConfigPath: currentPath,
        DiskPath: normalizedMatch.relPath,
        Status: 'SYNCED (CASE/SPACE)',
        Size: `${(normalizedMatch.sizeBytes / 1024).toFixed(1)} KB`,
      });
    } else {
      unmatchedCards.push(card);
      resultsTable.push({
        CardId: card.id,
        ConfigPath: currentPath,
        DiskPath: 'NOT FOUND',
        Status: 'MISSING',
        Size: '0 KB',
      });
    }
  }
}

// 4. Save synced config if updates were made
if (updatedCount > 0) {
  fs.writeFileSync(cardsConfigFile, cardsContent, 'utf-8');
  console.log(`\n💾 Saved ${updatedCount} corrected path(s) to ${cardsConfigFile}`);
}

console.log('\n--- AUDIT TABLE ---');
console.table(resultsTable.slice(0, 15)); // Show sample
if (resultsTable.length > 15) {
  console.log(`... and ${resultsTable.length - 15} more verified.`);
}

console.log('\n=================================================');
console.log('AUDIT SUMMARY');
console.log('=================================================');
console.log(`Total Configured Cards: ${cardsInConfig.length}`);
console.log(`Total Disk Files:       ${diskFiles.length}`);
console.log(`Matched on Disk:        ${matchedCount} (${((matchedCount / cardsInConfig.length) * 100).toFixed(1)}%)`);
console.log(`Unmatched / Missing:    ${unmatchedCards.length}`);
console.log(`Synced Paths:           ${updatedCount}`);
console.log('=================================================');

if (unmatchedCards.length > 0) {
  console.error('\n❌ Unmatched cards detected:');
  console.error(unmatchedCards);
  process.exit(1);
} else {
  console.log('\n✅ 100% of cards in cardsData.ts mapped to valid files on disk!');
}
