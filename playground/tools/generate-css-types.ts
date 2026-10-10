import { join } from 'node:path';
import { writeAllDeclarations } from './css-module-types.ts';

const written = writeAllDeclarations(join(import.meta.dirname, '..', 'src'));
console.log(`CSS module types: ${written} file(s) updated.`);
