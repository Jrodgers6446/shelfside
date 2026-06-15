SHELFSIDE PWA — CLOUDFLARE PAGES
================================

Repo root = deploy root (this folder).

Cloudflare Pages setup:
  Build command: (empty)
  Build output: /

Connect GitHub repo in Cloudflare → Workers & Pages → Create → Pages → Connect to Git.

Must include: index.html, sw.js, manifest.webmanifest, icons/, functions/

Verify after deploy:
  https://YOUR-SITE.pages.dev/DEPLOY-VERSION.txt
  Create tab → Shelfside v2.16.0
  Settings → Install app → Icons: ok

Share shelf: use "Share as text" (works without any server storage).
