# midi-seq

A browser MIDI step sequencer for writing set melodies, generative variations and drum patterns, then playing them out to external gear over Web MIDI. The aims and roles behind it are in [TEAM_CHARTER.md](TEAM_CHARTER.md).

**Live:** https://yakov.khalinsky.com/midi-seq/

## What it does

- Two melodic tracks (piano roll, scale root and mode) and four rhythmic tracks (Kick, Snare, Hi-hat, Perc), 16 steps per pattern.
- Eight patterns (A–H) with duplicate, clear and rename, plus a song mode that chains patterns with repeats.
- BPM, swing and optional MIDI clock out.
- Generative helpers: Euclidean fill on rhythmic tracks and mutate on melodic tracks.
- Export a pattern or the whole project as a MIDI file, and import MIDI files.
- Saves your project in the browser (IndexedDB) and works offline as a PWA.

## Browser requirements

- Web MIDI only works in a secure context. Use the **https** address above (or `http://localhost` for local dev). The `yakovkhalinsky.github.io` address redirects over plain http, which turns Web MIDI off.
- Use **Chrome or Edge**. Safari doesn't support Web MIDI.
- Plug your MIDI interface or device into the computer you're browsing on, allow MIDI access when asked, then pick it under MIDI output.

## Run locally

Needs Node.js (CI uses Node 22).

```sh
npm install
npm run dev       # dev server, served under /midi-seq/
npm run build     # production build into dist/
npm run preview   # serve the built dist/
npm run check     # svelte-check + TypeScript
```

## Deploy

Pushing to `master` runs `.github/workflows/deploy.yml`, which builds with `npm ci && npm run build` and publishes `dist/` to GitHub Pages. Vite's `base` is `/midi-seq/` to match the Pages path.

Built with Svelte 5, TypeScript and Vite.
