import { expect } from 'chai';
import {
  parsePaginationParams,
  createPaginationMeta,
  paginateArray,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '../../src/common/pagination';

describe('Pagination Utils', () => {
  describe('parsePaginationParams', () => {
    it('should parse valid page and limit', () => {
      const result = parsePaginationParams({ page: '2', limit: '15' });

      expect(result.page).to.equal(2);
      expect(result.limit).to.equal(15);
    });

    it('should use default page when not provided', () => {
      const result = parsePaginationParams({ limit: '10' });

      expect(result.page).to.equal(DEFAULT_PAGE);
      expect(result.limit).to.equal(10);
    });

    it('should use default limit when not provided', () => {
      const result = parsePaginationParams({ page: '3' });

      expect(result.page).to.equal(3);
      expect(result.limit).to.equal(DEFAULT_LIMIT);
    });

    it('should use defaults when both are not provided', () => {
      const result = parsePaginationParams({});

      expect(result.page).to.equal(DEFAULT_PAGE);
      expect(result.limit).to.equal(DEFAULT_LIMIT);
    });

    it('should use default page for invalid page value', () => {
      const testCases = [
        { page: 'abc', limit: '10' },
        { page: '-1', limit: '10' },
        { page: '0', limit: '10' },
        { page: '', limit: '10' },
      ];

      testCases.forEach((query) => {
        const result = parsePaginationParams(query);
        expect(result.page).to.equal(DEFAULT_PAGE);
      });
    });

    it('should use default limit for invalid limit value', () => {
      const testCases = [
        { page: '1', limit: 'abc' },
        { page: '1', limit: '-5' },
        { page: '1', limit: '0' },
        { page: '1', limit: '' },
      ];

      testCases.forEach((query) => {
        const result = parsePaginationParams(query);
        expect(result.limit).to.equal(DEFAULT_LIMIT);
      });
    });

    it('should cap limit at MAX_LIMIT', () => {
      const result = parsePaginationParams({ page: '1', limit: '500' });

      expect(result.limit).to.equal(MAX_LIMIT);
    });

    it('should allow limit equal to MAX_LIMIT', () => {
      const result = parsePaginationParams({ page: '1', limit: String(MAX_LIMIT) });

      expect(result.limit).to.equal(MAX_LIMIT);
    });

    it('should handle float values by parsing as integers', () => {
      const result = parsePaginationParams({ page: '2.7', limit: '15.3' });

      expect(result.page).to.equal(2);
      expect(result.limit).to.equal(15);
    });
  });

  describe('createPaginationMeta', () => {
    it('should create correct pagination metadata', () => {
      const meta = createPaginationMeta(1, 10, 100);

      expect(meta.page).to.equal(1);
      expect(meta.limit).to.equal(10);
      expect(meta.total).to.equal(100);
      expect(meta.totalPages).to.equal(10);
    });

    it('should calculate totalPages correctly with remainder', () => {
      const meta = createPaginationMeta(1, 10, 95);

      expect(meta.totalPages).to.equal(10); // ceil(95/10) = 10
    });

    it('should handle zero total items', () => {
      const meta = createPaginationMeta(1, 10, 0);

      expect(meta.total).to.equal(0);
      expect(meta.totalPages).to.equal(0);
    });

    it('should handle total less than limit', () => {
      const meta = createPaginationMeta(1, 20, 5);

      expect(meta.totalPages).to.equal(1);
    });

    it('should handle large datasets', () => {
      const meta = createPaginationMeta(1, 10, 1_000_000);

      expect(meta.totalPages).to.equal(100_000);
    });
  });

  describe('paginateArray', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('should return first page correctly', () => {
      const result = paginateArray(items, 1, 3);

      expect(result.data).to.deep.equal([1, 2, 3]);
      expect(result.total).to.equal(10);
    });

    it('should return middle page correctly', () => {
      const result = paginateArray(items, 2, 3);

      expect(result.data).to.deep.equal([4, 5, 6]);
      expect(result.total).to.equal(10);
    });

    it('should return last page with remaining items', () => {
      const result = paginateArray(items, 4, 3);

      expect(result.data).to.deep.equal([10]);
      expect(result.total).to.equal(10);
    });

    it('should return empty array for page beyond total', () => {
      const result = paginateArray(items, 10, 3);

      expect(result.data).to.deep.equal([]);
      expect(result.total).to.equal(10);
    });

    it('should handle empty array', () => {
      const result = paginateArray([], 1, 10);

      expect(result.data).to.deep.equal([]);
      expect(result.total).to.equal(0);
    });

    it('should handle limit larger than array', () => {
      const result = paginateArray(items, 1, 100);

      expect(result.data).to.deep.equal(items);
      expect(result.total).to.equal(10);
    });

    it('should work with objects', () => {
      const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = paginateArray(objects, 1, 2);

      expect(result.data).to.deep.equal([{ id: 1 }, { id: 2 }]);
      expect(result.total).to.equal(3);
    });
  });

  describe('Constants', () => {
    it('DEFAULT_PAGE should be 1', () => {
      expect(DEFAULT_PAGE).to.equal(1);
    });

    it('DEFAULT_LIMIT should be 20', () => {
      expect(DEFAULT_LIMIT).to.equal(20);
    });

    it('MAX_LIMIT should be 100', () => {
      expect(MAX_LIMIT).to.equal(100);
    });
  });
});
