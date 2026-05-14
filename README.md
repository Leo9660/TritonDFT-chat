# TritonDFT Frontend

Minimal chat UI for the [TritonDFT](https://github.com/yil384/TritonDFT) backend.

- **Stack**: Next.js 16 (static export) · TypeScript · Tailwind · react-i18next · KaTeX
- **Backend**: https://tritondft.nrp-nautilus.io
- **Deployed**: https://yil384.github.io/TritonDFT-frontend/

## Local dev

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000.

## Build (static export)

```bash
npm run build
# Output in ./out/ — fully static, deployable anywhere
```

## Deploy

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages.

In the repo settings, enable Pages with source = "GitHub Actions".

## Features

- Multi-turn chat with the OpenAI-compatible `/v1/chat/completions` endpoint
- Streaming response rendering
- Markdown + code highlighting + LaTeX (KaTeX) for math/formulas
- Conversation history in localStorage (per-browser, no server state)
- English / 中文 toggle
- Settings dialog to override backend URL at runtime
- Image upload placeholder (UI only — backend support TBD)

## Backend URL override

Default backend is hard-coded as `https://tritondft.nrp-nautilus.io`. Users can override via the Settings dialog (saved to localStorage), which is useful for testing against a local backend.
