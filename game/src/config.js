// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.
// The turkey runs across a farmyard at sunset, chased by the farmer: distance is the goal
// (escape at ESCAPE_DISTANCE metres), knives cost lives and let the farmer close in, corn
// and golden feathers push him back, and ovens must be jumped over.

export const FIELD = { width: 1280, height: 720, groundY: 620, horizonY: 430 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Metres of escape the turkey must cover to win. */
export const ESCAPE_DISTANCE = 1000;

export const PLAYER = {
  width: 84,
  height: 30,
  speed: 640,
  invulnerable: 2.5,
  /** Jump take-off speed and gravity: the hop clears a 64 px oven with room to spare. */
  jumpSpeed: 860,
  gravity: 2400,
};

export const LIVES = 3;

export const KNIFE = {
  minWidth: 36,
  maxWidth: 88,
  height: 38,
  speed: 220,
  speedPerLevel: 16,
  speedJitter: 95,
  interval: 1.0,
  intervalScale: 0.94,
  minInterval: 0.4,
  dodgePoints: 1,
};

export const CORN = {
  size: 26,
  speed: 195,
  speedPerLevel: 15,
  interval: 1.3,
  intervalJitter: 0.8,
  points: 10,
  /** Corn eaten pushes the farmer this far back, in gap points. */
  farmerPush: 3,
};

export const FEATHER = {
  size: 30,
  speed: 170,
  interval: 9,
  intervalJitter: 5,
  points: 50,
  farmerPush: 15,
};

export const OVEN = {
  width: 88,
  height: 64,
  speed: 190,
  speedPerLevel: 12,
  interval: 7,
  intervalJitter: 2,
  /** How close the farmer gets when a knife hits, in gap points. */
  hitCost: 20,
};

/** The farmer's gap starts here (0..100); at 0 he catches the turkey. */
export const FARMER = { startGap: 70, maxGap: 100 };

/** Seconds of play per level, and the last level: speeds and spawn rates stop growing there. */
export const LEVEL = { seconds: 18, max: 10 };

/** How many falling things can exist at once; the pool is allocated once, at boot. */
export const POOL_SIZE = 96;

/** Metres covered per second of running, before the level bonus. */
export const RUN_SPEED = 11;

export const PALETTE = {
  backdrop: '#241428',
  // Sunset sky, top to horizon.
  skyTop: '#3a1c5c',
  skyMid: '#a03d6e',
  skyLow: '#ff7a45',
  sunCore: '#ffd97a',
  sunGlow: '#ff9e4f',
  hillFar: '#5a2d5e',
  hillNear: '#41204a',
  barn: '#33183a',
  barnRoof: '#241028',
  treeTrunk: '#2e1a24',
  treeFoliage: ['#e06428', '#f08c1e', '#c94f1e', '#e8a33c'],
  fence: '#4a2c33',
  hay: '#d9a441',
  hayDark: '#b57f2e',
  pumpkin: '#e56b1f',
  ground: '#6b4423',
  groundDark: '#54341a',
  dirt: '#8a5a30',
  grass: '#7a8c2e',
  leaf: ['#e06428', '#f08c1e', '#e8a33c', '#c94f1e'],
  player: '#8a5230',
  playerDark: '#6b3d22',
  tail: ['#a0522d', '#c96a1e', '#e8a33c', '#d2691e', '#b3541e'],
  tailEye: '#2e5d4b',
  head: '#7fa3c9',
  headDark: '#5d84ad',
  wattle: '#e5534b',
  beak: '#f2c94c',
  knife: '#dfe4ea',
  knifeEdge: '#ffffff',
  handle: '#7a4a26',
  corn: '#f2c94c',
  cornDark: '#d9a41f',
  husk: '#5d8a2e',
  featherGold: '#ffd94d',
  oven: '#2c2c34',
  ovenDoor: '#1a1a20',
  fire: ['#ffd23e', '#ff8c1e', '#ff4d1e', '#ff2e1e'],
  farmerShirt: '#c94f38',
  farmerOveralls: '#3d5a80',
  farmerSkin: '#e8b48c',
  farmerHat: '#d9b45b',
  panel: '#241a2e',
  panelEdge: '#ff9e4f',
  text: '#fff3e0',
  muted: '#d9b8a3',
  danger: '#ff4d4d',
  safe: '#7ed957',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-dash.best';
