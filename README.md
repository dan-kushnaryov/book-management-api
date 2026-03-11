# Book Management API

RESTful API for managing books with TypeScript, Express, and MongoDB.

## Tech Stack

- **Node.js** + **Express** - Web framework
- **TypeScript** - Type safety
- **MongoDB** + **Mongoose** - Database and ODM
- **JWT** - Authentication
- **Docker** - Containerization
- **Mocha** + **Sinon** + **Chai** - Testing

## Project Structure

```
src/
├── config/          # Configuration (database, env variables)
├── controllers/     # Request handlers
├── middleware/      # Auth, validation, error handling
├── models/          # Mongoose schemas
├── routes/          # API routes
├── services/        # Business logic
├── scripts/         # Utility scripts (seed)
├── types/           # TypeScript type definitions
├── app.ts           # Express app setup
└── index.ts         # Entry point
test/
├── setup.ts         # Test database setup
├── books.test.ts    # Books endpoint tests
└── feed.test.ts     # Feed endpoint tests
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Docker)
- Docker & Docker Compose (optional)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start MongoDB** (if not using Docker):
   ```bash
   mongod
   ```

4. **Seed the database:**
   ```bash
   npm run seed
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

### Docker

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# Seed the database (run after containers are up)
docker-compose exec app npm run seed

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/login` | Login and get JWT token |

### Books (Protected)

| Method | Endpoint      | Description        |
|--------|---------------|--------------------|
| GET    | `/books`      | List all books     |
| GET    | `/books/:id`  | Get single book    |
| POST   | `/books`      | Create new book    |
| PUT    | `/books/:id`  | Update book        |
| DELETE | `/books/:id`  | Delete book        |

### Feed (Protected)

| Method | Endpoint | Description                    |
|--------|----------|--------------------------------|
| GET    | `/feed`  | Get ranked book recommendations |

**Feed Ranking Algorithm:**
1. Books by authors from the same country as the user are prioritized first
2. Within each group, books are sorted by weighted score:
   - 80% weight: number of pages (longer books score higher)
   - 20% weight: age of the book (older books score higher)

## Design Decisions

### Pre-computed Score Field

The `score` field was added to the Book model as a **performance optimization**. Instead of calculating the ranking score at query time for potentially millions of books, the score is computed once when a book is created or updated.

**Formula:**
```
score = 0.8 × (pages / 10,000) + 0.2 × ((5,000 - year) / 5,000)
```

**Normalization Constants:**

| Constant | Value | Rationale |
|----------|-------|-----------|
| `SCORE_MAX_PAGES` | 10,000 | Covers most books in existence. Even the longest novels rarely exceed this. Books with more pages still work but won't score higher. |
| `SCORE_BASE_YEAR` | 5,000 | A far future reference year. Using `(5000 - publishedYear)` ensures older books get higher age scores. Any book published between year 0 and 5000 will have a positive age score. |

These values were chosen to normalize both components to a 0-1 range, ensuring the 80/20 weighting works correctly.

**Why fixed constants instead of dynamic max values?**

An alternative approach would be to dynamically find maximum values from the database (e.g., `SELECT MAX(pages) FROM books`). However, fixed constants were chosen for the following reasons:

1. **Score stability** — If we used dynamic max values, adding a single book with 20,000 pages would recalculate scores for ALL existing books. With fixed constants, each book's score is independent and never changes unless the book itself is updated.

2. **Performance** — No additional database queries needed to find current max values before calculating a score.

3. **Predictability** — The same book always produces the same score, regardless of what other books exist in the database. This makes debugging and testing straightforward.

4. **Simplicity** — No need for complex recalculation logic or background jobs to update scores when the dataset changes.

**Why this formula is deterministic:**

The age score is calculated using only the publication year, not the current date:
```typescript
const ageScore = (5000 - publishedYear) / 5000;
```

This means:
- Two identical books added at different times will always have the same score
- No need for periodic recalculation
- Scores are stable and predictable

**Why pre-compute? (Runtime vs Write-time calculation)**

The key design decision was to move score calculation from **read time** (GET `/feed`) to **write time** (POST/PUT `/books`).

| Approach | When calculated | GET /feed query | Scalability |
|----------|-----------------|-----------------|-------------|
| **Runtime** | Every GET request | Must calculate score for all matching books, then sort in memory | Poor — O(n) calculation on every request |
| **Pre-computed** | Once on create/update | Simple `sort({ score: -1 })` on indexed field | Excellent — O(log n) index lookup |

**Without pre-compute (in-memory):**
```javascript
// 1. Fetch ALL books from user's libraries (no limit!)
const allBooks = await Book.find({ library: { $in: userLibraries } });

// 2. Calculate score for each book in memory
const booksWithScore = allBooks.map(book => ({
  ...book,
  score: 0.8 * (book.pages / 10000) + 0.2 * ((5000 - book.publishedDate.getFullYear()) / 5000)
}));

// 3. Sort in memory
booksWithScore.sort((a, b) => b.score - a.score);

// 4. Return paginated slice
const paginated = booksWithScore.slice(offset, offset + pageSize);

// Problem: With 1 million books, EVERY request loads 1M documents into memory,
// calculates 1M scores, sorts 1M items — just to return 10 results
// O(n) on every request — unacceptable
```

**Without pre-compute (aggregation pipeline):**
```javascript
// Attempt to calculate score in MongoDB:
Book.aggregate([
  { $match: { library: { $in: userLibraries } } },
  { $addFields: {
      score: {
        $add: [
          { $multiply: [0.8, { $divide: ['$pages', 10000] }] },
          { $multiply: [0.2, { $divide: [{ $subtract: [5000, { $year: '$publishedDate' }] }, 5000] }] }
        ]
      }
    }
  },
  { $sort: { score: -1 } },  // Cannot use index — field is calculated
  { $skip: offset },
  { $limit: pageSize }
])
// Problem: $sort on calculated field requires in-memory sort
// MongoDB must scan ALL matching documents, calculate score for each,
// then sort entire result set in memory before applying skip/limit
// With millions of books: slow, memory-intensive, may require allowDiskUse
```

**With pre-compute:**
```javascript
// GET /feed simply does:
Book.find({ library: { $in: userLibraries } })
    .sort({ score: -1 })  // Uses index — O(log n)
    .skip(offset)
    .limit(pageSize)
// MongoDB uses B-tree index to directly jump to the right position
// No full scan, no in-memory sort, constant performance regardless of dataset size
```

This trade-off makes sense because:
- **Reads are frequent, writes are rare** — Feed is accessed constantly, books are added/updated occasionally
- **Index-based sorting is extremely fast** — MongoDB can sort millions of records instantly using B-tree index
- **Score depends only on book data** — No external factors, so it can be safely pre-calculated

### Author Country Field

The `authorCountry` field was added to the Book model to implement the "prioritize books by authors from the same country as the user" requirement. The original assignment didn't specify how to determine an author's country, so this field was added to store the author's country code (e.g., "US", "UK") explicitly.

This enables efficient two-pool pagination: books from matching countries are queried separately and prioritized in the feed results.

### Pagination

Pagination was **not explicitly required** in the assignment, but was implemented as a necessity for both `/books` and `/feed` endpoints.

**Why pagination is essential:**

The assignment states: *"The dataset may contain millions of books."* Without pagination:

1. **Memory exhaustion** — Loading millions of records into memory would crash the server or cause severe performance degradation.

2. **Network overhead** — Transferring millions of records in a single response would result in extremely slow response times and potential timeouts.

3. **Client-side issues** — Frontend applications cannot efficiently render millions of items. Users typically view 10-50 items at a time.

4. **Database performance** — Queries without `LIMIT` on large datasets cause full collection scans and block other operations.

**Implementation:**

Both endpoints support standard pagination parameters:
- `page` — Page number (default: 1)
- `limit` — Items per page (default: 10, max: 100)

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1500000,
    "totalPages": 150000
  }
}
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Test Users

After running the seed script:

| Username | Password      | Country | Role  |
|----------|---------------|---------|-------|
| admin    | password123   | US      | admin |
| user1    | password123   | US      | user  |
| user2    | password123   | UK      | user  |

## Example Requests

### Login
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'
```

### Create Book
```bash
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "The Great Book",
    "author": "John Doe",
    "authorCountry": "US",
    "publishedDate": "2023-01-15",
    "pages": 350,
    "library": "<library_id>"
  }'
```

### Get Feed
```bash
curl http://localhost:3000/feed \
  -H "Authorization: Bearer <token>"
```

## License

ISC
