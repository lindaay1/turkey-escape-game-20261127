// Sound only: every effect is synthesised with WebAudio oscillators and filtered noise,
// so the game ships no audio files and makes no network request. The context is created
// on the first user gesture; in a staged screenshot nothing plays.

export function createAudio() {
  let context = null;
  let enabled = true;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(frequency, duration, type, volume, when, slideTo) {
    const audio = ensure();
    if (audio === null || !enabled) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime + when);
    if (slideTo !== undefined) oscillator.frequency.exponentialRampToValueAtTime(slideTo, audio.currentTime + when + duration);
    gain.gain.setValueAtTime(0.0001, audio.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(volume, audio.currentTime + when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + when + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(audio.currentTime + when);
    oscillator.stop(audio.currentTime + when + duration + 0.05);
  }

  function noise(duration, volume, when, lowpass) {
    const audio = ensure();
    if (audio === null || !enabled) return;
    const length = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(volume, audio.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + when + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    source.start(audio.currentTime + when);
  }

  return {
    /** Call from a user gesture so the browser lets sound start. */
    unlock() {
      ensure();
    },
    gobble() {
      // Three quick low clucks, the turkey's own voice.
      tone(300, 0.09, 'square', 0.08, 0, 210);
      tone(260, 0.09, 'square', 0.08, 0.1, 190);
      tone(320, 0.12, 'square', 0.09, 0.2, 230);
    },
    corn() {
      tone(880, 0.1, 'sine', 0.12, 0, 1318);
      tone(1318, 0.14, 'sine', 0.1, 0.07, 1760);
    },
    feather() {
      tone(660, 0.12, 'triangle', 0.12, 0, 990);
      tone(990, 0.12, 'triangle', 0.12, 0.09, 1320);
      tone(1320, 0.18, 'triangle', 0.12, 0.18, 1760);
    },
    hit() {
      noise(0.18, 0.25, 0, 900);
      tone(140, 0.2, 'sawtooth', 0.14, 0, 70);
    },
    jump() {
      noise(0.16, 0.1, 0, 2400);
      tone(300, 0.14, 'sine', 0.06, 0, 620);
    },
    land() {
      noise(0.07, 0.08, 0, 500);
    },
    win() {
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((note, index) => tone(note, 0.22, 'triangle', 0.12, index * 0.11));
    },
    lose() {
      const notes = [392, 330, 262, 196];
      notes.forEach((note, index) => tone(note, 0.3, 'sawtooth', 0.07, index * 0.16));
    },
    toggle() {
      enabled = !enabled;
      return enabled;
    },
  };
}
