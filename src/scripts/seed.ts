import mongoose from 'mongoose';
import { config } from '../config';
import { Library, User, Book, UserRole } from '../models';
import { calculateBookScore } from '../common';

const seedData = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB');

    await Library.deleteMany({});
    await User.deleteMany({});
    await Book.deleteMany({});
    console.log('Cleared existing data');

    const libraries = await Library.insertMany([
      { name: 'Central Library', location: 'New York, USA' },
      { name: 'City Library', location: 'Los Angeles, USA' },
      { name: 'Public Library', location: 'London, UK' },
    ]);
    console.log('Created libraries:', libraries.length);

    const users = await User.create([
      {
        username: 'admin',
        password: 'password123',
        country: 'US',
        libraries: [libraries[0]._id, libraries[1]._id],
        role: UserRole.ADMIN,
      },
      {
        username: 'user1',
        password: 'password123',
        country: 'US',
        libraries: [libraries[0]._id],
        role: UserRole.USER,
      },
      {
        username: 'user2',
        password: 'password123',
        country: 'UK',
        libraries: [libraries[2]._id],
        role: UserRole.USER,
      },
    ]);
    console.log('Created users:', users.length);

    // Books for Central Library (libraries[0]) - accessible by admin and user1
    // Mix of US and UK authors to test country prioritization
    const centralLibraryBooks = [
      // US authors (should appear first for US users)
      { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', authorCountry: 'US', publishedDate: new Date('1925-04-10'), pages: 180 },
      { title: 'The Catcher in the Rye', author: 'J.D. Salinger', authorCountry: 'US', publishedDate: new Date('1951-07-16'), pages: 234 },
      { title: 'Moby Dick', author: 'Herman Melville', authorCountry: 'US', publishedDate: new Date('1851-10-18'), pages: 635 },
      { title: 'The Grapes of Wrath', author: 'John Steinbeck', authorCountry: 'US', publishedDate: new Date('1939-04-14'), pages: 464 },
      { title: 'Beloved', author: 'Toni Morrison', authorCountry: 'US', publishedDate: new Date('1987-09-02'), pages: 324 },
      { title: 'The Color Purple', author: 'Alice Walker', authorCountry: 'US', publishedDate: new Date('1982-06-01'), pages: 295 },
      { title: 'Slaughterhouse-Five', author: 'Kurt Vonnegut', authorCountry: 'US', publishedDate: new Date('1969-03-31'), pages: 275 },
      { title: 'On the Road', author: 'Jack Kerouac', authorCountry: 'US', publishedDate: new Date('1957-09-05'), pages: 320 },
      // UK authors
      { title: '1984', author: 'George Orwell', authorCountry: 'UK', publishedDate: new Date('1949-06-08'), pages: 328 },
      { title: 'Brave New World', author: 'Aldous Huxley', authorCountry: 'UK', publishedDate: new Date('1932-01-01'), pages: 311 },
      { title: 'Jane Eyre', author: 'Charlotte Brontë', authorCountry: 'UK', publishedDate: new Date('1847-10-16'), pages: 500 },
      { title: 'Wuthering Heights', author: 'Emily Brontë', authorCountry: 'UK', publishedDate: new Date('1847-12-01'), pages: 416 },
      { title: 'The Lord of the Rings', author: 'J.R.R. Tolkien', authorCountry: 'UK', publishedDate: new Date('1954-07-29'), pages: 1178 },
      // Other countries
      { title: 'One Hundred Years of Solitude', author: 'Gabriel García Márquez', authorCountry: 'CO', publishedDate: new Date('1967-05-30'), pages: 417 },
      { title: 'Crime and Punishment', author: 'Fyodor Dostoevsky', authorCountry: 'RU', publishedDate: new Date('1866-01-01'), pages: 671 },
      { title: 'War and Peace', author: 'Leo Tolstoy', authorCountry: 'RU', publishedDate: new Date('1869-01-01'), pages: 1225 },
    ].map((book) => ({ ...book, library: libraries[0]._id }));

    // Books for City Library (libraries[1]) - accessible by admin only
    const cityLibraryBooks = [
      // US authors
      { title: 'To Kill a Mockingbird', author: 'Harper Lee', authorCountry: 'US', publishedDate: new Date('1960-07-11'), pages: 281 },
      { title: 'The Sun Also Rises', author: 'Ernest Hemingway', authorCountry: 'US', publishedDate: new Date('1926-10-22'), pages: 251 },
      { title: 'A Farewell to Arms', author: 'Ernest Hemingway', authorCountry: 'US', publishedDate: new Date('1929-09-27'), pages: 355 },
      { title: 'The Old Man and the Sea', author: 'Ernest Hemingway', authorCountry: 'US', publishedDate: new Date('1952-09-01'), pages: 127 },
      { title: 'East of Eden', author: 'John Steinbeck', authorCountry: 'US', publishedDate: new Date('1952-09-19'), pages: 601 },
      { title: 'Fahrenheit 451', author: 'Ray Bradbury', authorCountry: 'US', publishedDate: new Date('1953-10-19'), pages: 194 },
      // UK authors
      { title: 'A Clockwork Orange', author: 'Anthony Burgess', authorCountry: 'UK', publishedDate: new Date('1962-01-01'), pages: 192 },
      { title: 'The Hobbit', author: 'J.R.R. Tolkien', authorCountry: 'UK', publishedDate: new Date('1937-09-21'), pages: 310 },
      // Other countries
      { title: 'The Stranger', author: 'Albert Camus', authorCountry: 'FR', publishedDate: new Date('1942-01-01'), pages: 123 },
      { title: 'The Trial', author: 'Franz Kafka', authorCountry: 'CZ', publishedDate: new Date('1925-04-26'), pages: 255 },
    ].map((book) => ({ ...book, library: libraries[1]._id }));

    // Books for Public Library (libraries[2]) - accessible by user2 (UK user)
    const publicLibraryBooks = [
      // UK authors (should appear first for UK users)
      { title: 'Pride and Prejudice', author: 'Jane Austen', authorCountry: 'UK', publishedDate: new Date('1813-01-28'), pages: 432 },
      { title: 'Sense and Sensibility', author: 'Jane Austen', authorCountry: 'UK', publishedDate: new Date('1811-01-01'), pages: 409 },
      { title: 'Emma', author: 'Jane Austen', authorCountry: 'UK', publishedDate: new Date('1815-12-23'), pages: 474 },
      { title: 'Great Expectations', author: 'Charles Dickens', authorCountry: 'UK', publishedDate: new Date('1861-08-01'), pages: 544 },
      { title: 'Oliver Twist', author: 'Charles Dickens', authorCountry: 'UK', publishedDate: new Date('1838-01-01'), pages: 608 },
      { title: 'A Tale of Two Cities', author: 'Charles Dickens', authorCountry: 'UK', publishedDate: new Date('1859-04-30'), pages: 489 },
      { title: 'Dracula', author: 'Bram Stoker', authorCountry: 'UK', publishedDate: new Date('1897-05-26'), pages: 418 },
      { title: 'Frankenstein', author: 'Mary Shelley', authorCountry: 'UK', publishedDate: new Date('1818-01-01'), pages: 280 },
      // US authors
      { title: 'The Scarlet Letter', author: 'Nathaniel Hawthorne', authorCountry: 'US', publishedDate: new Date('1850-03-16'), pages: 272 },
      { title: 'Little Women', author: 'Louisa May Alcott', authorCountry: 'US', publishedDate: new Date('1868-09-30'), pages: 449 },
      // Other countries
      { title: 'Anna Karenina', author: 'Leo Tolstoy', authorCountry: 'RU', publishedDate: new Date('1877-01-01'), pages: 864 },
      { title: 'Don Quixote', author: 'Miguel de Cervantes', authorCountry: 'ES', publishedDate: new Date('1605-01-16'), pages: 863 },
    ].map((book) => ({ ...book, library: libraries[2]._id }));

    const allBooksData = [...centralLibraryBooks, ...cityLibraryBooks, ...publicLibraryBooks];

    const booksWithScores = allBooksData.map((book) => ({
      ...book,
      score: calculateBookScore(book.pages, book.publishedDate),
    }));

    const books = await Book.insertMany(booksWithScores);
    console.log('Created books:', books.length);

    // Summary for testing
    console.log('\n--- Seed Summary ---');
    console.log(`Central Library: ${centralLibraryBooks.length} books`);
    console.log(`City Library: ${cityLibraryBooks.length} books`);
    console.log(`Public Library: ${publicLibraryBooks.length} books`);
    console.log(`Total: ${books.length} books`);

    console.log('\n--- Test Users ---');
    console.log('admin (US): Central + City Library → 26 books (14 US authors first)');
    console.log('user1 (US): Central Library only → 16 books (8 US authors first)');
    console.log('user2 (UK): Public Library only → 12 books (8 UK authors first)');

    console.log('\n--- Credentials ---');
    console.log('Admin: username="admin", password="password123"');
    console.log('User1: username="user1", password="password123"');
    console.log('User2: username="user2", password="password123"');

    console.log('\n--- Test Feed Pagination ---');
    console.log('GET /feed?page=1&limit=5  (first page)');
    console.log('GET /feed?page=2&limit=5  (second page)');
    console.log('GET /feed?page=3&limit=10 (should span country pools for admin)');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

seedData();
