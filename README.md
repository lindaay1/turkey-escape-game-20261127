# Gobble Dash — A Turkey's Great Escape

A turkey escape game for make.fun's `turkey-run-game-01` bounty: one turkey, one
farmer, one Thanksgiving dinner to escape from.

**The game.** You are a turkey running across a farmyard at sunset. Farmer Bram is
chasing you from behind — every carving knife that hits you, and every oven you fail
to jump, lets him close in. Catch corn and golden feathers to push him back. Cover
**1000 m** and you escape; lose all three lives, or let the farmer catch you, and you
are dinner.

- Steer with `←` `→` or `A` `D`; jump with `Space`, `↑` or `W`; pause with `P`.
  Mouse and touch work too: hold the left or right third of the screen to steer,
  tap the middle to jump.
- Falling carving knives (dodge them), ovens rolling in along the ground (jump
  them), corn cobs (10 points, farmer +3), golden feathers (50 points, farmer +15).
- Levels speed everything up every 12 seconds. The HUD shows score, distance with a
  progress bar to 1000 m, level, three lives, and a Farmer bar that fills red as he
  closes in.
- Title screen, pause screen, a "Caught for dinner" screen and an "Escaped!" screen
  with confetti, all with restart. Sounds are synthesised with WebAudio — no audio
  files, no network requests, no libraries. Every picture is drawn in canvas code.

**Play it.** `node serve.ts`, then open http://localhost:8080.

**Screenshots.** `?shot=start|play|chase|end` (with `&seed=N`) stages that scene from
the real rules with an autopilot, so the four screenshots in `screenshots/` are real
renders of this code, deterministic for a seed. See `shots.json` for the exact queries.

**Hand in.** `main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the kit's `vendor/makefun-game.ts` library.

MIT licensed.
