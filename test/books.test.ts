import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import { Application } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { setupTestDb, teardownTestDb, clearTestDb } from './setup';
import { Library, User, Book, UserRole } from '../src/models';
import { config } from '../src/config';
import { calculateBookScore } from '../src/common';

describe('Books API', function() {
  this.timeout(10000);
  
  let app: Application;
  let token: string;
  let libraryId: string;

  before(async () => {
    await setupTestDb();
    app = createApp();
  });

  after(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    const library = await Library.create({
      name: 'Test Library',
      location: 'Test Location',
    });
    libraryId = library._id.toString();

    const user = await User.create({
      username: 'testuser',
      password: 'password123',
      country: 'US',
      libraries: [library._id],
      role: UserRole.USER,
    });

    token = jwt.sign({ userId: user._id }, config.jwt.secret, {
      expiresIn: '1h',
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('POST /books', () => {
    it('should create a new book', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        authorCountry: 'US',
        publishedDate: '2020-01-01',
        pages: 200,
        library: libraryId,
      };

      const res = await request(app)
        .post('/books')
        .set('Authorization', `Bearer ${token}`)
        .send(bookData);

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('title', 'Test Book');
      expect(res.body).to.have.property('author', 'Test Author');
      expect(res.body).to.have.property('authorCountry', 'US');
    });

    it('should return proper DTO format without internal fields', async () => {
      const bookData = {
        title: 'DTO Test Book',
        author: 'DTO Author',
        authorCountry: 'UK',
        publishedDate: '2020-01-01',
        pages: 150,
        library: libraryId,
      };

      const res = await request(app)
        .post('/books')
        .set('Authorization', `Bearer ${token}`)
        .send(bookData);

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('id');
      expect(res.body).to.not.have.property('_id');
      expect(res.body).to.not.have.property('__v');
      expect(res.body).to.not.have.property('createdAt');
      expect(res.body).to.not.have.property('updatedAt');
      expect(res.body.library).to.have.property('id');
      expect(res.body.library).to.not.have.property('_id');
      expect(res.body.library).to.not.have.property('__v');
    });

    it('should return 400 for invalid input (missing title)', async () => {
      const bookData = {
        author: 'Test Author',
        authorCountry: 'US',
        publishedDate: '2020-01-01',
        pages: 200,
        library: libraryId,
      };

      const res = await request(app)
        .post('/books')
        .set('Authorization', `Bearer ${token}`)
        .send(bookData);

      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('errors');
    });

    it('should return 400 for invalid pages (negative number)', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        authorCountry: 'US',
        publishedDate: '2020-01-01',
        pages: -10,
        library: libraryId,
      };

      const res = await request(app)
        .post('/books')
        .set('Authorization', `Bearer ${token}`)
        .send(bookData);

      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('errors');
    });

    it('should return 401 without authentication', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        authorCountry: 'US',
        publishedDate: '2020-01-01',
        pages: 200,
        library: libraryId,
      };

      const res = await request(app).post('/books').send(bookData);

      expect(res.status).to.equal(401);
    });
  });

  describe('GET /books', () => {
    beforeEach(async () => {
      const publishedDate = new Date('2020-01-01');
      await Book.create({
        title: 'Existing Book',
        author: 'Existing Author',
        authorCountry: 'US',
        publishedDate,
        pages: 300,
        library: libraryId,
        score: calculateBookScore(300, publishedDate),
      });
    });

    it('should return paginated books for user libraries', async () => {
      const res = await request(app)
        .get('/books')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('data').that.is.an('array');
      expect(res.body.data).to.have.lengthOf(1);
      expect(res.body).to.have.property('pagination');
      expect(res.body.pagination).to.have.property('page', 1);
      expect(res.body.pagination).to.have.property('total', 1);
      expect(res.body.pagination).to.have.property('totalPages', 1);
    });

    it('should support pagination parameters', async () => {
      const res = await request(app)
        .get('/books?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.pagination).to.have.property('page', 1);
      expect(res.body.pagination).to.have.property('limit', 10);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/books');

      expect(res.status).to.equal(401);
    });
  });

  describe('GET /books/:id', () => {
    let bookId: string;

    beforeEach(async () => {
      const publishedDate = new Date('2020-01-01');
      const book = await Book.create({
        title: 'Existing Book',
        author: 'Existing Author',
        authorCountry: 'US',
        publishedDate,
        pages: 300,
        library: libraryId,
        score: calculateBookScore(300, publishedDate),
      });
      bookId = book._id.toString();
    });

    it('should return a single book', async () => {
      const res = await request(app)
        .get(`/books/${bookId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('title', 'Existing Book');
    });

    it('should return 404 for non-existent book', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/books/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(404);
    });
  });

  describe('PUT /books/:id', () => {
    let bookId: string;

    beforeEach(async () => {
      const publishedDate = new Date('2020-01-01');
      const book = await Book.create({
        title: 'Original Title',
        author: 'Original Author',
        authorCountry: 'US',
        publishedDate,
        pages: 300,
        library: libraryId,
        score: calculateBookScore(300, publishedDate),
      });
      bookId = book._id.toString();
    });

    it('should update a book', async () => {
      const res = await request(app)
        .put(`/books/${bookId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('title', 'Updated Title');
    });
  });

  describe('DELETE /books/:id', () => {
    let bookId: string;

    beforeEach(async () => {
      const publishedDate = new Date('2020-01-01');
      const book = await Book.create({
        title: 'Book to Delete',
        author: 'Author',
        authorCountry: 'US',
        publishedDate,
        pages: 300,
        library: libraryId,
        score: calculateBookScore(300, publishedDate),
      });
      bookId = book._id.toString();
    });

    it('should delete a book', async () => {
      const res = await request(app)
        .delete(`/books/${bookId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(204);

      const deletedBook = await Book.findById(bookId);
      expect(deletedBook).to.be.null;
    });
  });
});
