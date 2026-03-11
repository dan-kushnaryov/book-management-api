import { expect } from 'chai';
import {
  calculateBookScore,
  SCORE_MAX_PAGES,
  SCORE_BASE_YEAR,
} from '../../src/common/score';

describe('Score Utils', () => {
  describe('calculateBookScore', () => {
    it('should return deterministic result for same input', () => {
      const date = new Date('2000-01-01');
      const score1 = calculateBookScore(500, date);
      const score2 = calculateBookScore(500, date);

      expect(score1).to.equal(score2);
    });

    it('should give higher score to longer books (same year)', () => {
      const date = new Date('2000-01-01');
      const longBook = calculateBookScore(1000, date);
      const shortBook = calculateBookScore(100, date);

      expect(longBook).to.be.greaterThan(shortBook);
    });

    it('should give higher score to older books (same pages)', () => {
      const oldBook = calculateBookScore(500, new Date('1900-01-01'));
      const newBook = calculateBookScore(500, new Date('2020-01-01'));

      expect(oldBook).to.be.greaterThan(newBook);
    });

    it('should weight pages at 80%', () => {
      // Two books with same age, different pages
      const date = new Date('2000-01-01');
      const book1 = calculateBookScore(1000, date);
      const book2 = calculateBookScore(2000, date);

      // Difference should be 0.8 * (1000/10000) = 0.08
      const expectedDiff = 0.8 * (1000 / SCORE_MAX_PAGES);
      const actualDiff = book2 - book1;

      expect(actualDiff).to.be.closeTo(expectedDiff, 0.0001);
    });

    it('should weight age at 20%', () => {
      // Two books with same pages, different years
      const pages = 500;
      const book1 = calculateBookScore(pages, new Date('2000-01-01'));
      const book2 = calculateBookScore(pages, new Date('1900-01-01'));

      // Difference should be 0.2 * (100/5000) = 0.004
      const yearDiff = 100;
      const expectedDiff = 0.2 * (yearDiff / SCORE_BASE_YEAR);
      const actualDiff = book2 - book1;

      expect(actualDiff).to.be.closeTo(expectedDiff, 0.0001);
    });

    it('should handle books with maximum pages', () => {
      const score = calculateBookScore(SCORE_MAX_PAGES, new Date('2000-01-01'));

      // pageScore = 10000/10000 = 1.0
      // ageScore = (5000-2000)/5000 = 0.6
      // score = 0.8 * 1.0 + 0.2 * 0.6 = 0.92
      expect(score).to.be.closeTo(0.92, 0.0001);
    });

    it('should handle books exceeding maximum pages', () => {
      const maxScore = calculateBookScore(SCORE_MAX_PAGES, new Date('2000-01-01'));
      const overMaxScore = calculateBookScore(15000, new Date('2000-01-01'));

      // Books with more than max pages should score even higher
      expect(overMaxScore).to.be.greaterThan(maxScore);
    });

    it('should handle very old books (year 1)', () => {
      const score = calculateBookScore(500, new Date('0001-01-01'));

      // pageScore = 500/10000 = 0.05
      // ageScore = (5000-1)/5000 = 0.9998
      // score = 0.8 * 0.05 + 0.2 * 0.9998 = 0.23996
      expect(score).to.be.closeTo(0.24, 0.001);
    });

    it('should calculate correct score for "1984" example from docs', () => {
      // "1984" by George Orwell (1949, 328 pages)
      const score = calculateBookScore(328, new Date('1949-06-08'));

      // pageScore = 328 / 10000 = 0.0328
      // ageScore = (5000 - 1949) / 5000 = 0.6102
      // score = 0.8 × 0.0328 + 0.2 × 0.6102 = 0.14828
      expect(score).to.be.closeTo(0.1483, 0.0001);
    });

    it('should calculate correct score for "Clean Code" example from docs', () => {
      // "Clean Code" by Robert Martin (2008, 464 pages)
      const score = calculateBookScore(464, new Date('2008-08-01'));

      // pageScore = 464 / 10000 = 0.0464
      // ageScore = (5000 - 2008) / 5000 = 0.5984
      // score = 0.8 × 0.0464 + 0.2 × 0.5984 = 0.15680
      expect(score).to.be.closeTo(0.1568, 0.0001);
    });

    it('should return positive score for any valid book', () => {
      const testCases = [
        { pages: 1, date: new Date('2025-01-01') },
        { pages: 100, date: new Date('1500-01-01') },
        { pages: 10000, date: new Date('1000-01-01') },
      ];

      testCases.forEach(({ pages, date }) => {
        const score = calculateBookScore(pages, date);
        expect(score).to.be.greaterThan(0);
      });
    });
  });

  describe('Constants', () => {
    it('SCORE_MAX_PAGES should be 10000', () => {
      expect(SCORE_MAX_PAGES).to.equal(10_000);
    });

    it('SCORE_BASE_YEAR should be 5000', () => {
      expect(SCORE_BASE_YEAR).to.equal(5_000);
    });
  });
});
