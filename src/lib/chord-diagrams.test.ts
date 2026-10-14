import assert from 'node:assert/strict';
import test from 'node:test';
import { normaliseSuffix, parseChordToken, toRenderableStringPosition } from '../components/ChordDiagrams';

test('keeps chord extensions distinct when choosing a diagram', () => {
  assert.equal(normaliseSuffix('m7b5'), 'm7b5');
  assert.equal(normaliseSuffix('dim7'), 'dim7');
  assert.equal(normaliseSuffix('7♯9'), '7#9');
  assert.equal(normaliseSuffix('M7'), 'maj7');
  assert.equal(normaliseSuffix('6/9'), '69');
});

test('parses the explicit bass of slash chords separately', () => {
  assert.deepEqual(parseChordToken('Cm/Eb'), { root: 'C', suffix: 'm', bass: 'Eb' });
  assert.deepEqual(parseChordToken('F♯m7♭5/A'), { root: 'F#', suffix: 'm7b5', bass: 'A' });
});

test('retains the database base fret and relative fret positions', () => {
  assert.deepEqual(
    toRenderableStringPosition({ frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], barres: [2], baseFret: 5 }, 6),
    { frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], barres: [2], capo: undefined, baseFret: 5 },
  );
});
