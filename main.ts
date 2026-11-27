// Gobble Dash — a turkey's great escape (turkey-run-game-01 entry).
//
// The game lives in game/: plain static files a desktop browser opens
// offline — index.html plus its ES modules, no library, no network
// request at all. A turkey runs for its life across a farmyard at
// sunset, the farmer hot on its heels, dodging falling carving knives
// and the glowing oven while grabbing corn on the way. Title screen,
// a live run with a HUD (score, distance, lives), and an end screen
// for both fates — caught, or escaped — with a restart.
//
// This program is the handover step. It stages the finished game and
// its screenshots into the output directory and builds dossier.json,
// the summary the judge reads, with the vendored make.fun library
// (vendor/makefun-game.ts, kept untouched from the kit).
//
// Run it locally like this:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// then open out/game/index.html, or serve game/ with node serve.ts
// and visit http://localhost:8080. Inside the grader's container
// MAKEFUN_OUTPUT_DIR is not set, so the output goes to /output.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The folder this file sits in, and where the handover lands.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps: only text_max_bytes changes the dossier's
// bytes. The rest refuse an entry the scorer would refuse anyway —
// more than 4 screenshots or one over 256 KiB; more than 993 files
// in game/ or 48 MiB of game files in all; or a path under game/
// longer than 1000 bytes. game/ shares /output's own 1000-entry cap
// with screenshots/ and dossier.json, so we leave it room.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Count every file below a directory, following subfolders.
function countFiles(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    total += entry.isDirectory() ? countFiles(path) : 1;
  }
  return total;
}

// Stage the game, then its screenshots (the first by name is the cover).
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// Build the dossier from what we just staged.
const dossierPath = join(outputDir, 'dossier.json');
writeFileSync(dossierPath, buildDossier(outputDir, dossierCaps));

// A short handover summary, so a local run shows at a glance that
// everything landed: how many game files, how many screenshots, and
// how big the dossier came out.
const gameFiles = countFiles(join(outputDir, 'game'));
const shotFiles = countFiles(join(outputDir, 'screenshots'));
const dossierBytes = statSync(dossierPath).size;
console.log(`Gobble Dash handed over to ${outputDir}`);
console.log(`  game files:  ${gameFiles}`);
console.log(`  screenshots: ${shotFiles}`);
console.log(`  dossier:     ${dossierBytes} bytes`);
