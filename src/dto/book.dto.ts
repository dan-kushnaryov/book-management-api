import { IBook, ILibrary } from '../models';
import { LibraryResponseDto, toLibraryDto } from './library.dto';

export interface BookResponseDto {
  id: string;
  title: string;
  author: string;
  authorCountry: string;
  publishedDate: string;
  pages: number;
  library: LibraryResponseDto;
}

type BookLike = IBook | Record<string, unknown>;

export const toBookDto = (book: BookLike): BookResponseDto => {
  const library = book.library as ILibrary | Record<string, unknown>;
  const publishedDate = book.publishedDate as Date | string;

  return {
    id: String(book._id),
    title: book.title as string,
    author: book.author as string,
    authorCountry: book.authorCountry as string,
    publishedDate: publishedDate instanceof Date 
      ? publishedDate.toISOString() 
      : new Date(publishedDate).toISOString(),
    pages: book.pages as number,
    library: toLibraryDto(library as ILibrary),
  };
};

export const toBookDtoList = (books: BookLike[]): BookResponseDto[] => {
  return books.map(toBookDto);
};
