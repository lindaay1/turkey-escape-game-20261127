// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred. A farmyard at sunset: gradient sky,
// sun, drifting clouds, two hill ridges, a barn and a windmill, autumn trees, a fence and
// hay bales scrolling past as the turkey runs, a dirt track, and the turkey itself — a fan
// of tail feathers, a flapping wing, running legs — chased by Farmer Bram, whose distance
// from the turkey the HUD shows. Decorative motion reads the world's own elapsed time, so
// a staged screenshot paints the same frame every time.
import { ESCAPE_DISTANCE, FIELD, FONT, LIVES, PALETTE } from './config.js';
import { KIND_CORN, KIND_FEATHER, KIND_OVEN } from './world.js';
import { KIND_CONFETTI, KIND_DUST, KIND_EMBER, KIND_FEATHER as P_FEATHER, KIND_LEAF } from './particles.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 660, top: 128, line: 32, bottom: 76 };
const LIFE_SIZE = 20;
const LIFE_GAP = 8;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

function mulberry(seed) {
  return createRandom(seed);
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const levelLabel = cachedLabel('Level ');
  const distanceLabel = cachedLabel('');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  // Fixed scenery, drawn once from a seeded generator so every run looks the same.
  const scenery = mulberry(20261127);
  const farRidge = [];
  const nearRidge = [];
  for (let x = 0; x <= FIELD.width; x += 64) {
    farRidge.push({ x, y: FIELD.horizonY - 40 - scenery() * 46 });
    nearRidge.push({ x, y: FIELD.horizonY + 6 - scenery() * 30 });
  }
  const trees = [];
  for (let index = 0; index < 4; index += 1) {
    trees.push({ x: 90 + index * 320 + scenery() * 90, y: FIELD.horizonY + 34, size: 52 + scenery() * 30, hue: index % PALETTE.treeFoliage.length });
  }
  const clouds = [];
  for (let index = 0; index < 5; index += 1) {
    clouds.push({ x: scenery() * FIELD.width, y: 60 + scenery() * 150, size: 46 + scenery() * 60, speed: 6 + scenery() * 8 });
  }
  const tufts = [];
  for (let index = 0; index < 26; index += 1) tufts.push({ x: scenery() * FIELD.width, y: FIELD.groundY + 8 + scenery() * 84 });

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = size + (weight || '');
    if (!fonts.has(key)) fonts.set(key, `${weight ? weight + ' ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function rr(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function ellipse(x, y, rx, ry, rotation) {
    context.beginPath();
    context.ellipse(x, y, rx, ry, rotation || 0, 0, Math.PI * 2);
    context.fill();
  }

  function drawSky(elapsed) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.horizonY + 60);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.55, PALETTE.skyMid);
    gradient.addColorStop(1, PALETTE.skyLow);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.horizonY + 60);
    // Low sun with a warm glow.
    const glow = context.createRadialGradient(1020, 168, 8, 1020, 168, 150);
    glow.addColorStop(0, 'rgba(255, 217, 122, 0.9)');
    glow.addColorStop(0.4, 'rgba(255, 158, 79, 0.35)');
    glow.addColorStop(1, 'rgba(255, 158, 79, 0)');
    context.fillStyle = glow;
    context.fillRect(820, 0, 400, 360);
    context.fillStyle = PALETTE.sunCore;
    ellipse(1020, 168, 44, 44);
    // Drifting clouds.
    context.fillStyle = 'rgba(255, 214, 190, 0.55)';
    for (const cloud of clouds) {
      const cx = ((cloud.x + elapsed * cloud.speed) % (FIELD.width + 260)) - 130;
      ellipse(cx, cloud.y, cloud.size, cloud.size * 0.36);
      ellipse(cx + cloud.size * 0.55, cloud.y + 8, cloud.size * 0.7, cloud.size * 0.3);
      ellipse(cx - cloud.size * 0.55, cloud.y + 10, cloud.size * 0.6, cloud.size * 0.28);
    }
  }

  function ridge(points, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(-4, FIELD.horizonY + 60);
    for (const point of points) context.lineTo(point.x, point.y);
    context.lineTo(FIELD.width + 4, FIELD.horizonY + 60);
    context.closePath();
    context.fill();
  }

  function drawBarn() {
    // Barn silhouette on the far ridge, with a windmill whose blades turn with time.
    const bx = 190;
    const by = FIELD.horizonY - 66;
    context.fillStyle = PALETTE.barn;
    context.fillRect(bx, by, 120, 66);
    context.beginPath();
    context.moveTo(bx - 8, by);
    context.lineTo(bx + 60, by - 34);
    context.lineTo(bx + 128, by);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.barnRoof;
    context.fillRect(bx + 52, by + 18, 16, 30);
    // Windmill.
    const wx = 1120;
    const wy = FIELD.horizonY - 96;
    context.fillStyle = PALETTE.barn;
    context.beginPath();
    context.moveTo(wx - 12, FIELD.horizonY);
    context.lineTo(wx - 4, wy);
    context.lineTo(wx + 4, wy);
    context.lineTo(wx + 12, FIELD.horizonY);
    context.closePath();
    context.fill();
    return { wx, wy };
  }

  function drawWindmillBlades(wx, wy, elapsed) {
    context.strokeStyle = PALETTE.barn;
    context.lineWidth = 5;
    for (let arm = 0; arm < 4; arm += 1) {
      const angle = elapsed * 0.5 + (arm * Math.PI) / 2;
      context.beginPath();
      context.moveTo(wx, wy);
      context.lineTo(wx + Math.cos(angle) * 34, wy + Math.sin(angle) * 34);
      context.stroke();
    }
  }

  function drawTrees() {
    for (const tree of trees) {
      context.fillStyle = PALETTE.treeTrunk;
      context.fillRect(tree.x - 4, tree.y - 34, 8, 36);
      context.fillStyle = PALETTE.treeFoliage[tree.hue];
      ellipse(tree.x, tree.y - 52, tree.size * 0.62, tree.size * 0.42);
      ellipse(tree.x - tree.size * 0.4, tree.y - 34, tree.size * 0.4, tree.size * 0.3);
      ellipse(tree.x + tree.size * 0.4, tree.y - 36, tree.size * 0.42, tree.size * 0.3);
      context.fillStyle = PALETTE.treeFoliage[(tree.hue + 1) % PALETTE.treeFoliage.length];
      ellipse(tree.x + tree.size * 0.18, tree.y - 62, tree.size * 0.3, tree.size * 0.22);
    }
  }

  function drawFence(distance) {
    const spacing = 96;
    const offset = (distance * 26) % spacing;
    context.fillStyle = PALETTE.fence;
    context.fillRect(0, FIELD.horizonY + 52, FIELD.width, 6);
    context.fillRect(0, FIELD.horizonY + 76, FIELD.width, 6);
    for (let x = -spacing + offset; x < FIELD.width + spacing; x += spacing) {
      context.fillRect(x, FIELD.horizonY + 38, 10, 62);
    }
  }

  function drawHayAndPumpkins(distance) {
    const spacing = 420;
    const offset = (distance * 40) % spacing;
    for (let x = -spacing + offset; x < FIELD.width + spacing; x += spacing) {
      // Hay bale: a solid golden mound with straw arcs for texture.
      context.fillStyle = PALETTE.hay;
      ellipse(x + 60, FIELD.groundY - 14, 46, 24);
      context.strokeStyle = PALETTE.hayDark;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(x + 60, FIELD.groundY - 14, 34, Math.PI * 1.15, Math.PI * 1.85);
      context.stroke();
      context.beginPath();
      context.arc(x + 60, FIELD.groundY - 14, 22, Math.PI * 1.2, Math.PI * 1.8);
      context.stroke();
      // Pumpkin beside it.
      context.fillStyle = PALETTE.pumpkin;
      ellipse(x + 150, FIELD.groundY - 8, 16, 12);
      context.fillStyle = PALETTE.grass;
      context.fillRect(x + 147, FIELD.groundY - 24, 5, 8);
    }
  }

  function drawGround(distance) {
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = PALETTE.dirt;
    context.fillRect(0, FIELD.groundY, FIELD.width, 10);
    context.fillStyle = PALETTE.groundDark;
    context.fillRect(0, FIELD.height - 26, FIELD.width, 26);
    // Grass tufts scrolling with the run.
    context.strokeStyle = PALETTE.grass;
    context.lineWidth = 2;
    const spacing = 160;
    const offset = (distance * 60) % spacing;
    for (const tuft of tufts) {
      const x = ((tuft.x + offset) % (FIELD.width + 40)) - 20;
      context.beginPath();
      context.moveTo(x, tuft.y);
      context.lineTo(x - 4, tuft.y - 10);
      context.moveTo(x + 3, tuft.y);
      context.lineTo(x + 3, tuft.y - 12);
      context.moveTo(x + 6, tuft.y);
      context.lineTo(x + 10, tuft.y - 9);
      context.stroke();
    }
  }

  /** A falling carving knife, point down: a narrow steel blade under a wooden handle,
   * drawn centred in its box so it reads as a knife, never as a triangle. */
  function drawKnife(item, elapsed) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const bladeW = Math.min(item.width * 0.52, 30);
    context.save();
    context.translate(cx, cy);
    context.rotate(Math.sin(elapsed * 2 + item.x * 0.01) * 0.1);
    // Handle: a rounded wooden grip at the top.
    context.fillStyle = PALETTE.handle;
    rr(-bladeW * 0.32, -item.height / 2, bladeW * 0.64, item.height * 0.34, 4);
    context.fill();
    context.fillStyle = '#5d3a1e';
    context.fillRect(-bladeW * 0.32, -item.height * 0.2, bladeW * 0.64, 3);
    // Blade: a long tapered shape with a sharp point and a bright cutting edge.
    context.fillStyle = PALETTE.knife;
    context.beginPath();
    context.moveTo(-bladeW / 2, -item.height * 0.16);
    context.lineTo(bladeW / 2, -item.height * 0.16);
    context.lineTo(bladeW * 0.18, item.height * 0.32);
    context.lineTo(0, item.height / 2);
    context.lineTo(-bladeW * 0.32, item.height * 0.3);
    context.closePath();
    context.fill();
    context.strokeStyle = PALETTE.knifeEdge;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(bladeW * 0.3, -item.height * 0.14);
    context.lineTo(0, item.height / 2 - 3);
    context.stroke();
    context.restore();
  }

  function drawCorn(item, elapsed) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    context.fillStyle = PALETTE.husk;
    context.beginPath();
    context.moveTo(cx - 8, cy + 4);
    context.lineTo(cx - 16, cy + 16);
    context.lineTo(cx - 4, cy + 12);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(cx + 8, cy + 4);
    context.lineTo(cx + 16, cy + 16);
    context.lineTo(cx + 4, cy + 12);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.corn;
    ellipse(cx, cy, item.width * 0.32, item.height * 0.46);
    context.fillStyle = PALETTE.cornDark;
    for (let row = -1; row <= 1; row += 1) {
      context.fillRect(cx - 6, cy + row * 7 - 1, 12, 2);
    }
    context.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ellipse(cx - 3, cy - 6, 3, 6, -0.4);
  }

  function drawGoldenFeather(item, elapsed) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2 + Math.sin(elapsed * 4 + item.x) * 4;
    context.save();
    context.shadowColor = PALETTE.featherGold;
    context.shadowBlur = 18;
    context.fillStyle = PALETTE.featherGold;
    context.beginPath();
    context.ellipse(cx, cy, 7, 15, 0.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.strokeStyle = '#b57f2e';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(cx - 6, cy + 12);
    context.lineTo(cx + 8, cy - 14);
    context.stroke();
  }

  /** An oven rolling in along the ground, its door glowing with fire. A bright rim and a
   * warning triangle make it stand out against the dark farmyard. */
  function drawOven(item, elapsed) {
    const flicker = Math.sin(elapsed * 13 + item.x) * 0.5 + 0.5;
    // Warm glow spilling onto the ground around the oven.
    const glow = context.createRadialGradient(item.x + item.width / 2, item.y + item.height / 2, 8, item.x + item.width / 2, item.y + item.height / 2, 110);
    glow.addColorStop(0, 'rgba(255, 140, 30, 0.35)');
    glow.addColorStop(1, 'rgba(255, 140, 30, 0)');
    context.fillStyle = glow;
    context.fillRect(item.x - 60, item.y - 60, item.width + 120, item.height + 120);
    context.fillStyle = '#55555f';
    rr(item.x, item.y, item.width, item.height, 8);
    context.fill();
    context.strokeStyle = PALETTE.fire[1];
    context.lineWidth = 3;
    rr(item.x, item.y, item.width, item.height, 8);
    context.stroke();
    context.fillStyle = PALETTE.ovenDoor;
    rr(item.x + 16, item.y + 14, item.width - 32, item.height - 26, 6);
    context.fill();
    const fire = context.createLinearGradient(0, item.y + item.height, 0, item.y + 14);
    fire.addColorStop(0, PALETTE.fire[3]);
    fire.addColorStop(0.5, PALETTE.fire[1]);
    fire.addColorStop(1, PALETTE.fire[0]);
    context.fillStyle = fire;
    context.beginPath();
    context.moveTo(item.x + 22, item.y + item.height - 14);
    context.lineTo(item.x + item.width / 2 - 8, item.y + 20 + flicker * 6);
    context.lineTo(item.x + item.width / 2 + 2, item.y + item.height - 22);
    context.lineTo(item.x + item.width / 2 + 10, item.y + 26 + flicker * 5);
    context.lineTo(item.x + item.width - 22, item.y + item.height - 14);
    context.closePath();
    context.fill();
    // Chimney with a curl of smoke.
    context.fillStyle = PALETTE.oven;
    context.fillRect(item.x + item.width - 26, item.y - 16, 14, 18);
    context.fillStyle = 'rgba(220, 220, 220, 0.4)';
    ellipse(item.x + item.width - 18, item.y - 26 - flicker * 6, 7, 5);
    // Wheels, so it reads as rolling in.
    context.fillStyle = '#14141a';
    ellipse(item.x + 18, item.y + item.height - 2, 9, 9);
    ellipse(item.x + item.width - 18, item.y + item.height - 2, 9, 9);
    // Warning triangle above the oven.
    context.fillStyle = PALETTE.fire[0];
    context.beginPath();
    context.moveTo(item.x + item.width / 2, item.y - 30);
    context.lineTo(item.x + item.width / 2 + 13, item.y - 8);
    context.lineTo(item.x + item.width / 2 - 13, item.y - 8);
    context.closePath();
    context.fill();
    text('!', item.x + item.width / 2, item.y - 10, 18, '#1a1a1a', 'center', 'bold');
  }

  /** The turkey: a fan of tail feathers, a plump body, a flapping wing, a blue-grey head
   * with a red wattle, and legs that run. It squashes when it lands and stretches in a jump. */
  function drawTurkey(player, elapsed) {
    const cx = player.x + player.width / 2;
    const feet = player.y + player.height;
    const running = player.onGround;
    const swing = running ? Math.sin(elapsed * 14) * 9 : 4;
    const stretch = 1 + Math.max(-0.12, Math.min(0.12, -player.vy / 6500));
    context.save();
    context.translate(cx, feet);
    context.scale(2 - stretch, stretch);
    context.translate(-cx, -feet);
    // Tail fan: five feathers fanning out behind.
    for (let feather = 0; feather < 5; feather += 1) {
      const angle = -0.9 + feather * 0.45;
      const length = 46 - Math.abs(feather - 2) * 7;
      context.save();
      context.translate(cx - 26, feet - 18);
      context.rotate(angle - Math.PI / 2 + 0.5);
      context.fillStyle = PALETTE.tail[feather];
      context.beginPath();
      context.ellipse(0, -length / 2, 9, length / 2, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.tailEye;
      context.beginPath();
      context.ellipse(0, -length + 12, 4, 6, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    // Body.
    context.fillStyle = PALETTE.player;
    ellipse(cx, feet - 16, 26, 15);
    context.fillStyle = PALETTE.playerDark;
    ellipse(cx - 4, feet - 12, 18, 9);
    // Wing, flapping as it runs.
    const flap = running ? Math.sin(elapsed * 14) * 0.35 : -0.2;
    context.save();
    context.translate(cx - 2, feet - 18);
    context.rotate(flap);
    context.fillStyle = PALETTE.playerDark;
    context.beginPath();
    context.ellipse(-6, 2, 15, 8, -0.3, 0, Math.PI * 2);
    context.fill();
    context.restore();
    // Legs.
    context.strokeStyle = '#e8a33c';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(cx - 8, feet - 6);
    context.lineTo(cx - 8 + swing, feet);
    context.moveTo(cx + 8, feet - 6);
    context.lineTo(cx + 8 - swing, feet);
    context.stroke();
    // Head, beak, wattle, eye.
    context.fillStyle = PALETTE.head;
    ellipse(cx + 22, feet - 38, 11, 12);
    context.fillStyle = PALETTE.beak;
    context.beginPath();
    context.moveTo(cx + 30, feet - 40);
    context.lineTo(cx + 42, feet - 36);
    context.lineTo(cx + 30, feet - 33);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.wattle;
    ellipse(cx + 28, feet - 28, 4, 7);
    context.fillStyle = '#ffffff';
    ellipse(cx + 25, feet - 42, 3, 3);
    context.fillStyle = '#1a1a1a';
    ellipse(cx + 26, feet - 42, 1.6, 1.6);
    context.restore();
  }

  /** Farmer Bram, chasing from the left: straw hat, red shirt, overalls, a net in hand.
   * His x comes from the gap: the smaller the gap, the closer he looms. */
  function drawFarmer(gap, elapsed) {
    const x = 150 - gap * 1.5;
    const feet = FIELD.groundY;
    const bob = Math.abs(Math.sin(elapsed * 9)) * 5;
    const y = feet - bob;
    // Legs.
    context.strokeStyle = PALETTE.farmerOveralls;
    context.lineWidth = 9;
    const swing = Math.sin(elapsed * 9) * 12;
    context.beginPath();
    context.moveTo(x, y - 44);
    context.lineTo(x - 8 + swing, y);
    context.moveTo(x + 10, y - 44);
    context.lineTo(x + 18 - swing, y);
    context.stroke();
    // Torso and overalls.
    context.fillStyle = PALETTE.farmerShirt;
    rr(x - 16, y - 92, 44, 52, 10);
    context.fill();
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(x - 12, y - 62, 36, 22);
    // Arm reaching out with a net when he is close.
    context.strokeStyle = PALETTE.farmerSkin;
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(x + 22, y - 80);
    context.lineTo(x + 48, y - 70 - (gap < 30 ? 14 : 0));
    context.stroke();
    context.strokeStyle = '#8a6d3b';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(x + 58, y - 76 - (gap < 30 ? 14 : 0), 14, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(x + 48, y - 86 - (gap < 30 ? 14 : 0));
    context.lineTo(x + 68, y - 66 - (gap < 30 ? 14 : 0));
    context.moveTo(x + 68, y - 86 - (gap < 30 ? 14 : 0));
    context.lineTo(x + 48, y - 66 - (gap < 30 ? 14 : 0));
    context.stroke();
    // Head and straw hat.
    context.fillStyle = PALETTE.farmerSkin;
    ellipse(x + 6, y - 104, 13, 14);
    context.fillStyle = PALETTE.farmerHat;
    ellipse(x + 6, y - 112, 22, 6);
    context.fillRect(x - 6, y - 126, 24, 12);
    // Angry eyes and moustache.
    context.fillStyle = '#1a1a1a';
    context.fillRect(x + 0, y - 108, 4, 2);
    context.fillRect(x + 10, y - 108, 4, 2);
    context.fillStyle = '#5d4030';
    context.fillRect(x + 2, y - 98, 12, 3);
    if (gap < 25) {
      text('!', x + 6, y - 140, 30, PALETTE.danger, 'center', 'bold');
    }
  }

  function drawParticles(particles, elapsed) {
    if (!particles) return;
    for (const part of particles.parts) {
      if (!part.active) continue;
      const alpha = Math.max(0, Math.min(1, part.life / part.maxLife));
      context.save();
      context.globalAlpha = part.kind === KIND_DUST ? alpha * 0.55 : alpha;
      context.fillStyle = part.color;
      if (part.kind === KIND_LEAF || part.kind === P_FEATHER || part.kind === KIND_CONFETTI) {
        context.translate(part.x, part.y);
        context.rotate(part.angle);
        context.fillRect(-part.size / 2, -part.size / 4, part.size, part.size / 2);
      } else if (part.kind === KIND_EMBER) {
        ellipse(part.x, part.y, part.size, part.size);
      } else {
        ellipse(part.x, part.y, part.size, part.size * 0.7);
      }
      context.restore();
    }
  }

  function drawField(state, elapsed, particles) {
    drawSky(elapsed);
    ridge(farRidge, PALETTE.hillFar);
    const mill = drawBarn();
    ridge(nearRidge, PALETTE.hillNear);
    drawWindmillBlades(mill.wx, mill.wy, elapsed);
    drawTrees();
    drawFence(state.distance);
    drawHayAndPumpkins(state.distance);
    drawGround(state.distance);

    const items = state.items;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      if (item.kind === KIND_CORN) drawCorn(item, elapsed);
      else if (item.kind === KIND_FEATHER) drawGoldenFeather(item, elapsed);
      else if (item.kind === KIND_OVEN) drawOven(item, elapsed);
      else drawKnife(item, elapsed);
    }

    drawFarmer(state.farmerGap, elapsed);
    const player = state.player;
    // Blink while invulnerable after a hit: hidden on every other tenth of a second.
    if (player.invulnerable === 0 || Math.floor(player.invulnerable * 10) % 2 === 1) drawTurkey(player, elapsed);
    drawParticles(particles, elapsed);
  }

  function heart(x, y, size, filled) {
    context.fillStyle = filled ? '#ff5d73' : 'rgba(255, 255, 255, 0.25)';
    context.beginPath();
    context.moveTo(x, y + size * 0.9);
    context.bezierCurveTo(x - size, y + size * 0.2, x - size * 0.6, y - size * 0.7, x, y - size * 0.1);
    context.bezierCurveTo(x + size * 0.6, y - size * 0.7, x + size, y + size * 0.2, x, y + size * 0.9);
    context.closePath();
    context.fill();
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    // Pills behind the HUD text so it stays readable over the sky.
    context.fillStyle = 'rgba(20, 12, 26, 0.55)';
    rr(16, 12, 220, 44, 12);
    context.fill();
    rr(FIELD.width / 2 - 170, 12, 340, 44, 12);
    context.fill();
    rr(FIELD.width - 236, 12, 220, 44, 12);
    context.fill();
    text(scoreLabel(state.score), 30, 20, 26, PALETTE.text, 'left', 'bold');
    const metres = Math.floor(state.distance);
    text(distanceLabel(metres) + ' m', FIELD.width / 2 - 160, 20, 26, PALETTE.text, 'left', 'bold');
    // Progress to the escape, under the distance number.
    context.fillStyle = 'rgba(255, 255, 255, 0.25)';
    rr(FIELD.width / 2 + 30, 26, 120, 12, 6);
    context.fill();
    context.fillStyle = PALETTE.safe;
    rr(FIELD.width / 2 + 30, 26, 120 * Math.min(1, state.distance / ESCAPE_DISTANCE), 12, 6);
    context.fill();
    text(levelLabel(state.level), FIELD.width / 2 + 160, 20, 26, PALETTE.text, 'left', 'bold');
    const firstHeart = FIELD.width - 24 - LIVES * (LIFE_SIZE + LIFE_GAP) + LIFE_GAP;
    for (let life = 0; life < LIVES; life += 1) heart(firstHeart + life * (LIFE_SIZE + LIFE_GAP) + 8, 34, 9, life < state.lives);
    // Farmer proximity bar, under the score pill: the fuller and redder, the closer he is.
    const danger = state.farmerGap < 25;
    const flash = danger && Math.floor(state.elapsed * 4) % 2 === 0;
    context.fillStyle = 'rgba(20, 12, 26, 0.55)';
    rr(16, 64, 220, 34, 10);
    context.fill();
    text('FARMER', 28, 72, 16, flash ? PALETTE.danger : PALETTE.muted, 'left', 'bold');
    context.fillStyle = 'rgba(255, 255, 255, 0.25)';
    rr(96, 72, 126, 14, 7);
    context.fill();
    context.fillStyle = state.farmerGap > 50 ? PALETTE.safe : state.farmerGap > 25 ? PALETTE.featherGold : PALETTE.danger;
    rr(96, 72, 126 * (state.farmerGap / 100), 14, 7);
    context.fill();
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    rr(x, y, PANEL.width, height, 18);
    context.fill();
    context.strokeStyle = accent || PALETTE.panelEdge;
    context.lineWidth = 3;
    rr(x, y, PANEL.width, height, 18);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 52, accent || PALETTE.text, 'center', 'bold');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.corn, 'center', 'bold');
  }

  const TITLE_LINES = [
    'A turkey\'s great escape from Thanksgiving dinner.',
    'Dodge the carving knives. Jump the ovens. Catch the corn.',
    'Grab golden feathers to slow Farmer Bram down.',
    'Escape 1000 m and you are free!',
    'Move: ← → or A D  •  Jump: Space or W  •  Pause: P',
    '',
  ];
  const PAUSED_LINES = ['The knives will wait for you.'];
  const CAUGHT_LINES = ['', '', ''];
  const ESCAPED_LINES = ['', '', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, particles) {
    const elapsed = state.elapsed;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state, elapsed, particles);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = bestLabel(best);
      drawPanel('GOBBLE DASH', TITLE_LINES, 'Press Space or click to start');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      if (state.escaped) {
        ESCAPED_LINES[0] = finalLabel(state.score);
        ESCAPED_LINES[1] = `You outran Farmer Bram — ${Math.floor(state.distance)} m to freedom!`;
        ESCAPED_LINES[2] = bestLabel(best);
        drawPanel('ESCAPED!', ESCAPED_LINES, 'Press Space or click to run again', PALETTE.safe);
      } else {
        CAUGHT_LINES[0] = finalLabel(state.score);
        CAUGHT_LINES[1] = `Caught after ${Math.floor(state.distance)} m. The oven was ready.`;
        CAUGHT_LINES[2] = bestLabel(best);
        drawPanel('CAUGHT FOR DINNER!', CAUGHT_LINES, 'Press Space or click to play again', PALETTE.danger);
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
