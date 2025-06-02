// src/systems/dialogue/utils/syllableUtils.ts

export class SyllableSegmenter {
  private vowels = new Set('aeiouyAEIOUY');

  public segment(word: string): string[] {
    if (!word) return [];

    const segments: string[] = [];
    let current = '';

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const nextChar = word[i + 1];

      current += char;

      if (this.vowels.has(char)) {
        // Vowel followed by consonant or end of word
        if (!nextChar || !this.vowels.has(nextChar)) {
          let j = i + 1;
          while (j < word.length && !this.vowels.has(word[j])) j++;

          if (j - i === 2 && j < word.length) {
            segments.push(current);
            current = '';
          } else if (j - i > 2 || j === word.length) {
            segments.push(current);
            current = '';
          }
        }
      }
    }

    if (current) segments.push(current);
    return segments.length > 0 ? segments : [word];
  }
}
