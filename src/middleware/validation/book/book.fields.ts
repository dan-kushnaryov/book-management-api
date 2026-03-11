import { body } from 'express-validator';

export const bookFields = {
  title: () =>
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required'),

  author: () =>
    body('author')
      .trim()
      .notEmpty()
      .withMessage('Author is required'),

  authorCountry: () =>
    body('authorCountry')
      .trim()
      .notEmpty()
      .withMessage('Author country is required')
      .isLength({ min: 2, max: 3 })
      .withMessage('Author country must be a 2-3 letter code (e.g., US, UK)'),

  publishedDate: () =>
    body('publishedDate')
      .isISO8601()
      .withMessage('Valid published date is required'),

  pages: () =>
    body('pages')
      .isInt({ min: 1 })
      .withMessage('Pages must be a positive integer'),

  library: () =>
    body('library')
      .isMongoId()
      .withMessage('Valid library ID is required'),
};
