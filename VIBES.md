# Maintaining the /vibes page

The `/vibes` page (https://vals.quest/vibes) is a random, non-overlapping collage of
images. It's a port of [girl.surgery/website_vibes](https://girl.surgery/website_vibes/)
into this Astro site.

## How it works (the pipeline)

```
public/vibes/original_images/   →   scripts/build-vibes.mjs   →   src/data/vibes.json   →   src/pages/vibes.astro
      (your image files)              (npm run build:vibes)          (committed manifest)        (renders the collage)
```

1. **Images** live in `public/vibes/original_images/`. Astro serves `public/` as-is, so
   a file `foo.jpg` there is reachable at `/vibes/original_images/foo.jpg`.
2. **`scripts/build-vibes.mjs`** scans that folder, reads each image's width/height, and
   writes **`src/data/vibes.json`** — a list of `["/vibes/original_images/foo.jpg", [w, h]]`
   pairs. Run it with `npm run build:vibes`. This runs on your **dev machine only**.
3. **`src/pages/vibes.astro`** imports that JSON at build time, inlines it into the page,
   and the browser script shuffles + lays out the collage.

`vibes.json` is **committed to git**. The VPS never runs `build:vibes` — it just builds
the site from the committed manifest (same pattern as the travels globe).

## The one workflow you'll use: add / remove images

1. Drop image files into `public/vibes/original_images/` (or delete ones you don't want).
2. Regenerate the manifest:
   ```
   npm run build:vibes
   ```
   It prints how many images it wrote. Preview locally with `npm run dev` → open
   http://localhost:4321/vibes.
3. Commit **both** the images and the regenerated manifest, then deploy:
   ```
   git add public/vibes src/data/vibes.json
   git commit -m "vibes: update images"
   git push
   ```
   Then on the VPS (per `CLAUDE.md` → Deployment):
   ```
   ssh vals@167.233.85.125 "cd ~/vals.questWebsite && git pull && npm run build && rsync -a --delete dist/ /var/www/vals.quest/"
   ```

> If you add images but forget `npm run build:vibes`, they won't appear — the page only
> knows about images listed in `vibes.json`.

## Supported image formats

`.jpg` `.jpeg` `.png` `.webp` `.gif` — anything else in the folder is ignored.

**HEIC is NOT supported** (iPhone photos are often `.heic`). Convert them to jpg first,
e.g. on macOS: open in Preview → File → Export → JPEG. The build script skips any file
it can't read and tells you which ones.

## Editing the look / behavior

Everything visual lives in **`src/pages/vibes.astro`**:

- **Image sizing** — the "normalize to equal area" logic. `goal_pixels` sets the target
  on-screen area per image; the `aspect_ratio > 8` / `> 4` buckets shrink very wide/tall
  images. Bump `500 * 300` up for bigger tiles.
- **Reveal speed** — the `setInterval(…, 100)` at the bottom shows one image every 100ms.
  Lower it for a faster reveal, or replace the interval with a plain loop for instant.
- **Placement** — the `50` in `for (let k = 0; k < 50; k++)` is how many random spots each
  image tries before the canvas grows by 50px. Leave as-is unless collages look too sparse.
- **Styling** — the `<style>` block at the bottom (`#container` height/padding). The page
  uses the `wide` layout to break out of the site's 800px column.

## Known rough edges (inherited from the original, intentionally left as-is)

- The canvas width is measured once on load — resizing the window does **not** re-flow the
  collage (reload to re-layout).
- No click-to-enlarge.
- Images reveal one at a time rather than all at once.

Ask if you want any of these changed.

## Files at a glance

| File | Role | Edit it to… |
|------|------|-------------|
| `public/vibes/original_images/` | source images | add/remove pictures |
| `scripts/build-vibes.mjs` | manifest generator | change supported formats / output shape |
| `src/data/vibes.json` | committed manifest | **don't edit by hand** — regenerate it |
| `src/pages/vibes.astro` | the page + collage script | change layout, sizing, styling, speed |
| `src/layouts/Base.astro` | site nav | rename/remove the `Vibes` nav link |
