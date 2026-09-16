import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canEditMass,
  canManageMassMembers,
  emailsMatch,
  findMembershipByEmail,
  findUsersByEmail,
  getInviteAction,
  normalizeEmail,
} from './mass-collaboration';

test('normalizes whitespace and casing in collaboration emails', () => {
  assert.equal(normalizeEmail('  Colaborador.Exemplo@Cantolico.pt  '), 'colaborador.exemplo@cantolico.pt');
  assert.equal(emailsMatch(' COLABORADOR@EXEMPLO.PT ', 'colaborador@exemplo.pt'), true);
});

test('rejects missing and malformed collaboration emails', () => {
  assert.equal(normalizeEmail(''), null);
  assert.equal(normalizeEmail('sem-arroba'), null);
  assert.equal(normalizeEmail('nome@localhost'), null);
  assert.equal(normalizeEmail(null), null);
});

test('finds legacy memberships regardless of casing or surrounding whitespace', () => {
  const member = findMembershipByEmail([
    { userEmail: '  COLABORADOR@EXEMPLO.PT ', role: 'EDITOR' as const, status: 'ACCEPTED' as const },
  ], 'colaborador@exemplo.pt');

  assert.equal(member?.status, 'ACCEPTED');
});

test('finds an existing account by normalized email and rejects a nonexistent account', () => {
  const users = [{ id: 42, email: 'Conta.Existente@Exemplo.pt' }];

  assert.equal(findUsersByEmail(users, ' conta.existente@exemplo.pt ').at(0)?.id, 42);
  assert.equal(findUsersByEmail(users, 'inexistente@exemplo.pt').length, 0);
});

test('rejects duplicate pending and accepted invitations, but permits a re-invite after decline', () => {
  assert.equal(getInviteAction({ status: 'PENDING' }), 'ALREADY_PENDING');
  assert.equal(getInviteAction({ status: 'ACCEPTED' }), 'ALREADY_ACCEPTED');
  assert.equal(getInviteAction({ status: 'DECLINED' }), 'REINVITE');
  assert.equal(getInviteAction(null), 'CREATE');
});

test('only owner/admin/editor can perform the appropriate collaboration actions', () => {
  const acceptedEditor = { userEmail: 'editor@exemplo.pt', role: 'EDITOR' as const, status: 'ACCEPTED' as const };
  const acceptedViewer = { userEmail: 'viewer@exemplo.pt', role: 'VIEWER' as const, status: 'ACCEPTED' as const };
  const pendingEditor = { userEmail: 'pending@exemplo.pt', role: 'EDITOR' as const, status: 'PENDING' as const };

  assert.equal(canEditMass(1, 1, 'USER', null), true);
  assert.equal(canEditMass(1, 2, 'ADMIN', null), true);
  assert.equal(canEditMass(1, 2, 'USER', acceptedEditor), true);
  assert.equal(canEditMass(1, 2, 'USER', acceptedViewer), false);
  assert.equal(canEditMass(1, 2, 'USER', pendingEditor), false);
  assert.equal(canManageMassMembers(1, 2, 'USER'), false);
  assert.equal(canManageMassMembers(1, 1, 'USER'), true);
});
