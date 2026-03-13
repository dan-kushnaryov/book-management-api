import { Types, FilterQuery } from 'mongoose';
import { Book, IBook } from '../models';
import { PaginationParams, createPaginationMeta } from '../common';

interface PaginatedFeed {
  books: IBook[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Feed service that returns books ranked by relevance.
 *
 * Sorting priority:
 * 1. Books by authors from the same country as the user (prioritized first)
 * 2. Within each group, sorted by pre-computed score (pages + age weighted)
 *
 * Performance notes:
 * - All queries use compound index { library, authorCountry, score }
 * - Complex aggregations are intentionally avoided for better index utilization
 * - Score is pre-computed on book create/update to avoid runtime calculations
 * - Fetches exactly `limit` records regardless of page depth
 */
export class FeedService {
  async getFeed(
    userLibraries: Types.ObjectId[],
    userCountry: string,
    pagination: PaginationParams
  ): Promise<PaginatedFeed> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const baseQuery = { library: { $in: userLibraries } };
    const sameCountryQuery = { ...baseQuery, authorCountry: userCountry };
    const otherCountryQuery = { ...baseQuery, authorCountry: { $ne: userCountry } };

    // Get counts to calculate pagination across two pools
    const [sameCountryCount, total] = await Promise.all([
      Book.countDocuments(sameCountryQuery),
      Book.countDocuments(baseQuery),
    ]);

    // Calculate skip/limit for each pool based on where the page falls
    const poolParams = this.calculatePoolParams(sameCountryCount, skip, limit);

    // Fetch only the exact records needed for this page
    const books = await this.fetchFromPools(
      sameCountryQuery,
      otherCountryQuery,
      poolParams
    );

    return {
      books,
      pagination: createPaginationMeta(page, limit, total),
    };
  }

  /**
   * Calculates skip/limit for each pool (same country vs other countries).
   *
   * @example
   * Given: sameCountryCount=14, page=3, limit=5 (skip=10)
   *
   * Pool 1 (same country):  [0  1  2  3  4  5  6  7  8  9  10 11 12 13]
   * Pool 2 (other country): [0  1  2 ...]
   * Page 3 needs:           [10 11 12 13] [0]
   *
   * Calculation:
   *   sameCountrySkip  = min(10, 14) = 10
   *   sameCountryLimit = max(0, min(5, 14 - 10)) = 4  ← only 4 left in pool 1
   *   otherCountrySkip  = max(0, 10 - 14) = 0
   *   otherCountryLimit = 5 - 4 = 1  ← take 1 from pool 2 to fill the page
   *
   * Result:
   *   Pool 1: skip=10, limit=4 → 4 books from same country
   *   Pool 2: skip=0, limit=1 → 1 book from other countries
   *   Total: 5 books for page 3
   */
  private calculatePoolParams(
    sameCountryCount: number,
    skip: number,
    limit: number
  ) {
    // How many items to skip in pool 1 (capped by pool size)
    const sameCountrySkip = Math.min(skip, sameCountryCount);

    // How many items to take from pool 1 (remaining after skip, capped by limit)
    const sameCountryLimit = Math.min(limit, sameCountryCount - sameCountrySkip);

    // Pool 2 starts after pool 1 is exhausted
    const otherCountrySkip = skip - sameCountrySkip;

    // Pool 2 fills the rest of the page
    const otherCountryLimit = limit - sameCountryLimit;

    return {
      sameCountry: { skip: sameCountrySkip, limit: sameCountryLimit },
      otherCountry: { skip: otherCountrySkip, limit: otherCountryLimit },
    };
  }

  /**
   * Fetches books from both pools in parallel, returns combined result.
   */
  private async fetchFromPools(
    sameCountryQuery: FilterQuery<IBook>,
    otherCountryQuery: FilterQuery<IBook>,
    params: ReturnType<typeof this.calculatePoolParams>
  ): Promise<IBook[]> {
    const queries: Promise<IBook[]>[] = [];

    if (params.sameCountry.limit > 0) {
      queries.push(
        this.findBooks(sameCountryQuery, params.sameCountry.skip, params.sameCountry.limit)
      );
    }

    if (params.otherCountry.limit > 0) {
      queries.push(
        this.findBooks(otherCountryQuery, params.otherCountry.skip, params.otherCountry.limit)
      );
    }

    if (queries.length === 0) {
      return [];
    }

    const results = await Promise.all(queries);
    return results.flat();
  }

  private findBooks(
    query: FilterQuery<IBook>,
    skip: number,
    limit: number
  ): Promise<IBook[]> {
    return Book.find(query)
      .sort({ score: -1 })
      .skip(skip)
      .limit(limit)
      .populate('library')
      .lean<IBook[]>();
  }
}

export const feedService = new FeedService();
