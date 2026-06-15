# Shelfside — Reading PWA

Installable reading app. Single-page PWA — static files + one Cloudflare Pages Function for link import.

## Features

- **Library** — bookshelf, folders, tags, reading progress
- **Discover** — Project Gutenberg via Gutendex
- **Create** — paste text, import files, fetch links (Wattpad, Literotica, Gutenberg, Wayback Machine), comics
- **Share** — text/link share with comics embedded (no server storage needed)
- **Reader** — themes, font size, read-aloud, offline

## Deploy on Cloudflare Pages

1. Push this repo to GitHub
2. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Select this repo
4. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` (repo root)
5. **Save and Deploy**

Cloudflare auto-deploys `functions/` — link import uses `/api/fetch-url`.

### After deploy

- Open your `*.pages.dev` URL (or custom domain)
- **Settings → Install app** — HTTPS, Manifest, Icons, Service worker should all say **ok**
- iPhone: Safari → Share → **Add to Home Screen**

Books live in IndexedDB on that URL. Keep the **same** Pages URL when redeploying.

## Local preview

```bash
npx wrangler pages dev .
```

Or: `npx serve .` (link import won't use the proxy locally unless wrangler is running)

## Structure

```
index.html
sw.js
manifest.webmanifest
icons/                    PWA install (required)
functions/api/fetch-url.js   Cloudflare Pages Function
_headers                  cache headers (Cloudflare + Netlify)
```

## Version

Check the **Create** tab for `Shelfside vX.X.X` after deploy.
