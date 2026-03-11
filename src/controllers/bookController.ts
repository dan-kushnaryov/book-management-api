import { Response, NextFunction } from 'express';
import { bookService } from '../services';
import { AppError } from '../middleware';
import { AuthenticatedRequest } from '../types';
import { toBookDto, toBookDtoList, toPaginatedDto } from '../dto';
import { parsePaginationParams } from '../common';

export class BookController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const book = await bookService.create(req.body, req.user!.libraries);
      res.status(201).json(toBookDto(book));
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = parsePaginationParams(req.query as { page?: string; limit?: string });
      const { books, pagination: paginationMeta } = await bookService.findAll(
        req.user!.libraries,
        pagination
      );
      res.json(toPaginatedDto(toBookDtoList(books), paginationMeta));
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const book = await bookService.findById(req.params.id, req.user!.libraries);
      
      if (!book) {
        throw new AppError('Book not found', 404);
      }

      res.json(toBookDto(book));
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const book = await bookService.update(req.params.id, req.body, req.user!.libraries);
      
      if (!book) {
        throw new AppError('Book not found', 404);
      }

      res.json(toBookDto(book));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = await bookService.delete(req.params.id, req.user!.libraries);
      
      if (!deleted) {
        throw new AppError('Book not found', 404);
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const bookController = new BookController();
