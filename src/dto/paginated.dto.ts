import { PaginationMeta } from '../common';

export interface PaginatedResponseDto<T> {
  data: T[];
  pagination: PaginationMeta;
}

export const toPaginatedDto = <T>(
  data: T[],
  pagination: PaginationMeta
): PaginatedResponseDto<T> => ({
  data,
  pagination,
});
