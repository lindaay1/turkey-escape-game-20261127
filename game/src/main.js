// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), particles drift with it, and the
// renderer paints what is there. The game moves between five screens: title, play, paused,
// game over (caught) and escaped. Sounds are synthesised; nothing is fetched.
//
// ?seed=N fixes the falling pattern. ?shot=start|play|chase|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CORN, EVENT_ESCAPED, EVENT_FEATHER, EVENT_HIT, EVENT_OVER, KIND_OVEN } from './world.js';
import { ACTION_CONFIRM, ACTION_JUMP, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createParticles } from './particles.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const world = createWorld(random);
const particles = createParticles(createRandom(seed + 1));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world, particles);
  // Let the leaves drift in before the paint.
  for (let index = 0; index < 150; index += 1) particles.update(STEP, world.state.elapsed);
  // Confetti for the escaped end screen is burst last, so it is still in the air
  // when the frame is painted (a burst from staging would have faded by now).
  if (scene.screen === SCREEN_OVER && world.state.escaped) {
    particles.burstConfetti(320, 200);
    particles.burstConfetti(960, 180);
    particles.burstConfetti(640, 120);
    for (let index = 0; index < 12; index += 1) particles.update(STEP, world.state.elapsed);
  }
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, particles);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      document.title = 'shot-ready';
    }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let dustTimer = 0;
  let emberTimer = 0;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives. Escape 1000 metres.`);
  }

  function endGame(escaped) {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (escaped) {
      audio.win();
      particles.burstConfetti(320, 200);
      particles.burstConfetti(960, 180);
      announce(`Escaped! Score ${world.state.score}. Best ${best}.`);
    } else {
      audio.lose();
      announce(`Caught for dinner. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    return actions;
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, 0, false, true);
      return;
    }
    const jump = Boolean(actions & ACTION_JUMP) && world.state.player.onGround;
    if (jump) audio.jump();
    const events = world.step(STEP, input.direction(), jump, false);
    if (events & EVENT_CORN) audio.corn();
    if (events & EVENT_FEATHER) audio.feather();
    if (events & EVENT_HIT) {
      audio.hit();
      audio.gobble();
      particles.burstFeathers(world.state.player.x + 40, world.state.player.y + 10);
      announce(world.state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.state.lives} lives left.`);
    }
    if (events & EVENT_ESCAPED) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      accumulator += dt;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    // Ambient particles: dust at the turkey's feet while it runs, embers over ovens.
    if (screen === SCREEN_PLAY) {
      dustTimer -= dt;
      if (dustTimer <= 0 && world.state.player.onGround) {
        particles.puffDust(world.state.player.x + 10, world.state.player.y + 28);
        dustTimer = 0.18;
      }
      emberTimer -= dt;
      if (emberTimer <= 0) {
        for (const item of world.state.items) {
          if (item.active && item.kind === KIND_OVEN) particles.burstEmber(item.x + 48, item.y + 10);
        }
        emberTimer = 0.12;
      }
    }
    particles.update(dt, world.state.elapsed);
    renderer.draw(world.state, screen, best, particles);
  }

  // Leaving the tab pauses a running game rather than letting knives fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Gobble Dash. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
