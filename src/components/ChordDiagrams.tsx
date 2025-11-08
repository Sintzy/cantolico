"use client";
import React, { useMemo } from "react";
import Chord from "@tombatossals/react-chords/lib/Chord";

// Try to import chord DBs that live in src/lib/chords. They may be empty or absent.
let GUITAR_DB: any = null;
let UKULELE_DB: any = null;
let PIANO_DB: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  GUITAR_DB = require('@/lib/chords/guitar.json');
} catch (e) {
  GUITAR_DB = null;
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  UKULELE_DB = require('@/lib/chords/ukulele.json');
} catch (e) {
  UKULELE_DB = null;
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  PIANO_DB = require('@/lib/chords/piano.json');
} catch (e) {
  PIANO_DB = null;
}

// Basic shapes for common chords (guitar 6-string). Each shape is defined
// relative to a base root (C). We will transpose these shapes to other roots.
// Format: { frets: number[], fingers?: number[], barres?: number[], baseFret?: number, capo?: boolean }
type Shape = { frets: number[]; fingers?: number[]; barres?: number[]; baseFret?: number; capo?: boolean };

const BASE_SHAPES: Record<string, Record<string, Shape>> = {
  // Root C shapes
  C: {
    major: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0,3,2,0,1,0], baseFret: 1 },
    minor: { frets: [-1,3,5,5,4,3], fingers:[0,1,3,4,2,1], barres:[3], baseFret:1 }, // barre Cm (x35543)
    '7': { frets: [-1,3,2,3,1,0], fingers:[0,3,2,4,1,0], baseFret:1 }
  }
};

const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function noteIndex(note: string) {
  // Normalize flats to sharps
  const map: Record<string,string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  const n = map[note] || note;
  return NOTES.indexOf(n);
}

function parseChordToken(token: string) {
  // Remove whitespace
  token = token.trim();
  // Handle slash chords like G/D -> root G, ignore bass for diagram
  const [main] = token.split('/');
  // Extract root (letter + optional # or b)
  const match = main.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;
  const [, root, qualityRaw] = match;
  // Normalize quality
  let quality = qualityRaw || 'major';
  if (quality === '') quality = 'major';
  // Simplify common suffixes
  if (quality.startsWith('maj7')) quality = 'maj7';
  if (quality.startsWith('m7')) quality = 'm7';
  if (quality === '7') quality = '7';
  if (quality.startsWith('dim')) quality = 'dim';

  return { root, quality };
}

// Normalize suffixes from DB and parsed tokens to a compact canonical form
function normalizeSuffix(s: string | undefined): string {
  if (!s) return '';
  const low = String(s).toLowerCase();
  if (low === 'minor' || low === 'm' || low === 'min') return 'm';
  if (low === 'major' || low === '' || low === 'maj') return '';
  if (low === 'm7' || low.startsWith('m7')) return 'm7';
  if (low === 'maj7' || low.startsWith('maj7') || low.startsWith('j7')) return 'maj7';
  if (low === '7') return '7';
  if (low.startsWith('dim')) return 'dim';
  // return raw lowercase for anything else
  return low;
}

function findDbEntriesForRoot(db: any, root: string) {
  if (!db || !db.chords) return null;
  // Try exact
  if (db.chords[root]) return db.chords[root];
  // Try C# -> Csharp (piano uses Csharp key)
  if (root.includes('#')) {
    const spelled = root.replace('#', 'sharp');
    if (db.chords[spelled]) return db.chords[spelled];
  }
  // Map sharps to flats (G# -> Ab)
  const sharpToFlat: Record<string,string> = { 'C#':'Db', 'D#':'Eb', 'F#':'Gb', 'G#':'Ab', 'A#':'Bb' };
  if (sharpToFlat[root]) {
    if (db.chords[sharpToFlat[root]]) return db.chords[sharpToFlat[root]];
  }
  // Map flats to sharps
  const flatToSharp: Record<string,string> = { 'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'Bb':'A#' };
  if (flatToSharp[root]) {
    if (db.chords[flatToSharp[root]]) return db.chords[flatToSharp[root]];
  }
  return null;
}

function transposeShape(shape: Shape, semitones: number): Shape {
  // For frets we add semitones (not perfect musically but works for simple shapes)
  const frets = shape.frets.map(f => (f <= 0 ? f : f + semitones));
  const barres = shape.barres ? shape.barres.map(b => b + semitones) : undefined;
  // Compute baseFret: if frets are high, shift them down relative to a base fret for the renderer
  const positiveFrets = frets.filter(f => f > 0);
  let baseFret = shape.baseFret ? shape.baseFret : 1;
  const minFret = positiveFrets.length ? Math.min(...positiveFrets) : 0;
  if (minFret > 1) {
    baseFret = minFret;
    // Normalize frets relative to baseFret
    for (let i = 0; i < frets.length; i++) {
      if (frets[i] > 0) frets[i] = frets[i] - baseFret + 1;
    }
    if (barres) {
      for (let j = 0; j < barres.length; j++) barres[j] = barres[j] - baseFret + 1;
    }
  }

  return { ...shape, frets, barres, baseFret };
}

function buildChordObject(shape: Shape) {
  return {
    frets: shape.frets,
    fingers: shape.fingers,
    barres: shape.barres,
    capo: shape.capo,
    baseFret: shape.baseFret || 1
  };
}

export default function ChordDiagrams({ text, size = 110, instrument = 'guitar' }: { text: string; size?: number; instrument?: 'guitar'|'ukulele'|'piano' }) {
  const chords = useMemo(() => {
    if (!text) return [] as { token: string; chordObj: any }[];
    // Extract chords like [G], [G#m7], etc. Also support inline tokens without brackets
    const matches = Array.from(text.matchAll(/\[([^\]]+)\]/g));
    const tokens = matches.length ? matches.map(m => m[1]) : (() => {
      // Fallback: try to extract space-separated chord-like tokens
      const words = text.split(/\s+/);
      return words.filter(w => /^[A-G][#b]?[a-zA-Z0-9\/]*$/.test(w));
    })();

    const unique: string[] = [];
    const result: { token: string; chordObj: any }[] = [];

    for (const token of tokens) {
      if (unique.includes(token)) continue;
      unique.push(token);
      const parsed = parseChordToken(token);
      if (!parsed) continue;
  // Prefer instrument DB shapes (guitar/ukulele) when available. We'll look into GUITAR_DB and UKULELE_DB keys.
  const rootKey = parsed.root;
  const suffixKey = parsed.quality;

      // Helper to map DB position -> chord object expected by react-chords
      const mapPositionToChordObj = (pos: any, instrumentStrings: number) => {
        // pos.frets may be strings like ["x",3,2,0,1,0] or actual note names in piano DB
        const frets: number[] = [];
        const fingers: number[] = [];
        const barres: number[] = [];
        let baseFret = 1;
        if (instrument === 'piano' && Array.isArray(pos.frets) && pos.frets.length > 0 && typeof pos.frets[0] === 'string') {
          // For piano, keep the note names as-is
          // Build chord object with a frets field that is an array of note names (library supports this)
          return { frets: pos.frets, fingers: pos.fingers, barres: undefined, baseFret: 1 } as any;
        }

        if (Array.isArray(pos.frets) && pos.frets.length > 0) {
          // Accept frets as numbers or strings (e.g. [0,1,2] or ['x',3,'2',0])
          for (const f of pos.frets) {
            if (f === 'x' || f === 'X' || f === '-') {
              frets.push(-1);
            } else if (typeof f === 'number') {
              frets.push(f);
            } else {
              // Try parse numeric from string; if not numeric, treat as muted
              const n = parseInt(String(f).replace(/[^0-9]/g, ''), 10);
              frets.push(Number.isNaN(n) ? -1 : n);
            }
          }
        } else {
          // No frets or unknown format (piano uses note names handled earlier) - cannot map
          return null;
        }

        // Map fingers if provided. Keep positions aligned with frets (pad/truncate as needed)
        if (Array.isArray(pos.fingers)) {
          for (const fi of pos.fingers) {
            const n = parseInt(String(fi).replace(/[^0-9]/g, ''));
            fingers.push(Number.isNaN(n) ? 0 : n);
          }
        }

        if (Array.isArray(pos.barres)) {
          for (const b of pos.barres) barres.push(Number(b));
        }

        // Ensure frets/fingers arrays length matches instrument strings - pad left (low strings) with muted if shorter
        if (frets.length < instrumentStrings) {
          const padCount = instrumentStrings - frets.length;
          for (let i = 0; i < padCount; i++) {
            frets.unshift(-1);
            // Keep fingers aligned
            if (fingers.length) fingers.unshift(0);
          }
        }

        // If fingers is longer than frets, trim; if shorter, pad with zeros
        if (fingers.length > frets.length) fingers.splice(0, fingers.length - frets.length);
        while (fingers.length < frets.length) fingers.unshift(0);

        // Compute baseFret: smallest positive fret
        const positiveFrets = frets.filter(f => f > 0);
        const minFret = positiveFrets.length ? Math.min(...positiveFrets) : 0;
        // For ukulele we prefer to keep absolute fret numbers (show blank frets before marks)
        if (minFret > 1 && instrument !== 'ukulele') {
          baseFret = minFret;
          // Normalize frets relative to baseFret for the renderer
          for (let i = 0; i < frets.length; i++) {
            if (frets[i] > 0) frets[i] = frets[i] - baseFret + 1;
          }
          // Adjust barres to relative too
          for (let j = 0; j < barres.length; j++) {
            barres[j] = barres[j] - baseFret + 1;
          }
        }

        return { frets, fingers: fingers.length ? fingers : undefined, barres: barres.length ? barres : undefined, baseFret };
      };

        // Find a matching entry by normalized suffix. Returns null if none found (no silent fallback).
        const findMatchingEntry = (entries: any[], wantedRaw: string | undefined) => {
          if (!Array.isArray(entries) || entries.length === 0) return null;
          const wanted = normalizeSuffix(wantedRaw);
          // exact normalized match
          let match = entries.find((e: any) => normalizeSuffix(e.suffix) === wanted);
          if (match) return match;
          // If the wanted suffix is more specific than a single character (e.g. 'm7'),
          // allow DB entries that start with the wanted suffix (e.g. 'm7b5' startsWith 'm7').
          // Do NOT allow '7' to match '7sus4' implicitly.
          if (wanted && wanted.length > 1) {
            match = entries.find((e: any) => {
              const es = normalizeSuffix(e.suffix);
              if (!es) return false;
              return es.startsWith(wanted);
            });
            if (match) return match;
          }
          // As a safety: if we have a candidate but the quality might be ambiguous (e.g. '7' vs 'm7'), prefer an entry whose midi contains the expected third
          const verifyMatchQuality = (entry: any, wantedNorm: string) => {
            try {
              if (!entry || !entry.positions || !entry.positions[0] || !entry.positions[0].midi) return true; // can't verify, assume ok
              const root = entry.key; // 'D'
              const rootIdx = noteIndex(root);
              if (rootIdx === -1) return true;
              const pcs = (entry.positions[0].midi || []).map((m: number) => m % 12);
              if (wantedNorm === 'm' || wantedNorm === 'm7') {
                // expect minor third (root + 3)
                return pcs.includes((rootIdx + 3) % 12);
              }
              if (wantedNorm === '7' || wantedNorm === '') {
                // for dominant/major expect major third (root + 4)
                return pcs.includes((rootIdx + 4) % 12);
              }
              // default: accept
              return true;
            } catch (e) {
              return true;
            }
          };

          // If we had an earlier exact match candidate but it doesn't verify, try to find another entry that does
          if (wanted) {
            // look for any entry that verifies
            const alternate = entries.find((e: any) => normalizeSuffix(e.suffix) && verifyMatchQuality(e, wanted));
            if (alternate) return alternate;
          }

          return null;
        };

      let used = false;

      // Prefer DB based on selected instrument
      if (instrument === 'guitar') {
        if (GUITAR_DB) {
          const entries = findDbEntriesForRoot(GUITAR_DB, rootKey);
          if (Array.isArray(entries) && entries.length) {
    const wanted = normalizeSuffix(parsed.quality);
    const match = findMatchingEntry(entries, parsed.quality);
            if (match && match.positions && match.positions[0]) {
              const obj = mapPositionToChordObj(match.positions[0], 6);
              if (obj) {
                // Ensure barres actually match a fret value after mapping
                if (obj.barres && Array.isArray(obj.barres)) {
                  const valid = obj.barres.filter((b: number) => Array.isArray(obj.frets) && obj.frets.includes(b));
                  if (valid.length) obj.barres = valid; else delete obj.barres;
                }
                result.push({ token, chordObj: buildChordObject(obj) });
                used = true;
              }
            }
          }
        }
      } else if (instrument === 'ukulele') {
        if (UKULELE_DB) {
          const entries = findDbEntriesForRoot(UKULELE_DB, rootKey);
          if (Array.isArray(entries) && entries.length) {
            const wanted = normalizeSuffix(parsed.quality);
            const match = findMatchingEntry(entries, parsed.quality);
            if (match && match.positions && match.positions[0]) {
              // Use the ukulele DB position directly, but ensure arrays fit 4 strings
              const rawPos = match.positions[0];
              // Create a safe copy
              const pos = {
                frets: Array.isArray(rawPos.frets) ? rawPos.frets.slice() : [],
                fingers: Array.isArray(rawPos.fingers) ? rawPos.fingers.slice() : [],
                barres: Array.isArray(rawPos.barres) ? rawPos.barres.slice() : [],
                baseFret: rawPos.baseFret || 1
              };

              // Normalize frets: convert 'x','X','-' to -1, keep numbers as numbers
              const normalizedFrets: number[] = pos.frets.map((f: any) => {
                if (typeof f === 'string') {
                  if (f === 'x' || f === 'X' || f === '-') return -1;
                  const n = parseInt(f.replace(/[^0-9]/g, ''), 10);
                  return Number.isNaN(n) ? -1 : n;
                }
                return typeof f === 'number' ? f : -1;
              });

              // Ensure length is 4 (ukulele). If DB has more or fewer, pad/truncate as needed.
              if (normalizedFrets.length > 4) {
                // Keep the last 4 strings (higher-pitched strings) if extra on the left
                // Many DBs list strings low->high; ensure we take rightmost 4
                normalizedFrets.splice(0, normalizedFrets.length - 4);
              } else if (normalizedFrets.length < 4) {
                const pad = Array(4 - normalizedFrets.length).fill(-1);
                // Prepend muted strings to reach 4
                normalizedFrets.unshift(...pad);
              }

              // Align fingers with frets: convert fingers to numbers, pad/truncate to length 4
              const normalizedFingers: number[] = pos.fingers.map((fi: any) => {
                if (fi === null || fi === undefined || fi === 0) return 0;
                const n = parseInt(String(fi).replace(/[^0-9]/g, ''), 10);
                return Number.isNaN(n) ? 0 : n;
              });
              if (normalizedFingers.length > 4) normalizedFingers.splice(0, normalizedFingers.length - 4);
              while (normalizedFingers.length < 4) normalizedFingers.unshift(0);

              // Normalize barres relative to baseFret if present
              const normalizedBarres: number[] = (pos.barres || []).map((b: any) => Number(b)).filter((n: number) => !Number.isNaN(n));
              // Only keep barre values that actually exist in the frets array (avoid library errors when barre doesn't match any fret)
              const filteredBarres = normalizedBarres.filter((b: number) => normalizedFrets.includes(b));
              const finalPos = { frets: normalizedFrets, fingers: normalizedFingers, barres: filteredBarres.length ? filteredBarres : undefined, baseFret: pos.baseFret };

              const obj = mapPositionToChordObj(finalPos, 4);
              if (obj) {
                // Sanitize barres post-mapping
                if (obj.barres && Array.isArray(obj.barres)) {
                  const valid = obj.barres.filter((b: number) => Array.isArray(obj.frets) && obj.frets.includes(b));
                  if (valid.length) obj.barres = valid; else delete obj.barres;
                }
                result.push({ token, chordObj: buildChordObject(obj) });
                used = true;
              }
            }
          }
        }
      }

      // Try piano DB: contains positions as note names. Use it when instrument === 'piano'
      if (instrument === 'piano' && PIANO_DB && PIANO_DB.chords) {
        const entries = findDbEntriesForRoot(PIANO_DB, parsed.root);
        if (Array.isArray(entries) && entries.length) {
            let match = findMatchingEntry(entries, parsed.quality);
            // If no suffix-match found, use a midi/pitch-class heuristic to pick the best entry (avoid D7->Dm7)
            if (!match) {
              try {
                const wanted = normalizeSuffix(parsed.quality);
                const rootIdx = noteIndex(parsed.root);
                if (rootIdx !== -1) {
                  // expected pcs depending on quality
                  const expectedPcs: number[] = [];
                  if (wanted === 'm' || wanted === 'm7') {
                    expectedPcs.push((rootIdx + 3) % 12); // minor third
                  }
                  if (wanted === '' || wanted === '7' || wanted === 'maj7') {
                    expectedPcs.push((rootIdx + 4) % 12); // major third
                  }
                  // seventh present for 7/m7
                  if (wanted === 'm7' || wanted === '7') expectedPcs.push((rootIdx + 10) % 12);

                  // Score entries by how many expected pcs are present
                  let best: any = null;
                  let bestScore = 0;
                  for (const e of entries) {
                    const pos = e.positions && e.positions[0];
                    if (!pos) continue;
                    const midis = Array.isArray(pos.midi) ? pos.midi : [];
                    const pcs = midis.map((m: number) => m % 12);
                    let score = 0;
                    for (const p of expectedPcs) if (pcs.includes(p)) score++;
                    if (score > bestScore) { bestScore = score; best = e; }
                  }
                  if (best && bestScore > 0) match = best;
                }
              } catch (e) {
                // ignore heuristic errors
              }
            }

            if (match && match.positions && match.positions[0]) {
              const pos = match.positions[0];
              // Build chord object with note names / midi for piano
              const chordObj: any = { frets: pos.frets };
              if (Array.isArray(pos.midi) && pos.midi.length) chordObj.midi = pos.midi;
              result.push({ token, chordObj });
              used = true;
            }
        }
      }
      
    if (used) continue;

      // If ukulele was selected and we couldn't find a ukulele DB entry, skip fallback
      if (instrument === 'ukulele') continue;

      // Fallback for instruments that have base shapes (guitar)
      // Find mapping in base (we only have C shapes) - compute semitone distance from C
      const rootIdx = noteIndex(parsed.root);
      const baseIdx = noteIndex('C');
      if (rootIdx === -1) continue;
      const semitones = (rootIdx - baseIdx + 12) % 12;

      // Pick a base shape for quality
      const qualKey = parsed.quality === 'major' ? 'major' : (parsed.quality.startsWith('minor') ? 'minor' : (parsed.quality.startsWith('7') ? '7' : parsed.quality));
      const baseShape = BASE_SHAPES['C'][qualKey];
      if (!baseShape) continue; // ignore unsupported

      const transposed = transposeShape(baseShape, semitones);
      // Sanitize barres on fallback transposed shape
      if (transposed.barres && Array.isArray(transposed.barres)) {
        const valid = transposed.barres.filter((b: number) => Array.isArray(transposed.frets) && transposed.frets.includes(b));
        if (valid.length) transposed.barres = valid; else delete transposed.barres;
      }
      result.push({ token, chordObj: buildChordObject(transposed) });
    }

    return result;
  }, [text, instrument]);

  if (!chords.length) return null;

  // Layout: piano -> 2 per row on desktop, guitar/ukulele -> 3 per row on desktop.
  // On mobile we want 3 per row for chords (as requested).
  const isPiano = instrument === 'piano';
  const gridClass = isPiano ? 'grid grid-cols-2 md:grid-cols-2 gap-4' : 'grid grid-cols-3 md:grid-cols-3 gap-4';

  // If the consumer requests a small size (mobile block), add a small wrapper class to shrink visuals
  const smallMode = size && size <= 100;

  return (
    <div className={gridClass}>
      {chords.map((c, i) => (
        <div key={i} className={`flex flex-col items-center text-center w-full ${smallMode ? 'text-xs' : ''}`}>
          <div style={{ width: '100%', transform: smallMode ? 'scale(0.85)' : 'scale(1)', transformOrigin: 'top center' }}>
            {instrument === 'ukulele' ? (
              <Chord chord={c.chordObj} instrument={{ strings: 4, fretsOnChord: 4, name: 'Ukulele', keys: NOTES, tunings: { standard: ['G','C','E','A'] } }} />
            ) : instrument === 'piano' ? (
              // For piano we render a small keyboard visualization below
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <PianoKeyboard notes={c.chordObj.midi || (Array.isArray(c.chordObj.frets) ? c.chordObj.frets : [])} size={Math.floor(size * 0.55)} />
              </div>
            ) : (
              <Chord chord={c.chordObj} instrument={{ strings: 6, fretsOnChord: 4, name: 'Guitar', keys: NOTES, tunings: { standard: ['E','A','D','G','B','E'] } }} />
            )}
          </div>
          <small className="mt-1 text-xs text-muted-foreground">{c.token}</small>
        </div>
      ))}
    </div>
  );
}

// Small, lightweight piano keyboard renderer (visual only)
function PianoKeyboard({ notes, size = 140 }: { notes: string[] | number[] | undefined; size?: number }) {
  // single octave layout: 7 white keys, 5 black keys placed between them
  const whiteNames = ['C','D','E','F','G','A','B'];
  const blackMap = [ {name:'C#', after:0}, {name:'D#', after:1}, {name:'F#', after:3}, {name:'G#', after:4}, {name:'A#', after:5} ];

  // Normalize function: flats to sharps and strip octave digits
  const normalize = (s: string) => s.replace('Db','C#').replace('Eb','D#').replace('Gb','F#').replace('Ab','G#').replace('Bb','A#').replace(/[0-9]/g,'');

  // Collect midi and name arrays
  const midis: number[] = [];
  const names: string[] = [];
  for (const n of (notes || [])) {
    if (typeof n === 'number') midis.push(n);
    else names.push(String(n));
  }

  // Highlight based on exact midi pitches if available, otherwise use normalized note names
  const highlightSet = new Set<string>();
  if (midis.length) {
    for (const m of midis) {
      const pc = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][m % 12];
      highlightSet.add(pc);
    }
  } else if (names.length) {
    for (const n of names) highlightSet.add(normalize(n));
  }

  // Sizes
  const whiteWidth = Math.max(18, Math.floor(size / 7));
  const blackWidth = Math.floor(whiteWidth * 0.6);
  // Increase key height slightly for better touch targets/visibility
  const whiteHeight = Math.floor(size * 0.62);

// Render whites
return (
    <div style={{ position: 'relative', width: whiteWidth * 7, height: whiteHeight }}>
        <div style={{ display: 'flex', position: 'absolute', zIndex: 1 }}>
            {whiteNames.map((w, i) => (
                <div key={i} style={{ width: whiteWidth, height: whiteHeight, background: highlightSet.has(w) ? '#add8e6' : '#ffffff', border: '1px solid #e6e7ea', boxSizing: 'border-box', borderRadius: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ fontSize: 9, color: '#6b7280', paddingBottom: 1 }}>{w}</div>
                </div>
            ))}
        </div>

        {/* Render black keys positioned absolutely between whites */}
        <div style={{ position: 'absolute', zIndex: 2, pointerEvents: 'none' }}>
            {blackMap.map((b, idx) => {
                const left = (b.after + 1) * whiteWidth - (blackWidth / 2);
                return (
                    <div key={idx} style={{ position: 'absolute', left, width: blackWidth, height: Math.floor(whiteHeight * 0.68), background: highlightSet.has(b.name) ? '#739099' : '#111827', borderRadius: 3 }} />
                );
            })}
        </div>
    </div>
);
}

// Additional export: helper for piano render-only lists (not SVG). If instrument === 'piano', we render simple voicings above.
export function PianoVoicings({ text }: { text: string }) {
  if (!PIANO_DB) return null;
  const tokens = Array.from(text.matchAll(/\[([^\]]+)\]/g)).map(m => m[1]);
  const unique = Array.from(new Set(tokens));
  const list: { token: string; positions?: any[] }[] = [];
  for (const token of unique) {
    const parsed = parseChordToken(token);
    if (!parsed) continue;
    const key = parsed.root;
    const suffix = parsed.quality === 'major' ? 'major' : parsed.quality.replace('minor','m');
    const entries = (PIANO_DB && PIANO_DB.chords && (PIANO_DB.chords[key] || PIANO_DB.chords[key === 'C#' ? 'Csharp' : key])) || [];
    const match = entries.find((e:any)=>e.suffix === parsed.quality || e.suffix === suffix) || entries[0];
    list.push({ token, positions: match ? match.positions : undefined });
  }

  if (!list.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {list.map((l, i) => (
        <div key={i} className="text-sm">
          <strong>{l.token}</strong>: {l.positions && l.positions[0] ? (Array.isArray(l.positions[0].frets) ? l.positions[0].frets.join(', ') : '') : '—'}
        </div>
      ))}
    </div>
  );
}
