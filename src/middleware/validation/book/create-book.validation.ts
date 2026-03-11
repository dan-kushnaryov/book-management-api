import { bookFields } from './book.fields';

export const createBookValidation = [
  bookFields.title(),
  bookFields.author(),
  bookFields.authorCountry(),
  bookFields.publishedDate(),
  bookFields.pages(),
  bookFields.library(),
];
