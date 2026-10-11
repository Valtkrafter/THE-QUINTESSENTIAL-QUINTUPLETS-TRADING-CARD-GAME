# The Windows app (Tauri)

The game is a web page. For Windows it is wrapped in a small native window with **Tauri 2**: the window is made by the Rust code in `playground/src-tauri/`, and everything in it (all screens, all rules, all sound and 3D) is the same web game as on https://tqqtcg.vercel.app. Nothing in the game has to know that it is inside a window.

## Build it

You need Node, Rust (`rustup`, the MSVC toolchain) and the Visual Studio C++ build tools; Windows 11 brings the web view (WebView2) with it.

```bash
cd playground
npm install
npm run desktop:build
```

The first build compiles Tauri and takes several minutes; later builds are fast. The results are in `playground/src-tauri/target/release/`:

- `tqq-tcg.exe`: the game itself (runs on its own, nothing to install).
- `bundle/nsis/TQQ TCG_<version>_x64-setup.exe`: the installer. It installs for the current user, so it needs no administrator rights. The installer tool (NSIS) is downloaded by Tauri the first time.

`npm run desktop:dev` opens the game in the same window while the Vite dev server (`npm run dev`, port 5173) is running, with live reload.

## What lives where

| File | What it does |
|---|---|
| `src-tauri/tauri.conf.json` | Name, version (taken from `package.json`), window size, the content security policy, the installer settings |
| `src-tauri/src/lib.rs`, `main.rs` | Opens the window, and keeps the game to one window: starting it a second time only brings the first window to the front (two windows on one saved game would overwrite each other's progress). That is all the Rust there is. |
| `src-tauri/capabilities/default.json` | What the window may ask the shell for: only the basics of a window |
| `src-tauri/icons/` | App icons, made from `public/favicon.svg` with `npx tauri icon public/favicon.svg` |

The save game lives in the web view's storage (IndexedDB), in the app's own folder under `%LOCALAPPDATA%\io.github.valtkrafter.tqqtcg`. Uninstalling the game leaves it there; "Start a new game" in Settings or deleting that folder removes it. Settings has "Export save" and "Import save" for backups; they work as in the browser (a download and a file picker).

The same protection exists in the browser: when a second tab or window of the game saves a newer game, the older one stops with a "reload" screen instead of writing over it (`state/gameStore.ts`, `ui/StaleScreen.tsx`, tested in `gameStore.test.ts` and in `e2e/game.spec.ts`).

## Content security policy

The window only runs what is inside the app: scripts and styles from the app itself, pictures from the app, from `data:` and from `blob:` (the card thumbnails are made in the browser), fonts from the app, and `blob:` workers and sound modules for Tone.js. Nothing is loaded from the internet. If a feature stops working in the app but works in the browser, the policy in `tauri.conf.json` is the first place to look (the console of the window shows a blocked request).

## Checking the built app

Start the exe with the web view's debug port open and drive it with Playwright, the same way the browser tests do:

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9222"
Start-Process playground/src-tauri/target/release/tqq-tcg.exe
```

then connect with `chromium.connectOverCDP('http://localhost:9222')`.
