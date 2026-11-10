# VisiDocsverse website

Static marketing site for VisiDocsverse (landing page, 8 moment pages, Terms, Privacy). No build step, no dependencies.

## Deploy on Vercel

1. Push these files to a GitHub repo (files at the repo root, so index.html is top-level).
2. In Vercel: Add New -> Project -> Import the repo.
3. Framework Preset: Other. No build command, no output directory (leave both empty).
4. Deploy. Every push to main redeploys automatically.

## Preview locally

Any static server from this folder, e.g. npx serve . or python3 -m http.server 8000.

## Notes

- Checkout uses Lemon Squeezy hosted checkout + overlay (lemonsqueezy-button class) with affiliate tracking (?aff=CODE becomes aff_ref on checkout links). See the Lemon Squeezy block before </head> on each page.
- Legal copy (non-resale clause, key-void enforcement) lives in terms.html sections 2 and 10 and mirrors the in-app EULA.
