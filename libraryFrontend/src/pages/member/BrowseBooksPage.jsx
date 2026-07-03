// src/pages/member/BrowseBooksPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { getBooks } from '../../api/api';
import { useToast } from '../../components/Toast';
import BookShelf from '../../components/BookShelf';
import BookPreviewModal from '../../components/BookPreviewModal';
import RecommendationsSection from '../../components/RecommendationsSection';
import Icon from '../../components/Icon';
import styles from './BrowseBooksPage.module.css';

const BOOKS_PER_SHELF = 5;

const GENRES = [
  'All Genres',
  'Fantasy',
  'Science Fiction',
  'Romance',
  'Mystery',
  'Thriller',
  'Historical Fiction'
];

const EBOOK_OPTIONS = [
  { value: 'all', label: 'All Books' },
  { value: 'available', label: 'eBook Available' },
  { value: 'unavailable', label: 'eBook Not Available' }
];

// Books with local ebook files (Gutenberg IDs)
const EBOOK_TITLES = [
  "pride and prejudice",
  "alice's adventures in wonderland",
  "the adventures of sherlock holmes",
  "frankenstein",
  "the yellow wallpaper",
  "dracula",
  "moby dick",
  "great expectations",
  "a tale of two cities",
  "the picture of dorian gray",
  "the prince",
  "a christmas carol",
  "adventures of huckleberry finn",
  "the adventures of tom sawyer",
  "metamorphosis",
  "a modest proposal",
  "the importance of being earnest",
  "beowulf",
  "grimms' fairy tales",
  "heart of darkness"
];

function hasEbook(bookTitle) {
  const normalize = (str) => str.toLowerCase().replace(/['']/g, "'").replace(/[^\w\s']/g, '').replace(/\s+/g, ' ').trim();
  const normalizedTitle = normalize(bookTitle);
  return EBOOK_TITLES.some(t => {
    const normalizedEbook = normalize(t);
    const containsMatch = normalizedEbook.includes(normalizedTitle) || normalizedTitle.includes(normalizedEbook);
    const bookWords = normalizedTitle.split(' ').filter(w => w.length > 3);
    const ebookWords = normalizedEbook.split(' ').filter(w => w.length > 3);
    const wordMatch = bookWords.length > 0 && bookWords.every(w => ebookWords.some(ew => ew.includes(w) || w.includes(ew)));
    return containsMatch || wordMatch;
  });
}

export default function BrowseBooksPage() {
  const toast = useToast();

  const [books, setBooks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [genreFilter, setGenreFilter] = useState('All Genres');
  const [ebookFilter, setEbookFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [bookHistory, setBookHistory] = useState([]);


  useEffect(() => {
    getBooks()
      .then(data => {
        setBooks(data);
        setError(null);
      })
      .catch(err => setError(err.message || 'Failed to load library catalog'))
      .finally(() => setLoading(false));
  }, []);

  const filteredBooks = (books || []).filter(book => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (
      book.title.toLowerCase().includes(q) ||
      (book.author && book.author.toLowerCase().includes(q)) ||
      (book.genre && book.genre.toLowerCase().includes(q)) ||
      (book.isbn && book.isbn.toLowerCase().includes(q))
    );

    const matchesGenre = genreFilter === 'All Genres' ||
      (book.genre && book.genre.toLowerCase() === genreFilter.toLowerCase());

    const bookHasEbook = hasEbook(book.title);
    const matchesEbook = ebookFilter === 'all' ||
      (ebookFilter === 'available' && bookHasEbook) ||
      (ebookFilter === 'unavailable' && !bookHasEbook);

    return matchesSearch && matchesGenre && matchesEbook;
  });

  const shelves = useMemo(() => {
    const result = [];
    for (let i = 0; i < filteredBooks.length; i += BOOKS_PER_SHELF) {
      result.push(filteredBooks.slice(i, i + BOOKS_PER_SHELF));
    }
    return result;
  }, [filteredBooks]);

  // Always open the modal with the canonical catalog object, no matter
  // which section (recommendations shelf or library shelves) was clicked
  function handleBookClick(book) {
    const canonical = (books || []).find(b => b.id === book.id);
    setBookHistory([]);
    setSelectedBook(canonical || book);
  }

  // Navigating inside the modal (via "readers also read") keeps a history
  // so the user can go back to the book they started from
  function handleModalNavigate(book) {
    const canonical = (books || []).find(b => b.id === book.id) || book;
    setBookHistory(prev => [...prev, selectedBook]);
    setSelectedBook(canonical);
  }

  function handleModalBack() {
    setBookHistory(prev => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      setSelectedBook(copy.pop());
      return copy;
    });
  }

  function handleModalClose() {
    setSelectedBook(null);
    setBookHistory([]);
  }

  return (
    <div className={styles.container}>
      <div className={styles.searchBarWrapper}>
        <Icon name="search" className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchBar}
          placeholder="Search by title, author..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          className={`${styles.filterBtn} ${(genreFilter !== 'All Genres' || ebookFilter !== 'all') ? styles.filterActive : ''}`}
          onClick={() => setFilterOpen(!filterOpen)}
        >
          <Icon name="filter" />
          <span>Filter</span>
        </button>

        {filterOpen && (
          <>
            <div className={styles.filterOverlay} onClick={() => setFilterOpen(false)} />
            <div className={styles.filterDropdown}>
              <div className={styles.filterSection}>
                <h4 className={styles.filterTitle}>Genre</h4>
                <div className={styles.filterOptions}>
                  {GENRES.map(genre => (
                    <label key={genre} className={styles.filterOption}>
                      <input
                        type="radio"
                        name="genre"
                        checked={genreFilter === genre}
                        onChange={() => setGenreFilter(genre)}
                      />
                      <span>{genre}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.filterDivider} />

              <div className={styles.filterSection}>
                <h4 className={styles.filterTitle}>eBook</h4>
                <div className={styles.filterOptions}>
                  {EBOOK_OPTIONS.map(opt => (
                    <label key={opt.value} className={styles.filterOption}>
                      <input
                        type="radio"
                        name="ebook"
                        checked={ebookFilter === opt.value}
                        onChange={() => setEbookFilter(opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.filterActions}>
                <button
                  className={styles.clearFiltersBtn}
                  onClick={() => {
                    setGenreFilter('All Genres');
                    setEbookFilter('all');
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recommendations — hidden while searching or filtering */}
      {!searchQuery && genreFilter === 'All Genres' && ebookFilter === 'all' && (
        <RecommendationsSection onBookClick={handleBookClick} />
      )}

      {loading ? (
        <div className={styles.loadingWrapper}>
          <span className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}></span>
          <p style={{ marginTop: '12px' }}>Loading catalog...</p>
        </div>
      ) : error ? (
        <div className={styles.errorWrapper}>
          <p style={{ color: 'var(--verso-danger)', fontWeight: 'bold' }}>{error}</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className={styles.noResults}>
          No books found matching "{searchQuery}"
        </div>
      ) : (
        <div className={styles.shelvesArea}>
          {!searchQuery && genreFilter === 'All Genres' && ebookFilter === 'all' && (
            <h2 className={styles.sectionTitle}>Browse Books in the Library</h2>
          )}
          {shelves.map((shelfBooks, index) => (
            <BookShelf
              key={index}
              books={shelfBooks}
              onBookClick={handleBookClick}
            />
          ))}
        </div>
      )}

      <BookPreviewModal
        book={selectedBook}
        isOpen={selectedBook !== null}
        onClose={handleModalClose}
        onSelectBook={handleModalNavigate}
        onBack={bookHistory.length > 0 ? handleModalBack : null}
      />
    </div>
  );
}
