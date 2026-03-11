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

const createBookWithScore = (data: {
  title: string;
  author: string;
  authorCountry: string;
  publishedDate: Date;
  pages: number;
  library: unknown;
}) => ({
  ...data,
  score: calculateBookScore(data.pages, data.publishedDate),
});

describe('Feed API', function() {
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

  describe('GET /feed', () => {
    it('should return empty data array when no books exist', async () => {
      const res = await request(app)
        .get('/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('data').that.is.an('array');
      expect(res.body.data).to.have.lengthOf(0);
      expect(res.body).to.have.property('pagination');
      expect(res.body.pagination).to.have.property('total', 0);
    });

    it('should return books sorted by relevance with pagination', async () => {
      await Book.create([
        createBookWithScore({
          title: 'Short Old Book',
          author: 'Author A',
          authorCountry: 'US',
          publishedDate: new Date('1900-01-01'),
          pages: 100,
          library: libraryId,
        }),
        createBookWithScore({
          title: 'Long New Book',
          author: 'Author B',
          authorCountry: 'US',
          publishedDate: new Date('2020-01-01'),
          pages: 500,
          library: libraryId,
        }),
        createBookWithScore({
          title: 'Medium Book',
          author: 'Author C',
          authorCountry: 'US',
          publishedDate: new Date('1980-01-01'),
          pages: 300,
          library: libraryId,
        }),
      ]);

      const res = await request(app)
        .get('/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('data').that.is.an('array');
      expect(res.body.data).to.have.lengthOf(3);
      expect(res.body.data[0].title).to.equal('Long New Book');
      expect(res.body.pagination).to.have.property('total', 3);
    });

    it('should support pagination parameters', async () => {
      await Book.create([
        createBookWithScore({
          title: 'Book 1',
          author: 'Author',
          authorCountry: 'US',
          publishedDate: new Date('2020-01-01'),
          pages: 100,
          library: libraryId,
        }),
        createBookWithScore({
          title: 'Book 2',
          author: 'Author',
          authorCountry: 'US',
          publishedDate: new Date('2020-01-02'),
          pages: 200,
          library: libraryId,
        }),
        createBookWithScore({
          title: 'Book 3',
          author: 'Author',
          authorCountry: 'US',
          publishedDate: new Date('2020-01-03'),
          pages: 300,
          library: libraryId,
        }),
      ]);

      const res = await request(app)
        .get('/feed?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.data).to.have.lengthOf(2);
      expect(res.body.pagination).to.have.property('page', 1);
      expect(res.body.pagination).to.have.property('limit', 2);
      expect(res.body.pagination).to.have.property('total', 3);
      expect(res.body.pagination).to.have.property('totalPages', 2);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/feed');

      expect(res.status).to.equal(401);
    });

    it('should only return books from user libraries', async () => {
      const otherLibrary = await Library.create({
        name: 'Other Library',
        location: 'Other Location',
      });

      await Book.create([
        createBookWithScore({
          title: 'My Book',
          author: 'Author',
          authorCountry: 'US',
          publishedDate: new Date('2020-01-01'),
          pages: 200,
          library: libraryId,
        }),
        createBookWithScore({
          title: 'Other Book',
          author: 'Author',
          authorCountry: 'US',
          publishedDate: new Date('2020-01-01'),
          pages: 200,
          library: otherLibrary._id,
        }),
      ]);

      const res = await request(app)
        .get('/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.data).to.have.lengthOf(1);
      expect(res.body.data[0].title).to.equal('My Book');
    });

    it('should prioritize books by authors from the same country as the user', async () => {
      await Book.create([
        createBookWithScore({
          title: 'UK Author High Score',
          author: 'British Author',
          authorCountry: 'UK',
          publishedDate: new Date('1900-01-01'),
          pages: 1000,
          library: libraryId,
        }),
        createBookWithScore({
          title: 'US Author Low Score',
          author: 'American Author',
          authorCountry: 'US',
          publishedDate: new Date('2020-01-01'),
          pages: 100,
          library: libraryId,
        }),
      ]);

      const res = await request(app)
        .get('/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.data).to.have.lengthOf(2);
      expect(res.body.data[0].title).to.equal('US Author Low Score');
      expect(res.body.data[1].title).to.equal('UK Author High Score');
    });
  });
});
