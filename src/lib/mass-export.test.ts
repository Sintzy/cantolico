import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLyricPages,
  getProjectionFontSize,
  stripSongMarkup,
  wrapLyricLine,
} from './mass-export';

test('cleans chords, editor markers and markdown without joining lyrics', () => {
  const result = stripSongMarkup('#mic#\r\n**[G]Senhor**, tende piedade\r\n\r\n[C]de nós');
  assert.equal(result, 'Senhor, tende piedade\n\nde nós');
});

test('wraps a long lyric line at word boundaries', () => {
  const lines = wrapLyricLine('Esta é uma linha de letra muito longa que deve continuar sem ficar minúscula', 28);
  assert.deepEqual(lines, ['Esta é uma linha de letra', 'muito longa que deve', 'continuar sem ficar', 'minúscula']);
});

test('keeps verses together and continues a long verse on a new slide', () => {
  const pages = createLyricPages('Um\nDois\nTrês\nQuatro\nCinco\nSeis\n\nSete\nOito', 5);
  assert.deepEqual(pages, [['Um', 'Dois', 'Três', 'Quatro', 'Cinco'], ['Seis', 'Sete', 'Oito']]);
});

test('uses large projection text when a page is short', () => {
  assert.equal(getProjectionFontSize(['Santo, Santo, Santo']), 44);
  assert.equal(getProjectionFontSize(['Uma frase bastante extensa que exige uma escala segura']), 30);
});
