"use client";

import React, { useMemo, useState } from "react";

import guitarDb from "@/lib/chords/guitar.json";
import pianoDb from "@/lib/chords/piano.json";
import ukuleleDb from "@/lib/chords/ukulele.json";

type Instrument = "guitar" | "ukulele" | "piano";
type StringPosition = {
  frets: Array<number | string>;
  fingers?: Array<number | string>;
  barres?: number[];
  capo?: boolean;
  baseFret?: number;
};
type ChordEntry = { key: string; suffix: string; positions: StringPosition[] };
type ChordDatabase = { chords: Record<string, ChordEntry[]> };
type ParsedChord = { root: string; suffix: string; bass?: string };
type Diagram = { token: string; positions: StringPosition[] };

const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SHARP_TO_FLAT: Record<string, string> = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };
const FLAT_TO_SHARP: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
const INSTRUMENTS = {
  guitar: { strings: 6, fretsOnChord: 4, name: "Guitarra", keys: PITCH_CLASSES, tunings: { standard: ["E", "A", "D", "G", "B", "E"] } },
  ukulele: { strings: 4, fretsOnChord: 4, name: "Ukulele", keys: PITCH_CLASSES, tunings: { standard: ["G", "C", "E", "A"] } },
} as const;

function normaliseNote(value: string): string {
  return value.trim().replaceAll("♯", "#").replaceAll("♭", "b");
}

/** Preserves every extension: m7b5 must never be treated as m7, for example. */
export function normaliseSuffix(value: string | undefined): string {
  const rawSuffix = (value ?? "").trim();
  const upperMajor = rawSuffix.match(/^M(?=\d|$)/);
  let suffix = rawSuffix
    .trim()
    .replaceAll("Δ", "maj")
    .replaceAll("°", "dim")
    .replaceAll("ø", "m7b5")
    .replaceAll("+", "aug")
    .replaceAll("♯", "#")
    .replaceAll("♭", "b")
    .replace(/\s+/g, "")
    .toLowerCase();

  if (upperMajor) suffix = `maj${suffix.slice(1)}`;
  if (!suffix || suffix === "major" || suffix === "maj") return "";
  if (suffix === "m" || suffix === "min" || suffix === "minor" || suffix === "-") return "m";
  return suffix
    .replace(/^minor/, "m")
    .replace(/^min/, "m")
    .replace(/^major/, "maj")
    .replace(/sharp/g, "#")
    .replace(/flat/g, "b")
    .replace(/\/(?=\d)/g, "");
}

export function parseChordToken(token: string): ParsedChord | null {
  const compact = normaliseNote(token).replace(/\s+/g, "");
  const match = compact.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) return null;

  const [, root, remainder] = match;
  const slash = remainder.lastIndexOf("/");
  const hasBass = slash >= 0 && /^[A-G](?:#|b)?$/.test(remainder.slice(slash + 1));
  const suffix = hasBass ? remainder.slice(0, slash) : remainder;
  const bass = hasBass ? remainder.slice(slash + 1) : undefined;
  return { root, suffix: normaliseSuffix(suffix), bass };
}

function entriesForRoot(database: ChordDatabase, root: string): ChordEntry[] {
  const keys = [root];
  if (root in SHARP_TO_FLAT) keys.push(SHARP_TO_FLAT[root]);
  if (root in FLAT_TO_SHARP) keys.push(FLAT_TO_SHARP[root]);
  return keys.flatMap((key) => database.chords[key] ?? []);
}

function entrySuffix(entry: ChordEntry): string {
  return normaliseSuffix(entry.suffix);
}

function matchingEntry(database: ChordDatabase, chord: ParsedChord): ChordEntry | undefined {
  const entries = entriesForRoot(database, chord.root);
  const inversionSuffix = chord.bass ? `${chord.suffix}/${chord.bass.toLowerCase()}` : undefined;
  const suffixes = chord.suffix === "sus" ? ["sus", "sus4"] : [chord.suffix];

  return entries.find((entry) => entrySuffix(entry) === inversionSuffix)
    ?? entries.find((entry) => suffixes.includes(entrySuffix(entry)));
}

function fretNumber(value: number | string): number {
  if (typeof value === "number") return value;
  if (/^(x|-)$/.test(value.trim().toLowerCase())) return -1;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? -1 : parsed;
}

/** The databases store fret positions relative to baseFret; do not rebase them. */
export function toRenderableStringPosition(position: StringPosition, strings: number) {
  const frets = position.frets.map(fretNumber);
  const fingers = (position.fingers ?? []).map((finger) => {
    const parsed = Number.parseInt(String(finger), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  });

  while (frets.length < strings) frets.unshift(-1);
  while (fingers.length < strings) fingers.unshift(0);
  if (frets.length > strings) frets.splice(0, frets.length - strings);
  if (fingers.length > strings) fingers.splice(0, fingers.length - strings);

  const validBarres = (position.barres ?? []).filter((barre) => frets.includes(barre));
  return {
    frets,
    fingers: fingers.some(Boolean) ? fingers : undefined,
    barres: validBarres.length ? validBarres : undefined,
    capo: position.capo,
    baseFret: position.baseFret ?? 1,
  };
}

function pianoPitchClass(note: string): number | null {
  const match = normaliseNote(note).match(/^([A-G])([#b]?)/);
  if (!match) return null;
  const natural: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  return (natural[match[1]] + accidental + 12) % 12;
}

function pianoInversions(position: StringPosition): number[][] {
  const pitchClasses = position.frets
    .map((note) => pianoPitchClass(String(note)))
    .filter((note): note is number => note !== null);
  if (!pitchClasses.length) return [];

  const base = pitchClasses.map((pitchClass, index) => 60 + pitchClass + (index > 0 && pitchClass < pitchClasses[index - 1] ? 12 : 0));
  return base.map((_, inversion) => {
    const rotated = [...base.slice(inversion), ...base.slice(0, inversion).map((note) => note + 12)];
    return rotated.sort((left, right) => left - right);
  });
}

function diagramData(text: string, instrument: Instrument): Diagram[] {
  const database = (instrument === "guitar" ? guitarDb : instrument === "ukulele" ? ukuleleDb : pianoDb) as ChordDatabase;
  const tokens = Array.from(text.matchAll(/\[([^\]]+)\]/g), (match) => match[1]);
  const fallback = tokens.length ? tokens : text.split(/\s+/).filter((token) => /^[A-G](?:#|b)?[^\s]*$/.test(token));
  const seen = new Set<string>();

  return fallback.flatMap((token) => {
    if (seen.has(token)) return [];
    seen.add(token);
    const parsed = parseChordToken(token);
    if (!parsed) return [];
    const entry = matchingEntry(database, parsed);
    return entry?.positions?.length ? [{ token, positions: entry.positions }] : [];
  });
}

export default function ChordDiagrams({ text, size = 110, instrument = "guitar" }: { text: string; size?: number; instrument?: Instrument }) {
  const chords = useMemo(() => diagramData(text, instrument), [text, instrument]);
  const [inversions, setInversions] = useState<Record<string, number>>({});
  if (!chords.length) return null;

  const isPiano = instrument === "piano";
  const smallMode = size <= 100;
  const gridClass = isPiano ? "grid grid-cols-2 gap-4" : "grid grid-cols-3 gap-4";

  return (
    <div className={`${gridClass} chord-diagrams`}>
      {chords.map((chord) => {
        const available = isPiano ? pianoInversions(chord.positions[0]) : chord.positions;
        if (!available.length) return null;
        const current = (inversions[chord.token] ?? 0) % available.length;
        const next = () => setInversions((previous) => ({ ...previous, [chord.token]: (current + 1) % available.length }));
        const label = available.length > 1 ? `Inversão ${current + 1} de ${available.length}` : "Posição disponível";

        return (
          <button
            type="button"
            key={chord.token}
            onClick={next}
            className={`flex w-full flex-col items-center rounded-md text-center transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${smallMode ? "text-xs" : ""}`}
            aria-label={`${chord.token}: ${label}. Clique para mostrar a próxima inversão.`}
            title={available.length > 1 ? "Clique para mudar de inversão" : undefined}
          >
            <div style={{ width: "100%", transform: smallMode ? "scale(0.85)" : "scale(1)", transformOrigin: "top center" }}>
              {isPiano ? (
                <div className="flex justify-center">
                  <PianoKeyboard notes={available[current] as number[]} size={Math.floor(size * 0.72)} />
                </div>
              ) : (
                <StringChordDiagram
                  chord={toRenderableStringPosition(available[current] as StringPosition, INSTRUMENTS[instrument].strings)}
                  strings={INSTRUMENTS[instrument].strings}
                  size={size}
                />
              )}
            </div>
            <small className="mt-1 text-xs text-muted-foreground">{chord.token}{available.length > 1 ? ` · ${current + 1}/${available.length}` : ""}</small>
          </button>
        );
      })}
    </div>
  );
}

function StringChordDiagram({
  chord,
  strings,
  size = 120,
}: {
  chord: ReturnType<typeof toRenderableStringPosition>;
  strings: number;
  size?: number;
}) {
  const frets = chord.frets;
  const fingers = chord.fingers ?? [];
  const baseFret = chord.baseFret;
  const fretCount = 4;
  const width = size;
  const height = Math.round(size * 1.08);
  const left = 18;
  const right = width - 18;
  const top = 22;
  const bottom = height - 28;
  const stringGap = strings > 1 ? (right - left) / (strings - 1) : 0;
  const fretGap = (bottom - top) / fretCount;
  const dotRadius = Math.max(5, Math.round(size * 0.055));
  const xForString = (index: number) => left + index * stringGap;
  const yForFret = (fret: number) => top + (Math.min(Math.max(fret, 1), fretCount) - 0.5) * fretGap;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Diagrama de acorde" className="mx-auto text-stone-800">
      {baseFret > 1 && <text x={2} y={top + fretGap * 0.65} fontSize="10" fill="currentColor">{baseFret}fr</text>}
      {Array.from({ length: fretCount + 1 }, (_, index) => (
        <line key={`fret-${index}`} x1={left} x2={right} y1={top + index * fretGap} y2={top + index * fretGap} stroke="currentColor" strokeWidth={index === 0 && baseFret === 1 ? 3 : 1} strokeLinecap="round" />
      ))}
      {Array.from({ length: strings }, (_, index) => (
        <line key={`string-${index}`} x1={xForString(index)} x2={xForString(index)} y1={top} y2={bottom} stroke="currentColor" strokeWidth={1} strokeLinecap="round" />
      ))}
      {frets.map((fret, index) => {
        const x = xForString(index);
        if (fret === 0) return <circle key={`open-${index}`} cx={x} cy={12} r={4} fill="none" stroke="currentColor" strokeWidth={1.5} />;
        if (fret < 0) return <text key={`muted-${index}`} x={x} y={15} textAnchor="middle" fontSize="13" fill="currentColor">x</text>;
        return <g key={`note-${index}`}><circle cx={x} cy={yForFret(fret)} r={dotRadius} fill="currentColor" />{fingers[index] ? <text x={x} y={yForFret(fret) + 3} textAnchor="middle" fontSize="8" fill="white">{fingers[index]}</text> : null}</g>;
      })}
      {(chord.barres ?? []).map((barre, index) => {
        const covered = frets.map((fret, stringIndex) => ({ fret, stringIndex })).filter((item) => item.fret === barre).map((item) => item.stringIndex);
        if (covered.length < 2) return null;
        const first = Math.min(...covered);
        const last = Math.max(...covered);
        return <rect key={`barre-${index}`} x={xForString(first) - dotRadius} y={yForFret(barre) - dotRadius} width={xForString(last) - xForString(first) + dotRadius * 2} height={dotRadius * 2} rx={dotRadius} fill="currentColor" />;
      })}
    </svg>
  );
}

function PianoKeyboard({ notes, size = 140 }: { notes: number[]; size?: number }) {
  const whitePitchClasses = [0, 2, 4, 5, 7, 9, 11];
  const blackKeys = [{ pitchClass: 1, after: 0 }, { pitchClass: 3, after: 1 }, { pitchClass: 6, after: 3 }, { pitchClass: 8, after: 4 }, { pitchClass: 10, after: 5 }];
  const active = new Set(notes);
  const octaves = [4, 5];
  const whiteWidth = Math.max(14, Math.floor(size / 14));
  const whiteHeight = Math.floor(size * 0.52);
  const blackWidth = Math.floor(whiteWidth * 0.62);

  return (
    <div style={{ position: "relative", width: whiteWidth * 14, height: whiteHeight }} aria-hidden="true">
      <div className="absolute z-[1] flex">
        {octaves.flatMap((octave) => whitePitchClasses.map((pitchClass) => {
          const midi = (octave + 1) * 12 + pitchClass;
          return <div key={midi} style={{ width: whiteWidth, height: whiteHeight, background: active.has(midi) ? "#93c5fd" : "#fff", border: "1px solid #e5e7eb", borderRadius: 3 }} />;
        }))}
      </div>
      <div className="absolute z-[2] pointer-events-none">
        {octaves.flatMap((octave, octaveIndex) => blackKeys.map(({ pitchClass, after }) => {
          const midi = (octave + 1) * 12 + pitchClass;
          return <div key={midi} style={{ position: "absolute", left: (octaveIndex * 7 + after + 1) * whiteWidth - blackWidth / 2, width: blackWidth, height: Math.floor(whiteHeight * 0.62), background: active.has(midi) ? "#2563eb" : "#111827", borderRadius: 3 }} />;
        }))}
      </div>
    </div>
  );
}
