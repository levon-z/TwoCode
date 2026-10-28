'use strict';
// TwoCode fun: faces, blinking, startup show, sounds, confetti, sleeping, dancing, outfits,
// limit warnings, a focus timer, and all the "make it yours" options in Settings.
// Reads the Claude Code status from ai-monitor-ui.js (window.__twocodeStatus) and draws through
// the hooks in drawGhost (mascot.html): __twocodeGhostFx, __twocodeGhostDecor and __twocodeLook.
(function twocodeFun() {
  const now = () => performance.now();
  const store = {
    get: (key, fallback) => { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  };

  // ---------- preferences (Settings → Algemeen) ----------
  const DEFAULTS = { lang: 'en', speed: 'snel', focusMin: 25, focusSec: 1500,eye: 'mint', body: 'wolk', palette: 'klassiek', faces: true, blink: true,
    dance: true, confetti: true, chimes: true, notify: true, startup: true, outfit: 'auto', sleepMin: 10, warnAt: 80,
    pack: 'klassiek', seasonal: true, hunger: true, volumeHud: true, batteryWarn: true, appAnim: true,
    testMode: false, name: 'TwoCode', lightBusy: '#ff9a1f', lightDone: '#22e05a', lightError: '#ff3b3b' };
  const savedPrefs = store.get('twocode:prefs', {});
  if (!savedPrefs.newLook) { savedPrefs.body = 'wolk'; savedPrefs.newLook = true; store.set('twocode:prefs', savedPrefs); } // switch once to the new white look
  const prefs = { ...DEFAULTS, ...savedPrefs };
  // Old saves only had a palette preset: start the own colours from that preset.
  if (savedPrefs.lightBusy === undefined && savedPrefs.palette && savedPrefs.palette !== 'klassiek') {
    const old = { zacht: ['#ffc27a', '#8ef0a8', '#ff8a8a'], kleurenblind: ['#ffb000', '#3d9bff', '#ff5ac8'] }[savedPrefs.palette];
    if (old) [prefs.lightBusy, prefs.lightDone, prefs.lightError] = old;
  }
  const petName = () => String(prefs.name || '').trim() || 'TwoCode';
  if (!['snel', 'normaal'].includes(prefs.speed)) prefs.speed = 'normaal'; // 'rustig' no longer exists
  let drafting = false; // TwoCode Instellingen is trying something out (settings-bridge-ui.js): not saved, not on the real Robo
  const save = () => { if (drafting) return; store.set('twocode:prefs', prefs); apply(); };

  const EYES = { mint: '#e3ffd4', wit: '#ffffff', blauw: '#8fd3ff', roze: '#ffb3d9', paars: '#c9a7ff', geel: '#fff3a3' };
  // 'wolk' is the bright white blob (default since the new look); the others are the classic dark ghost.
  const BODIES = { wolk: ['#ffffff', '#e2ece6'], munt: ['#f4fff6', '#c9f0d6'], lucht: ['#f3f8ff', '#cfe0ff'], roos: ['#fff4f8', '#ffd3e4'], klassiek: ['#59695d', '#344239'], nacht: ['#3a3f47', '#1c1f24'], blauw: ['#4f6f9e', '#2c3f5e'],
    paars: ['#6e5a9e', '#3b2f5e'], roze: ['#a5637f', '#5e3446'], goud: ['#9e8a4f', '#5e4f2c'] };
  const PALETTES = {
    klassiek: { busy: '#ff9a1f', question: '#ff9a1f', done: '#22e05a', error: '#ff3b3b', label: 'Klassiek' },
    zacht: { busy: '#ffc27a', question: '#ffc27a', done: '#8ef0a8', error: '#ff8a8a', label: 'Zacht' },
    kleurenblind: { busy: '#ffb000', question: '#ffb000', done: '#3d9bff', error: '#ff5ac8', label: 'Kleurenblind' }
  };
  // Only Snel and Normaal: slow animations felt sluggish.
  const SPEEDS = { snel: { t: 0.5, peek: 140, home: 300, view: 1500, mon: 600 }, normaal: { t: 0.8, peek: 260, home: 400, view: 2200, mon: 800 } };

  const BLOBS = ['wolk', 'munt', 'lucht', 'roos'];
  window.__twocodeLook = () => ({ eye: EYES[prefs.eye], shell1: BODIES[prefs.body]?.[0], shell2: BODIES[prefs.body]?.[1], style: BLOBS.includes(prefs.body) ? 'blob' : 'ghost' });
  // The traffic-light colours are your own choice (Settings → Karakter → Stoplicht-ogen).
  window.__twocodePalette = () => ({ busy: prefs.lightBusy, question: prefs.lightBusy, done: prefs.lightDone, error: prefs.lightError });
  window.__twocodeName = petName;

  // Faster (or calmer) opening and closing, and how quickly the island reacts to your mouse.
  const baseSetMode = setMode;
  setMode = function (next, playSound) {
    const result = baseSetMode(next, playSound);
    if (transition && !transition.scaled) { transition.duration *= SPEEDS[prefs.speed].t; transition.scaled = true; }
    return result;
  };
  function apply() {
    const s = SPEEDS[prefs.speed];
    UI.NORMAL_PEEK_DELAY = s.peek; UI.HOME_LEAVE_DELAY = s.home; UI.VIEW_LEAVE_DELAY = s.view; UI.MONITOR_LEAVE_DELAY = s.mon;
    window.twocode?.setLanguage?.(prefs.lang);
    window.twocode?.aiMonitorSetNotify?.(prefs.notify).catch?.(() => {});
  }
  apply();

  const say = (title, body) => { if (!prefs.notify) return; try { new Notification(title, { body, silent: true }); } catch {} };
  window.__twocodePrefs = () => prefs;
  window.__twocodeSay = say;

  // ---------- sounds: the same melodies in different sound packs ----------
  const PACKS = { klassiek: { wave: 'sine', vol: 1, mul: 1, len: 1, label: 'Klassiek' }, '8bit': { wave: 'square', vol: 0.45, mul: 1, len: 0.8, label: '8-bit' },
    zacht: { wave: 'sine', vol: 0.55, mul: 0.75, len: 1.4, label: 'Zacht' }, belletjes: { wave: 'triangle', vol: 0.9, mul: 2, len: 1.8, label: 'Belletjes' } };
  let audio = null;
  function synth(from, to, dur, vol, delay = 0) {
    const pack = PACKS[prefs.pack] || PACKS.klassiek;
    try {
      audio ||= new AudioContext();
      const t = audio.currentTime + delay, osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = pack.wave; osc.frequency.setValueAtTime(from * pack.mul, t); osc.frequency.exponentialRampToValueAtTime(to * pack.mul, t + dur * pack.len);
      gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(vol * pack.vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * pack.len);
      osc.connect(gain).connect(audio.destination); osc.start(t); osc.stop(t + dur * pack.len + 0.05);
    } catch {}
  }
  const MELODIES = {
    done: [[660, 880, 0.12, 0.02], [880, 1320, 0.18, 0.018, 0.12]],
    question: [[520, 600, 0.09, 0.018], [600, 820, 0.14, 0.016, 0.1]],
    error: [[300, 220, 0.18, 0.022], [220, 160, 0.22, 0.02, 0.16]],
    party: [523, 659, 784, 1047].map((f, i) => [f, f * 1.01, 0.12, 0.016, i * 0.09]),
    warn: [[440, 440, 0.1, 0.02], [440, 440, 0.1, 0.02, 0.18]],
    hello: [392, 523, 659, 784].map((f, i) => [f, f * 1.02, 0.1, 0.014, i * 0.07]),
    pop: [[700, 1100, 0.06, 0.012]],
    badge: [784, 988, 1175, 1568].map((f, i) => [f, f * 1.01, 0.1, 0.014, i * 0.06]),
    yum: [[500, 760, 0.08, 0.016], [760, 620, 0.08, 0.014, 0.09]],
    // Robo's chat: a soft whoosh when you send, two bright notes for an answer, a little fanfare for a fix
    send: [[480, 960, 0.07, 0.011]],
    reply: [[880, 1175, 0.08, 0.012], [1175, 1568, 0.12, 0.01, 0.08]],
    fix: [523, 659, 784, 1047, 1319].map((f, i) => [f, f * 1.01, 0.13, 0.015, i * 0.075])
  };
  function chime(kind) {
    if (!soundEnabled || !prefs.chimes) return;
    for (const note of MELODIES[kind] || []) synth(...note);
  }

  // ---------- outfits: unlocked by finishing tasks ----------
  const OUTFITS = [{ at: 5, id: 'hat', name: 'feesthoedje' }, { at: 15, id: 'shades', name: 'zonnebril' }, { at: 30, id: 'crown', name: 'kroon' }];
  let doneCount = store.get('twocode:done-count', 0);
  // the Style pack (twocode.nl) opens them all at once
  const unlocked = id => doneCount >= (OUTFITS.find(o => o.id === id)?.at ?? Infinity) || (!!OUTFITS.find(o => o.id === id) && !window.__twocodeLicense?.().locked.includes('outfits'));
  // Holidays: TwoCode dresses up by himself (Settings → Seizoensoutfits).
  function season() {
    if (!prefs.seasonal) return null;
    const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    if (m === 12 && day <= 26) return 'santa';
    if ((m === 12 && day === 31) || (m === 1 && day === 1)) return 'hat';
    if (m === 10 && day >= 24) return 'witch';
    if (m === 4 && (day === 26 || day === 27)) return 'oranje';
    return null;
  }
  const outfit = () => prefs.outfit === 'geen' ? null
    : prefs.outfit !== 'auto' && unlocked(prefs.outfit) ? prefs.outfit
    : season() || [...OUTFITS].reverse().find(o => unlocked(o.id))?.id || null;
  window.__twocodeOutfitOn = () => { const o = outfit(); return Boolean(o && o !== 'shades'); }; // something on his head (the antenna grows above it)
  window.__twocodeOutfits = { count: () => doneCount, next: () => OUTFITS.find(o => doneCount < o.at) || null };
  function countDone(status) {
    doneCount++; store.set('twocode:done-count', doneCount);
    window.__twocodeMonitor?.refresh?.(); // the Claude screen shows the new task count right away
    feed(25);
    const fresh = OUTFITS.find(o => o.at === doneCount);
    if (fresh) { say('TwoCode heeft iets nieuws!', `${doneCount} taken klaar: je hebt een ${fresh.name} verdiend.`); chime('party'); confetti(); feel('heart', 2000); }
    const hour = new Date().getHours();
    earn('first'); if (doneCount >= 10) earn('ten'); if (doneCount >= 50) earn('fifty');
    if (hour < 5) earn('owl'); if (hour >= 5 && hour < 7) earn('bird');
    if ((status?.elapsed || 0) >= 900) earn('marathon');
    if (unlocked('crown')) earn('fashion');
  }

  // ---------- achievements ----------
  const BADGES = [
    { id: 'first', icon: '🌱', name: 'Eerste taak', how: 'Claude Code maakt een taak af' },
    { id: 'ten', icon: '🔟', name: 'Tien taken', how: '10 taken klaar' },
    { id: 'fifty', icon: '🏅', name: 'Vijftig taken', how: '50 taken klaar' },
    { id: 'helper', icon: '💬', name: 'Behulpzaam', how: '10 keer antwoorden vanuit de island' },
    { id: 'owl', icon: '🦉', name: 'Nachtuil', how: 'Een taak klaar na middernacht' },
    { id: 'bird', icon: '🐦', name: 'Vroege vogel', how: 'Een taak klaar voor 7 uur' },
    { id: 'marathon', icon: '🏃', name: 'Lange adem', how: 'Een taak van meer dan 15 minuten' },
    { id: 'focus', icon: '🎯', name: 'Focusmeester', how: '5 focusblokken afgemaakt' },
    { id: 'dj', icon: '🎧', name: 'DJ', how: '10 keer Spotify bediend vanuit de island' },
    { id: 'tray', icon: '📥', name: 'Verzamelaar', how: '5 bestanden in de lade' },
    { id: 'mirror', icon: '🪞', name: 'Lekker bezig', how: 'De spiegel gebruikt' },
    { id: 'fashion', icon: '👑', name: 'Mode-icoon', how: 'Alle outfits verdiend' }
  ];
  const badges = new Set(store.get('twocode:badges', []));
  const counters = store.get('twocode:counters', {});
  function earn(id) {
    if (badges.has(id)) return;
    const b = BADGES.find(x => x.id === id); if (!b) return;
    badges.add(id); store.set('twocode:badges', [...badges]);
    say(`${b.icon} Prestatie: ${b.name}`, b.how); chime('badge'); confetti(50); jump(); feel('heart', 1500);
  }
  function bump(name, goal, id) { counters[name] = (counters[name] || 0) + 1; store.set('twocode:counters', counters); if (counters[name] >= goal) earn(id); }
  window.addEventListener('twocode:badge', e => {
    const what = String(e.detail || '');
    if (what === 'dj') bump('dj', 10, 'dj');
    else if (what === 'mirror') earn('mirror');
    else if (what.startsWith('tray:') && Number(what.slice(5)) >= 5) earn('tray');
  });

  // ---------- hunger: finishing tasks feeds TwoCode (like a Tamagotchi) ----------
  let food = store.get('twocode:food', { value: 80, at: Date.now() });
  const hunger = () => {
    // Loses 1 point every 10 minutes while the app runs (time while closed does not count).
    const lost = Math.floor((Date.now() - food.at) / 600000);
    if (lost > 0) { food = { value: Math.max(0, food.value - lost), at: food.at + lost * 600000 }; store.set('twocode:food', food); }
    return food.value;
  };
  function feed(points) {
    if (!prefs.hunger) return;
    hunger(); food = { value: Math.min(100, food.value + points), at: food.at }; store.set('twocode:food', food); chime('yum');
  }
  const hungry = () => prefs.hunger && hunger() < 30;
  window.__twocodeHunger = () => (prefs.hunger ? hunger() : null);
  window.__twocodeHomeTitle = () => ''; // no hungry message on Home (it made Robo look sad all day)
  if (Date.now() - food.at > 600000) { food.at = Date.now(); store.set('twocode:food', food); } // time while closed doesn't count

  // ---------- focus timer (hours, minutes and seconds are chosen on the Focus page, focus-ui.js) ----------
  if (!prefs.focusSec) prefs.focusSec = (prefs.focusMin || 25) * 60;
  let focusEnd = store.get('twocode:focus-end', 0), focusLength = store.get('twocode:focus-length', prefs.focusSec * 1000);
  const clock = ms => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`; };
  const focus = {
    active: () => focusEnd > Date.now(),
    left: () => Math.max(0, focusEnd - Date.now()),
    length: () => focusLength,
    chosen: () => prefs.focusSec,
    minutes: () => Math.round(prefs.focusSec / 60),
    label: () => clock(focus.left()),
    choose(sec) { prefs.focusSec = Math.max(5, Math.min(24 * 3600 - 1, Math.round(sec))); save(); },
    start(sec = prefs.focusSec) {
      focusLength = sec * 1000; focusEnd = Date.now() + focusLength;
      store.set('twocode:focus-end', focusEnd); store.set('twocode:focus-length', focusLength);
      chime('pop'); feel('heart', 1200); wake(); window.__twocodeSettleSize?.();
    },
    add(sec) { if (!focus.active()) return; focusEnd += sec * 1000; focusLength += sec * 1000; store.set('twocode:focus-end', focusEnd); store.set('twocode:focus-length', focusLength); },
    stop() { focusEnd = 0; store.set('twocode:focus-end', 0); chime('error'); window.__twocodeSettleSize?.(); },
    toggle() { focus.active() ? focus.stop() : focus.start(); }
  };
  window.__twocodeFocus = focus;
  canvas.addEventListener('click', event => {
    if (inside(event.clientX, event.clientY, hit.focusApp)) { event.preventDefault(); event.stopImmediatePropagation(); setView('focus'); }
  }, true);

  // ---------- confetti (own click-through canvas over the window) ----------
  const layer = document.createElement('canvas');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:80';
  document.body.appendChild(layer);
  const lctx = layer.getContext('2d');
  let bits = [], running = false;
  function confetti(amount = 90) {
    if (!prefs.confetti) return;
    const cx = islandBounds.x + islandBounds.width / 2, colours = ['#22e05a', '#ff9a1f', '#ffd166', '#4cc9f0', '#f72585', EYES[prefs.eye]];
    for (let i = 0; i < amount; i++) {
      bits.push({ x: cx + (Math.random() - 0.5) * Math.max(80, islandBounds.width * 0.6), y: islandBounds.height * 0.6, vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 3 - 1, size: 3 + Math.random() * 4, spin: Math.random() * 6, colour: colours[i % colours.length], life: 1 });
    }
    if (!running) { running = true; requestAnimationFrame(drawConfetti); }
  }
  function drawConfetti() {
    layer.width = innerWidth; layer.height = innerHeight;
    bits = bits.filter(b => b.life > 0 && b.y < innerHeight + 10);
    for (const b of bits) {
      b.vy += 0.12; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.spin += 0.2; b.life -= 0.008;
      lctx.save(); lctx.globalAlpha = Math.min(1, b.life * 2); lctx.translate(b.x, b.y); lctx.rotate(b.spin);
      lctx.fillStyle = b.colour; lctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2); lctx.restore();
    }
    if (bits.length) requestAnimationFrame(drawConfetti); else running = false;
  }

  // ---------- feelings: short-lived expressions on top of the status ----------
  let feeling = null, feelingUntil = 0, bounceAt = -1e9;
  // The settings app's own Robo: his own feelings, hops, waves and the look you are trying out.
  const pv = { prefs: null, feeling: null, feelingUntil: 0, bounceAt: -1e9, danceUntil: 0, waveUntil: 0, nextBlink: 0 };
  function feel(mood, ms) { if (drafting) { pv.feeling = mood; pv.feelingUntil = now() + ms; return; } feeling = mood; feelingUntil = now() + ms; }
  function jump() { if (drafting) { pv.bounceAt = now(); return; } bounceAt = now(); }
  window.__twocodeFeel = feel;
  window.__twocodeCelebrate = (kind = 'done', bits = 40) => { chime(kind); jump(); confetti(bits); }; // Robo's chat: a fix landed
  window.__twocodeChime = kind => chime(kind);
  window.__twocodeCheer = () => { jump(); feel('happy', 800); chime('pop'); };

  // ---------- sleeping ----------
  let lastWake = Date.now();
  function wake() { lastWake = Date.now(); }
  canvas.addEventListener('click', wake, true);
  const asleep = () => sleepEnabled && !window.__twocodeStatus?.() && !focus.active() && !spotifyState.is_playing
    && !(pointer.known && inside(pointer.x, pointer.y, islandBounds)) && Date.now() - lastWake > prefs.sleepMin * 60000;

  // ---------- hello and goodbye: calm and smooth ----------
  // Startup: the island opens, he waves and says "Hoi! Ik ben …", winks, and goes small again.
  // Goodbye: "Doei! Tot zo", he waves, closes his eyes, and the island shrinks away.
  let showAt = null;
  const showColours = () => [prefs.lightError, prefs.lightBusy, prefs.lightDone];
  const baseEyes = window.__twocodeEyes;
  // In the Settings locker TwoCode shows his own look, not Claude's traffic light.
  const inLocker = () => window.__twocodeLockerDraw === true;
  let lightsDemoAt = -1e9; // Settings example: the traffic-light eyes test themselves once
  let lightPreview = null; // { color, until }: a just-picked traffic-light colour, shown on the eyes
  // Like a jelly blob (inspired by the iPhone's Dynamic Island springs and cartoon squash & stretch):
  // hello: the island plops open and wobbles, he lands squashed, stretches up and says a cute "hi!".
  // bye: "bye-bye!", he waves, squashes down and zips into a dot with a "bloop", the island squeezes shut.
  const HELLO = { land: 380, hi: 700, tilt: 1300, wink: 2000, end: 2700 };
  const BYE = { squash: 650, off: 880, end: 1400 };
  // A spring: overshoots and wobbles out (amp × fading sine). Used for the jelly island and squash & stretch.
  const spring = (ms, amp, hz = 3, damp = 6) => ms < 0 ? 0 : amp * Math.exp(-damp * ms / 1000) * Math.sin(2 * Math.PI * hz * ms / 1000);

  // ---- Robo's voice: soft, round chirps (like a Tamagotchi or Kirby), no words ----
  const soundVolume = () => { const v = window.__twocodeVolume?.() ?? 1; return soundEnabled && v > 0 ? v : 0; };
  const ac = () => { audio ||= new AudioContext(); if (audio.state === 'suspended') audio.resume(); return audio; };
  // One chirp: a sine that slides in pitch, a soft octave on top, and an optional little trill at the end.
  function chirp(at, from, to, dur, trill = 0, gain = 0.055) {
    const V = soundVolume(); if (!V) return;
    try {
      const c = ac(), t = c.currentTime + at, out = c.createGain();
      out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(gain * V, t + 0.015);
      out.gain.setValueAtTime(gain * V, t + dur * 0.6); out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      out.connect(c.destination);
      const tones = [['sine', 1, 1], ['triangle', 2, 0.18]].map(([type, mul, level]) => {
        const o = c.createOscillator(), g = c.createGain(); o.type = type; g.gain.value = level;
        o.frequency.setValueAtTime(from * mul, t); o.frequency.exponentialRampToValueAtTime(to * mul, t + dur * 0.7);
        o.connect(g).connect(out); return o;
      });
      if (trill) { const lfo = c.createOscillator(), depth = c.createGain(); lfo.frequency.value = 16; depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(trill, t + dur);
        lfo.connect(depth); tones.forEach(o => depth.connect(o.frequency)); lfo.start(t); lfo.stop(t + dur + 0.05); }
      tones.forEach(o => { o.start(t); o.stop(t + dur + 0.05); });
    } catch {}
  }  // Bloop / plop: a round, wet blob sound.
  function blobTone(at, from, to, dur, gain = 0.05) {
    const V = soundVolume(); if (!V) return;
    try {
      const c = ac(), t = c.currentTime + Math.max(0, at), o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain * V, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.03);
    } catch {}
  }
  const sayHi = () => { chirp(0, 760, 1180, 0.09); chirp(0.085, 1180, 1580, 0.2, 28); };                    // "hi~" (up, happy)
  const sayByeBye = () => { chirp(0, 1180, 940, 0.11); chirp(0.17, 1080, 640, 0.26, 24); };                 // "bye-bye~" (down, a bit sad)
  window.__twocodeVoice = { hi: sayHi, bye: sayByeBye }; // handy for testing

  // The island itself wobbles like jelly: each "kick" starts a spring.
  const kicks = [];
  const kick = (amp, hz = 2.6, damp = 5.5) => { kicks.push({ at: now(), amp, hz, damp }); if (kicks.length > 6) kicks.shift(); };
  window.__twocodeKick = kick; // a little jelly wobble of the island (used by swipe)
  const baseDrawIsland = drawIsland;
  // During hello and bye he stands in the middle of the island (a bit bigger): he is the show.
  const baseDrawGhost = drawGhost;
  drawGhost = function (x, y, size, ...rest) {
    if ((showAt != null || byeAt != null) && mode === 'compact' && y < 40 && !inLocker()) { x = islandBounds.x + islandBounds.width / 2; size *= 1.2; }
    return baseDrawGhost(x, y, size, ...rest);
  };
  drawIsland = function () {
    const out = window.__twocodeOutro?.() || 0;
    if (out > 0) { // goodbye: narrower and lower, faster at the end (it slips into the edge)
      const e = out * out, w = visual.width, h = visual.height, r = visual.radius;
      visual.width = w + (18 - w) * e; visual.height = h * (1 - e); visual.radius = Math.min(r, visual.height / 2);
      try { if (visual.height > 1) baseDrawIsland(); } finally { visual.width = w; visual.height = h; visual.radius = r; }
      return;
    }
    const t = now(); let j = 0;
    for (const k of kicks) j += spring(t - k.at, k.amp, k.hz, k.damp);
    if (Math.abs(j) < 0.002) return baseDrawIsland();
    const w = visual.width, h = visual.height;
    visual.width = w * (1 + j); visual.height = h * (1 - j * 1.4); // wider = flatter, thinner = taller
    try { return baseDrawIsland(); } finally { visual.width = w; visual.height = h; }
  };
  let byeAt = null;
  window.__twocodeEyes = () => {
    if (lightPreview && now() < lightPreview.until) return { color: lightPreview.color };
    const demo = now() - lightsDemoAt; if (demo >= 0 && demo < 1500) return { color: showColours()[Math.min(2, Math.floor(demo / 500))] };
    if (inLocker()) return null;
    return baseEyes?.() || null;
  };
  let waveUntil = 0, popAt = -1e9;
  const waving = () => now() < waveUntil;
  // No text during hello and bye: the animation says it all. (A space keeps the island open without showing anything.)
  window.__twocodeCompactMessage = () => byeAt != null ? (now() - byeAt < BYE.off ? ' ' : '') : showAt != null && now() - showAt < HELLO.end ? ' ' : '';

  let showId = 0;
  const step = (id, ms, fn) => setTimeout(() => { if (id === showId) fn(); }, ms); // a newer show cancels the old steps
  function startHello() {
    const id = ++showId;
    showAt = now(); popAt = now() + 180; setMode('compact', false);
    kick(0.12); blobTone(0, 180, 620, 0.16, 0.06);                                   // the island plops open: "bloop"
    step(id, HELLO.land, () => blobTone(0, 520, 240, 0.08, 0.05));                    // he lands: "plop"
    step(id, HELLO.hi, () => { sayHi(); feel('happy', 1100); waveUntil = now() + 1100; }); // stretches up and says "hi!"
    step(id, HELLO.tilt, () => feel('happy', 600));
    step(id, HELLO.wink, () => { feel('wink', 450); blobTone(0, 900, 1300, 0.05, 0.025); });
    // Back to small with a little wobble, unless you already opened the island yourself.
    step(id, HELLO.end, () => { showAt = null; if (mode === 'compact' && !(pointer.known && inside(pointer.x, pointer.y, islandBounds))) { setMode('rest', false); kick(0.07, 3); } });
  }
  let helloQueued = true;
  const startShow = setInterval(() => {
    if (!introFinished) return;
    clearInterval(startShow);
    helloQueued = false;
    if (prefs.startup) startHello();
  }, 100);
  // While Robo says hi (or bye) he stands big in the middle of the island: other messages wait (extras-ui.js).
  window.__twocodeHelloBusy = () => (helloQueued && prefs.startup) || showAt != null || byeAt != null;
  window.__twocodeHello = startHello; // also used by the Settings example
  // Goodbye, calm and quick: "bye-bye", the island goes small, Robo closes his eyes and the island shrinks back into the
  // top edge, then the app is gone (main.js quits after OUT.end). No moment where the island hangs around empty.
  const OUT = { eyes: 260, shrink: 300, end: 950 };
  let outAt = null;
  const baseIslandEyes = drawIslandEyes;
  drawIslandEyes = function (cx, cy, size = 1) {
    if (outAt == null) return baseIslandEyes(cx, cy, size);
    const k = Math.max(0, Math.min(1, (now() - outAt) / OUT.eyes)); if (k >= 1) return;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, Math.max(0.06, 1 - k * k)); ctx.translate(-cx, -cy); baseIslandEyes(cx, cy, size); ctx.restore();
  };
  window.__twocodeIslandEyes = drawIslandEyes;
  window.__twocodeOutro = () => outAt == null ? 0 : Math.max(0, Math.min(1, (now() - outAt - OUT.eyes * 0.7) / OUT.shrink));
  window.__twocodeBye = () => {
    ++showId; byeAt = null; showAt = null; sayByeBye();
    const wasOpen = mode !== 'rest'; if (wasOpen) setMode('rest', false);
    outAt = now() + (wasOpen ? 320 : 120);
    setTimeout(() => blobTone(0, 520, 160, 0.18, 0.05), (wasOpen ? 320 : 120) + OUT.eyes); // a soft "bloop" as it closes
  };
  window.__twocodeByeReset = () => { outAt = null; };
  // while the eyes close, everything else in the small island (cover, bars, time) fades with them; after that only the shape is left
  const baseSmall = drawSmall;
  drawSmall = function (...args) {
    if (outAt == null) return baseSmall.apply(this, args);
    const k = Math.max(0, Math.min(1, (now() - outAt) / OUT.eyes)); if (k >= 1) return;
    ctx.save(); ctx.globalAlpha *= 1 - k; try { return baseSmall.apply(this, args); } finally { ctx.restore(); }
  };
  window.twocode?.onGoodbye?.(() => window.__twocodeBye());

  // ---------- poking: click TwoCode a few times and he gets angry, click a lot and he gets dizzy ----------
  let pokes = [], dizzyUntil = 0, pokeMessage = '', pokeMessageUntil = 0;
  canvas.addEventListener('click', event => {
    if (!(window.__twocodeOnRobo?.(event) ?? inside(event.clientX, event.clientY, hit.ghost))) return;
    const t = now(); pokes = pokes.filter(p => t - p < 1600); pokes.push(t);
    jump(); chime('pop');
    if (pokes.length >= 6) {
      dizzyUntil = t + 2600; pokes = []; feel('dizzy', 2600); chime('error');
      pokeMessage = 'Au! Te veel tikken… even bijkomen 😵'; pokeMessageUntil = t + 2600;
      if (mode === 'rest') setMode('compact', false);
    } else if (pokes.length >= 3) { angry = 1; feel('surprised', 900); }
    else feel('surprised', 400);
  });
  setInterval(() => {
    angry = Math.max(0, angry - 0.12);                             // red anger fades away
    dizzy = now() < dizzyUntil ? 1 : Math.max(0, dizzy - 0.15);   // wobbling (drawGhost rotates with it)
  }, 100);
  const startMessage = window.__twocodeCompactMessage;
  window.__twocodeCompactMessage = () => (now() < pokeMessageUntil ? pokeMessage : '') || startMessage?.() || '';

  // ---------- watch Claude Code ----------
  let lastState = null, lastDetail = '', wasFocus = focus.active();
  setInterval(() => {
    const status = window.__twocodeStatus?.(), state = status?.state || null;
    if (pointer.known && inside(pointer.x, pointer.y, islandBounds)) wake();
    if (state !== lastState) {
      if (state) wake();
      if (state === 'done') { chime('done'); jump(); countDone(status); if ((status.elapsed || 0) >= 300) confetti(); }
      if (state === 'question') chime('question');
      if (state === 'error') chime('error');
      lastState = state;
    }
    // You answered or allowed something from the island: a little heart.
    const detail = status?.detail || '';
    if (detail !== lastDetail && /Toegestaan|antwoord is verstuurd/.test(detail)) { feel('heart', 1400); chime('pop'); bump('helper', 10, 'helper'); }
    lastDetail = detail;
    if (wasFocus && !focus.active()) {
      say('Focus klaar!', `${clock(focusLength)} gefocust. Neem even pauze.`); chime('party'); confetti(); jump(); feel('happy', 2000);
      bump('focus', 5, 'focus'); feed(10);
      window.__twocodeSettleSize?.();
    }
    wasFocus = focus.active();
    warnLimit();
  }, 300);

  function warnLimit() {
    const usage = window.__twocodeMonitor?.state()?.providers?.find(p => p.provider === 'claudecode')?.usage?.fiveHour;
    if (!usage || !prefs.warnAt) return;
    const level = usage.used >= 95 ? 95 : usage.used >= prefs.warnAt ? prefs.warnAt : 0;
    const key = `${usage.resetsAt || 'x'}:${level}`;
    if (!level || store.get('twocode:limit-warned', '') === key) return;
    store.set('twocode:limit-warned', key);
    const at = usage.resetsAt ? new Date(usage.resetsAt * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '';
    say(`Je hebt ${usage.used}% van je Claude-limiet gebruikt`, at ? `Om ${at} is hij weer vol.` : 'Doe het even rustig aan.');
    chime('warn'); feel('surprised', 1500);
  }

  // ---------- random life: blinking and the odd wink ----------
  let nextBlink = now() + 2500;
  function idleLife(t, mood) {
    if (!prefs.blink || mood) return mood;
    if (t > nextBlink) {
      if (t > nextBlink + 140) nextBlink = t + 2500 + Math.random() * 3500;
      else return Math.random() < 0.004 ? 'wink' : 'blink';
    }
    return null;
  }

  let danceDemoUntil = 0;
  // ---------- what drawGhost asks for ----------
  const MOODS = { running: 'focus', sending: 'focus', question: 'curious', done: 'happy' }; // never a lasting sad face: an error shows in the eyes' colour
  function fx() {
    const t = now(), status = window.__twocodeStatus?.();
    let dy = 0, tilt = 0, scale = 1;
    let mood = prefs.faces && !inLocker() ? (status?.permission ? 'surprised' : MOODS[status?.state] || null) : null;
    if (feeling && t < feelingUntil) mood = feeling;
    const hop = (t - bounceAt) / 700;
    if (hop >= 0 && hop < 1) { dy -= Math.abs(Math.sin(hop * Math.PI)) * 11 * (1 - hop * 0.5); scale = 1 + Math.sin(hop * Math.PI) * 0.06; }
    else if ((prefs.dance && spotifyState.is_playing && window.__twocodeHearing || now() < danceDemoUntil) && !mood) { // dance to the music: every song gets its own move
      const id = spotifyState.track?.id || spotifyState.track?.name || '';
      const move = [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 4;
      if (move === 0) { dy -= Math.abs(Math.sin(t / 250)) * 3; tilt = Math.sin(t / 500) * 0.07; } // bob
      if (move === 1) { tilt = Math.sin(t / 380) * 0.16; dy -= Math.abs(Math.sin(t / 380)) * 1.5; } // sway
      if (move === 2) { dy -= Math.abs(Math.sin(t / 180)) * 4; scale = 1 + Math.abs(Math.sin(t / 180)) * 0.04; } // jump
      if (move === 3) { tilt = Math.sin(t / 120) * 0.08; dy -= Math.abs(Math.sin(t / 240)) * 2; } // wiggle
    }
    if (mood === 'sad') dy += 2;
    if (!mood && asleep()) { mood = 'sleep'; dy += Math.sin(t / 900) * 1.5; }
    mood = idleLife(t, mood);
    // Hello: pop in with a little overshoot. Goodbye: shrink away after waving.
    const pop = (t - popAt) / 420;
    if (pop >= 0 && pop < 1) scale *= 1 + 2.70158 * Math.pow(pop - 1, 3) + 1.70158 * Math.pow(pop - 1, 2); // ease-out-back: 0 → overshoot → 1
    let sx = 1, sy = 1; // squash & stretch
    if (showAt != null) {
      const k = t - showAt;
      if (k < 180) scale = 0;                                                       // not there yet: the island opens first
      const land = spring(k - HELLO.land, 0.3, 3.2, 7);                             // lands: squashed flat, then wobbles
      const hi = spring(k - HELLO.hi, -0.22, 3, 6);                                 // "hi!": stretches up tall
      sx += land + hi; sy -= land + hi;
      const hop = (k - HELLO.hi) / 450; if (hop > 0 && hop < 1) dy -= Math.sin(hop * Math.PI) * 7;
      const hehe = (k - HELLO.tilt) / 600; if (hehe > 0 && hehe < 1) tilt += Math.sin(hehe * Math.PI * 2) * 0.22 * (1 - hehe); // cute head tilt left-right
    }
    if (byeAt != null) {
      const k = t - byeAt, pre = (k - (BYE.squash - 250)) / 250, zip = (k - BYE.squash) / 230;
      if (pre > 0 && pre < 1) { sx *= 1 + 0.25 * pre; sy *= 1 - 0.25 * pre; dy += 3 * pre; } // ducks down (getting ready)
      if (zip > 0) { const z = Math.min(1, zip); scale *= Math.max(0, 1 - z * z); sx *= 1 - 0.35 * z; sy *= 1 + 0.5 * z; dy -= 4 * z; } // zips away
    }
    // Leaning into the walk while carrying the basket.
    const b = window.__twocodeBasket?.(); if (b?.show) tilt += Math.max(-0.25, Math.min(0.25, b.vx * 0.03));
    return { dy, tilt, scale, sx, sy, mood };
  }
  window.__twocodeGhostFx = fx;
  window.__twocodeGhostDecor = c => {
    // A little heart floats up when he says hi.
    const hk = showAt != null ? (now() - showAt - HELLO.hi - 120) / 900 : -1;
    if (hk > 0 && hk < 1) {
      c.save(); c.globalAlpha = hk < 0.7 ? 1 : 1 - (hk - 0.7) / 0.3; c.translate(20 + Math.sin(hk * 6) * 3, -34 - hk * 22); c.scale(1 + hk * 0.6, 1 + hk * 0.6);
      c.fillStyle = '#ff7eb6'; c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(-9, -3, -5, -11, 0, -6); c.bezierCurveTo(5, -11, 9, -3, 0, 4); c.fill(); c.restore();
    }
    const wear = outfit();
    c.save();
    if (wear === 'hat') {
      c.beginPath(); c.moveTo(-15, -27); c.lineTo(15, -27); c.lineTo(3, -62); c.closePath();
      c.fillStyle = '#f72585'; c.fill();
      c.strokeStyle = '#ffd166'; c.lineWidth = 3; c.beginPath(); c.moveTo(-9, -38); c.lineTo(10, -40); c.moveTo(-3, -50); c.lineTo(7, -51); c.stroke();
      c.beginPath(); c.arc(3, -63, 5, 0, Math.PI * 2); c.fillStyle = '#ffd166'; c.fill();
    }
    if (wear === 'shades') { // pushed up on the forehead, so the traffic-light eyes stay visible
      c.fillStyle = '#111'; c.strokeStyle = '#555'; c.lineWidth = 2;
      for (const side of [-1, 1]) { c.beginPath(); c.roundRect(side * 15 - 9, -24, 18, 11, 4); c.fill(); c.stroke(); }
      c.beginPath(); c.moveTo(-6, -19); c.lineTo(6, -19); c.stroke();
    }
    if (wear === 'crown' || wear === 'oranje') { // oranje: King's Day
      const gold = wear === 'oranje' ? '#ff7a00' : '#ffc93c';
      c.beginPath(); c.moveTo(-20, -24); c.lineTo(-20, -44); c.lineTo(-10, -34); c.lineTo(0, -48); c.lineTo(10, -34); c.lineTo(20, -44); c.lineTo(20, -24); c.closePath();
      c.fillStyle = gold; c.shadowColor = gold; c.shadowBlur = 10; c.fill();
      c.shadowBlur = 0; c.fillStyle = wear === 'oranje' ? '#ffffff' : '#f72585'; c.beginPath(); c.arc(0, -32, 3.5, 0, Math.PI * 2); c.fill();
    }
    if (wear === 'santa') {
      c.beginPath(); c.moveTo(-24, -24); c.quadraticCurveTo(-6, -66, 26, -50); c.lineTo(20, -24); c.closePath();
      c.fillStyle = '#e63946'; c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(-26, -30, 50, 9, 4.5); c.fill();
      c.beginPath(); c.arc(27, -50, 6, 0, Math.PI * 2); c.fill();
    }
    if (wear === 'witch') {
      c.fillStyle = '#2b1d3a'; c.beginPath(); c.ellipse(0, -26, 34, 6, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(-16, -27); c.lineTo(16, -27); c.lineTo(10, -54); c.lineTo(20, -66); c.lineTo(2, -56); c.closePath(); c.fill();
      c.fillStyle = '#ff9a1f'; c.fillRect(-15, -33, 30, 5);
    }
    if (fx().mood === 'sleep') {
      c.fillStyle = '#c6e994'; c.font = '700 16px Arial';
      const t = now() / 1000;
      ['z', 'Z', 'Z'].forEach((letter, i) => { const k = (t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - k; c.fillText(letter, 30 + k * 18, -20 - k * 34); });
    }
    if (focus.active() && mode !== 'expanded' && !previewing) { // focus progress around the small ghost
      const part = 1 - focus.left() / focusLength;
      c.globalAlpha = 1; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.arc(0, 0, 50, 0, Math.PI * 2); c.strokeStyle = 'rgba(255,255,255,.12)'; c.stroke();
      c.beginPath(); c.arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * part); c.strokeStyle = '#ffc93c'; c.stroke();
    }
    const hand = (x, y, angle = 0) => { // a small round mitten in the body colour
      const look = window.__twocodeLook?.() || {};
      c.save(); c.translate(x, y); c.rotate(angle); c.globalAlpha = 1;
      c.beginPath(); c.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2); c.fillStyle = look.shell1 || '#59695d'; c.fill();
      c.beginPath(); c.ellipse(-6, 3, 3.5, 4.5, -0.6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2); c.stroke();
      c.restore();
    };
    // Waving hello / goodbye
    if (waving()) hand(50, -14, Math.sin(now() / 85) * 0.55);
    // Holding a basket under a file you are dragging
    const b = window.__twocodeBasket?.();
    if (b?.show) {
      c.save(); c.translate(0, 48); c.rotate(b.wobble * 0.3); c.globalAlpha = 1;
      c.beginPath(); c.moveTo(-36, -8); c.lineTo(36, -8); c.lineTo(26, 24); c.lineTo(-26, 24); c.closePath();
      const wood = c.createLinearGradient(0, -8, 0, 24); wood.addColorStop(0, '#c98d4a'); wood.addColorStop(1, '#8a5a2b'); c.fillStyle = wood; c.fill();
      c.strokeStyle = 'rgba(70,40,15,.55)'; c.lineWidth = 2;
      for (const y of [2, 12]) { c.beginPath(); c.moveTo(-33 + (y + 8) * 0.3, y); c.lineTo(33 - (y + 8) * 0.3, y); c.stroke(); }
      for (const x of [-20, -7, 7, 20]) { c.beginPath(); c.moveTo(x, -8); c.lineTo(x * 0.75, 24); c.stroke(); }
      c.beginPath(); c.roundRect(-39, -13, 78, 8, 4); c.fillStyle = '#d9a05c'; c.fill();
      c.restore();
      hand(-38, 38, 0.4); hand(38, 38, -0.4);
    }
    c.restore();
  };

  // ---------- Settings: make TwoCode yours ----------
  const style = document.createElement('style');
  style.textContent = `
#twocode-settings-v2 .tc-group{margin:14px 2px 6px;color:#c6e994;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
#twocode-settings-v2 .tc-chips{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;max-width:62%}
#twocode-settings-v2 .tc-chip{border:0;border-radius:12px;padding:6px 10px;background:#262e23;color:#dfe7da;font-size:10px}
#twocode-settings-v2 .tc-chip.on{background:#c6e994;color:#11180d;font-weight:700}
#twocode-settings-v2 .tc-swatch{width:22px;height:22px;border-radius:50%;border:2px solid transparent;padding:0}
#twocode-settings-v2 .tc-swatch.on{border-color:#fff;box-shadow:0 0 0 2px #c6e994}
#twocode-settings-v2 .tc-lights{flex-direction:column;align-items:stretch !important;gap:8px}
#twocode-settings-v2 .tc-lights-head{display:flex;flex-direction:column;gap:8px}
#twocode-settings-v2 .tc-lights-head .tc-chips,#twocode-settings-v2 .tc-light-line .tc-chips{justify-content:flex-start;max-width:none}
#twocode-settings-v2 .tc-light-line{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.03)}
#twocode-settings-v2 .tc-light-line > span{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600;color:#dfe7da;white-space:nowrap}
#twocode-settings-v2 .tc-light-line > span i{width:10px;height:10px;border-radius:50%;display:block}
#twocode-settings-v2 .tc-light-line .tc-swatch{width:20px;height:20px}
#twocode-settings-v2 .tc-tests{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0 4px}
#twocode-settings-v2 .tc-tests .tc-chip{padding:9px 8px;font-size:11px;border-radius:11px}
#twocode-settings-v2 .tc-name{width:140px;font-size:12px;font-weight:600}
#twocode-settings-v2 .tc-step{display:flex;align-items:center;gap:6px}
#twocode-settings-v2 .tc-step b{min-width:46px;text-align:center;font-size:12px}
#twocode-settings-v2 .tc-input{width:170px;border:1px solid #4b5943;border-radius:10px;padding:6px 9px;background:#1b2219;color:#f0f5ed;font-size:10px;user-select:text}
#twocode-settings-v2 .tc-badges{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}
#twocode-settings-v2 .tc-badge{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 6px;border-radius:12px;background:#121611;opacity:.55;text-align:center}
#twocode-settings-v2 .tc-badge.on{opacity:1;background:#1d2619;box-shadow:inset 0 0 0 1px #c6e994}
#twocode-settings-v2 .tc-badge span{font-size:18px}
#twocode-settings-v2 .tc-badge b{font-size:10px}
#twocode-settings-v2 .tc-badge small{font-size:8px;color:#aab4a5}
#twocode-settings-v2 .tc-preview{display:inline-flex;gap:3px;margin-right:6px;vertical-align:middle}
#twocode-settings-v2 .tc-preview i{width:5px;height:8px;border-radius:50%;display:block}`;
  document.head.appendChild(style);

  const esc = s => String(s).replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
  // A settings block. With a demo name, clicking anywhere on the block shows it on TwoCode in the locker.
  const row = (title, help, control, demo = '') => `<div class="tc-setting-row${demo ? ' tc-demo' : ''}"${demo ? ` data-demo="${demo}"` : ''}><div><strong>${title}</strong><small>${help}</small></div>${control}</div>`;
  const chips = (key, options) => `<div class="tc-chips">${options.map(([value, label, locked]) =>
    `<button type="button" class="tc-chip ${prefs[key] === value ? 'on' : ''}" data-pref="${key}" data-value="${esc(value)}" ${locked ? 'disabled title="Nog niet verdiend"' : ''}>${locked ? '🔒 ' : ''}${label}</button>`).join('')}</div>`;
  const toggle = key => `<button type="button" class="tc-toggle ${prefs[key] ? 'on' : ''}" data-pref="${key}" data-toggle="1" aria-pressed="${prefs[key]}">${prefs[key] ? 'Aan' : 'Uit'}</button>`;
  const swatches = (key, colours) => `<div class="tc-chips">${Object.entries(colours).map(([name, c]) =>
    `<button type="button" class="tc-swatch ${prefs[key] === name ? 'on' : ''}" style="background:${Array.isArray(c) ? `linear-gradient(135deg,${c[0]},${c[1]})` : c}" data-pref="${key}" data-value="${name}" title="${name}" aria-label="${name}"></button>`).join('')}</div>`;
  const preview = p => `<span class="tc-preview">${[p.busy, p.done, p.error].map(c => `<i style="background:${c};box-shadow:0 0 6px ${c}"></i>`).join('')}</span>`;

  // Traffic-light eyes: pick your own colour for every state (plus three quick presets).
  const LIGHT_OPTIONS = {
    lightBusy: ['#ff9a1f', '#ffb000', '#ffd23f', '#ff6b9d', '#c9a7ff', '#8fd3ff'],
    lightDone: ['#22e05a', '#8ef0a8', '#c6e994', '#2ee6d6', '#3d9bff', '#ffffff'],
    lightError: ['#ff3b3b', '#ff8a8a', '#e11d48', '#ff6b00', '#ff5ac8', '#b04bff']
  };
  const LIGHT_PRESETS = { klassiek: ['#ff9a1f', '#22e05a', '#ff3b3b', 'Klassiek'], zacht: ['#ffc27a', '#8ef0a8', '#ff8a8a', 'Zacht'], kleurenblind: ['#ffb000', '#3d9bff', '#ff5ac8', 'Kleurenblind'] };
  const lightsBlock = () => `<div class="tc-setting-row tc-demo tc-lights" data-demo="lights"><div class="tc-lights-head"><div><strong>Stoplicht-ogen</strong><small>Kies zelf de kleur voor elke stand. Klik het blokje voor een test.</small></div>
    <div class="tc-chips">${Object.entries(LIGHT_PRESETS).map(([k, [b, d, e, label]]) => `<button type="button" class="tc-chip ${prefs.lightBusy === b && prefs.lightDone === d && prefs.lightError === e ? 'on' : ''}" data-lightpreset="${k}">${preview({ busy: b, done: d, error: e })}${label}</button>`).join('')}</div></div>
    ${[['lightBusy', 'Bezig of een vraag'], ['lightDone', 'Klaar'], ['lightError', 'Fout']].map(([key, label]) => `<div class="tc-light-line"><span><i style="background:${prefs[key]};box-shadow:0 0 8px ${prefs[key]}"></i>${label}</span><div class="tc-chips">${LIGHT_OPTIONS[key].map(c => `<button type="button" class="tc-swatch ${prefs[key] === c ? 'on' : ''}" style="background:${c}" data-pref="${key}" data-value="${c}" aria-label="${label}: ${c}"></button>`).join('')}</div></div>`).join('')}</div>`;
  const MOOD_DEMO = [['happy', '😊 Blij'], ['heart', '😍 Verliefd'], ['surprised', '😮 Verrast'], ['curious', '🤔 Nieuwsgierig'], ['focus', '🧐 Gefocust'], ['wink', '😉 Knipoog'], ['sad', '😢 Verdrietig'], ['dizzy', '😵 Duizelig'], ['sleep', '😴 Slaperig']];
  // Settings → Karakter (the locker): everything about how TwoCode looks and behaves.
  window.__twocodeSettingsCharacter = (sleepRow = '') => [
    '<div class="tc-group" data-icon="🏷️" style="--g:#5ad1c4">Naam</div>',
    row('Hoe heet hij?', 'Hij zegt het als hij hoi zegt', `<div class="tc-step"><input class="tc-input tc-name" id="tc-in-petname" maxlength="18" placeholder="TwoCode" value="${esc(prefs.name || '')}"><button type="button" class="tc-chip on" data-setname="1">Opslaan</button></div>`),
    '<div class="tc-group" data-icon="🎨" style="--g:#ff86c2">Uiterlijk</div>',
    row('Kleur van de ogen', 'Als er niks aan de hand is', swatches('eye', EYES), 'look'),
    row('Kleur van het lijfje', 'Kies wat bij hem past', swatches('body', BODIES), 'look'),
    lightsBlock(),
    row('Outfit', `${doneCount} taken klaar. Verdien meer door taken af te ronden.`,
      chips('outfit', [['auto', 'Beste'], ['geen', 'Geen'], ...OUTFITS.map(o => [o.id, o.name[0].toUpperCase() + o.name.slice(1), !unlocked(o.id)])]), 'look'),
    row('Seizoensoutfits', 'Kerstmuts, heksenhoed, oranje kroon op Koningsdag', toggle('seasonal'), 'look'),
    '<div class="tc-group" data-icon="🤖" style="--g:#7fb2ff">Gedrag · klik een blokje voor een voorbeeld</div>',
    row('Gezichtjes', 'Blij, verdrietig, nieuwsgierig, gefocust', toggle('faces'), 'faces'),
    row('Emoties bekijken', 'Klik er een aan om het te zien', `<div class="tc-chips">${MOOD_DEMO.map(([m, label]) => `<button type="button" class="tc-chip" data-mood="${m}">${label}</button>`).join('')}</div>`),
    row('Knipperen', 'Hij knippert af en toe met zijn ogen', toggle('blink'), 'blink'),
    row('Dansen op muziek', 'Meebewegen als Spotify speelt', toggle('dance'), 'dance'),
    sleepRow,
    row('In slaap vallen na', 'Als er niks gebeurt (Slaapeffect moet aan staan)', chips('sleepMin', [[5, '5 min'], [10, '10 min'], [30, '30 min']]), 'sleep'),
    row('Opstartanimatie', 'Zwaaien en "hoi" zeggen bij het opstarten', toggle('startup'), 'hello'),
    row('Honger', prefs.hunger ? `${petName()} is ${window.__twocodeHunger?.() ?? 0}% vol. Elke taak geeft eten 🍪` : 'Hij krijgt honger als je lang geen taak afmaakt', toggle('hunger'), 'hunger'),
    `<div class="tc-group" data-icon="🏆" style="--g:#ffc93c">Prestaties · ${badges.size}/${BADGES.length}</div>`,
    `<div class="tc-badges">${BADGES.map(b => `<div class="tc-badge ${badges.has(b.id) ? 'on' : ''}" title="${esc(b.how)}"><span>${badges.has(b.id) ? b.icon : '🔒'}</span><b>${esc(b.name)}</b><small>${esc(b.how)}</small></div>`).join('')}</div>`,
  ].join('');
  // What the locker shows under TwoCode.
  window.__twocodeLocker = () => ({ name: petName(), done: doneCount, badges: badges.size, total: BADGES.length });

  // Settings → Algemeen: the island itself.
  const TESTS = [['hello', '👋 Opstarten'], ['bye', '😴 Afsluiten'], ['busy', '🟠 Claude bezig'], ['question', '❓ Claude vraagt'],
    ['done', '🟢 Claude klaar'], ['error', '🔴 Claude fout'], ['music', '🎵 Nep-muziek'], ['focus', '⏱️ Focus 1 min'], ['clear', '🧹 Alles stoppen']];
  window.__twocodeSettingsExtra = () => [
    '<div class="tc-group" data-icon="🌍" style="--g:#7fb2ff">Taal</div>',
    row('Taal · Language', 'De taal van de island', chips('lang', [['nl', 'Nederlands'], ['en', 'English']])),
    '<div class="tc-group" data-icon="🧪" style="--g:#b98cff">Testen</div>',
    row('Testmodus', 'Knoppen om alles te bekijken zonder echte Claude of muziek', toggle('testMode')),
    prefs.testMode ? `<div class="tc-tests">${TESTS.map(([k, label]) => `<button type="button" class="tc-chip" data-test="${k}">${label}</button>`).join('')}</div>` : '',
    '<div class="tc-group" data-icon="✨" style="--g:#ffb35c">Animaties</div>',
    row('Snelheid', 'Hoe snel de island opent, sluit en reageert', chips('speed', [['snel', 'Snel'], ['normaal', 'Normaal']])),
    row('App-animaties', 'Robo doet een kunstje als je een app opent', toggle('appAnim')),
    row('Confetti', 'Bij lange taken, focus klaar en nieuwe outfits', toggle('confetti'), 'confetti'),
    '<div class="tc-group" data-icon="🔔" style="--g:#ff6b6b">Focus &amp; meldingen</div>',
    row('Stoplicht-geluiden', 'Ding bij klaar, pling bij een vraag, laag bij fout', toggle('chimes'), 'chimes'),
    row('Windows-meldingen', 'Melding bij klaar, vraag, focus en limiet', toggle('notify')),
    row('Waarschuw bij limiet', 'Melding als je zoveel van je 5-uurslimiet gebruikt hebt', chips('warnAt', [[70, '70%'], [80, '80%'], [90, '90%'], [0, 'Nooit']])),
    row('Geluidspakket', 'Hoe de stoplicht-geluiden klinken (klik om te horen)', chips('pack', Object.entries(PACKS).map(([k, p]) => [k, p.label]))),
    '<div class="tc-group" data-icon="🏝️" style="--g:#c6e994">Island</div>',
    row('Weer', extrasCfg.city ? `Nu: ${esc(extrasCfg.city)}` : 'Typ je stad om het weer op het homescherm te zien',
      `<div class="tc-step"><input class="tc-input" id="tc-in-city" maxlength="80" placeholder="Bijv. Amsterdam" value="${esc(extrasCfg.city || '')}"><button type="button" class="tc-chip" data-pref="city" data-save="1">Opslaan</button></div>`),
    row('Agenda', extrasCfg.calendarUrl ? 'Gekoppeld: je volgende afspraak staat op het homescherm' : 'Google Agenda: Instellingen → je agenda → "Geheim adres in iCal-indeling". Plak die link hier.',
      `<div class="tc-step"><input class="tc-input" id="tc-in-calendarUrl" maxlength="2000" placeholder="https://… .ics" value="${esc(extrasCfg.calendarUrl || '')}"><button type="button" class="tc-chip" data-pref="calendarUrl" data-save="1">Opslaan</button></div>`),
    extrasError ? `<p class="tc-ai-error" role="alert">${esc(extrasError)}</p>` : '',
    row('Volumebalk', 'Laat het volume zien in de island als je het verandert', toggle('volumeHud')),
    row('Batterij-waarschuwing', 'Laptop en Bluetooth (koptelefoon, muis) bijna leeg', toggle('batteryWarn')),
    `<div class="tc-setting-row"><div><strong>Alles terugzetten</strong><small>Zet al deze keuzes terug naar standaard</small></div><button type="button" class="tc-toggle" data-pref="reset">Herstel</button></div>`,
    '<div class="tc-group" data-icon="⏻" style="--g:#ff8a8a">TwoCode</div>',
    row('Starten met Windows', 'TwoCode start vanzelf als je je pc aanzet', `<button type="button" class="tc-toggle ${loginOn ? 'on' : ''}" data-login="1" aria-pressed="${loginOn}">${loginOn ? 'Aan' : 'Uit'}</button>`),
    row('Opnieuw starten', 'Sluit TwoCode en start hem meteen opnieuw', '<button type="button" class="tc-chip" data-restart="1">Herstart</button>'),
    row('Afsluiten', 'Sluit TwoCode helemaal af. Kan ook via Robo rechtsonder bij de klok.', '<button type="button" class="tc-chip" data-quit="1">Afsluiten</button>')
  ].join('');

  // Settings: click a block and TwoCode shows what it does (in the locker).
  const later = (ms, fn) => setTimeout(fn, ms);
  const DEMOS = {
    look: () => { jump(); feel('happy', 900); chime('pop'); },
    lights: () => { lightsDemoAt = now(); chime('pop'); },
    faces: () => [['happy', 0], ['curious', 750], ['surprised', 1500], ['sad', 2250], ['heart', 3000]].forEach(([m, ms]) => later(ms, () => feel(m, 760))),
    blink: () => [0, 450, 900].forEach(ms => later(ms, () => feel('blink', 160))),
    dance: () => { danceDemoUntil = now() + 3200; },
    sleep: () => { feel('sleep', 3200); chime('pop'); },
    hello: () => { sayHi(); jump(); feel('happy', 1300); waveUntil = now() + 1300; },
    hunger: () => { feel('sad', 1800); later(1900, () => { jump(); feel('happy', 900); }); },
    confetti: () => { confetti(30); jump(); feel('happy', 900); },
    chimes: () => chime('done')
  };
  window.__twocodeDemo = name => { if (drafting) previewDemo(name); else DEMOS[name]?.(); };
  // ---------- test mode: see every state without a real Claude Code session or music ----------
  let fakeMusicUntil = 0;
  function fakeMusic() {
    const realRefresh = window.__twocodeRealRefresh || refreshSpotify;
    window.__twocodeRealRefresh = realRefresh;
    refreshSpotify = async () => {}; // the real Spotify check would replace the fake song
    const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 200, 200); gr.addColorStop(0, '#ff5ac8'); gr.addColorStop(1, '#3d1a8e'); g.fillStyle = gr; g.fillRect(0, 0, 200, 200);
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(100, 100, 46, 0, Math.PI * 2); g.fill();
    albumImage = new Image(); albumImage.src = c.toDataURL(); window.__twocodeAlbumColour = '#ff5ac8';
    spotifyConnected = true; spotifyState = { is_playing: true, progress_ms: 0, duration_ms: 210000, track: { name: 'Testnummer', artist: 'TwoCode', id: 'test' } }; spotifySyncAt = performance.now();
    fakeMusicUntil = now() + 30000; window.__twocodeSettleSize?.();
    setTimeout(() => { if (now() >= fakeMusicUntil) stopFakeMusic(); }, 30100);
  }
  function stopFakeMusic() {
    fakeMusicUntil = 0;
    if (window.__twocodeRealRefresh) { refreshSpotify = window.__twocodeRealRefresh; window.__twocodeRealRefresh = null; }
    spotifyState = { is_playing: false, track: null }; albumImage = null; window.__twocodeAlbumColour = null; refreshSpotify(); window.__twocodeSettleSize?.();
  }
  function runTest(kind) {
    const claude = k => window.twocode?.aiMonitorHooksTest?.(k).then(() => window.__twocodeMonitor?.refresh()).catch(() => {});
    if (kind === 'hello') startHello();
    else if (kind === 'bye') { window.__twocodeBye(); setTimeout(() => { window.__twocodeByeReset(); jump(); feel('happy', 900); }, 1600); } // a test: he comes back
    else if (kind === 'music') fakeMusic();
    else if (kind === 'focus') focus.start(60);
    else if (kind === 'clear') { claude('clear'); if (fakeMusicUntil) stopFakeMusic(); if (focus.active()) focus.stop(); }
    else if (kind === 'hungry') { food = { value: 12, at: Date.now() }; store.set('twocode:food', food); } // hungry right away: the next finished task feeds him
    else claude(kind);
  }
  window.__twocodeTest = runTest; // the same test scenes from the console (or a video recording)
  // City and calendar link live in the main process (extras-main.cjs).
  let extrasCfg = {}, extrasError = '';
  const rerender = () => window.dispatchEvent(new Event('twocode:open-ai-settings'));
  window.twocode?.extrasConfig?.().then(r => { if (r.ok) extrasCfg = r.config; }).catch(() => {});
  // Start with Windows lives in the main process (tray-main.cjs).
  let loginOn = false;
  window.twocode?.loginGet?.().then(r => { if (r?.ok) loginOn = r.on; }).catch(() => {});
  window.__twocodeSettingsAction = target => {
    if (target.dataset.quit) { window.twocode?.close?.(); return true; }
    if (target.dataset.restart) { window.twocode?.restart?.(); return true; }
    if (target.dataset.login) { window.twocode?.loginSet?.(!loginOn).then(r => { if (r?.ok) loginOn = r.on; rerender(); }).catch(() => {}); return true; }
    if (target.dataset.mood) { feel(target.dataset.mood, 2600); jump(); return true; } // emotion preview in the locker
    if (target.dataset.test) { runTest(target.dataset.test); return true; }
    if (target.dataset.setname) {
      prefs.name = (document.getElementById('tc-in-petname')?.value || '').trim().slice(0, 18) || 'TwoCode'; save();
      jump(); feel('heart', 1400); chime('pop'); return true;
    }
    if (target.dataset.lightpreset) {
      const [b, d, e] = LIGHT_PRESETS[target.dataset.lightpreset]; Object.assign(prefs, { lightBusy: b, lightDone: d, lightError: e }); save();
      if (!drafting) lightsDemoAt = now(); return true;
    }
    const key = target.dataset.pref; if (!key) return false;
    if (target.dataset.save) {
      const value = document.getElementById('tc-in-' + key)?.value || '';
      window.twocode.extrasConfig({ [key]: value }).then(r => {
        extrasError = r.ok ? '' : r.error; if (r.ok) extrasCfg = r.config;
        window.__twocodeRefreshInfo?.(); rerender();
      });
      return true;
    }
    if (key === 'reset') Object.assign(prefs, DEFAULTS);
    else if (target.dataset.toggle) prefs[key] = !prefs[key];
    else if (target.dataset.step) prefs[key] = Math.min(120, Math.max(5, prefs[key] + Number(target.dataset.step)));
    else { const raw = target.dataset.value; prefs[key] = typeof DEFAULTS[key] === 'number' ? Number(raw) : raw; }
    save();
    if (key === 'eye' || key === 'body' || key === 'palette' || key === 'outfit' || key === 'seasonal') { jump(); feel('happy', 700); }
    if (key === 'pack') chime('done');
    if (/^light(Busy|Done|Error)$/.test(key) && !drafting) lightPreview = { color: prefs[key], until: now() + 1400 }; // show the new colour on his eyes
    return true;
  };

  // ---------- TwoCode Instellingen: drafts and the app's own Robo (settings-bridge-ui.js, buddy-ui.js) ----------
  let previewing = false;
  const later2 = (ms, fn) => setTimeout(fn, ms);
  const pFeel = (mood, ms) => { pv.feeling = mood; pv.feelingUntil = now() + ms; };
  // The examples in the settings list, played by the app's Robo only.
  function previewDemo(name) {
    const hop = () => { pv.bounceAt = now(); };
    ({
      look: () => { hop(); pFeel('happy', 900); },
      lights: () => { hop(); pFeel('happy', 700); },
      faces: () => [['happy', 0], ['curious', 750], ['surprised', 1500], ['sad', 2250], ['heart', 3000]].forEach(([m, ms]) => later2(ms, () => pFeel(m, 760))),
      blink: () => [0, 450, 900].forEach(ms => later2(ms, () => pFeel('blink', 160))),
      dance: () => { pv.danceUntil = now() + 3200; },
      sleep: () => pFeel('sleep', 3200),
      hello: () => { hop(); pFeel('happy', 1300); pv.waveUntil = now() + 1300; },
      hunger: () => { pFeel('sad', 1800); later2(1900, () => { hop(); pFeel('happy', 900); }); },
      confetti: () => { hop(); pFeel('happy', 900); },
      chimes: () => { chime('done'); pFeel('happy', 700); }
    })[name]?.();
  }
  window.__twocodePreviewPrefs = p => { pv.prefs = p ? { ...p } : null; };
  window.__twocodeRealPrefs = () => ({ ...prefs });
  // Run a click from the settings app on a draft: prefs become the draft for this moment, nothing is saved,
  // feelings go to the app's Robo, and afterwards the real prefs are back.
  window.__twocodeWithDraft = (draft, fn) => {
    const real = { ...prefs };
    for (const k of Object.keys(prefs)) delete prefs[k];
    Object.assign(prefs, draft); drafting = true;
    try { return fn(); }
    finally {
      const out = { ...prefs };
      for (const k of Object.keys(prefs)) delete prefs[k];
      Object.assign(prefs, real); drafting = false;
      for (const k of Object.keys(draft)) delete draft[k];
      Object.assign(draft, out);
    }
  };
  // Save: the draft becomes the real thing, and the real Robo is happy with it.
  window.__twocodeSaveDraft = draft => { Object.assign(prefs, draft); save(); jump(); feel('happy', 1400); chime('pop'); };
  // Draw the app's Robo: for this one drawing everything he reads comes from the preview, then the real
  // Robo's state is put back. So a test timer, Claude or music never shows on him, and nothing leaks out.
  window.__twocodeDrawPreview = draw => {
    const keep = { prefs: { ...prefs }, feeling, feelingUntil, bounceAt, danceDemoUntil, waveUntil, showAt, byeAt, popAt, nextBlink, lastWake,
      spotify: spotifyState, angry: typeof angry === 'number' ? angry : 0, dizzy: typeof dizzy === 'number' ? dizzy : 0, basket: window.__twocodeBasket, locker: window.__twocodeLockerDraw };
    if (pv.prefs) Object.assign(prefs, pv.prefs);
    feeling = pv.feeling; feelingUntil = pv.feelingUntil; bounceAt = pv.bounceAt; danceDemoUntil = pv.danceUntil;
    waveUntil = pv.waveUntil; showAt = null; byeAt = null; popAt = -1e9; nextBlink = pv.nextBlink || now() + 2000; lastWake = Date.now();
    spotifyState = { is_playing: false, track: null }; angry = 0; dizzy = 0; window.__twocodeBasket = null; window.__twocodeLockerDraw = true;
    previewing = true;
    try { draw(); }
    finally {
      previewing = false; pv.nextBlink = nextBlink;
      for (const k of Object.keys(prefs)) delete prefs[k];
      Object.assign(prefs, keep.prefs);
      ({ feeling, feelingUntil, bounceAt, danceDemoUntil, waveUntil, showAt, byeAt, popAt, nextBlink, lastWake } = keep);
      spotifyState = keep.spotify; angry = keep.angry; dizzy = keep.dizzy; window.__twocodeBasket = keep.basket; window.__twocodeLockerDraw = keep.locker;
    }
  };
})();
