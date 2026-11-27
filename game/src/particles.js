// Particles, drawn only: falling autumn leaves, dust puffs at the turkey's feet, feather
// bursts on a hit, fire embers above an oven, and confetti for the escape. Nothing here
// allocates after boot: one fixed pool, recycled. Positions are seeded so a staged scene
// paints the same frame every time.

import { FIELD, PALETTE } from './config.js';

export const KIND_LEAF = 0;
export const KIND_DUST = 1;
export const KIND_FEATHER = 2;
export const KIND_EMBER = 3;
export const KIND_CONFETTI = 4;

const POOL = 240;
const CONFETTI_COLORS = ['#ffd23e', '#ff4d4d', '#7ed957', '#4da6ff', '#ff8ce8', '#ffffff'];

export function createParticles(random) {
  const parts = [];
  for (let index = 0; index < POOL; index += 1) {
    parts.push({ active: false, kind: KIND_LEAF, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 4, spin: 0, angle: 0, color: '#ffffff' });
  }

  function free() {
    for (let index = 0; index < parts.length; index += 1) if (!parts[index].active) return parts[index];
    return null;
  }

  function spawn(kind, x, y, vx, vy, life, size, color) {
    const p = free();
    if (p === null) return;
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.angle = random() * Math.PI * 2;
    p.spin = (random() - 0.5) * 6;
    p.color = color;
  }

  /** One drifting autumn leaf, respawned at the top once it lands. */
  function spawnLeaf() {
    const p = free();
    if (p === null) return;
    p.active = true;
    p.kind = KIND_LEAF;
    p.x = random() * FIELD.width;
    p.y = -12;
    p.vx = -14 - random() * 22;
    p.vy = 26 + random() * 30;
    p.life = 60;
    p.maxLife = 60;
    p.size = 5 + random() * 5;
    p.angle = random() * Math.PI * 2;
    p.spin = (random() - 0.5) * 4;
    p.color = PALETTE.leaf[Math.floor(random() * PALETTE.leaf.length)];
  }

  function burstFeathers(x, y) {
    for (let index = 0; index < 14; index += 1) {
      spawn(KIND_FEATHER, x, y, (random() - 0.5) * 320, -60 - random() * 180, 0.7 + random() * 0.5, 5 + random() * 5, PALETTE.tail[Math.floor(random() * PALETTE.tail.length)]);
    }
  }

  function puffDust(x, y) {
    spawn(KIND_DUST, x, y, (random() - 0.5) * 40, -12 - random() * 18, 0.45, 6 + random() * 5, '#c9a37e');
  }

  function burstEmber(x, y) {
    spawn(KIND_EMBER, x + (random() - 0.5) * 60, y, (random() - 0.5) * 24, -40 - random() * 70, 0.6 + random() * 0.5, 2 + random() * 3, PALETTE.fire[Math.floor(random() * PALETTE.fire.length)]);
  }

  function burstConfetti(x, y) {
    for (let index = 0; index < 26; index += 1) {
      spawn(KIND_CONFETTI, x, y, (random() - 0.5) * 420, -120 - random() * 260, 1.1 + random() * 0.8, 4 + random() * 5, CONFETTI_COLORS[Math.floor(random() * CONFETTI_COLORS.length)]);
    }
  }

  function update(dt, elapsed) {
    let leaves = 0;
    for (let index = 0; index < parts.length; index += 1) {
      const p = parts[index];
      if (!p.active) continue;
      if (p.kind === KIND_LEAF) leaves += 1;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt + Math.sin(elapsed * 2 + index) * 12 * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      if (p.kind === KIND_CONFETTI || p.kind === KIND_FEATHER) p.vy += 420 * dt;
      if (p.kind === KIND_DUST) p.size += 14 * dt;
      if (p.kind === KIND_LEAF && p.y > FIELD.groundY + 6) p.active = false;
    }
    // Keep about ten leaves drifting at all times.
    while (leaves < 10) {
      spawnLeaf();
      leaves += 1;
    }
  }

  return { parts, update, burstFeathers, puffDust, burstEmber, burstConfetti, spawnLeaf };
}
