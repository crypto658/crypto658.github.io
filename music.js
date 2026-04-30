// Stack Fusion - Procedural Music System
// 4 tracks: menu, gameplay, levelup, gameover
// Uses Web Audio API oscillators only — no external files

class GameMusic {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.currentTrack = null;
    this.playing = false;
    this.volume = 0.4;
    this.nodes = [];
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);
  }

  stop() {
    this.playing = false;
    for (const n of this.nodes) {
      try { n.stop(); } catch (e) {}
      try { n.disconnect(); } catch (e) {}
    }
    this.nodes = [];
    this.currentTrack = null;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  // Create a looping sequence of notes
  seq(notes, bpm = 120, loop = true) {
    this.init();
    this.stop();
    this.playing = true;
    const beat = 60 / bpm;
    const notes2d = Array.isArray(notes[0]) ? notes : [notes];

    for (let r = 0; loop; r++) {
      for (let ri = 0; ri < notes2d.length; ri++) {
        if (!this.playing) return;
        const row = notes2d[ri];
        const startTime = this.ctx.currentTime + (r * notes2d.length + ri) * beat;
        for (const note of row) {
          if (!this.playing) return;
          const [freq, dur, type = 'sine', vol = 0.5, attack = 0.01, decay = 0.1] = note;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = type;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(vol * 0.3, startTime + attack);
          gain.gain.linearRampToValueAtTime(vol * 0.15, startTime + attack + decay);
          gain.gain.linearRampToValueAtTime(0, startTime + dur);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(startTime);
          osc.stop(startTime + dur + 0.05);
          this.nodes.push(osc);
        }
      }
    }
  }

  // Simple minor pentatonic scale helper
  note(base, semitones) {
    return base * Math.pow(2, semitones / 12);
  }

  A4 = 440;
  // Menu track - calm, dreamy
  playMenu() {
    const n = (s) => this.note(this.A4, s);
    const mel = [
      [n(-21), 2, 'sine', 0.4],
      [n(-18), 2, 'sine', 0.35],
      [n(-13), 2, 'sine', 0.3],
      [n(-9), 2, 'sine', 0.35],
    ];
    const bass = [
      [n(-33), 2, 'triangle', 0.2],
      [n(-33), 2, 'triangle', 0.18],
      [n(-33), 2, 'triangle', 0.15],
      [n(-33), 2, 'triangle', 0.18],
    ];
    const pat = mel.map((m, i) => [m, bass[i]]);
    this.seq(pat, 90, true);
  }

  // Gameplay - upbeat, driving
  playGame() {
    const n = (s) => this.note(this.A4, s);
    // Bass line
    const b1 = [n(-24), 0.5, 'triangle', 0.25];
    const b2 = [n(-21), 0.5, 'triangle', 0.22];
    // Melody
    const m1 = [n(-1), 0.5, 'sine', 0.3, 0.01, 0.15];
    const m2 = [n(2), 0.5, 'sine', 0.28, 0.01, 0.15];
    const m3 = [n(4), 0.5, 'sine', 0.25, 0.01, 0.15];
    // Percussion-like accent
    const acc = [n(-100), 0.15, 'square', 0.12, 0.005, 0.05];
    // Pattern: beat 1 = bass+melody, beat 2 = bass+accent, beat 3 = bass+melody, beat 4 = bass
    const bar = [
      [b1, m1],
      [b2, acc],
      [b1, m2],
      [b2, m3],
    ];
    this.seq(bar, 140, true);
  }

  // Level up - triumphant
  playLevelUp() {
    const n = (s) => this.note(this.A4, s);
    const t = (s, d, v = 0.4) => [n(s), d, 'sine', v, 0.01, 0.3];
    const fanfare = [
      [t(0, 0.25), t(4, 0.25), t(7, 0.5, 0.5)],
      [t(0, 0.25), t(4, 0.25), t(9, 0.75, 0.5)],
      [t(-2, 0.25), t(2, 0.25), t(5, 0.5, 0.4)],
      [n(0), 1.0, 'sine', 0.6, 0.01, 0.5],
    ];
    this.seq(fanfare, 130, false);
  }

  // Game over - short, bittersweet
  playGameOver() {
    const n = (s) => this.note(this.A4, s);
    const t = (s, d, v = 0.35) => [n(s), d, 'sine', v, 0.02, 0.4];
    const sad = [
      [t(-9, 0.5), t(-13, 0.5, 0.3)],
      [t(-11, 0.5), t(-13, 0.5, 0.28)],
      [t(-13, 1.0, 0.25)],
    ];
    this.seq(sad, 80, false);
  }
}

const gameMusic = new GameMusic();