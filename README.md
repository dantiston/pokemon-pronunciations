# Pokédex Pronunciation Guide – React + Vite

Complete ready-to-run project. 1025 Pokémon with IPA (General American) + browser TTS.

IPA source: https://pokemonlp.fandom.com/wiki/Pok%C3%A9mon_Pronunciation_Guide/

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Deploy to GitHub Pages
1. Set `base` in `vite.config.ts` to `/your-repo-name/` if deploying to project pages
2. `npm run deploy`  (uses gh-pages, builds to dist and pushes to gh-pages branch)
   Or use the GitHub Actions workflow in `.github/workflows/deploy.yml`
