/**
 * Canonical email and permission helpers for mass collaboration.
 *
 * `MassMember` predates the user relation and identifies collaborators by
 * email. Keeping all comparisons here avoids one endpoint accepting a
 * collaborator that another endpoint cannot find.
 */

export type MassMemberRole = 'EDITOR' | 'VIEWER';
export type MassMemberStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface MassMembership {
  userEmail: string;
  role?: MassMemberRole;
  status?: MassMemberStatus;
}

/**
 * Normalises the email identity used by Cantólico. It deliberately only
 * changes insignificant presentation details (surrounding whitespace and
 * casing); it does not alter the local-part in any other way.
 */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const email = value.trim().toLowerCase();
  if (!email || email.length > 254) return null;

  // Practical validation for an account/invite identifier. The backend must
  // validate independently from the browser's <input type="email">.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  return email;
}

export function emailsMatch(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizeEmail(left);
  const normalizedRight = normalizeEmail(right);
  return normalizedLeft !== null && normalizedLeft === normalizedRight;
}

/** Escape SQL LIKE metacharacters before using Supabase's `ilike` filter. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

/**
 * Finds a membership by canonical email after rows have been scoped to a
 * single mass. This also makes existing legacy rows with casing/whitespace
 * usable until the normalisation migration is applied.
 */
export function findMembershipByEmail<T extends MassMembership>(
  memberships: T[] | null | undefined,
  email: unknown,
): T | null {
  return memberships?.find((membership) => emailsMatch(membership.userEmail, email)) ?? null;
}

export function findUsersByEmail<T extends { email: string }>(
  users: T[] | null | undefined,
  email: unknown,
): T[] {
  return (users || []).filter((user) => emailsMatch(user.email, email));
}

export function isAcceptedMember(membership: MassMembership | null | undefined): boolean {
  return membership?.status === 'ACCEPTED';
}

export function canEditMass(
  ownerId: number,
  userId: number | undefined,
  userRole: string | undefined,
  membership: MassMembership | null | undefined,
): boolean {
  return userId === ownerId
    || userRole === 'ADMIN'
    || (isAcceptedMember(membership) && membership?.role === 'EDITOR');
}

export function canManageMassMembers(
  ownerId: number,
  userId: number | undefined,
  userRole: string | undefined,
): boolean {
  return userId === ownerId || userRole === 'ADMIN';
}

export function getInviteAction(
  membership: Pick<MassMembership, 'status'> | null | undefined,
): 'CREATE' | 'ALREADY_PENDING' | 'ALREADY_ACCEPTED' | 'REINVITE' {
  switch (membership?.status) {
    case 'PENDING':
      return 'ALREADY_PENDING';
    case 'ACCEPTED':
      return 'ALREADY_ACCEPTED';
    case 'DECLINED':
      return 'REINVITE';
    default:
      return 'CREATE';
  }
}
