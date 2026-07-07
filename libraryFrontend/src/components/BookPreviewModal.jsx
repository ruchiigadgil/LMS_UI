// src/components/BookPreviewModal.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Icon from './Icon';
import { getAlsoRead, getReviews } from '../api/api';
import { formatDate } from '../utils/formatDate';
import styles from './BookPreviewModal.module.css';

// Local book index - maps titles to Gutenberg IDs with descriptions
const LOCAL_BOOKS_INDEX = [
  { id: 1342, title: 'Pride and Prejudice', author: 'Jane Austen', description: 'Pride and Prejudice follows the turbulent relationship between Elizabeth Bennet, the daughter of a country gentleman, and Fitzwilliam Darcy, a rich aristocratic landowner. They must overcome the titular sins of pride and prejudice in order to fall in love and marry. The novel is set in rural England in the early 19th century and is a witty comedy of manners that has remained one of the most popular novels in the English language.' },
  { id: 11, title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll', description: "Alice's Adventures in Wonderland tells the story of a young girl named Alice who falls down a rabbit hole into a fantastical underground world populated by peculiar creatures. Through her encounters with the Cheshire Cat, the Mad Hatter, and the Queen of Hearts, Alice navigates a world where logic is turned upside down. This beloved classic has enchanted readers of all ages with its imaginative wordplay and whimsical characters." },
  { id: 1661, title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', description: 'The Adventures of Sherlock Holmes is a collection of twelve short stories featuring the legendary detective Sherlock Holmes and his faithful companion Dr. John Watson. Set in Victorian London, these tales showcase Holmes\'s extraordinary powers of observation and deduction as he solves seemingly impossible mysteries, from stolen jewels to mysterious deaths.' },
  { id: 84, title: 'Frankenstein', author: 'Mary Shelley', description: 'Frankenstein tells the story of Victor Frankenstein, a young scientist who creates a sapient creature in an unorthodox scientific experiment. The novel explores themes of ambition, the pursuit of knowledge, and the consequences of playing God. Often considered the first science fiction novel, it raises profound questions about creation, responsibility, and what it means to be human.' },
  { id: 1952, title: 'The Yellow Wallpaper', author: 'Charlotte Perkins Gilman', description: 'The Yellow Wallpaper is a short story that depicts a woman\'s descent into madness while confined to a room by her physician husband as treatment for "nervous depression." The story is regarded as an important early work of feminist literature, illustrating attitudes in the 19th century toward women\'s physical and mental health.' },
  { id: 345, title: 'Dracula', author: 'Bram Stoker', description: 'Dracula is the classic Gothic horror novel that introduced Count Dracula and established many conventions of subsequent vampire fantasy. The novel tells the story of Dracula\'s attempt to move from Transylvania to England so that he may find new blood and spread the undead curse, and of the battle between Dracula and a small group led by Professor Abraham Van Helsing.' },
  { id: 2701, title: 'Moby Dick', author: 'Herman Melville', description: 'Moby-Dick is the saga of Captain Ahab and his obsessive quest to kill the white whale, Moby Dick, who bit off his leg on a previous voyage. The novel is a profound meditation on obsession, nature, fate, and the limits of knowledge. Narrated by Ishmael, a sailor aboard Ahab\'s ship the Pequod, it is considered one of the great American novels.' },
  { id: 1400, title: 'Great Expectations', author: 'Charles Dickens', description: 'Great Expectations depicts the education of an orphan nicknamed Pip. It is Dickens\'s second novel to be fully narrated in the first person, and traces Pip\'s journey from a humble blacksmith\'s apprentice to a London gentleman, exploring themes of ambition, self-improvement, wealth, and the true meaning of being a gentleman.' },
  { id: 98, title: 'A Tale of Two Cities', author: 'Charles Dickens', description: 'A Tale of Two Cities is a historical novel set in London and Paris before and during the French Revolution. The plot centers on the years leading up to the Revolution and culminates in the Jacobin Reign of Terror. It tells the story of two men, Charles Darnay and Sydney Carton, who look alike but are very different in character, and their love for the same woman.' },
  { id: 174, title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', description: 'The Picture of Dorian Gray is a Gothic novel about a young man named Dorian Gray, who, upon seeing his portrait, wishes that the painting would age instead of him. His wish is granted, and as Dorian pursues a life of sin and pleasure, the portrait becomes increasingly hideous while he remains young and beautiful. The novel explores themes of aestheticism, moral corruption, and the nature of beauty.' },
  { id: 1232, title: 'The Prince', author: 'Niccolò Machiavelli', description: 'The Prince is a 16th-century political treatise written by Italian diplomat Niccolò Machiavelli. Although it was written as if it were a traditional work in the mirrors for princes style, it is generally agreed that it was especially innovative, since it involved the effective truth rather than abstract ideals and focused on what a prince should do to maintain power rather than what is morally right.' },
  { id: 46, title: 'A Christmas Carol', author: 'Charles Dickens', description: 'A Christmas Carol tells the story of Ebenezer Scrooge, an elderly miser who is visited by the ghost of his former business partner Jacob Marley and the spirits of Christmas Past, Present and Yet to Come. After their visits, Scrooge is transformed into a kinder, gentler man. This classic tale has become synonymous with Christmas and continues to inspire adaptations worldwide.' },
  { id: 76, title: 'Adventures of Huckleberry Finn', author: 'Mark Twain', description: 'Adventures of Huckleberry Finn is a novel about a young boy, Huck Finn, and a runaway slave, Jim, who travel down the Mississippi River on a raft. The book is noted for its colorful description of people and places along the river and is considered one of the Great American Novels for its exploration of racism, identity, and morality in the antebellum South.' },
  { id: 74, title: 'The Adventures of Tom Sawyer', author: 'Mark Twain', description: 'The Adventures of Tom Sawyer is a novel about a young boy growing up along the Mississippi River in the fictional town of St. Petersburg, Missouri. The story follows Tom through his many adventures, including witnessing a murder, running away to become a pirate, and searching for buried treasure. It captures the spirit of childhood adventure and has become a classic of American literature.' },
  { id: 5200, title: 'Metamorphosis', author: 'Franz Kafka', description: 'The Metamorphosis tells the story of salesman Gregor Samsa, who wakes one morning to find himself inexplicably transformed into a huge insect. The story explores themes of alienation, guilt, and the absurdity of existence, and is considered one of the seminal works of 20th-century fiction. Kafka\'s masterpiece continues to resonate with readers for its haunting portrayal of isolation and dehumanization.' },
  { id: 1080, title: 'A Modest Proposal', author: 'Jonathan Swift', description: 'A Modest Proposal is a satirical essay written by Jonathan Swift in 1729. The essay suggests that impoverished Irish people might ease their economic troubles by selling their children as food to rich gentlemen and ladies. This satirical hyperbole mocked heartless attitudes towards the poor and British policy toward the Irish, and remains one of the greatest examples of sustained irony in the English language.' },
  { id: 844, title: 'The Importance of Being Earnest', author: 'Oscar Wilde', description: 'The Importance of Being Earnest is a comedic play that satirizes Victorian society\'s attitudes about marriage, morality, and social expectations. The story follows two friends who each create alter egos named "Ernest" to escape their social obligations, leading to a farcical series of misunderstandings. Wilde\'s wit and wordplay make this one of the most beloved comedies in the English language.' },
  { id: 16328, title: 'Beowulf', author: 'Anonymous', description: 'Beowulf is an Old English epic poem consisting of over 3,000 alliterative lines. It is one of the most important works of Anglo-Saxon literature. The poem tells the story of Beowulf, a hero who comes to the aid of Hrothgar, the king of the Danes, whose mead hall has been under attack by a monster known as Grendel. Beowulf defeats Grendel and later Grendel\'s mother, then rules as king for fifty years.' },
  { id: 2591, title: "Grimms' Fairy Tales", author: 'Brothers Grimm', description: "Grimms' Fairy Tales is a collection of German fairy tales first published in 1812 by the Brothers Grimm, Jacob and Wilhelm. The collection includes many famous stories such as Cinderella, Snow White, Hansel and Gretel, Rapunzel, and Rumpelstiltskin. These tales have become foundational stories in Western culture and continue to inspire countless adaptations in literature, film, and other media." },
  { id: 219, title: 'Heart of Darkness', author: 'Joseph Conrad', description: 'Heart of Darkness is a novella about a voyage up the Congo River into the Congo Free State in the heart of Africa. The story follows Charles Marlow as he journeys into the African interior to meet the mysterious Kurtz, an ivory trader who has established himself as a god among the natives. The novella explores themes of imperialism, racism, and the darkness within the human soul.' },
];

const CHARS_PER_PAGE = 2000;

// Format TOC-style lines with proper alignment
function formatTocContent(content) {
  const lines = content.split('\n');
  // Pattern for "Title ... page" or "Title    page"
  const tocWithPagePattern = /^(.+?)\s{2,}([ivxlcdmIVXLCDM\d]+)\s*$/;
  // Pattern for "CHAPTER I. Title" style (no page number)
  const chapterEntryPattern = /^\s*(CHAPTER|Chapter|PART|Part|BOOK|Book|ACT|Act)\s+([IVXLCDM\d]+)[.\s]+(.*)$/;

  return lines.map(line => {
    // Check for traditional TOC with page numbers
    const tocMatch = line.match(tocWithPagePattern);
    if (tocMatch) {
      const title = tocMatch[1].trim();
      const pageNum = tocMatch[2].trim();
      return { type: 'toc', title, pageNum };
    }

    // Check for chapter entry style (CHAPTER I. Title)
    const chapterMatch = line.match(chapterEntryPattern);
    if (chapterMatch) {
      const chapterNum = chapterMatch[2];
      const chapterTitle = chapterMatch[3].trim();
      const fullTitle = chapterTitle ? `${chapterMatch[1]} ${chapterNum}. ${chapterTitle}` : `${chapterMatch[1]} ${chapterNum}`;
      return { type: 'tocEntry', chapterNum, title: fullTitle };
    }

    return { type: 'text', content: line };
  });
}

// Parse chapters and split into pages
function parseBookIntoPages(content) {
  if (!content) return { chapters: [], pages: [] };

  const chapterPattern = /^(CHAPTER|Chapter|PART|Part|BOOK|Book|ACT|Act)\s+[IVXLCDM\d]+\.?\s*$/;
  const chapterWithTitlePattern = /^(CHAPTER|Chapter|PART|Part|BOOK|Book|ACT|Act)\s+[IVXLCDM\d]+[.\s]+.+$/;
  const prefacePattern = /^(PREFACE|Preface|PROLOGUE|Prologue|INTRODUCTION|Introduction|FOREWORD|Foreword)\.?\s*$/;
  const contentsPattern = /^(CONTENTS|Contents|TABLE OF CONTENTS|INDEX)\.?\s*$/;

  const lines = content.split('\n');
  const chapters = [];
  const pages = [];

  let currentChapterTitle = 'Title Page';
  let currentChapterIndex = 0;
  let currentChapterContent = '';
  let currentChapterStartPage = 0;
  let sectionType = 'titlePage';
  let inContentsSection = false;
  let blankLineCount = 0;

  function splitChapterIntoPages(chapterTitle, chapterContent, chapterIdx, startPageNum, secType) {
    const chapterPages = [];
    let remaining = chapterContent;
    let pageInChapter = 0;

    while (remaining.length > 0) {
      let breakPoint = CHARS_PER_PAGE;
      if (remaining.length > CHARS_PER_PAGE) {
        const paragraphBreak = remaining.lastIndexOf('\n\n', CHARS_PER_PAGE);
        if (paragraphBreak > CHARS_PER_PAGE * 0.5) {
          breakPoint = paragraphBreak + 2;
        } else {
          const sentenceBreak = remaining.lastIndexOf('. ', CHARS_PER_PAGE);
          if (sentenceBreak > CHARS_PER_PAGE * 0.5) {
            breakPoint = sentenceBreak + 2;
          }
        }
      }

      const pageContent = remaining.slice(0, breakPoint);
      remaining = remaining.slice(breakPoint);

      chapterPages.push({
        content: pageContent,
        chapterTitle: chapterTitle,
        chapterIndex: chapterIdx,
        pageInChapter: pageInChapter,
        globalPageNumber: startPageNum + pageInChapter,
        isFirstPageOfChapter: pageInChapter === 0,
        sectionType: secType
      });
      pageInChapter++;
    }

    return chapterPages;
  }

  // Check if a line looks like a TOC entry (has chapter + title on same line, or indented)
  function isTocEntry(line) {
    const trimmed = line.trim();
    // TOC entries typically have "CHAPTER I. Title" format or are indented lists
    if (chapterWithTitlePattern.test(trimmed)) return true;
    // Or they start with spaces/tabs (indented)
    if (line.startsWith(' ') || line.startsWith('\t')) return true;
    return false;
  }

  // Check if this is a real chapter start (not in TOC)
  function isRealChapterStart(line, lineIndex) {
    const trimmed = line.trim();

    // Must match chapter pattern
    if (!chapterPattern.test(trimmed) && !chapterWithTitlePattern.test(trimmed)) {
      return false;
    }

    // If we're in contents section, check if this looks like end of TOC
    if (inContentsSection) {
      // Real chapters are usually preceded by multiple blank lines after TOC
      // and are NOT indented, and the chapter title is on its own line or next line

      // Check if line is NOT indented (real chapter headers aren't indented)
      if (line.startsWith(' ') || line.startsWith('\t')) {
        return false;
      }

      // Check for multiple blank lines before this (indicates end of TOC section)
      if (blankLineCount >= 2) {
        return true;
      }

      // Check if this matches the standalone chapter pattern (just "CHAPTER I." without title)
      if (chapterPattern.test(trimmed) && !chapterWithTitlePattern.test(trimmed)) {
        return true;
      }

      return false;
    }

    return true;
  }

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();

    // Track blank lines
    if (trimmedLine === '') {
      blankLineCount++;
    } else {
      const isPreface = prefacePattern.test(trimmedLine);
      const isContents = contentsPattern.test(trimmedLine);
      const isChapter = isRealChapterStart(line, lineIndex);

      if (isContents) {
        // Save previous section
        if (currentChapterContent.trim()) {
          const chapterPages = splitChapterIntoPages(
            currentChapterTitle,
            currentChapterContent,
            currentChapterIndex,
            pages.length,
            sectionType
          );
          pages.push(...chapterPages);
        }

        // Start contents section
        inContentsSection = true;
        sectionType = 'contents';
        currentChapterIndex++;
        currentChapterTitle = trimmedLine.substring(0, 50);
        currentChapterStartPage = pages.length;

        chapters.push({
          title: currentChapterTitle,
          startPage: currentChapterStartPage,
          index: currentChapterIndex,
          sectionType: 'contents'
        });

        currentChapterContent = line + '\n';
      } else if (isPreface) {
        // Save previous section
        if (currentChapterContent.trim()) {
          const chapterPages = splitChapterIntoPages(
            currentChapterTitle,
            currentChapterContent,
            currentChapterIndex,
            pages.length,
            sectionType
          );
          pages.push(...chapterPages);
        }

        inContentsSection = false;
        sectionType = 'preface';
        currentChapterIndex++;
        currentChapterTitle = trimmedLine.substring(0, 50);
        currentChapterStartPage = pages.length;

        chapters.push({
          title: currentChapterTitle,
          startPage: currentChapterStartPage,
          index: currentChapterIndex,
          sectionType: 'preface'
        });

        currentChapterContent = line + '\n';
      } else if (isChapter) {
        // Save previous section
        if (currentChapterContent.trim()) {
          const chapterPages = splitChapterIntoPages(
            currentChapterTitle,
            currentChapterContent,
            currentChapterIndex,
            pages.length,
            sectionType
          );
          pages.push(...chapterPages);
        }

        // End contents section when we hit first real chapter
        inContentsSection = false;
        sectionType = 'chapter';
        currentChapterIndex++;
        currentChapterTitle = trimmedLine.substring(0, 50);
        currentChapterStartPage = pages.length;

        chapters.push({
          title: currentChapterTitle,
          startPage: currentChapterStartPage,
          index: currentChapterIndex,
          sectionType: 'chapter'
        });

        currentChapterContent = line + '\n';
      } else {
        currentChapterContent += line + '\n';
      }

      blankLineCount = 0;
    }
  });

  // Push the last section's pages
  if (currentChapterContent.trim()) {
    const chapterPages = splitChapterIntoPages(
      currentChapterTitle,
      currentChapterContent,
      currentChapterIndex,
      pages.length,
      sectionType
    );
    pages.push(...chapterPages);
  }

  // Update chapters with page counts
  chapters.forEach((chapter, idx) => {
    const nextChapter = chapters[idx + 1];
    chapter.endPage = nextChapter ? nextChapter.startPage - 1 : pages.length - 1;
    chapter.pageCount = chapter.endPage - chapter.startPage + 1;
  });

  return { chapters, pages };
}

// Get reading progress from localStorage
function getReadingProgress(bookId) {
  try {
    const progress = localStorage.getItem(`reading_progress_${bookId}`);
    return progress ? JSON.parse(progress) : null;
  } catch {
    return null;
  }
}

// Save reading progress to localStorage
function saveReadingProgress(bookId, scrollPercent) {
  try {
    const data = {
      scrollPercent,
      timestamp: Date.now()
    };
    localStorage.setItem(`reading_progress_${bookId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save reading progress:', e);
  }
}

export default function BookPreviewModal({ book, isOpen, onClose, onSelectBook, onBack }) {
  const [activeTab, setActiveTab] = useState('details');
  const [description, setDescription] = useState('');
  const [bookContent, setBookContent] = useState('');
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [gutenbergId, setGutenbergId] = useState(null);
  const [isFullBook, setIsFullBook] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [pages, setPages] = useState([]);
  const [navOpen, setNavOpen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);
  const [hasEbook, setHasEbook] = useState(true);
  const [alsoRead, setAlsoRead] = useState([]);
  const [bookReviews, setBookReviews] = useState([]);

  const readerRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !book) return;
    setActiveTab('details');
    setDescription('');
    setBookContent('');
    setGutenbergId(null);
    setIsFullBook(false);
    setChapters([]);
    setPages([]);
    setNavOpen(false);
    setReadingProgress(0);
    setHasRestoredProgress(false);
    setHasEbook(true);
    fetchBookDescription();
    findLocalBook();

    // "Readers also read" recommendations + reviews for this book
    setAlsoRead([]);
    setBookReviews([]);
    if (book.id) {
      getAlsoRead(book.id)
        .then(data => setAlsoRead(data || []))
        .catch(() => setAlsoRead([]));
      getReviews(book.id)
        .then(data => setBookReviews(data || []))
        .catch(() => setBookReviews([]));
    }
  }, [isOpen, book]);

  useEffect(() => {
    if (bookContent) {
      const { chapters: parsedChapters, pages: parsedPages } = parseBookIntoPages(bookContent);
      setChapters(parsedChapters);
      setPages(parsedPages);
    }
  }, [bookContent]);

  function fetchWithTimeout(url, ms = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  async function fetchBookDescription() {
    if (!book) return;

    // Cached from a previous fetch — no network call
    const cacheKey = `verso_desc_${book.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setDescription(cached);
      setLoadingDescription(false);
      return;
    }

    setLoadingDescription(true);

    function saveAndShow(desc) {
      if (desc && desc.trim()) {
        localStorage.setItem(cacheKey, desc);
      }
      setDescription(desc);
      setLoadingDescription(false);
    }

    // Check local index for description first
    const titleLower = book.title.toLowerCase();
    const localMatch = LOCAL_BOOKS_INDEX.find(b =>
      b.title.toLowerCase().includes(titleLower) ||
      titleLower.includes(b.title.toLowerCase())
    );
    if (localMatch && localMatch.description) {
      saveAndShow(localMatch.description);
      return;
    }

    // Use book's own description if available
    const bookOwnDescription = book.description || book.summary || book.synopsis;

    // Search Google Books and return the first result that HAS a description
    async function tryGoogleBooks(query) {
      try {
        const res = await fetchWithTimeout(
          `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=10&printType=books`
        );
        const data = await res.json();
        const match = (data.items || []).find(
          it => it.volumeInfo && it.volumeInfo.description && it.volumeInfo.description.length > 60
        );
        return match ? match.volumeInfo.description : null;
      } catch (err) {
        console.error('Google Books API failed:', err);
        return null;
      }
    }

    // 1. Precise lookup by ISBN when we have one
    if (book.isbn) {
      const cleanIsbn = book.isbn.replace(/[^0-9Xx]/g, '');
      if (cleanIsbn.length >= 10) {
        const desc = await tryGoogleBooks(`isbn:${cleanIsbn}`);
        if (desc) { saveAndShow(desc); return; }
      }
    }

    // 2. Title + author search
    {
      const q = encodeURIComponent(`intitle:"${book.title}"${book.author ? `+inauthor:"${book.author}"` : ''}`);
      const desc = await tryGoogleBooks(q);
      if (desc) { saveAndShow(desc); return; }
    }

    // 3. Loose title search
    {
      const q = encodeURIComponent(`${book.title} ${book.author || ''}`);
      const desc = await tryGoogleBooks(q);
      if (desc) { saveAndShow(desc); return; }
    }

    // 4. Open Library fallback
    try {
      const query = encodeURIComponent(book.title);
      const res = await fetchWithTimeout(`https://openlibrary.org/search.json?title=${query}&limit=3`);
      const data = await res.json();
      for (const doc of (data.docs || [])) {
        if (!doc.key) continue;
        try {
          const workRes = await fetchWithTimeout(`https://openlibrary.org${doc.key}.json`);
          const workData = await workRes.json();
          if (workData.description) {
            const desc = typeof workData.description === 'string' ? workData.description : workData.description.value;
            if (desc) { saveAndShow(desc); return; }
          }
        } catch (e) {
          console.error('Open Library work fetch failed:', e);
        }
      }
    } catch (err) {
      console.error('Open Library API failed:', err);
    }

    // Book's own description is cacheable; the "not available" fallback is
    // deliberately not cached so a later open can retry the APIs
    if (bookOwnDescription) {
      saveAndShow(bookOwnDescription);
    } else {
      setDescription('No description available for this book.');
      setLoadingDescription(false);
    }
  }

  function findLocalBook() {
    if (!book) return;
    const titleLower = book.title.toLowerCase().trim();

    // Normalize title for matching (remove punctuation, extra spaces)
    const normalize = (str) => str.toLowerCase().replace(/['']/g, "'").replace(/[^\w\s']/g, '').replace(/\s+/g, ' ').trim();
    const normalizedBookTitle = normalize(book.title);

    console.log('Looking for book:', book.title, '| normalized:', normalizedBookTitle);

    const match = LOCAL_BOOKS_INDEX.find(b => {
      const normalizedLocalTitle = normalize(b.title);
      // Check various matching strategies
      const exactMatch = normalizedLocalTitle === normalizedBookTitle;
      const containsMatch = normalizedLocalTitle.includes(normalizedBookTitle) || normalizedBookTitle.includes(normalizedLocalTitle);
      // Check if main words match (e.g., "alice wonderland" matches "alice's adventures in wonderland")
      const bookWords = normalizedBookTitle.split(' ').filter(w => w.length > 3);
      const localWords = normalizedLocalTitle.split(' ').filter(w => w.length > 3);
      const wordMatch = bookWords.length > 0 && bookWords.every(w => localWords.some(lw => lw.includes(w) || w.includes(lw)));

      return exactMatch || containsMatch || wordMatch;
    });

    if (match) {
      console.log('Found local match:', match.title, 'with ID:', match.id);
      setGutenbergId(match.id);
      setHasEbook(true);
    } else {
      console.log('No local match found, searching Gutenberg online...');
      setHasEbook(false);
      searchGutenbergOnline();
    }
  }

  async function searchGutenbergOnline() {
    if (!book) return;
    try {
      const query = encodeURIComponent(book.title);
      const res = await fetch(`https://gutendex.com/books?search=${query}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const match = data.results.find(b =>
          b.title.toLowerCase().includes(book.title.toLowerCase()) ||
          book.title.toLowerCase().includes(b.title.toLowerCase())
        );
        if (match) {
          setGutenbergId(match.id);
        }
      }
    } catch (err) {
      console.error('Failed to search Gutenberg:', err);
    }
  }

  async function fetchBookContent() {
    if (!gutenbergId) {
      setBookContent('This book is not available in the public domain library. Full content preview is not available.');
      return;
    }
    setLoadingContent(true);

    // Helper to check if content is HTML instead of plain text
    const isHtmlContent = (text) => {
      const trimmed = text.trim().toLowerCase();
      return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.startsWith('<head');
    };

    const localPath = `/books/${gutenbergId}.txt`;
    console.log('Fetching book from:', localPath);

    try {
      const localRes = await fetch(localPath);
      console.log('Local fetch response:', localRes.status, localRes.ok);
      if (localRes.ok) {
        const text = await localRes.text();
        console.log('Content preview:', text.substring(0, 100));
        if (!isHtmlContent(text)) {
          setBookContent(text);
          setLoadingContent(false);
          return;
        } else {
          console.log('Local file returned HTML, trying Gutenberg...');
        }
      }
    } catch (err) {
      console.log('Local file fetch error:', err);
    }

    try {
      const res = await fetch(`https://www.gutenberg.org/files/${gutenbergId}/${gutenbergId}-0.txt`);
      if (res.ok) {
        const text = await res.text();
        if (!isHtmlContent(text)) {
          setBookContent(text);
          setLoadingContent(false);
          return;
        }
      }

      const altRes = await fetch(`https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`);
      if (altRes.ok) {
        const text = await altRes.text();
        if (!isHtmlContent(text)) {
          setBookContent(text);
          setLoadingContent(false);
          return;
        }
      }

      throw new Error('Content not available');
    } catch (err) {
      console.error('Failed to fetch book content:', err);
      setBookContent('Unable to load book content. This title may not be available in the public domain.');
    } finally {
      setLoadingContent(false);
    }
  }

  function handlePreviewClick() {
    setIsFullBook(false);
    setActiveTab('reading');
    if (!bookContent) {
      fetchBookContent();
    }
  }

  function openFullBook() {
    setIsFullBook(true);
    setActiveTab('reading');
    if (!bookContent) {
      fetchBookContent();
    }
  }

  // Get pages to display based on preview/full mode (preview shows first 15 pages)
  const pagesToShow = isFullBook ? pages : pages.slice(0, Math.min(pages.length, 15));

  // Handle scroll to track progress and save position
  const handleScroll = useCallback(() => {
    if (!readerRef.current || !gutenbergId) return;
    const { scrollTop, scrollHeight, clientHeight } = readerRef.current;
    const scrollPercent = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100) || 0;
    setReadingProgress(scrollPercent);

    // Debounce save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveReadingProgress(gutenbergId, scrollPercent);
    }, 500);
  }, [gutenbergId]);

  // Restore reading position when entering reading mode
  useEffect(() => {
    if (activeTab === 'reading' && pages.length > 0 && gutenbergId && !hasRestoredProgress && readerRef.current) {
      const saved = getReadingProgress(gutenbergId);
      if (saved && typeof saved.scrollPercent === 'number' && saved.scrollPercent > 0) {
        // Wait a bit for content to render
        setTimeout(() => {
          if (readerRef.current) {
            const { scrollHeight, clientHeight } = readerRef.current;
            const scrollPos = (saved.scrollPercent / 100) * (scrollHeight - clientHeight);
            readerRef.current.scrollTop = scrollPos;
          }
        }, 100);
      }
      setHasRestoredProgress(true);
    }
  }, [activeTab, pages, gutenbergId, hasRestoredProgress]);

  function goToChapter(chapterIndex) {
    const chapter = chapters[chapterIndex];
    if (!chapter) return;
    const chapterElement = document.getElementById(`chapter-${chapter.index}`);
    if (chapterElement) {
      chapterElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setNavOpen(false);
  }

  function handleBackToDetails() {
    setActiveTab('details');
    setHasRestoredProgress(false);
  }

  if (!isOpen || !book) return null;

  const coverUrl = book.cover_image_url || '/placeholder-cover.svg';

  const isAvailable = book.available_copies > 0;

  // Rating: prefer the book object's aggregate; fall back to the fetched reviews
  const avgRating = book.avg_rating != null
    ? book.avg_rating
    : (bookReviews.length > 0
        ? Math.round((bookReviews.reduce((sum, r) => sum + r.rating, 0) / bookReviews.length) * 10) / 10
        : null);
  const ratingsCount = book.avg_rating != null ? book.ratings_count : bookReviews.length;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>

        {onBack && activeTab === 'details' && (
          <button className={styles.backNavBtn} onClick={onBack} aria-label="Back to previous book">
            <Icon name="arrowLeft" />
            <span>Back</span>
          </button>
        )}

        {activeTab === 'details' && (
          <div className={styles.content}>
            <div className={styles.leftPanel}>
              <div className={styles.coverWrapper}>
                <img
                  src={coverUrl}
                  alt={book.title}
                  className={styles.cover}
                  onError={(e) => e.target.src = '/placeholder-cover.svg'}
                />
              </div>
              <div className={styles.bookDetails}>
                <h2 className={styles.title}>{book.title}</h2>
                <p className={styles.author}>by {book.author || 'Unknown'}</p>
                <div className={styles.ratingRow}>
                  {avgRating != null ? (
                    <>
                      <span className={styles.ratingStars}>
                        {[1, 2, 3, 4, 5].map(i => (
                          <Icon
                            key={i}
                            name="star"
                            size={15}
                            className={i <= Math.round(avgRating) ? styles.ratingStarFilled : styles.ratingStarEmpty}
                          />
                        ))}
                      </span>
                      <span className={styles.ratingText}>
                        {avgRating} ({ratingsCount} rating{ratingsCount !== 1 ? 's' : ''})
                      </span>
                    </>
                  ) : (
                    <span className={styles.ratingText}>No ratings yet</span>
                  )}
                </div>
                <div className={styles.tagsRow}>
                  {book.genre && <span className={styles.genre}>{book.genre}</span>}
                  {!hasEbook && <span className={styles.noEbookTag}>eBook not available</span>}
                </div>
                <div className={`${styles.stockIndicator} ${isAvailable ? styles.inStock : styles.outOfStock}`}>
                  {isAvailable ? 'Available' : 'Not Available'}
                </div>
              </div>
            </div>

            <div className={styles.rightPanel}>
              <h3 className={styles.sectionTitle}>About This Book</h3>
              {loadingDescription ? (
                <div className={styles.loading}>
                  <span className="spinner"></span>
                  <span>Loading description...</span>
                </div>
              ) : (
                <div
                  className={styles.description}
                  dangerouslySetInnerHTML={{ __html: description || 'No description available for this book.' }}
                />
              )}

              <div className={styles.actions}>
                <button
                  className={styles.previewBtn}
                  onClick={handlePreviewClick}
                >
                  <Icon name="book" className={styles.btnIcon} />
                  View Book Preview
                </button>
                <button className={styles.payBtn} onClick={openFullBook}>
                  <Icon name="book" className={styles.btnIcon} />
                  Pay To Read The Full Book
                </button>
              </div>

              <div className={styles.reviewsSection}>
                <h4 className={styles.reviewsTitle}>
                  Reviews ({bookReviews.length})
                </h4>
                {bookReviews.length === 0 ? (
                  <p className={styles.noReviewsText}>
                    No reviews yet. Be the first to review this book.
                  </p>
                ) : (
                  <div className={styles.reviewsList}>
                    {bookReviews.map(review => (
                      <div key={review.id} className={styles.reviewItem}>
                        <div className={styles.reviewItemHeader}>
                          <span className={styles.reviewStars}>
                            {[1, 2, 3, 4, 5].map(i => (
                              <Icon
                                key={i}
                                name="star"
                                size={13}
                                className={i <= review.rating ? styles.ratingStarFilled : styles.ratingStarEmpty}
                              />
                            ))}
                          </span>
                          <span className={styles.reviewAuthor}>{review.user_name}</span>
                          <span className={styles.reviewDate}>{formatDate(review.created_at)}</span>
                        </div>
                        {review.text && (
                          <p className={styles.reviewItemText}>{review.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {alsoRead.length > 0 && (
                <div className={styles.alsoRead}>
                  <h4 className={styles.alsoReadTitle}>Readers of this book also read</h4>
                  <div className={styles.alsoReadRow}>
                    {alsoRead.map(b => (
                      <div
                        key={b.id}
                        className={styles.alsoReadCard}
                        title={`${b.title} by ${b.author}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectBook && onSelectBook(b)}
                      >
                        <img
                          src={b.cover_image_url || '/placeholder-cover.svg'}
                          alt={b.title}
                          className={styles.alsoReadCover}
                          onError={(e) => e.target.src = '/placeholder-cover.svg'}
                        />
                        <span className={styles.alsoReadBookTitle}>{b.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reading' && (
          <div className={styles.fullscreenReader}>
            {/* Floating Controls */}
            <button className={styles.floatingBackBtn} onClick={handleBackToDetails}>
              <Icon name="arrowLeft" />
            </button>

            <button
              className={styles.floatingTocBtn}
              onClick={() => setNavOpen(!navOpen)}
              title="Table of Contents"
            >
              <Icon name="clipboardList" />
            </button>

            {/* Main Scrollable Reader */}
            <div className={styles.scrollableReader} ref={readerRef} onScroll={handleScroll}>
              {loadingContent ? (
                <div className={styles.loadingReader}>
                  <span className="spinner"></span>
                  <span>Loading book...</span>
                </div>
              ) : (
                <div className={styles.pagesContainer}>
                  {/* Title Page with Description */}
                  <div className={styles.bookPage}>
                    <div className={styles.titlePage}>
                      <h1 className={styles.bookTitleLarge}>{book.title}</h1>
                      {book.author && (
                        <p className={styles.bookAuthorLarge}>by {book.author}</p>
                      )}
                      <div className={styles.titleDivider}></div>
                      {description && (
                        <div className={styles.bookDescription}>
                          <h3>About This Book</h3>
                          <p dangerouslySetInnerHTML={{ __html: description }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {pagesToShow.length > 0 ? (
                    pagesToShow.map((page, idx) => {
                      const isTitleOrContents = page.sectionType === 'titlePage' || page.sectionType === 'contents';
                      const formattedLines = isTitleOrContents
                        ? formatTocContent(page.content)
                        : null;

                      return (
                        <div
                          key={idx}
                          className={`${styles.bookPage} ${page.sectionType === 'titlePage' ? styles.titlePageSection : ''} ${page.sectionType === 'contents' ? styles.contentsSection : ''}`}
                          id={page.isFirstPageOfChapter ? `chapter-${page.chapterIndex}` : undefined}
                          data-page={page.globalPageNumber}
                        >
                          {page.isFirstPageOfChapter && page.sectionType === 'contents' && (
                            <h2 className={styles.contentsTitle}>
                              {page.chapterTitle}
                            </h2>
                          )}
                          {page.isFirstPageOfChapter && page.sectionType !== 'titlePage' && page.sectionType !== 'contents' && (
                            <h2 className={styles.chapterTitle}>
                              {page.chapterTitle}
                            </h2>
                          )}
                          {isTitleOrContents && formattedLines ? (
                            <div className={page.sectionType === 'contents' ? styles.contentsText : styles.titlePageText}>
                              {formattedLines.map((line, lineIdx) => (
                                line.type === 'toc' ? (
                                  <div key={lineIdx} className={styles.tocLine}>
                                    <span className={styles.tocTitle}>{line.title}</span>
                                    <span className={styles.tocDots}></span>
                                    <span className={styles.tocPage}>{line.pageNum}</span>
                                  </div>
                                ) : line.type === 'tocEntry' ? (
                                  <div key={lineIdx} className={styles.tocEntryLine}>
                                    <span className={styles.tocEntryTitle}>{line.title}</span>
                                  </div>
                                ) : (
                                  <div key={lineIdx} className={page.sectionType === 'contents' ? styles.contentsLine : styles.titlePageLine}>
                                    {line.content}
                                  </div>
                                )
                              ))}
                            </div>
                          ) : (
                            <div className={styles.bookText}>
                              {page.content}
                            </div>
                          )}
                          {!isTitleOrContents && (
                            <div className={styles.pageFooter}>
                              <span className={styles.chapterIndicator}>{page.chapterTitle}</span>
                              <span className={styles.pageNumber}>Page {page.pageInChapter + 1}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.bookPage}>
                      <div className={styles.bookText}>{bookContent}</div>
                    </div>
                  )}

                  {/* End of preview message */}
                  {!isFullBook && pages.length > pagesToShow.length && (
                    <div className={styles.previewEndPage}>
                      <p>End of preview</p>
                      <button className={styles.continueBtn} onClick={openFullBook}>
                        Pay To Read Full Book
                      </button>
                    </div>
                  )}

                  {/* End of book */}
                  {isFullBook && (
                    <div className={styles.endPage}>
                      <p className={styles.bookEnd}>— The End —</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chapter Navigation Sidebar */}
            <div className={`${styles.chapterNav} ${navOpen ? styles.navOpen : ''}`}>
              <div className={styles.navHeader}>
                <h4>Table of Contents</h4>
                <button className={styles.navCloseBtn} onClick={() => setNavOpen(false)}>
                  <Icon name="close" />
                </button>
              </div>
              <div className={styles.chapterList}>
                {chapters.length > 0 ? (
                  chapters.map((chapter, idx) => (
                    <button
                      key={idx}
                      className={styles.chapterItem}
                      onClick={() => goToChapter(idx)}
                    >
                      <span className={styles.chapterName}>{chapter.title}</span>
                      <span className={styles.chapterDots}></span>
                      <span className={styles.chapterPage}>{chapter.startPage + 1}</span>
                    </button>
                  ))
                ) : (
                  <p className={styles.noChapters}>No chapters detected</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
