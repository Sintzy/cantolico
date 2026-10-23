import assert from 'node:assert/strict';
import test from 'node:test';

import { getHideableMassMoments, normalizeHiddenMoments, toggleMassMomentVisibility } from '@/types/mass';

test('normalizes hidden moments without accepting unknown or duplicate values', () => {
  assert.deepEqual(
    normalizeHiddenMoments(['OFERENDAS', 'GLORIA', 'OFERENDAS', 'UNKNOWN']),
    ['GLORIA', 'OFERENDAS'],
  );
  assert.deepEqual(normalizeHiddenMoments(null), []);
});

test('does not let a moment with songs be hidden', () => {
  assert.deepEqual(
    getHideableMassMoments([
      { moment: 'ENTRADA' },
      { moment: 'OFERENDAS' },
      { moment: 'OFERENDAS' },
    ]),
    ['ATO_PENITENCIAL', 'GLORIA', 'SALMO_RESPONSORIAL', 'ACLAMACAO_EVANGELHO', 'SANTO', 'PAI_NOSSO', 'SAUDACAO_PAZ', 'CORDEIRO_DEUS', 'COMUNHAO', 'ACAO_GRACAS', 'FINAL', 'OUTRO'],
  );
});

test('toggles only empty moments between visible and hidden', () => {
  assert.deepEqual(toggleMassMomentVisibility([], 'OFERENDAS', []), ['OFERENDAS']);
  assert.deepEqual(toggleMassMomentVisibility(['OFERENDAS'], 'OFERENDAS', []), []);
  assert.deepEqual(
    toggleMassMomentVisibility([], 'OFERENDAS', [{ moment: 'OFERENDAS' }]),
    [],
  );
});
