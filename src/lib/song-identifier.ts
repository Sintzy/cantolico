const SONG_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SONG_CUID_REGEX = /^c[a-z0-9]{24}$/;

export function normalizeSongIdentifier(identifier: string) {
  try {
    return decodeURIComponent(identifier).trim();
  } catch {
    return identifier.trim();
  }
}

export function isLikelySongId(identifier: string) {
  const normalized = normalizeSongIdentifier(identifier);
  return SONG_UUID_REGEX.test(normalized) || SONG_CUID_REGEX.test(normalized);
}
