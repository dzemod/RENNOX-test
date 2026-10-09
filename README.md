# RENNOX website

Redesigned one-page website for RENNOX (home renovation & interior remodeling).

## Structure

```
site/        # The website: static HTML/CSS/JS. This is the folder to deploy.
  index.html
  assets/    # css, js (config.js = Google Reviews + form endpoint), logos
  images/    # photos (temporary: from the Webflow template)
tools/       # Node scripts: image generation (Gemini), image optimization, local server
```

## Run locally

```bash
npm install
node tools/serve.mjs site 3000     # http://localhost:3000
```

## Deploy

Static site, no build step. On Netlify / Vercel / Cloudflare Pages set:
- **Build command:** none
- **Publish / output directory:** `site`

## Before launch

- Replace placeholder phone, email and address (`site/index.html`, incl. the JSON-LD blocks).
- `site/assets/js/config.js`: set the Google Place ID + Maps API key (live reviews) and `formEndpoint` (where leads are sent). The fallback reviews there are samples — do not publish them.
- Replace the Webflow template photos in `site/images/` (license) — e.g. generate new ones with `node tools/generate_image.mjs --manifest tools/rennox_images.json` (needs `GOOGLE_AI_API_KEY` in `.env`).
