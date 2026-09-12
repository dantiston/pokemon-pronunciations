# Pokédex Pronunciation Guide – React Source

This is the React source for the Pokédex Pronunciation Guide (1025 Pokémon with IPA + TTS).

## Files
- `App.tsx` – Main React component (TypeScript). Import your data JSON as shown.
- `pokemon_ipa.json` – Data: array of {dex: "#0001", name, pronunciation, ipa} (1025 entries, #0001-#1025)
  Source of IPA: https://pokemonlp.fandom.com/wiki/Pokémon_Pronunciation_Guide/ (General American)

## Setup (Vite + React + TS + Tailwind)
1. `npm create vite@latest pokedex-ipa -- --template react-ts`
2. `cd pokedex-ipa`
3. `npm install lucide-react`
4. Setup Tailwind per Vite docs
5. Copy `App.tsx` to `src/App.tsx`
6. Copy `pokemon_ipa.json` to `src/assets/pokemon_ipa.json` and update import:
   ```ts
   import pokemonData from "./assets/pokemon_ipa.json";
   ```
7. `npm run dev`

## TTS
Uses `window.speechSynthesis` – no API keys needed. Play button speaks `pokemon.name` with selected voice/rate.
