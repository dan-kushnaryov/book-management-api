/**
 * Maximum expected pages for score normalization.
 * Books with more pages will still work but won't score higher than this threshold.
 */
export const SCORE_MAX_PAGES = 10_000;

/**
 * Base year for age score calculation.
 * Using a far future year ensures older books get higher scores.
 * Formula: (BASE_YEAR - publishedYear) / BASE_YEAR
 */
export const SCORE_BASE_YEAR = 5_000;

/**
 * Calculates a relevance score for a book based on pages and publication year.
 *
 * Formula: score = 0.8 × (pages / 10000) + 0.2 × ((5000 - year) / 5000)
 *
 * - 80% weight: number of pages (longer books score higher)
 * - 20% weight: publication year inverted (older books score higher)
 *
 * This formula is deterministic - same input always produces same output.
 *
 * @example
 * // "1984" by George Orwell (1949, 328 pages)
 * calculateBookScore(328, new Date('1949-06-08'))
 * // pageScore = 328 / 10000 = 0.0328
 * // ageScore  = (5000 - 1949) / 5000 = 0.6102
 * // score     = 0.8 × 0.0328 + 0.2 × 0.6102 = 0.1483
 *
 * @example
 * // "Clean Code" by Robert Martin (2008, 464 pages)
 * calculateBookScore(464, new Date('2008-08-01'))
 * // pageScore = 464 / 10000 = 0.0464
 * // ageScore  = (5000 - 2008) / 5000 = 0.5984
 * // score     = 0.8 × 0.0464 + 0.2 × 0.5984 = 0.1568
 */
export const calculateBookScore = (pages: number, publishedDate: Date): number => {
  const publishedYear = publishedDate.getFullYear();

  const pageScore = pages / SCORE_MAX_PAGES;
  const ageScore = (SCORE_BASE_YEAR - publishedYear) / SCORE_BASE_YEAR;

  return 0.8 * pageScore + 0.2 * ageScore;
};
