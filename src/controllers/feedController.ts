import { Response, NextFunction } from 'express';
import { feedService } from '../services';
import { AuthenticatedRequest } from '../types';
import { toBookDtoList, toPaginatedDto } from '../dto';
import { parsePaginationParams } from '../common';

export class FeedController {
  async getFeed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = parsePaginationParams(req.query as { page?: string; limit?: string });
      const { books, pagination: paginationMeta } = await feedService.getFeed(
        req.user!.libraries,
        req.user!.country,
        pagination
      );
      res.json(toPaginatedDto(toBookDtoList(books), paginationMeta));
    } catch (error) {
      next(error);
    }
  }
}

export const feedController = new FeedController();
