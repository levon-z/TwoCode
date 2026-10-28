<p align="center"><img src="assets/icon-256.png" width="120" alt="Robo"></p>

<h1 align="center">TwoCode</h1>
<p align="center"><b>A Dynamic Island for Windows, with Robo living inside it.</b><br>
Robo shows what Claude Code and Codex are doing, asks before your AI does something important, and tells you when the work is done.</p>

<p align="center"><b>🧪 Public beta</b> · Windows 10 and 11 · free</p>

---

## Download and install (2 minutes)

1. Go to **[Releases](../../releases/latest)** and download **`TwoCode-Windows.zip`**.
2. Right-click the zip → **Extract All…** (for example to `Documents\TwoCode`).
3. Open the `TwoCode` folder and double-click **`TwoCode.exe`**.
4. Windows may say *"Windows protected your PC"*. That's because the app is new and not signed yet. Click **More info → Run anyway**.

The island appears at the top of your screen and Robo says hi. No installer, no account.

**Tips**
- **Ctrl+Alt+T** opens the island. **Ctrl+Alt+1–6** jumps straight to an app.
- Right-click **Robo next to the clock** (bottom right) → **Start with Windows**, so TwoCode is always there.
- Settings have their own app: **TwoCode Settings** in your Start menu (or the ⚙ in the island).

### Connect Claude Code or Codex

Open the island → **Settings → AI** and switch on **Claude Code** and/or **Codex**. From then on Robo follows your sessions by himself. Nothing about your code leaves your PC.

### Closing and updating

- Close: the **⏻ button** top right in the island, or right-click **Robo next to the clock** → **Quit TwoCode**.
- Update: download the new zip from Releases, quit TwoCode and replace the old folder. Your settings stay.

---

## What it does

| | |
| --- | --- |
| **Claude Code and Codex, live** | See which file your AI reads, what it edits and which command it runs. The island glows in your own colours for busy, done and error |
| **Allow in one click** | Your AI asks permission (say for `npm install`)? Allow or Deny right in the island |
| **A sign when it's done** | A chime, the done colour, and what changed. Click it to see the whole answer and your history |
| **Robo, your buddy** | Drag Robo onto any window and ask him what's going on. He uses the AI you connected, sees the screenshot and explains it |
| **Fix it for me** | Robo spots an error, proposes the fix, **asks before he touches a file**, then types the change into it while you watch |
| **5-hour limit** | A ring shows how much of your Claude limit you've used |
| **Spotify** | Controls, a song progress line, and switch where it plays (phone, laptop, speaker) |
| **Tray, clipboard, note, focus** | Drop files on the island, your last copies, one quick note and a focus timer |
| **Robo** | Moods, outfits, colours. He blinks, dances to music, and gets dizzy if you poke him too often |

## This is a beta

Things can still be rough. Tell us what you like and what you don't: **info@twocode.nl** or **@twocode.nl** on Instagram. Every message is read.

## Privacy

TwoCode runs on your own PC and needs no TwoCode account. The status of Claude Code and Codex is read locally and sent nowhere. When you ask Robo something, it goes to the AI you connected yourself (Claude Code or Codex), the same way as when you use it in your terminal. Links you switch on yourself (Spotify, weather, a calendar link) talk directly to that service.

---

## Nederlands: zo download je TwoCode

1. Ga naar **[Releases](../../releases/latest)** en download **`TwoCode-Windows.zip`**.
2. Rechtsklik op de zip → **Alles uitpakken…**
3. Open de map `TwoCode` en dubbelklik op **`TwoCode.exe`**.
4. Zegt Windows *"Uw pc is beveiligd"*? Klik **Meer info → Toch uitvoeren**. Dat komt omdat de app nieuw is.

Claude Code of Codex koppelen: island openen → **Instellingen → AI**. Afsluiten: de **⏻-knop** rechtsboven in de island. Feedback is heel welkom via info@twocode.nl.

---

## For developers

Needs [Node.js](https://nodejs.org) and Windows PowerShell 5.1.

```powershell
git clone https://github.com/levon-z/TwoCode.git
cd TwoCode
npm ci
npm start
```

`npm test` runs the tests. `tools/make-icon.cjs` redraws the app icon.

Codex support uses the optional Codex package: `npm install @openai/codex --include=optional`.

### Spotify in a fork

Spotify OAuth can succeed while Spotify's API rejects playback or device requests with HTTP 403. In Development Mode, the app owner needs Premium and each user must be on the app's allowlist (up to five users). Playback controls also require Premium for the Spotify account being used. See Spotify's [Development Mode requirements](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) and [playback API requirements](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback).

For a personal fork, create a Spotify Web API app, add `http://127.0.0.1:8888/callback` as a redirect URI, add your account to its allowlist, then start TwoCode with your app's Client ID:

```powershell
$env:TWOCODE_SPOTIFY_CLIENT_ID = "your-client-id"
npm start
```

Website: [twocode.nl](https://twocode.nl) · Contact: info@twocode.nl
