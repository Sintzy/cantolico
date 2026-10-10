import assert from 'node:assert/strict';
import test from 'node:test';

import { processAboveChords, processSimpleInline } from './chord-processor';

test('renders inline chords without losing spaces between chord groups', () => {
  const html = processSimpleInline('Gló[D]ria a Deus nas al[G]turas [A]e paz');

  assert.match(html, /Gló<\/span><span class="cw"><b class="ch">D<\/b>ria a Deus nas al/);
  assert.match(html, /turas <\/span><span class="cw"><b class="ch">A<\/b>e paz/);
  assert.match(html, /class="cl"/);
});

test('keeps Markdown formatting when an inline chord appears inside it', () => {
  const html = processSimpleInline('**Gló[D]ria [A7]a Deus [D]na terra!**');

  assert.doesNotMatch(html, /\*\*/);
  assert.match(html, /<strong>Gló<\/strong>/);
  assert.match(html, /<b class="ch">D<\/b><strong>ria <\/strong>/);
  assert.match(html, /<b class="ch">D<\/b><strong>na terra!<\/strong>/);
});

test('supports inline chords alongside the legacy above-the-lyrics format', () => {
  const html = processAboveChords('[C][G]\nCanto\nGló[D]ria a Deus');

  assert.match(html, /class="chord-section"/);
  assert.match(html, /<p class="cl">/);
  assert.match(html, /<b class="ch">D<\/b>ria a Deus/);
});
