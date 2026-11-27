// Keyboard and pointer input. Held keys give a steering direction; one-shot presses (start
// or restart, pause, jump) are queued as bit flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice. Pointer: hold the left or right
// third of the screen to steer, tap the middle to jump, tap anywhere to confirm a panel.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_JUMP = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let left = false;
  let right = false;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (JUMP.has(event.code)) {
      if (!event.repeat) actions |= ACTION_JUMP;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
  });

  function pointerZone(event) {
    const rect = target.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    if (x < 0.33) return 'left';
    if (x > 0.67) return 'right';
    return 'middle';
  }

  target.addEventListener('pointerdown', (event) => {
    const zone = pointerZone(event);
    if (zone === 'left') left = true;
    else if (zone === 'right') right = true;
    else actions |= ACTION_JUMP;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointerup', () => {
    left = false;
    right = false;
  });
  target.addEventListener('pointercancel', () => {
    left = false;
    right = false;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
