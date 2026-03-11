import { Types } from 'mongoose';
import { Book, IBook } from '../models';
import { AppError } from '../middleware';
import { PaginationParams, createPaginationMeta, PaginationMeta, calculateBookScore } from '../common';

interface CreateBookDto {
  title: string;
  author: string;
  publishedDate: Date;
  pages: number;
  library: string;
}

interface UpdateBookDto {
  title?: string;
  author?: string;
  publishedDate?: Date;
  pages?: number;
  library?: string;
}

interface PaginatedBooks {
  books: IBook[];
  pagination: PaginationMeta;
}

export class BookService {
  async create(data: CreateBookDto, userLibraries: Types.ObjectId[]): Promise<IBook> {
    const libraryId = new Types.ObjectId(data.library);
    
    if (!userLibraries.some((lib) => lib.equals(libraryId))) {
      throw new AppError('You do not have access to this library', 403);
    }

    const publishedDate = new Date(data.publishedDate);
    const score = calculateBookScore(data.pages, publishedDate);

    const book = new Book({
      ...data,
      publishedDate,
      library: libraryId,
      score,
    });

    return book.save();
  }

  async findAll(
    userLibraries: Types.ObjectId[],
    pagination: PaginationParams
  ): Promise<PaginatedBooks> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const query = { library: { $in: userLibraries } };

    const [books, total] = await Promise.all([
      Book.find(query)
        .populate('library')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Book.countDocuments(query),
    ]);

    return {
      books,
      pagination: createPaginationMeta(page, limit, total),
    };
  }

  async findById(id: string, userLibraries: Types.ObjectId[]): Promise<IBook | null> {
    const book = await Book.findById(id).populate('library');
    
    if (!book) {
      return null;
    }

    if (!userLibraries.some((lib) => lib.equals(book.library._id))) {
      throw new AppError('You do not have access to this book', 403);
    }

    return book;
  }

  async update(
    id: string,
    data: UpdateBookDto,
    userLibraries: Types.ObjectId[]
  ): Promise<IBook | null> {
    const book = await Book.findById(id);
    
    if (!book) {
      return null;
    }

    if (!userLibraries.some((lib) => lib.equals(book.library))) {
      throw new AppError('You do not have access to this book', 403);
    }

    if (data.library) {
      const newLibraryId = new Types.ObjectId(data.library);
      if (!userLibraries.some((lib) => lib.equals(newLibraryId))) {
        throw new AppError('You do not have access to the target library', 403);
      }
    }

    Object.assign(book, data);

    if (data.pages !== undefined || data.publishedDate !== undefined) {
      book.score = calculateBookScore(book.pages, book.publishedDate);
    }

    return book.save();
  }

  async delete(id: string, userLibraries: Types.ObjectId[]): Promise<boolean> {
    const book = await Book.findById(id);
    
    if (!book) {
      return false;
    }

    if (!userLibraries.some((lib) => lib.equals(book.library))) {
      throw new AppError('You do not have access to this book', 403);
    }

    await book.deleteOne();
    return true;
  }
}

export const bookService = new BookService();
