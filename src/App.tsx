import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Square,
  Copy,
  Check,
  Search,
  Volume2,
  Mic,
  Gauge,
  BookOpenText,
} from "lucide-react";
import pokemonData from "./assets/pokemon_ipa.json";

interface PokemonEntry {
  dex: string;
  name: string;
  pronunciation: string;
  ipa: string;
}

const DATA = pokemonData as PokemonEntry[];
const PAGE_SIZE = 96;

const GENS = [
  { label: "All", from: 1, to: 1025 },
  { label: "Gen I", from: 1, to: 151 },
  { label: "Gen II", from: 152, to: 251 },
  { label: "Gen III", from: 252, to: 386 },
  { label: "Gen IV", from: 387, to: 493 },
  { label: "Gen V", from: 494, to: 649 },
  { label: "Gen VI", from: 650, to: 721 },
  { label: "Gen VII", from: 722, to: 809 },
  { label: "Gen VIII", from: 810, to: 905 },
  { label: "Gen IX", from: 906, to: 1025 },
];

function dexNumber(entry: PokemonEntry): number {
  return parseInt(entry.dex.replace(/\D/g, ""), 10);
}

function dexDigits(entry: PokemonEntry): string {
  return entry.dex.replace(/\D/g, "");
}

export default function App() {
  const [query, setQuery] = useState("");
  const [genIndex, setGenIndex] = useState(0);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [playingDex, setPlayingDex] = useState<string | null>(null);
  const [copiedDex, setCopiedDex] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const playWatchdog = useRef<number | null>(null);

  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 1800);
  };

  // Clean up timers on unmount.
  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      if (playWatchdog.current !== null) window.clearTimeout(playWatchdog.current);
    };
  }, []);

  // Load available TTS voices (English preferred), handle async loading.
  useEffect(() => {
    if (!speechSupported) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length === 0) return;
      const sorted = [...list].sort((a, b) => {
        const aEn = a.lang.toLowerCase().startsWith("en") ? 0 : 1;
        const bEn = b.lang.toLowerCase().startsWith("en") ? 0 : 1;
        if (aEn !== bEn) return aEn - bEn;
        return a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
      });
      setVoices(sorted);
      setVoiceURI((prev) =>
        prev && sorted.some((v) => v.voiceURI === prev)
          ? prev
          : sorted[0]?.voiceURI ?? ""
      );
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [speechSupported]);

  const filtered = useMemo(() => {
    const gen = GENS[genIndex];
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return DATA.filter((p) => {
      const n = dexNumber(p);
      if (n < gen.from || n > gen.to) return false;
      if (!q) return true;
      if (p.name.toLowerCase().includes(q)) return true;
      if (qDigits && dexDigits(p).includes(qDigits)) return true;
      return false;
    });
  }, [query, genIndex]);

  // Reset pagination whenever the result set changes.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, genIndex]);

  const shown = filtered.slice(0, visible);

  const stopSpeech = () => {
    if (!speechSupported) {
      showToast("Speech not supported in this browser");
      return;
    }
    if (playWatchdog.current !== null) {
      window.clearTimeout(playWatchdog.current);
      playWatchdog.current = null;
    }
    window.speechSynthesis.cancel();
    setPlayingDex(null);
    showToast("Playback stopped");
  };

  const toggleSpeak = (entry: PokemonEntry) => {
    if (!speechSupported) return;
    const synth = window.speechSynthesis;
    if (playWatchdog.current !== null) {
      window.clearTimeout(playWatchdog.current);
      playWatchdog.current = null;
    }
    if (playingDex === entry.dex) {
      synth.cancel();
      setPlayingDex(null);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(entry.name);
    const voice = voices.find((v) => v.voiceURI === voiceURI);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.onend = () =>
      setPlayingDex((prev) => (prev === entry.dex ? null : prev));
    utterance.onerror = () =>
      setPlayingDex((prev) => (prev === entry.dex ? null : prev));
    setPlayingDex(entry.dex);
    synth.speak(utterance);
    // Safety watchdog: some environments never fire onend/onerror, so the
    // "Playing…" state can't get stuck on a card.
    playWatchdog.current = window.setTimeout(() => {
      setPlayingDex((prev) => (prev === entry.dex ? null : prev));
      playWatchdog.current = null;
    }, 6000);
  };

  const copyIpa = async (entry: PokemonEntry) => {
    try {
      await navigator.clipboard.writeText(entry.ipa);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = entry.ipa;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* clipboard unavailable */
      }
      document.body.removeChild(ta);
    }
    setCopiedDex(entry.dex);
    window.setTimeout(() => {
      setCopiedDex((prev) => (prev === entry.dex ? null : prev));
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-xl bg-white/15 p-2.5 backdrop-blur-sm">
              <BookOpenText className="h-7 w-7" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
                Pokédex Pronunciation Guide
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
                Every Pokémon name with IPA (General American) + tap-to-hear
                TTS. IPA source: Pokémon Let's Play Wiki.
              </p>
            </div>
          </div>

          {/* Voice controls */}
          <div className="mt-6 rounded-2xl bg-black/15 p-4 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <label className="flex min-w-0 flex-1 basis-64 items-center gap-2">
                <Mic className="h-4 w-4 shrink-0 text-white/80" aria-hidden />
                <span className="sr-only">TTS voice</span>
                <select
                  value={voiceURI}
                  onChange={(e) => setVoiceURI(e.target.value)}
                  disabled={!speechSupported || voices.length === 0}
                  className="w-full min-w-0 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-white/60 disabled:opacity-60"
                >
                  {voices.length === 0 && (
                    <option value="">Default voice</option>
                  )}
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-white/80" aria-hidden />
                <span className="text-sm font-medium text-white/90">
                  Rate{" "}
                  <span className="tabular-nums font-semibold">
                    {rate.toFixed(2)}×
                  </span>
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-32 accent-white sm:w-40"
                  aria-label="Speech rate"
                />
              </label>

              <button
                type="button"
                onClick={stopSpeech}
                className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/30 active:bg-white/40"
              >
                <Square className="h-4 w-4" aria-hidden />
                Stop
              </button>
            </div>
            {!speechSupported && (
              <p className="mt-3 flex items-center gap-2 text-sm text-white/90">
                <Volume2 className="h-4 w-4" aria-hidden />
                Your browser doesn't support the Web Speech API — audio playback
                is unavailable.
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="py-6">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search by name or dex number (e.g. "pikachu" or "25")'
              className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-base shadow-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              aria-label="Search Pokémon by name or dex number"
            />
          </div>

          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by generation"
          >
            {GENS.map((gen, i) => {
              const active = i === genIndex;
              return (
                <button
                  key={gen.label}
                  type="button"
                  onClick={() => {
                    setGenIndex(i);
                    showToast(`Filter: ${gen.label}`);
                  }}
                  aria-pressed={active}
                  className={
                    active
                      ? "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition"
                      : "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-700"
                  }
                >
                  {gen.label}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-slate-500" aria-live="polite">
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {shown.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-800">
              {filtered.length}
            </span>{" "}
            Pokémon
          </p>
        </div>

        {/* Grid */}
        {shown.length > 0 ? (
          <>
            <main className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 pb-4">
              {shown.map((p) => {
                const isPlaying = playingDex === p.dex;
                const isCopied = copiedDex === p.dex;
                return (
                  <article
                    key={p.dex}
                    className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <span className="inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-amber-800">
                      {p.dex}
                    </span>
                    <h2 className="mt-3 text-xl font-bold text-slate-900">
                      {p.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {p.pronunciation}
                    </p>
                    <p className="mt-3">
                      <span className="inline-block rounded-full bg-slate-100 px-3.5 py-1.5 font-mono text-lg text-slate-800">
                        {p.ipa}
                      </span>
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => toggleSpeak(p)}
                        disabled={!speechSupported}
                        className={
                          isPlaying
                            ? "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                            : "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
                        }
                      >
                        {isPlaying ? (
                          <>
                            <Square className="h-4 w-4" aria-hidden />
                            Playing…
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" aria-hidden />
                            Play pronunciation
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyIpa(p)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-amber-700"
                        aria-label={`Copy IPA for ${p.name}`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" aria-hidden />
                            Copy IPA
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </main>

            {visible < filtered.length && (
              <div className="flex justify-center pb-10 pt-2">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:ring-amber-300 hover:text-amber-700"
                >
                  Load more ({filtered.length - visible} remaining)
                </button>
              </div>
            )}
            {visible >= filtered.length && filtered.length > 0 && (
              <div className="pb-10" />
            )}
          </>
        ) : (
          <main className="pb-16">
            <div className="mx-auto max-w-md rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
              <p className="text-5xl" aria-hidden>
                🔍
              </p>
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                No Pokémon found
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                No matches for{" "}
                <span className="font-semibold text-slate-700">
                  “{query.trim()}”
                </span>
                . Try a different name or dex number.
              </p>
            </div>
          </main>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <p className="text-center text-sm text-slate-500">
            IPA transcriptions from Pokémon Let's Play Wiki – Pokémon
            Pronunciation Guide (General American). TTS via your browser's Web
            Speech API.
          </p>
        </div>
      </footer>

      {/* Toast for immediate action feedback */}
      {toast !== null && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}