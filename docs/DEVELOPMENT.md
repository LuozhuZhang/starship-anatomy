# Starship — Anatomy systems atlas

A local, self-contained SVG explainer of ten major Starship upper-stage assemblies.
Open `../outputs/starship.html` in a current browser. No server, installation, account,
external font, CDN or network access is needed. The dark theme is available from
the theme button; `../outputs/starship-dark.html` starts in dark mode.

## Explore

- Hover the drawing to preview separation; leave it to reassemble.
- Drag horizontally or use the range slider to hold an intermediate position.
- Click or tap a component, or its entry in the assembly index, to lock selection.
- System filters retain the physical context with subdued, opaque surfaces.
- The magnifier brings the selected assembly closer; press it again for context.
- Left/right arrows adjust separation; up/down preview assemblies; Enter locks.
- Space toggles open/closed; Home/End selects 0/100%; Escape resets the figure.
- The optional guided loop stops as soon as the reader interacts.
- Reduced motion removes the animation and disables the guided loop.

## Reference boundary

The design snapshot uses the SpaceX Starship design page retrieved on 22 October
2026 (52 m upper stage, 9 m diameter, three sea-level and three vacuum engines),
and the official **Introducing Starship V3** update dated 12 May 2026. It is not a
claim to reconstruct a specific vehicle serial number. Sources and limitations
are available inside the page through **Design reference**.

- https://www.spacex.com/vehicles/starship/design
- https://www.spacex.com/updates#starship-v3
- Official update data: https://content.spacex.com/api/spacex-website/updates

Tank station lengths, dome contours, skin thickness, pipe routes, mechanical
supports, tile pitch, port locations and payload rack details are schematic.
The payload rack is generic accommodation, not a reconstruction of SpaceX's PEZ
dispenser. Separating welded tank sections and lifting skin panels is an
explanatory operation, not a maintenance procedure. The Super Heavy booster and
flight simulation are outside the scope of this atlas.

## Build and verify

Use Node.js 22 or newer; the development machine used Node.js 24.3.0. A local
Chrome/Chromium installation is needed only for screenshot and input checks.
Set `CHROME_PATH` if it is not installed at the standard macOS location.

Run these commands from the repository root.

```sh
node build.mjs --audit
node work/check-continuous-motion.mjs
node vendor/anatomy/scripts/drive.mjs outputs/starship.html --actions work/qa/desktop-actions.json --preload work/qa/count-frames.js --height 1300
node work/verify-touch.mjs
node vendor/anatomy/scripts/drive.mjs outputs/starship.html --actions work/qa/visual-light-actions.json --height 1300
node vendor/anatomy/scripts/drive.mjs outputs/starship-dark.html --actions work/qa/visual-dark-actions.json --height 1300
```

The normal build settles painter order across 1,001 poses on the actual
continuous separation path. `--audit` also checks the recorded solid and tube
geometry across that path. The additional motion test replays quarter-position
stops, a continuous slider sweep and rapid reversals through the same spring
model used by the browser. Browser checks use real mouse/key input and Chromium
touch emulation. They are not a substitute for tests on a physical phone.

`--draft` is a development-only build using assembled/apart order samples. Do not
ship a draft build. Use the normal build or `--audit` for delivery.

## Files

- `src/model.mjs`: source facts, module descriptions and separation vectors.
- `src/geometry.mjs`: SVG solids, curved tile fields, hardware and shape records.
- `src/motion.mjs`: the shared spring and phased progress path.
- `src/live.js`: pointer, keyboard, touch, filtering, focus camera and readouts.
- `src/style.css`: responsive light/dark presentation.
- `build.mjs`: geometry settling, audit and standalone HTML generation.
- `vendor/anatomy/`: local Anatomy kit and verification tools, with MIT license.
- `references/`: the dated source facts and explicit schematic boundaries.
- `work/qa/`: repeatable browser action sequences; generated output is ignored.
- `docs/validation/`: final audit and interaction-check logs.
- `docs/images/`: finished screenshots and close-ups.

The local kit copy has one documented coordinate-precision patch for the 8x
inspection view; audit rules and tolerances are unchanged. See
[`vendor/anatomy/NOTICE.md`](../vendor/anatomy/NOTICE.md).

## Record the walkthrough

With Node.js 22+, Chrome/Chromium and `ffmpeg` installed, run from the repository root:

```sh
node scripts/record-demo.mjs
```

This captures the actual application into `media/starship-demo.mp4` (44 seconds, 1920×1080, 30 fps, silent H.264). A deterministic animation clock produces evenly spaced frames. Only the capture layout and chapter captions are added; the application’s own controls, spring motion and inspection camera drive the demonstration. Scratch frames and the recording receipt are written under `work/recording/`.
