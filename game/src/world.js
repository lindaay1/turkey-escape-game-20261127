// The game's rules and state, with no drawing and no browser in it: the player's turkey
// (it runs, steers left and right, and jumps), the farmer closing in behind it, the pool of
// falling knives and corn, golden feathers, and ovens rolling in along the ground that must
// be jumped over. Distance is the goal: cover ESCAPE_DISTANCE metres and the turkey escapes;
// let the farmer's gap reach zero, or lose all three lives, and it is caught for dinner.
// step() advances one fixed step and returns what happened as bit flags, so the caller can
// react without the world knowing about screens or sound. Nothing here allocates after
// createWorld returns.
import { CORN, ESCAPE_DISTANCE, FARMER, FEATHER, FIELD, KNIFE, LEVEL, LIVES, OVEN, PLAYER, POOL_SIZE, RUN_SPEED } from './config.js';

export const KIND_KNIFE = 0;
export const KIND_CORN = 1;
export const KIND_OVEN = 2;
export const KIND_FEATHER = 3;

export const EVENT_HIT = 1;
export const EVENT_CORN = 2;
export const EVENT_OVER = 4;
export const EVENT_FEATHER = 8;
export const EVENT_ESCAPED = 16;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const groundTop = FIELD.groundY - PLAYER.height;
  const player = { x: 0, y: groundTop, vy: 0, onGround: true, width: PLAYER.width, height: PLAYER.height, invulnerable: 0 };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_KNIFE, x: 0, y: 0, width: 0, height: 0, speed: 0 });
  }
  const state = {
    player, items, score: 0, lives: LIVES, level: 1, elapsed: 0,
    distance: 0, farmerGap: FARMER.startGap, escaped: false,
    knifeTimer: 0, cornTimer: 0, featherTimer: 0, ovenTimer: 0,
  };

  function reset() {
    player.x = (FIELD.width - player.width) / 2;
    player.y = groundTop;
    player.vy = 0;
    player.onGround = true;
    player.invulnerable = 0;
    for (const item of items) item.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.distance = 0;
    state.farmerGap = FARMER.startGap;
    state.escaped = false;
    state.knifeTimer = KNIFE.interval;
    state.cornTimer = CORN.interval;
    state.featherTimer = FEATHER.interval;
    state.ovenTimer = OVEN.interval;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function fallSpeed(base, perLevel) {
    return base + perLevel * (state.level - 1);
  }

  function spawnKnife() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_KNIFE;
    item.width = KNIFE.minWidth + random() * (KNIFE.maxWidth - KNIFE.minWidth);
    item.height = KNIFE.height;
    item.x = random() * (FIELD.width - item.width);
    item.y = -item.height;
    item.speed = fallSpeed(KNIFE.speed, KNIFE.speedPerLevel) + random() * KNIFE.speedJitter;
  }

  function spawnCorn() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_CORN;
    item.width = CORN.size;
    item.height = CORN.size;
    item.x = random() * (FIELD.width - item.width);
    item.y = -item.height;
    item.speed = fallSpeed(CORN.speed, CORN.speedPerLevel);
  }

  function spawnFeather() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_FEATHER;
    item.width = FEATHER.size;
    item.height = FEATHER.size;
    item.x = random() * (FIELD.width - item.width);
    item.y = -item.height;
    item.speed = FEATHER.speed;
  }

  function spawnOven() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_OVEN;
    item.width = OVEN.width;
    item.height = OVEN.height;
    item.x = FIELD.width + 24;
    item.y = FIELD.groundY - OVEN.height;
    item.speed = OVEN.speed + OVEN.speedPerLevel * (state.level - 1);
  }

  function knifeInterval() {
    return Math.max(KNIFE.minInterval, KNIFE.interval * KNIFE.intervalScale ** (state.level - 1));
  }

  function takeHit(events) {
    state.lives -= 1;
    state.farmerGap = Math.max(0, state.farmerGap - OVEN.hitCost);
    player.invulnerable = PLAYER.invulnerable;
    events |= EVENT_HIT;
    if (state.lives === 0 || state.farmerGap === 0) events |= EVENT_OVER;
    return events;
  }

  /**
   * One fixed step. `direction` is -1, 0 or 1 (left, still, right); `jump` starts a hop
   * when the turkey is on the ground. With `harmless` set (the title screen's backdrop)
   * things fall and roll but nothing touches the player and nothing scores.
   */
  function step(dt, direction, jump, harmless) {
    let events = 0;
    state.elapsed += dt;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));

    player.x = Math.min(FIELD.width - player.width, Math.max(0, player.x + direction * PLAYER.speed * dt));
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);

    if (jump && player.onGround) {
      player.vy = -PLAYER.jumpSpeed;
      player.onGround = false;
    }
    if (!player.onGround) {
      player.vy += PLAYER.gravity * dt;
      player.y += player.vy * dt;
      if (player.y >= groundTop) {
        player.y = groundTop;
        player.vy = 0;
        player.onGround = true;
      }
    }

    if (!harmless) {
      state.distance += RUN_SPEED * (1 + 0.05 * (state.level - 1)) * dt;
      state.farmerGap = Math.max(0, state.farmerGap - 0.3 * dt);
      if (state.farmerGap === 0) return EVENT_OVER;
      if (state.distance >= ESCAPE_DISTANCE) {
        state.escaped = true;
        return EVENT_ESCAPED;
      }
    }

    state.knifeTimer -= dt;
    if (state.knifeTimer <= 0) {
      spawnKnife();
      state.knifeTimer += knifeInterval();
    }
    state.cornTimer -= dt;
    if (state.cornTimer <= 0) {
      spawnCorn();
      state.cornTimer += CORN.interval + random() * CORN.intervalJitter;
    }
    state.featherTimer -= dt;
    if (state.featherTimer <= 0) {
      spawnFeather();
      state.featherTimer += FEATHER.interval + random() * FEATHER.intervalJitter;
    }
    state.ovenTimer -= dt;
    if (state.ovenTimer <= 0) {
      spawnOven();
      state.ovenTimer += OVEN.interval + random() * OVEN.intervalJitter;
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      if (item.kind === KIND_OVEN) {
        item.x -= item.speed * dt;
        if (item.x + item.width < 0) item.active = false;
      } else {
        item.y += item.speed * dt;
        if (item.y > FIELD.groundY) {
          item.active = false;
          if (item.kind === KIND_KNIFE && !harmless) state.score += KNIFE.dodgePoints;
          continue;
        }
      }
      if (harmless || !overlaps(item, player)) continue;
      if (item.kind === KIND_CORN) {
        item.active = false;
        state.score += CORN.points;
        state.farmerGap = Math.min(FARMER.maxGap, state.farmerGap + CORN.farmerPush);
        events |= EVENT_CORN;
      } else if (item.kind === KIND_FEATHER) {
        item.active = false;
        state.score += FEATHER.points;
        state.farmerGap = Math.min(FARMER.maxGap, state.farmerGap + FEATHER.farmerPush);
        events |= EVENT_FEATHER;
      } else if (player.invulnerable === 0) {
        item.active = false;
        events = takeHit(events);
        if (events & EVENT_OVER) break;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
