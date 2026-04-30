// Stack Fusion - Procedural Music V2
// Simple, reliable oscillator music using setInterval scheduling

(function() {
  var ctx = null;
  var masterGain = null;
  var volume = 0.35;
  var isPlaying = false;
  var currentTimeout = null;
  var activeNodes = [];

  function note(base, semitones) {
    return base * Math.pow(2, semitones / 12);
  }

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(ctx.destination);
    } catch (e) {
      console.log('AudioContext failed:', e);
      ctx = null;
    }
  }

  function stop() {
    isPlaying = false;
    if (currentTimeout) {
      clearTimeout(currentTimeout);
      currentTimeout = null;
    }
    for (var i = 0; i < activeNodes.length; i++) {
      try { activeNodes[i].stop(); } catch (e) {}
      try { activeNodes[i].disconnect(); } catch (e) {}
    }
    activeNodes = [];
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = volume;
  }

  function sched(freq, startIn, duration, type, vol, attack, decay) {
    if (!ctx) return;
    try {
      var t = ctx.currentTime + startIn;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime((vol || 0.3) * 0.4, t + (attack || 0.01));
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + duration + 0.1);
      activeNodes.push(osc);
    } catch (e) {
      console.log('sched error:', e);
    }
  }

  // Schedule all notes from a pattern array
  function schedulePattern(pat, bpm, offset) {
    var beat = 60 / bpm;
    var t = offset || 0;
    for (var rowIdx = 0; rowIdx < pat.length; rowIdx++) {
      var row = pat[rowIdx];
      for (var nIdx = 0; nIdx < row.length; nIdx++) {
        var note2 = row[nIdx];
        var freq = note2[0], dur = note2[1], type = note2[2] || 'sine', vol = note2[3] || 0.3, attack = note2[4] || 0.01, decay = note2[5] || 0.15;
        sched(freq, t, dur, type, vol, attack, decay);
      }
      t += beat;
    }
    return t;
  }

  // Play a one-shot sequence then stop
  function playSeq(pat, bpm) {
    init();
    if (!ctx) return;
    stop();
    isPlaying = true;
    var totalDur = schedulePattern(pat, bpm || 120);
    currentTimeout = setTimeout(function() {
      if (!isPlaying) return;
      stop();
    }, totalDur * 1000 + 300);
  }

  // Menu loop - calm, dreamy
  function playMenu() {
    init();
    if (!ctx) return;
    stop();
    isPlaying = true;
    var n = function(s) { return note(440, s); };
    var beat = 60 / 90;
    var t = 0;
    var notes = [
      [n(-21), 2, 'sine', 0.35], [n(-18), 2, 'sine', 0.3],
      [n(-13), 2, 'sine', 0.28], [n(-9), 2, 'sine', 0.3]
    ];
    var bassNotes = [
      [n(-33), 2, 'triangle', 0.18], [n(-33), 2, 'triangle', 0.15],
      [n(-33), 2, 'triangle', 0.12], [n(-33), 2, 'triangle', 0.15]
    ];
    var loop = function() {
      if (!isPlaying) return;
      for (var i = 0; i < notes.length; i++) {
        sched(notes[i][0], t + i * beat * 2, notes[i][1], notes[i][2], notes[i][3]);
        sched(bassNotes[i][0], t + i * beat * 2, bassNotes[i][1], bassNotes[i][2], bassNotes[i][3]);
      }
      t += beat * 8;
      currentTimeout = setTimeout(loop, beat * 8 * 1000);
    };
    loop();
  }

  // Gameplay loop - upbeat
  function playGame() {
    init();
    if (!ctx) return;
    stop();
    isPlaying = true;
    var n = function(s) { return note(440, s); };
    var beat = 60 / 140;
    var step = 0;
    var patterns = [
      [[n(-24), 0.5, 'triangle', 0.22], [n(-1), 0.5, 'sine', 0.25]],
      [[n(-24), 0.5, 'triangle', 0.2], [n(-100), 0.12, 'square', 0.1, 0.005, 0.04]],
      [[n(-24), 0.5, 'triangle', 0.22], [n(2), 0.5, 'sine', 0.22]],
      [[n(-21), 0.5, 'triangle', 0.2], [n(4), 0.5, 'sine', 0.2]]
    ];
    var loop = function() {
      if (!isPlaying) return;
      var pat = patterns[step % patterns.length];
      for (var i = 0; i < pat.length; i++) {
        var note2 = pat[i];
        sched(note2[0], 0, note2[1], note2[2], note2[3], 0.01, 0.15);
      }
      step++;
      currentTimeout = setTimeout(loop, beat * 1000);
    };
    loop();
  }

  // Level up fanfare
  function playLevelUp() {
    var n = function(s) { return note(440, s); };
    playSeq([
      [n(0), 0.3, 'sine', 0.4], [n(4), 0.3, 'sine', 0.38], [n(7), 0.6, 'sine', 0.5],
      [n(0), 0.3, 'sine', 0.38], [n(4), 0.3, 'sine', 0.35], [n(9), 0.8, 'sine', 0.5],
      [n(-2), 0.3, 'sine', 0.35], [n(2), 0.3, 'sine', 0.32], [n(5), 0.6, 'sine', 0.4],
      [n(0), 1.2, 'sine', 0.55]
    ], 130);
  }

  // Game over
  function playGameOver() {
    var n = function(s) { return note(440, s); };
    playSeq([
      [n(-9), 0.6, 'sine', 0.32], [n(-13), 0.6, 'sine', 0.28],
      [n(-11), 0.6, 'sine', 0.28], [n(-13), 0.6, 'sine', 0.25],
      [n(-13), 1.2, 'sine', 0.22]
    ], 80);
  }

  // Public API
  window.GameMusicV2 = {
    init: init,
    playMenu: playMenu,
    playGame: playGame,
    playLevelUp: playLevelUp,
    playGameOver: playGameOver,
    setVolume: setVolume,
    stop: stop
  };
})();