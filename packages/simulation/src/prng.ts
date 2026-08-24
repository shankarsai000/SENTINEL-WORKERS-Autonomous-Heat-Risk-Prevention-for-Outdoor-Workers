/**
 * Seedable Deterministic Pseudo-Random Number Generator (Mulberry32)
 */
export class DeterministicPRNG {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed >>> 0;
  }

  /**
   * Returns a pseudorandom float between 0 (inclusive) and 1 (exclusive).
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in range [min, max] inclusive.
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Picks a random element from an array.
   */
  public pick<T>(array: readonly T[]): T {
    const index = Math.floor(this.next() * array.length);
    return array[index];
  }

  /**
   * Picks an option based on weighted probabilities.
   */
  public pickWeighted<T>(options: Array<{ item: T; weight: number }>): T {
    const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
    let r = this.next() * totalWeight;
    for (const opt of options) {
      if (r < opt.weight) {
        return opt.item;
      }
      r -= opt.weight;
    }
    return options[options.length - 1].item;
  }
}
