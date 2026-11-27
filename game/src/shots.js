// The screenshot scenes behind ?shot=start|play|chase|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot
// (look ahead each way the turkey could move, keep clear of knives, chase the lowest corn
// when that is safe, and jump and sidestep an oven rolling in), so the frame is what a
// short game really looks like and the same seed always gives the same frame.
import { FIELD, PLAYER, STEP } from './config.js';
import { EVENT_ESCAPED, EVENT_OVER, KIND_KNIFE, KIND_OVEN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 24;
const CHASE_SECONDS = 40;
const END_LIMIT_SECONDS = 175;
/**
 * How far ahead, in seconds, the autopilot checks each way it could move: the play scene's
 * pilot looks well ahead and keeps all its lives; the chase scene's looks only a moment
 * ahead and never jumps, so the farmer catches up, as a hurried player is.
 */
const HORIZON_PLAY = 1.5;
const HORIZON_END = 2.0;
const HORIZON_CHASE = 0.25;
const SAMPLE = 1 / 30;
const DIRECTIONS = [0, -1, 1];
/** Extra room, each side, it keeps between the turkey and a knife. */
const MARGIN = 10;

/** Seconds until moving in `direction` (-1, 0, 1) runs the turkey into a knife; Infinity when it never does. */
function timeToHit(state, direction, horizon) {
  const player = state.player;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = Math.min(FIELD.width - player.width, Math.max(0, player.x + direction * PLAYER.speed * t));
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active || item.kind !== KIND_KNIFE) continue;
      const y = item.y + item.speed * t;
      if (y + item.height > player.y && y < player.y + player.height && item.x < x + player.width + MARGIN && item.x + item.width > x - MARGIN) return t;
    }
  }
  return Infinity;
}

/** Seconds until a jump in `direction` runs the turkey into a falling knife, following the
 * jump arc (up 154 px and back down in 0.72 s); Infinity when the arc is clear. */
function jumpHitTime(state, direction) {
  const player = state.player;
  const groundTop = FIELD.groundY - PLAYER.height;
  for (let t = SAMPLE; t <= 0.75; t += SAMPLE) {
    const x = Math.min(FIELD.width - player.width, Math.max(0, player.x + direction * PLAYER.speed * t));
    const rise = Math.max(0, PLAYER.jumpSpeed * t - 0.5 * PLAYER.gravity * t * t);
    const y = groundTop - rise;
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active || item.kind !== KIND_KNIFE) continue;
      const iy = item.y + item.speed * t;
      if (iy + item.height > y && iy < y + player.height && item.x < x + player.width + MARGIN && item.x + item.width > x - MARGIN) return t;
    }
  }
  return Infinity;
}
/** The oven rolling toward the turkey that will reach it first — the nearest one ahead,
 * not merely the leftmost, so a spent oven just behind never hides a fresh one coming in. */
function ovenThreat(state) {
  const player = state.player;
  let threat = null;
  let nearest = Infinity;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (!item.active || item.kind !== KIND_OVEN) continue;
    // Ahead of the turkey's front, within 260 px, and not already fully past it (its
    // right edge still left of the turkey's left edge). An oven the turkey is crossing
    // over still overlaps the turkey until its right edge clears the turkey's left.
    if (item.x + item.width < player.x - 10 || item.x > player.x + player.width + 260) continue;
    const ahead = item.x - player.x;
    if (ahead < nearest) {
      nearest = ahead;
      threat = item;
    }
  }
  return threat;
}

/** Of the safe ways to move, the one toward the lowest corn (or the centre); else the one that is hit last.
 * An oven rolling in overrides everything: jump and cross it at once, because it reaches
 * the turkey in a fraction of a second while a knife is still a fall away. Exported so the
 * staging can be probed from a test harness. */
export function autopilot(state, horizon, reckless, survival) {
  const player = state.player;
  const oven = ovenThreat(state);
  if (oven !== null && !reckless) {
    const gapX = oven.x - (player.x + player.width);
    const overlap = oven.x < player.x + player.width + 10 && oven.x + oven.width > player.x - 10;
    if (overlap || (gapX > 0 && gapX < 220)) {
      // Cross the oven while airborne: moving toward it makes the crossing quick
      // (the oven only needs to clear the turkey's width at the combined speed).
      // Pinned at the right edge, outrun it to the left instead. Alongside one,
      // step away from its centre.
      let cross;
      if (oven.x >= player.x) {
        cross = player.x > FIELD.width - 220 ? -1 : 1;
      } else {
        cross = (player.x + player.width / 2) < (oven.x + oven.width / 2) ? -1 : 1;
      }
      // A jump into a falling knife is worse than waiting: check the jump arc both
      // ways, and step away from the oven to let the knife pass when both arcs are mined.
      // Once airborne for the crossing, stay the course: re-checking the arc mid-flight
      // only makes the turkey zig-zag and waste its airtime.
      if (!player.onGround) return { direction: cross, jump: false };
      if (jumpHitTime(state, cross) > 0.45) return { direction: cross, jump: true };
      if (jumpHitTime(state, -cross) > 0.45) return { direction: -cross, jump: true };
      return { direction: -cross, jump: false };
    }
  }
  let corn = null;
  if (!reckless && !survival) {
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (item.active && item.kind !== KIND_KNIFE && item.kind !== KIND_OVEN && (corn === null || item.y > corn.y)) corn = item;
    }
  }
  const target = corn === null ? FIELD.width / 2 : corn.x + corn.width / 2;
  const centre = player.x + player.width / 2;
  const wanted = target > centre + 8 ? 1 : target < centre - 8 ? -1 : 0;
  // Score each way by how long the turkey survives moving that way, and take the
  // longest; on a tie, keep the way toward the corn. A longer horizon plans past the
  // next knife instead of merely out of its way for a second.
  let best = wanted;
  let bestTime = -1;
  for (const direction of [wanted, ...DIRECTIONS.filter((d) => d !== wanted)]) {
    const time = timeToHit(state, direction, horizon);
    if (time > bestTime) {
      bestTime = time;
      best = direction;
    }
  }
  return { direction: best, jump: false };
}

/**
 * Set `world` to the named scene (start, play, chase or end; any other name is start) and
 * return the screen to draw over it and the best score to show. `particles` is filled with
 * confetti for the escaped end screen.
 */
export function stageShot(name, world, particles) {
  world.reset();
  if (name !== 'play' && name !== 'chase' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, false, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
      const move = autopilot(world.state, HORIZON_PLAY, false);
      if (world.step(STEP, move.direction, move.jump, false) & EVENT_OVER) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'chase') {
    // Stop while the turkey is still alive but the farmer is right behind it: the gap
    // nearly closed, or one heart left with the gap half gone — the chase at its most
    // dramatic. The reckless pilot ignores corn, so the gap falls instead of recovering.
    for (let index = 0; index < CHASE_SECONDS / STEP; index += 1) {
      const move = autopilot(world.state, HORIZON_CHASE, true);
      const events = world.step(STEP, move.direction, false, false);
      if ((events & EVENT_OVER) || world.state.farmerGap <= 22 || (world.state.lives <= 1 && world.state.farmerGap <= 45)) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // end: play well until the turkey escapes. The end pilot plays for survival (no
  // corn chasing, just staying alive and crossing ovens) — a cautious player. Up to
  // five attempts; if it is caught every time, stage a clean escape from the furthest
  // genuinely-played run, keeping its earned score.
  let escaped = false;
  let bestAttempt = null;
  for (let attempt = 0; attempt < 5 && !escaped; attempt += 1) {
    world.reset();
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      const move = autopilot(world.state, HORIZON_END, false, true);
      const events = world.step(STEP, move.direction, move.jump, false);
      if (events & EVENT_ESCAPED) {
        escaped = true;
        break;
      }
      if (events & EVENT_OVER) break;
    }
    if (bestAttempt === null || world.state.distance > bestAttempt.distance) {
      bestAttempt = { distance: world.state.distance, score: world.state.score };
    }
  }
  if (!escaped) {
    world.state.score = bestAttempt.score;
    world.state.lives = 3;
    world.state.farmerGap = 80;
    world.state.distance = 999.9;
    world.step(STEP, 0, false, false);
  }
  if (particles) {
    particles.burstConfetti(320, 200);
    particles.burstConfetti(960, 180);
    particles.burstConfetti(640, 120);
  }
  return { screen: SCREEN_OVER, best: world.state.score };
}
