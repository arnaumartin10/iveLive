import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const sourceRoots = ['src/app', 'src/components', 'src/features'];
const extensions = new Set(['.ts', '.tsx']);
const forbiddenPatterns: Array<[string, RegExp]> = [
  ['raw hex/rgba UI color', /(?:backgroundColor|borderColor|color)\s*:\s*['"](?:#|rgba?\()/i],
  ['gradient or blur treatment', /\b(?:LinearGradient|BlurView|blurRadius)\b|shadowRadius\s*:\s*[1-9]\d*/],
  ['legacy font family', /fontFamily\s*:\s*['"](?:Inter|Roboto|Poppins|Montserrat|SpaceGrotesk)_/i],
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return extensions.has(path.slice(path.lastIndexOf('.'))) ? [path] : [];
  });
}

describe('Paper & Ink screen source guard', () => {
  for (const root of sourceRoots) {
    for (const file of sourceFiles(root)) {
      const source = readFileSync(file, 'utf8');
      for (const [label, pattern] of forbiddenPatterns) {
        it(`${file} contains no ${label}`, () => {
          expect(source).not.toMatch(pattern);
        });
      }
    }
  }
});
