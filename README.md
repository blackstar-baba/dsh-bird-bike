# dsh-bird-bike 🐦🚲

[![npm version](https://img.shields.io/npm/v/dsh-bird-bike)](https://www.npmjs.com/package/dsh-bird-bike)

English | [简体中文](README.zh-CN.md)

A helmeted pixel chicken rides a bicycle along a Minecraft-style pixel strip docked at the bottom of the DSH (DeepSeek Harness) web GUI.

![Day](assets/screenshot-day.png)

![Night](assets/screenshot-night.png)

## Features

- 🐦 **Pixel chicken rider**: IK-pedaled legs, two-frame wing flaps, blinking eyes, teal helmet
- 🚲 **Pixel bicycle**: spoked wheels, chainring, pedal cranks
- 🌙 **Day/night cycle**: ~80 seconds per day, dusk/dawn in eight quantized color steps; starry sky, square moon, and a headlight beam at night
- 👾 **Mobs**: creepers roam by day — entering the 2m trigger range starts the fuse (accelerating flash), and the blast launches the chicken into a forced super jump (no penalty); zombies shamble toward the rider at night and are knocked flying on contact (tumble + spin)
- 🔔 **Bell**: chip-tune ding + Minecraft-style colorful note particles + a short boost (dust)
- 🦘 **Jump**: chunky hop with landing dust
- ⏱ **Ride stats**: distance / speed / riding time (accumulates only while actually riding) in fixed-width tabular slots — no layout jitter
- ▾ **Collapsible**: the strip folds into a 40px mini rail; the choice persists locally
- ♿ Honors `prefers-reduced-motion`: still world, interactions still animate

## Install

### Option 1: official CLI (recommended)

```sh
# from npm
dsh plugin --profile web add dsh-bird-bike

# or straight from GitHub
dsh plugin --profile web add git+https://github.com/blackstar-baba/dsh-bird-bike.git
```

Plain JavaScript with no build step and no prepare script, so the install never triggers a pnpm allowBuilds prompt.

### Option 2: DSH plugin manager

1. Open the DSH web GUI → **Plugins** in the sidebar
2. **Add plugin** → **Install a third-party plugin**
3. Paste the repository URL `https://github.com/blackstar-baba/dsh-bird-bike` and confirm — the strip appears at the bottom of the app frame

### Option 3: manual link to a local clone

```bash
git clone https://github.com/blackstar-baba/dsh-bird-bike.git
cd ~/.dsh/profiles/<your-profile>          # e.g. web
pnpm add link:/absolute/path/to/dsh-bird-bike
```

Then enable `dsh-bird-bike` on the **Plugins** page (or add `"dsh-bird-bike"` to `dsh.profile.bundles` in the profile `package.json`).

## Controls

| Action | Effect |
| --- | --- |
| Click the strip | Bell + note particles + boost |
| 🔔 | Ring the bell |
| 🦘 | Jump |
| 🌙 / ☀️ | Jump to the other phase |
| ▾ / ▴ | Collapse / expand the strip |

## How it works

- Plain JavaScript, zero dependencies, no build step: a single `client.js` registers a lazy factory via `window.__ModuleLoader__` and mounts into ui-layout's `shell.bottom` slot
- The whole scene renders on a low-resolution offscreen canvas (1 art pixel = P CSS pixels) with hard-edged pixel primitives (rects / Bresenham lines / scanline ellipses), then upscaled nearest-neighbor
- Chrome colors use `--dsw-*` theme tokens; the artwork palette is its own by design (artwork exception)

## Uninstall

Remove it from the **Plugins** page, or `pnpm remove dsh-bird-bike` inside the profile directory and drop it from `dsh.profile.bundles`.

## Compatibility

Requires **DSH >= 0.2.1-alpha** (the `shell.bottom` slot the strip mounts into shipped in that release).

Developed on a DSH source checkout, `web` profile (`dsh.client` platform: web, manifest declares `dsh.bundle`). No npm dependencies — only Client baseline builtins (react, slots).

## License

[MIT](LICENSE)
