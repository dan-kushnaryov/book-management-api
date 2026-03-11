import { bookFields } from './book.fields';

export const updateBookValidation = [
  bookFields.title().optional(),
  bookFields.author().optional(),
  bookFields.authorCountry().optional(),
  bookFields.publishedDate().optional(),
  bookFields.pages().optional(),
  bookFields.library().optional(),
];
