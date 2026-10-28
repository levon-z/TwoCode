// TwoCode in the Windows tray (next to the clock): Robo's face, with a menu to open the island,
// start with Windows, restart and quit. The island itself has no taskbar button, so this is the
// place where you can always find and close TwoCode. Also: only one TwoCode runs at a time.
const { app, Tray, Menu, nativeImage, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

let tray = null;
let language = 'en';

function island() {
  return BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
}

function openIsland() {
  const win = island(); if (!win) return;
  if (win.isMinimized()) win.restore();
  win.showInactive();
  win.webContents.send('extras:shortcut', 'home');
}

// Start with Windows. During development TwoCode runs as "electron.exe <folder>", so pass those along.
function loginOptions() { return app.isPackaged ? {} : { path: process.execPath, args: [app.getAppPath()] }; }
function startsWithWindows() { try { return app.getLoginItemSettings(loginOptions()).openAtLogin; } catch { return false; } }
function setStartsWithWindows(on) { try { app.setLoginItemSettings({ ...loginOptions(), openAtLogin: !!on }); } catch {} buildMenu(); }

function quit() { app.quit(); } // main.js shows the goodbye first
function restart() { app.relaunch(); app.quit(); }
const languageFile = () => path.join(app.getPath('userData'), 'twocode-language.json');
function readLanguage() {
  try { return JSON.parse(fs.readFileSync(languageFile(), 'utf8')).language === 'nl' ? 'nl' : 'en'; }
  catch { return 'en'; }
}
function setLanguage(value) {
  language = value === 'nl' ? 'nl' : 'en';
  app.twocodeLanguage = language;
  try {
    const file = languageFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify({ language }), { mode: 0o600 });
    fs.renameSync(file + '.tmp', file);
  } catch {}
  buildMenu();
}
const fromIsland = event => /mascot\.html/.test(event.senderFrame?.url || '');

function buildMenu() {
  if (!tray) return;
  const text = language === 'nl'
    ? { open: 'Open de island', settings: 'Instellingen', startup: 'Starten met Windows', restart: 'Opnieuw starten', quit: 'TwoCode afsluiten' }
    : { open: 'Open the island', settings: 'Settings', startup: 'Start with Windows', restart: 'Restart', quit: 'Quit TwoCode' };
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'TwoCode', enabled: false },
    { type: 'separator' },
    { label: text.open, accelerator: 'Ctrl+Alt+1', registerAccelerator: false, click: openIsland },
    { label: text.settings, click: () => app.emit('twocode-open-settings') },
    { label: text.startup, type: 'checkbox', checked: startsWithWindows(), click: item => setStartsWithWindows(item.checked) },
    { type: 'separator' },
    { label: text.restart, click: restart },
    { label: text.quit, click: quit }
  ]));
}

if (!app.requestSingleInstanceLock()) {
  // TwoCode already runs: that one opens its island, this one stops right away.
  app.exit(0);
} else {
  // "TwoCode Instellingen" in the Start menu starts TwoCode with --settings: then only that app opens.
  app.on('second-instance', (event, argv) => { if ((argv || []).includes('--settings')) app.emit('twocode-open-settings'); else openIsland(); });
  app.setName('TwoCode');
  ipcMain.on('app:set-language', (event, value) => { if (fromIsland(event)) setLanguage(value); });
  app.whenReady().then(() => {
    language = readLanguage();
    app.twocodeLanguage = language;
    // Windows shows the name and icon of a notification from a Start menu shortcut with the same app id.
    // Without it, notifications said "Electron". Made (or fixed) on every start, it costs nothing.
    if (process.platform === 'win32') {
      try {
        const { shell } = require('electron');
        const programs = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
        const link = path.join(programs, 'TwoCode.lnk');
        // An old "Electron" shortcut with TwoCode's app id made every notification say "Electron". Only that one goes.
        const old = path.join(programs, 'Electron.lnk');
        try {
          const info = require('node:fs').existsSync(old) && shell.readShortcutLink(old);
          if (info && info.appUserModelId === 'nl.twocode.assistent' && path.resolve(info.target) === path.resolve(process.execPath)) require('node:fs').unlinkSync(old);
        } catch {}
        shell.writeShortcutLink(link, require('node:fs').existsSync(link) ? 'replace' : 'create', {
          target: process.execPath,
          args: app.isPackaged ? '' : `"${app.getAppPath()}"`,
          cwd: app.isPackaged ? path.dirname(process.execPath) : app.getAppPath(),
          icon: path.join(__dirname, 'assets', 'icon.ico'), iconIndex: 0,
          appUserModelId: 'nl.twocode.assistent',
          description: 'TwoCode: Robo, de Dynamic Island voor Windows'
        });
        // The second app: TwoCode Instellingen, with its own icon and app id (its own button on the taskbar).
        const settingsLink = path.join(programs, 'TwoCode Instellingen.lnk');
        shell.writeShortcutLink(settingsLink, require('node:fs').existsSync(settingsLink) ? 'replace' : 'create', {
          target: process.execPath,
          args: (app.isPackaged ? '' : `"${app.getAppPath()}" `) + '--settings',
          cwd: app.isPackaged ? path.dirname(process.execPath) : app.getAppPath(),
          icon: path.join(__dirname, 'assets', 'settings-icon.ico'), iconIndex: 0,
          appUserModelId: 'nl.twocode.instellingen',
          description: 'TwoCode Instellingen: verbindingen, Robo, kledingkast en meer'
        });
      } catch {}
      // The shortcut alone was not enough: Windows also reads the name and icon of notifications from
      // HKCU\Software\Classes\AppUserModelId\<app id>. Only TwoCode's own key, in the user's own registry part.
      try {
        const { execFile } = require('node:child_process');
        const key = 'HKCU\\Software\\Classes\\AppUserModelId\\nl.twocode.assistent';
        const set = (name, value) => execFile('reg.exe', ['add', key, '/v', name, '/t', 'REG_SZ', '/d', value, '/f'], { windowsHide: true }, () => {});
        set('DisplayName', 'TwoCode');
        set('IconUri', path.join(__dirname, 'assets', 'icon-256.png'));
        const key2 = 'HKCU\\Software\\Classes\\AppUserModelId\\nl.twocode.instellingen';
        execFile('reg.exe', ['add', key2, '/v', 'DisplayName', '/t', 'REG_SZ', '/d', 'TwoCode Instellingen', '/f'], { windowsHide: true }, () => {});
        execFile('reg.exe', ['add', key2, '/v', 'IconUri', '/t', 'REG_SZ', '/d', path.join(__dirname, 'assets', 'settings-icon.png'), '/f'], { windowsHide: true }, () => {});
      } catch {}
    }
    const image = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
    tray = new Tray(image);
    tray.setToolTip('TwoCode');
    tray.on('click', openIsland);
    buildMenu();
  });
  // the icon stays during the goodbye and goes when the app really stops
  app.on('will-quit', () => { try { tray?.destroy(); } catch {} tray = null; });

  // only the island itself may change these
  const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
  ipcMain.handle('app:login-get', e => fromIsland(e) ? { ok: true, on: startsWithWindows() } : { ok: false });
  ipcMain.handle('app:login-set', (e, on) => { if (!fromIsland(e)) return { ok: false }; setStartsWithWindows(on); return { ok: true, on: startsWithWindows() }; });
  ipcMain.on('app:restart', e => { if (fromIsland(e)) restart(); });
}

module.exports = { openIsland };
