export function parseMusicMarkdown(sourceText: string): {
  lyricsPlain: string;
  chords: string[];
  keyOriginal?: string;
  abcBlocks?: any;
} {
  const lines = sourceText.split(/\r?\n/);
  const chords: string[] = [];
  const lyrics: string[] = [];

  for (const line of lines) {
    if (line.startsWith("c1:")) {
      const tokens = line.slice(3).trim().split(/\s+/);
      chords.push(...tokens);
    }
    if (line.startsWith("l1:")) {
      lyrics.push(line.slice(3).trim());
    }
  }

  const lyricsPlain = lyrics.join("\n");
  return {
    lyricsPlain,
    chords,
    keyOriginal: chords[0] || undefined,
    abcBlocks: null,
  };
}
