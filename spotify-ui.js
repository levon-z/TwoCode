'use strict';
// Spotify screen: album cover, song, progress bar (click to jump) and previous / play-pause / next.
// Replaces the old drawSpotify in mascot.html, which only showed the song title.
(function spotifyScreen() {
  const api = window.twocode;
  // Colour of the album cover (extras-ui.js), Spotify green as fallback.
  const accent = () => window.__twocodeAlbumColour || '#1ed760';
  const tr2 = t => window.__twocodeTr ? window.__twocodeTr(t) : t; // the island's language for text not drawn with text()
  const time = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const position = () => Math.min(spotifyState.duration_ms || 0,
    (spotifyState.progress_ms || 0) + (spotifyState.is_playing ? performance.now() - spotifySyncAt : 0));

  // Vector media icons (crisper than text glyphs).
  function mediaIcon(kind, x, y, s, colour) {
    ctx.save(); ctx.fillStyle = colour; ctx.beginPath();
    const tri = (x0, dir) => { ctx.moveTo(x0, y - s / 2); ctx.lineTo(x0 + dir * s * 0.75, y); ctx.lineTo(x0, y + s / 2); ctx.closePath(); };
    if (kind === 'play') tri(x - s * 0.3, 1);
    else if (kind === 'pause') { ctx.roundRect(x - s * 0.4, y - s / 2, s * 0.28, s, 2); ctx.roundRect(x + s * 0.12, y - s / 2, s * 0.28, s, 2); }
    else { const d = kind === 'next' ? 1 : -1; tri(x - d * s * 0.6, d); tri(x - d * s * 0.05, d); ctx.roundRect(x + d * s * 0.7 - (d > 0 ? 0 : s * 0.16), y - s / 2, s * 0.16, s, 1); }
    ctx.fill(); ctx.restore();
  }
  window.__twocodeMediaIcon = mediaIcon;
  // The music visualizer in the cover's colour: bars that follow the sound when TwoCode can hear it, otherwise a made-up
  // dance. Every bar rises fast and falls slowly (like a real level meter), with a soft glow in the same colour.
  const vizState = {};
  window.__twocodeVisualizer = (key, x, cy, w, h, colour, n = 6) => {
    const levels = window.__twocodeAudioLevels?.(), t = performance.now() / 1000, playing = spotifyState.is_playing;
    const bars = vizState[key] && vizState[key].length === n ? vizState[key] : (vizState[key] = new Array(n).fill(0.15));
    const gap = Math.max(2, (w / n) * 0.4), bw = (w - gap * (n - 1)) / n;
    ctx.save(); ctx.shadowColor = colour; ctx.shadowBlur = h * 0.35;
    for (let i = 0; i < n; i++) {
      const raw = !playing ? 0.06 : levels ? levels[Math.min(levels.length - 1, Math.floor(i * levels.length / n))] || 0.06
        : 0.2 + 0.6 * Math.abs(Math.sin(t * (2.1 + i * 0.43) + i * 1.7)) * (0.65 + 0.35 * Math.sin(t * 1.3 + i * 0.9));
      const want = !playing ? 0.1 : Math.min(1, 0.12 + 1.15 * Math.pow(raw, 0.65)); // lift the quiet part, so the bars really dance; flat when paused
      bars[i] += (want - bars[i]) * (want > bars[i] ? 0.5 : 0.16);
      const bh = Math.max(bw, h * Math.min(1, bars[i]));
      box(x + i * (bw + gap), cy - bh / 2, bw, bh, bw / 2, colour);
    }
    ctx.restore();
  };
  // While music plays, the album's colour rises from the bottom of the island (black at the top, like a notch).
  let tintK = 0, tintColour = null;
  const rgba = (c, a) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c); if (m) return `rgba(${m[1]},${m[2]},${m[3]},${a})`; const n = parseInt(String(c).replace('#', '').slice(0, 6), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  window.__twocodeIslandBackdrop = (x, w, h, r) => {
    const want = mode === 'expanded' && window.__twocodeTintIsland && performance.now() - (window.__twocodeTintAt || 0) < 120;
    if (want) tintColour = window.__twocodeTintIsland;
    const strength = want ? (window.__twocodeTintStrength ?? 1) : 0; window.__twocodeTintStrength = undefined; // a page may dim it (it says so every frame)
    tintK += (strength - tintK) * (want ? 0.12 : 0.12);
    if (tintK < 0.01 || !tintColour) return;
    ctx.save(); islandPath(x, 0, w, h, r); ctx.clip();
    // black at the top (where the screen edge is), the cover's colour rising from the bottom
    const g = ctx.createLinearGradient(0, h * 0.18, 0, h);
    g.addColorStop(0, rgba(tintColour, 0)); g.addColorStop(0.5, rgba(tintColour, 0.2 * tintK)); g.addColorStop(1, rgba(tintColour, 0.6 * tintK));
    ctx.fillStyle = g; ctx.fillRect(x, 0, w, h); ctx.restore();
  };
  // ---- Spotify Connect: where the music plays (this PC, your phone, the car…) and moving it, like Spotify's speaker button ----
  let devicesOpen = false, devices = [], devicesNote = '';
  const spotify403 = () => tr2('Spotify gaf 403. In Development Mode heeft de app-eigenaar Premium nodig en moet je account in Users and Access staan. Afspelen vereist ook Premium.');
  const spotifyError = (status, message) => {
    if (Number(status) === 403) return spotify403();
    if (/premium/i.test(String(message || ''))) return tr2('Spotify-bediening vereist een Premium-account.');
    return message || tr2('Dat lukte niet.');
  };
  function devIcon(type, x, y, s, colour) { // small line icons per kind of device
    ctx.save(); ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.beginPath();
    if (type === 'Smartphone') ctx.roundRect(x - s * 0.28, y - s * 0.5, s * 0.56, s, 2.5);
    else if (type === 'Automobile') { ctx.roundRect(x - s * 0.5, y - s * 0.1, s, s * 0.38, 3); ctx.moveTo(x - s * 0.32, y - s * 0.1); ctx.lineTo(x - s * 0.2, y - s * 0.38); ctx.lineTo(x + s * 0.2, y - s * 0.38); ctx.lineTo(x + s * 0.32, y - s * 0.1); }
    else if (type === 'Speaker' || type === 'CastAudio' || type === 'AVR') { ctx.roundRect(x - s * 0.34, y - s * 0.5, s * 0.68, s, 3); ctx.moveTo(x + s * 0.14, y + s * 0.12); ctx.arc(x, y + s * 0.12, s * 0.14, 0, Math.PI * 2); }
    else if (type === 'TV' || type === 'CastVideo') { ctx.roundRect(x - s * 0.5, y - s * 0.38, s, s * 0.62, 2); ctx.moveTo(x - s * 0.22, y + s * 0.42); ctx.lineTo(x + s * 0.22, y + s * 0.42); }
    else { ctx.roundRect(x - s * 0.42, y - s * 0.36, s * 0.84, s * 0.56, 2); ctx.moveTo(x - s * 0.55, y + s * 0.34); ctx.lineTo(x + s * 0.55, y + s * 0.34); } // a laptop
    ctx.stroke(); ctx.restore();
  }
  async function loadDevices() {
    devicesNote = '…';
    try { const r = await api.spotifyDevices?.(); devices = r?.devices || []; devicesNote = r?.ok ? (devices.length ? '' : 'Open Spotify op een ander apparaat, dan zie je het hier.') : spotifyError(r?.status, r?.error || 'Kon je apparaten niet ophalen.'); }
    catch { devicesNote = tr2('Kon je apparaten niet ophalen.'); }
  }
  async function moveTo(device) {
    devicesNote = 'Wisselen naar ' + device.name + '…';
    const r = await api.spotifyTransfer?.(device.id).catch(e => ({ ok: false, error: e.message }));
    if (r?.ok) { devicesOpen = false; devicesNote = ''; window.__twocodeFlash?.('🔊  ' + device.name, 1200); window.__twocodeChime?.('pop'); setTimeout(() => refreshSpotify(), 700); }
    else devicesNote = spotifyError(r?.status, r?.error || 'Dat lukte niet.');
  }

  // The player: one glass card tinted by the album cover, the cover big on the left,
  // then the song, a clean progress line and iPhone-style controls (a white play button in the middle).
  drawSpotify = function (content) {
    const left = content.x + 4, top = content.y + 2, track = spotifyState.track;
    hit.ghost = null;
    if (!spotifyConnected) { // not linked yet: a small tile, two lines and one button
      const x0 = content.x, y0 = content.y + 6;
      box(x0, y0, 52, 52, 10, '#1c1c1e'); window.__twocodeIcon?.('music', x0 + 26, y0 + 26, 22, '#8e8e93', null, 'rgba(0,0,0,0)');
      text('Spotify koppelen', x0 + 64, y0 + 22, 15, '#fff', 600);
      text('Dan zie en bedien je je muziek hier.', x0 + 64, y0 + 40, 12, '#8e8e93', 400);
      const b = { x: x0 + 64, y: y0 + 54, width: 128, height: 28 }, over = inside(pointer.x, pointer.y, b);
      box(b.x, b.y, b.width, b.height, 8, over ? '#e5e5ea' : '#ffffff');
      text('Koppel Spotify', b.x + b.width / 2, b.y + 18.5, 12, '#000', 600, 'center');
      hit.spConnect = b;
      return;
    }
    // the player, compact like a notch app: the cover colours the island, small sharp white type
    const art = albumImage?.complete && albumImage.naturalWidth, colour = accent(), soft = 'rgba(255,255,255,.55)';
    window.__twocodeTintIsland = window.__twocodeAlbumColour; window.__twocodeTintAt = performance.now();
    const x0 = content.x, right = content.x + content.width, top0 = content.y + 2, cs = 60;
    const display = (str, tx, ty, sz, col, weight = 600, max) => { ctx.save(); ctx.font = `${weight} ${sz}px Inter, "Segoe UI", sans-serif`; ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      let t = String(str || ''); if (max) while (t.length > 1 && ctx.measureText(t).width > max) t = t.slice(0, -2) + '…'; ctx.fillText(t, tx, ty); ctx.restore(); };
    if (art) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4; box(x0, top0, cs, cs, 10, '#1c1c1e'); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.roundRect(x0, top0, cs, cs, 10); ctx.clip(); ctx.drawImage(albumImage, x0, top0, cs, cs); ctx.restore(); }
    else { box(x0, top0, cs, cs, 10, '#1c1c1e'); window.__twocodeIcon?.('music', x0 + cs / 2, top0 + cs / 2, 22, '#8e8e93', null, 'rgba(0,0,0,0)'); }
    // the visualizer in the cover's colour (it moves with the music when TwoCode can hear it)
    window.__twocodeVisualizer('page', right - 44, top0 + 24, 44, 28, colour, 6);
    const tx = x0 + cs + 12, titleW = right - 56 - tx;
    if (!track) {
      const denied = Number(spotifyState.status) === 403;
      display(tr2(denied ? 'Spotify blokkeert deze app (403)' : 'Er speelt nu niks'), tx, top0 + 26, 15, '#fff', 600, titleW);
      text(denied ? 'Controleer Spotify Development Mode-toegang in het dashboard.' : 'Start muziek in Spotify, of druk op afspelen.', tx, top0 + 44, 12, '#8e8e93', 400, 'left', titleW);
    } else {
      const over = inside(pointer.x, pointer.y, { x: tx, y: top0 + 10, width: titleW, height: 20 });
      display(track.name, tx, top0 + 26, 15, over ? soft : '#fff', 600, titleW);
      text(track.artist, tx, top0 + 44, 12, soft, 400, 'left', titleW);
    }
    hit.spTitle = { x: tx, y: top0 + 10, width: titleW, height: 20 };
    // the timeline: elapsed, a thin bar (grows when you point at it), remaining
    const barY = top0 + cs + 16, bx0 = x0 + 34, bw = right - 40 - bx0, part = spotifyState.duration_ms ? position() / spotifyState.duration_ms : 0;
    const overBar = inside(pointer.x, pointer.y, { x: bx0, y: barY - 8, width: bw, height: 16 }), bh = overBar ? 6 : 3;
    text(time(position()), x0, barY + 3.5, 10, soft, 500);
    box(bx0, barY - bh / 2, bw, bh, bh / 2, 'rgba(255,255,255,.2)');
    box(bx0, barY - bh / 2, Math.max(bh, bw * part), bh, bh / 2, '#ffffff');
    text(spotifyState.duration_ms ? '-' + time(spotifyState.duration_ms - position()) : '0:00', right, barY + 3.5, 10, soft, 500, 'right');
    hit.spSeek = { x: bx0, y: barY - 8, width: bw, height: 16 };
    // controls: previous, play/pause, next, small and centred; where it plays, bottom right
    const cy = barY + 22, mid = (x0 + right) / 2;
    const ctl = (kx, kind, key, size) => { // plain white symbols, they dim while you point at them
      const b = { x: kx - 20, y: cy - 14, width: 40, height: 28 }, over = inside(pointer.x, pointer.y, b);
      ctx.save(); ctx.globalAlpha *= over ? 0.6 : 1; mediaIcon(kind, kx, cy, size, '#ffffff'); ctx.restore(); hit[key] = b;
    };
    ctl(mid - 46, 'prev', 'spPrev', 12); ctl(mid, spotifyState.is_playing ? 'pause' : 'play', 'spPlay', 17); ctl(mid + 46, 'next', 'spNext', 12);
    const dev = spotifyState.device;
    ctx.save(); ctx.font = '600 11px Inter, "Segoe UI", sans-serif'; const devLabel = dev ? dev.name : tr2('Deze pc'), dw = Math.min(130, ctx.measureText(devLabel).width + 34); ctx.restore();
    const dbx = right - dw, dby = cy - 11, overDev = inside(pointer.x, pointer.y, { x: dbx, y: dby, width: dw, height: 22 });
    box(dbx, dby, dw, 22, 7, devicesOpen || overDev ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.1)');
    devIcon(dev?.type || 'Computer', dbx + 13, dby + 11, 12, '#ffffff');
    text(devLabel, dbx + 25, dby + 15, 11, '#ffffff', 600, 'left', dw - 30);
    hit.spDevices = { x: dbx, y: dby, width: dw, height: 22 };
    hit.spOpen = null;
    for (let i = 0; i < 5; i++) hit['spDev' + i] = null;
    if (devicesOpen) { // where it plays: a list like iOS's AirPlay menu
      const pw = 280, list = devices.slice(0, 4), ph = 52 + list.length * 40 + (devicesNote ? 22 : 0), px = right - pw, py = Math.max(content.y, dby - ph - 8);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; box(px, py, pw, ph, 12, '#1c1c1e'); ctx.restore();
      text('Speel af op', px + 16, py + 28, 15, '#fff', 600);
      text('✕', px + pw - 22, py + 28, 14, '#8e8e93', 600, 'center'); hit.spDevClose = { x: px + pw - 40, y: py + 6, width: 36, height: 36 };
      list.forEach((d, i) => {
        const ry = py + 44 + i * 40, b = { x: px + 6, y: ry, width: pw - 12, height: 40 }, over = inside(pointer.x, pointer.y, b);
        box(px + 16, ry, pw - 32, 1, 0, '#2c2c2e');
        if (over) box(b.x, b.y + 2, b.width, b.height - 4, 8, '#2c2c2e');
        devIcon(d.type, px + 26, ry + 20, 15, '#ffffff');
        text(d.name, px + 46, ry + 25, 15, '#ffffff', d.active ? 600 : 500, 'left', pw - 110);
        if (d.active) { ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(px + pw - 30, ry + 20); ctx.lineTo(px + pw - 26, ry + 24); ctx.lineTo(px + pw - 19, ry + 16); ctx.stroke(); ctx.restore(); }
        hit['spDev' + i] = { ...b, device: d };
      });
      if (devicesNote) text(devicesNote, px + 16, py + ph - 12, 12, '#8e8e93', 500, 'left', pw - 32);
    }
  };

  async function control(action) {
    window.dispatchEvent(new CustomEvent('twocode:badge', { detail: 'dj' }));
    if (action === 'play' || action === 'pause') { spotifyState.is_playing = action === 'play'; spotifySyncAt = performance.now(); }
    try { const result = await api.spotifyControl(action); if (!result?.ok && result?.error) console.warn('[TwoCode spotify]', result.error); } catch {}
    setTimeout(() => refreshSpotify(), 350);
  }
  // ---- swipe for music: drag left/right over the island (or swipe with two fingers on the touchpad) ----
  // left = next song, right = previous song. Works on the small island and on the Spotify page.
  let drag = null, swallowClick = false, wheelX = 0, wheelAt = 0, lastSwipe = 0;
  const canSwipe = (x, y) => spotifyConnected && spotifyState.track && inside(x, y, islandBounds) && (mode === 'compact' || currentView === 'spotify');
  function swipe(dir) {
    if (performance.now() - lastSwipe < 700) return; lastSwipe = performance.now();
    window.__twocodeFlash?.(dir > 0 ? '⏭  Volgend nummer' : '⏮  Vorig nummer', 900);
    window.__twocodeKick?.(dir > 0 ? -0.05 : 0.05);
    control(dir > 0 ? 'next' : 'previous');
  }
  canvas.addEventListener('pointerdown', e => { drag = canSwipe(e.clientX, e.clientY) ? { x: e.clientX, y: e.clientY } : null; });
  canvas.addEventListener('pointerup', e => {
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = null;
    if (Math.abs(dx) > 48 && Math.abs(dy) < 36) { swallowClick = true; swipe(dx < 0 ? 1 : -1); }
  });
  // on window (capture) so it runs before every other click handler: a swipe is not a click
  window.addEventListener('click', e => { if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  canvas.addEventListener('wheel', e => {
    if (!canSwipe(e.clientX, e.clientY) || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const now = performance.now(); if (now - wheelAt > 250) wheelX = 0; wheelAt = now; wheelX += e.deltaX;
    if (Math.abs(wheelX) > 90) { swipe(wheelX > 0 ? 1 : -1); wheelX = 0; }
  }, { passive: true });
  canvas.addEventListener('click', async event => {
    if (currentView !== 'spotify' || mode !== 'expanded') return;
    const x = event.clientX, y = event.clientY, hits = {
      spDevClose: () => { devicesOpen = false; },
      ...Object.fromEntries([0, 1, 2, 3].map(i => ['spDev' + i, () => hit['spDev' + i]?.device && moveTo(hit['spDev' + i].device)])),
      spDevices: () => { devicesOpen = !devicesOpen; if (devicesOpen) loadDevices(); },
      spPrev: () => control('previous'), spNext: () => control('next'),
      spPlay: () => control(spotifyState.is_playing ? 'pause' : 'play'), spOpen: () => control('open'), spTitle: () => control('open'),
      spConnect: async () => { try { await api.spotifyConnect(); } catch {} refreshSpotify(); },
      spSeek: () => {
        const bar = hit.spSeek, ms = Math.round(((x - bar.x) / bar.width) * (spotifyState.duration_ms || 0));
        spotifyState.progress_ms = ms; spotifySyncAt = performance.now(); api.spotifySeek(ms).catch(() => {});
      }
    };
    if (devicesOpen && !['spDevices', 'spDevClose', 'spDev0', 'spDev1', 'spDev2', 'spDev3'].some(k => inside(x, y, hit[k]))) { devicesOpen = false; event.preventDefault(); event.stopImmediatePropagation(); return; } // a click elsewhere closes the list
    for (const [key, run] of Object.entries(hits)) {
      if (inside(x, y, hit[key])) { event.preventDefault(); event.stopImmediatePropagation(); run(); return; }
    }
  }, true);
})();
