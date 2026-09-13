/**
 * TQQ Vault - Asset Integrity Verification Script
 * Validates that all card illustrations in CARDS_CATALOG match real files on disk
 * with exact directory and file casing to prevent 404 errors on Linux / Vercel.
 */

import fs from 'fs';
import path from 'path';
import { CARDS_CATALOG } from '../src/config/cardsData';

function verifyAssets() {
  console.log('🔍 [TQQ Vault] Verifying card asset taxonomy & casing integrity...\n');

  const publicDir = path.join(process.cwd(), 'public');
  let errors = 0;
  let verified = 0;

  for (const card of CARDS_CATALOG) {
    if (!card.imageUrl) {
      console.error(`❌ Card [${card.id} - ${card.name}] has no imageUrl defined!`);
      errors++;
      continue;
    }

    if (!card.imageUrl.startsWith('/cards/TQQ/')) {
      console.error(`❌ Card [${card.id}] path is not scoped to /cards/TQQ/: ${card.imageUrl}`);
      errors++;
      continue;
    }

    // Relative path without leading slash
    const relativePath = card.imageUrl.replace(/^\//, '');
    const fullPath = path.join(publicDir, relativePath);

    // 1. Basic existence check
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${card.imageUrl} (card: ${card.id})`);
      errors++;
      continue;
    }

    // 2. Strict case-sensitivity verification (even on Windows)
    const pathParts = relativePath.split('/');
    let currentDir = publicDir;
    let caseMismatch = false;

    for (const part of pathParts) {
      const dirContents = fs.readdirSync(currentDir);
      const exactMatch = dirContents.find((entry) => entry === part);

      if (!exactMatch) {
        const caseInsensitiveMatch = dirContents.find(
          (entry) => entry.toLowerCase() === part.toLowerCase()
        );
        console.error(
          `❌ Casing mismatch in path "${card.imageUrl}": expected exact "${part}" on disk, found "${caseInsensitiveMatch || 'NOT FOUND'}"`
        );
        caseMismatch = true;
        break;
      }
      currentDir = path.join(currentDir, exactMatch);
    }

    if (caseMismatch) {
      errors++;
    } else {
      verified++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Total Cards in Master Catalog: ${CARDS_CATALOG.length}`);
  console.log(`Assets Verified (Exact Casing): ${verified}`);
  console.log(`Errors: ${errors}`);
  console.log(`========================================\n`);

  if (errors > 0) {
    console.error(`🚨 Verification failed with ${errors} error(s)!`);
    process.exit(1);
  } else {
    console.log(`✨ All ${verified} card assets verified successfully with 0 casing discrepancies.`);
  }
}

verifyAssets();
