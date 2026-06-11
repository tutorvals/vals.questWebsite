# vals.quest

Personal website at https://vals.quest

## Stack
- **Framework**: Astro (TypeScript), static output
- **Server**: Caddy (automatic HTTPS) on Hetzner VPS (Ubuntu 24.04, `77.42.16.53`)
- **Domain**: vals.quest (Porkbun)

## Commands
- `npm run dev` — local dev server at localhost:4321
- `./deploy.sh` — builds Astro and rsyncs `dist/` to `/var/www/vals.quest/`

## Sudo access for Claude Code
- `./sudo-enable.sh` — grants passwordless sudo to vals user (prompts for password once)
- `./sudo-disable.sh` — revokes it
- Run enable before a session that needs root (e.g. installing packages, firewall changes), disable after

## Content vs form
Pages can be plain Markdown: `src/pages/<name>.md` with a 3-line frontmatter (`layout: ../layouts/Base.astro` + `title:`). Vals edits the words in the `.md` body only; style/structure lives in `src/layouts/Base.astro` and `src/styles/global.css`. Prefer converting `.astro` pages to `.md` when touching their content. `src/drafts/` holds unpublished pages (not built).

## Key files
- `src/pages/` — Astro pages (`.astro` or `.md`)
- `Caddyfile` — web server config (deployed to `/etc/caddy/Caddyfile`)
- `deploy.sh` — build + deploy script
