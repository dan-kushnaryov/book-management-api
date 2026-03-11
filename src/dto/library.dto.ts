import { ILibrary } from '../models';

export interface LibraryResponseDto {
  id: string;
  name: string;
  location: string;
}

type LibraryLike = ILibrary | Record<string, unknown>;

export const toLibraryDto = (library: LibraryLike): LibraryResponseDto => ({
  id: String(library._id),
  name: library.name as string,
  location: library.location as string,
});
