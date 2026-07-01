// scripts/downloadBooks.js
// Run with: node scripts/downloadBooks.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BOOKS_DIR = path.join(__dirname, '..', 'public', 'books');

// Popular books available on Gutenberg with their IDs
const GUTENBERG_BOOKS = [
  { id: 1342, title: 'Pride and Prejudice', author: 'Jane Austen' },
  { id: 11, title: 'Alice\'s Adventures in Wonderland', author: 'Lewis Carroll' },
  { id: 1661, title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle' },
  { id: 84, title: 'Frankenstein', author: 'Mary Shelley' },
  { id: 1952, title: 'The Yellow Wallpaper', author: 'Charlotte Perkins Gilman' },
  { id: 345, title: 'Dracula', author: 'Bram Stoker' },
  { id: 2701, title: 'Moby Dick', author: 'Herman Melville' },
  { id: 1400, title: 'Great Expectations', author: 'Charles Dickens' },
  { id: 98, title: 'A Tale of Two Cities', author: 'Charles Dickens' },
  { id: 174, title: 'The Picture of Dorian Gray', author: 'Oscar Wilde' },
  { id: 1232, title: 'The Prince', author: 'Niccolò Machiavelli' },
  { id: 46, title: 'A Christmas Carol', author: 'Charles Dickens' },
  { id: 76, title: 'Adventures of Huckleberry Finn', author: 'Mark Twain' },
  { id: 74, title: 'The Adventures of Tom Sawyer', author: 'Mark Twain' },
  { id: 5200, title: 'Metamorphosis', author: 'Franz Kafka' },
  { id: 1080, title: 'A Modest Proposal', author: 'Jonathan Swift' },
  { id: 844, title: 'The Importance of Being Earnest', author: 'Oscar Wilde' },
  { id: 16328, title: 'Beowulf', author: 'Anonymous' },
  { id: 2591, title: 'Grimms\' Fairy Tales', author: 'Brothers Grimm' },
  { id: 219, title: 'Heart of Darkness', author: 'Joseph Conrad' },
];

// Ensure books directory exists
if (!fs.existsSync(BOOKS_DIR)) {
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        fetch(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadBook(book) {
  const filePath = path.join(BOOKS_DIR, `${book.id}.txt`);

  // Skip if already downloaded
  if (fs.existsSync(filePath)) {
    console.log(`✓ Already exists: ${book.title}`);
    return true;
  }

  // Try different URL patterns
  const urls = [
    `https://www.gutenberg.org/files/${book.id}/${book.id}-0.txt`,
    `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`,
    `https://www.gutenberg.org/files/${book.id}/${book.id}.txt`,
  ];

  for (const url of urls) {
    try {
      console.log(`↓ Downloading: ${book.title}...`);
      const content = await fetch(url);

      if (content && content.length > 1000) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✓ Downloaded: ${book.title} (${Math.round(content.length / 1024)} KB)`);
        return true;
      }
    } catch (err) {
      // Try next URL
    }
  }

  console.log(`✗ Failed: ${book.title}`);
  return false;
}

async function downloadAll() {
  console.log('='.repeat(50));
  console.log('Gutenberg Book Downloader');
  console.log('='.repeat(50));
  console.log(`Target directory: ${BOOKS_DIR}\n`);

  let success = 0;
  let failed = 0;

  for (const book of GUTENBERG_BOOKS) {
    const result = await downloadBook(book);
    if (result) success++;
    else failed++;

    // Small delay to be nice to the server
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Complete! Downloaded: ${success}, Failed: ${failed}`);
  console.log('='.repeat(50));

  // Create index file
  const index = GUTENBERG_BOOKS.map(b => ({
    id: b.id,
    title: b.title,
    author: b.author,
    file: `/books/${b.id}.txt`
  }));

  fs.writeFileSync(
    path.join(BOOKS_DIR, 'index.json'),
    JSON.stringify(index, null, 2),
    'utf-8'
  );
  console.log('\nCreated index.json');
}

downloadAll().catch(console.error);
