"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, animate, useMotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';
import Icon from '../Icon';
import { formatDate } from '../../utils/formatDate';
import paperStyles from './InteractiveBook.module.css';

const GOLD = '#D97706';

function getBreakpointSize() {
  if (typeof window === 'undefined') return { width: 300, height: 420, bp: 'lg' };
  const w = window.innerWidth;
  let width, bp;
  if (w >= 1024) { width = 300; bp = 'lg'; }
  else if (w >= 640) { width = 235; bp = 'md'; }
  else { width = 170; bp = 'sm'; }
  // Clamp so the open spread (two pages side by side) always fits inside
  // the modal (90vw) with slack for the spine shift and page shadows.
  const maxPage = Math.floor((w * 0.9 - 24) / 2);
  if (maxPage < width) width = Math.max(110, maxPage);
  return { width, height: Math.round(width * 1.4), bp };
}

function resolveCover(coverUrl) {
  return coverUrl || '/placeholder-cover.svg';
}

function StarRow({ value, size = 14 }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name="star"
          size={size}
          className={i <= Math.round(value) ? 'text-[#D97706] fill-[#D97706]' : 'text-[var(--verso-brown-200)] fill-none'}
        />
      ))}
    </span>
  );
}

// Descriptions from Open Library often arrive as raw markdown; strip the
// syntax so links and emphasis read as plain prose on the page.
function cleanDescription(text) {
  if (!text) return text;
  return text
    .replace(/\[([^\]]*)\]\s*\(([^)]*)\)/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/\*\*?([^*\n]+)\*\*?/g, '$1');
}

function MiniBookCard({ book, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(book)}
      title={`${book.title} by ${book.author || 'Unknown'}`}
      className="w-full text-left group cursor-pointer"
    >
      <img
        src={resolveCover(book.cover_image_url)}
        alt={book.title}
        onError={(e) => { e.target.src = '/placeholder-cover.svg'; }}
        className="w-full aspect-[3/4] object-cover rounded shadow-md transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1 group-hover:scale-[1.03]"
      />
      <span className="block mt-1.5 min-h-[26px] text-[10px] font-medium text-[var(--verso-brown-900)] leading-tight line-clamp-2 transition-colors group-hover:text-[var(--verso-brown-600)] group-hover:underline">
        {book.title}
      </span>
    </button>
  );
}

function OverviewLeft({ book, coverImage, ratings, physicalAvailable, ebookAvailable }) {
  return (
    <div className="h-full flex flex-col items-center text-center">
      <img
        src={coverImage}
        alt={book.title}
        onError={(e) => { e.target.src = '/placeholder-cover.svg'; }}
        className="w-20 h-28 md:w-28 md:h-40 object-cover rounded shadow-lg mb-2 md:mb-3"
      />
      <h2 className="font-serif text-sm md:text-base font-semibold text-[var(--verso-brown-900)] leading-tight mb-1">
        {book.title}
      </h2>
      <p className="text-[10px] md:text-xs text-[var(--verso-brown-600)] mb-1.5 md:mb-2">by {book.author || 'Unknown'}</p>
      {book.genre && (
        <span className="inline-block text-[9px] font-medium uppercase tracking-wide text-[var(--verso-brown-600)] bg-[var(--verso-brown-100)] px-2.5 py-1 rounded-full mb-2">
          {book.genre}
        </span>
      )}
      <div className="flex items-center gap-1.5 mb-0.5">
        <StarRow value={ratings.average || 0} />
        {ratings.average != null && (
          <span className="text-[11px] text-[var(--verso-brown-600)]">{ratings.average.toFixed(1)}</span>
        )}
      </div>
      <span className="text-[10px] text-[var(--verso-brown-400)] mb-3">
        {ratings.count > 0 ? `${ratings.count} rating${ratings.count !== 1 ? 's' : ''}` : 'No ratings yet'}
      </span>
      <div className="flex flex-col gap-1.5 w-full mt-auto">
        <span
          className={cn(
            'text-[9px] md:text-[11px] font-medium px-2 py-1 md:px-2.5 md:py-1.5 rounded-md',
            physicalAvailable
              ? 'bg-[var(--verso-success-light)] text-[var(--verso-success)]'
              : 'bg-[var(--verso-danger-light)] text-[var(--verso-danger)]'
          )}
        >
          {physicalAvailable ? 'Available in Library' : 'Currently Checked Out'}
        </span>
        <span
          className={cn(
            'text-[9px] md:text-[11px] font-medium px-2 py-1 md:px-2.5 md:py-1.5 rounded-md',
            ebookAvailable
              ? 'bg-[var(--verso-info-light)] text-[var(--verso-info)]'
              : 'bg-[var(--verso-brown-50)] text-[var(--verso-brown-400)]'
          )}
        >
          {ebookAvailable ? 'eBook Available' : 'eBook Not Available'}
        </span>
      </div>
    </div>
  );
}

function OverviewRight({ description, loadingDescription, ebookAvailability }) {
  return (
    <div className="h-full flex flex-col">
      <h3 className="font-serif text-sm md:text-base text-[var(--verso-brown-900)] mb-1.5 md:mb-2.5">About This Book</h3>
      <div className="flex-1 overflow-hidden text-[11px] md:text-[13px] leading-relaxed text-[var(--verso-brown-800)]">
        {loadingDescription ? (
          <div className="flex items-center gap-2 text-[var(--verso-brown-500)]">
            <span className="spinner"></span> Loading description...
          </div>
        ) : (
          <div
            className="line-clamp-[7] md:line-clamp-[10] lg:line-clamp-[13]"
            dangerouslySetInnerHTML={{ __html: cleanDescription(description) || 'No description available for this book.' }}
          />
        )}
      </div>
      <div className="pt-3 mt-3 border-t border-[var(--verso-border-light)]">
        <button
          type="button"
          onClick={ebookAvailability?.available ? ebookAvailability.onRead : undefined}
          disabled={!ebookAvailability?.available}
          className={cn(
            'w-full px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-md font-medium transition-colors',
            ebookAvailability?.available
              ? 'bg-[var(--verso-brown-700)] text-white hover:bg-[var(--verso-brown-800)]'
              : 'bg-[var(--verso-brown-100)] text-[var(--verso-brown-400)] opacity-70 cursor-not-allowed'
          )}
        >
          Read eBook
        </button>
      </div>
    </div>
  );
}

function CommunityPage({ ratings, reviews }) {
  const { average, count, distribution } = ratings;
  if (count === 0 && reviews.length === 0) {
    return (
      <div className="h-full flex flex-col min-h-0">
        <h3 className="font-serif text-sm md:text-base text-[var(--verso-brown-900)] mb-2">Ratings &amp; Reviews</h3>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 px-4">
          <StarRow value={0} size={18} />
          <p className="font-serif text-sm text-[var(--verso-brown-600)]">No ratings yet</p>
          <p className="text-[11px] text-[var(--verso-brown-400)] leading-relaxed">
            Be the first to rate and review this book.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col min-h-0">
      <h3 className="font-serif text-sm md:text-base text-[var(--verso-brown-900)] mb-2">Ratings &amp; Reviews</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-xl md:text-2xl font-serif text-[var(--verso-brown-900)]">{average != null ? average.toFixed(1) : '–'}</span>
        <StarRow value={average || 0} size={13} />
      </div>
      <span className="text-[10px] text-[var(--verso-brown-500)] mb-2.5">
        {count} review{count !== 1 ? 's' : ''}
      </span>
      <div className="flex flex-col gap-1 mb-3">
        {[5, 4, 3, 2, 1].map((star) => {
          const n = distribution?.[star] || 0;
          const pct = count > 0 ? Math.round((n / count) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-[10px] text-[var(--verso-brown-600)]">
              <span className="w-2.5">{star}</span>
              <div className="flex-1 h-1 rounded-full bg-[var(--verso-brown-100)] overflow-hidden">
                <div className="h-full bg-[#D97706]" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-4 text-right">{n}</span>
            </div>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden pt-2.5 border-t border-[var(--verso-border-light)]">
        {reviews.length === 0 ? (
          <p className="text-xs text-[var(--verso-brown-400)] italic">No reviews yet.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {reviews.slice(0, 3).map((r) => (
              <div key={r.id} className="pb-2.5 border-b border-[var(--verso-border-light)] last:border-0 last:pb-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <StarRow value={r.rating} size={11} />
                  <span className="text-[11px] font-medium text-[var(--verso-brown-800)]">{r.user_name}</span>
                  <span className="text-[9px] text-[var(--verso-brown-400)] ml-auto">{formatDate(r.created_at)}</span>
                </div>
                {r.text && <p className="text-[11px] text-[var(--verso-brown-700)] leading-relaxed">{r.text}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookGridPage({ title, books, emptyText, onSelectBook }) {
  return (
    <div className="h-full flex flex-col min-h-0">
      <h3 className="font-serif text-sm text-[var(--verso-brown-900)] mb-3 leading-snug">{title}</h3>
      {books.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <p className="text-[11px] text-[var(--verso-brown-400)] leading-relaxed">{emptyText}</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-4">
            {books.slice(0, 6).map((b, i) => (
              <div key={b.id} className={i >= 2 ? 'hidden lg:block' : undefined}>
                <MiniBookCard book={b} onClick={onSelectBook} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BookLeaf({ flipped, zIndex, front, back, direction, onCommit }) {
  const rotateY = useMotionValue(flipped ? -180 : 0);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (draggingRef.current) return;
    const controls = animate(rotateY, flipped ? -180 : 0, { duration: 0.6, ease: [0.645, 0.045, 0.355, 1] });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  function handleDragStart() {
    draggingRef.current = true;
  }

  function handleDrag(_e, info) {
    if (!direction) return;
    const width = 260;
    const progress = Math.max(-1, Math.min(1, info.offset.x / width));
    const target = direction === 'forward' ? progress * -180 : -180 + progress * 180;
    rotateY.set(Math.max(-180, Math.min(0, target)));
  }

  function handleDragEnd(_e, info) {
    draggingRef.current = false;
    const threshold = 60;
    if (direction === 'forward') {
      if (info.offset.x < -threshold || info.velocity.x < -400) {
        onCommit('forward');
      } else {
        animate(rotateY, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }
    } else if (direction === 'backward') {
      if (info.offset.x > threshold || info.velocity.x > 400) {
        onCommit('backward');
      } else {
        animate(rotateY, -180, { type: 'spring', stiffness: 300, damping: 30 });
      }
    }
  }

  function handleTap(e) {
    if (!direction) return;
    // Taps on buttons/links inside a page should click, not turn the page.
    if (e?.target?.closest?.('button, a')) return;
    onCommit(direction);
  }

  return (
    <motion.div
      className="absolute inset-0 w-full h-full origin-left"
      style={{
        rotateY,
        zIndex,
        transformStyle: 'preserve-3d',
        pointerEvents: direction ? 'auto' : 'none',
      }}
      drag={direction ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onTap={handleTap}
    >
      <div
        className={cn(
          paperStyles.paper,
          'absolute inset-0 w-full h-full backface-hidden rounded-r-md rounded-l-sm bg-[var(--verso-cream-100)] border border-[var(--verso-border-light)] shadow-sm p-4 md:p-6 lg:p-8 overflow-hidden',
          direction && 'cursor-pointer'
        )}
        style={{ transform: 'translateZ(0.5px)' }}
      >
        {front}
      </div>
      <div
        className={cn(
          paperStyles.paper,
          'absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-l-md rounded-r-sm bg-[var(--verso-cream-100)] border-r border-[var(--verso-border-light)] shadow-sm p-4 md:p-6 lg:p-8 overflow-hidden',
          direction && 'cursor-pointer'
        )}
        style={{ transform: 'rotateY(180deg) translateZ(0.5px)' }}
      >
        {back || (
          <div className="w-full h-full flex items-center justify-center opacity-[0.05]">
            <span className="font-serif text-7xl italic font-bold text-black">✦</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function InteractiveBook({
  book,
  coverImage,
  description,
  loadingDescription = false,
  reviews = [],
  ratings = { average: null, count: 0, distribution: {} },
  similarBooks = [],
  ebookAvailability = { available: false },
  onSelectBook,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(-1);
  const [isHoveringCover, setIsHoveringCover] = useState(false);
  const [size, setSize] = useState(() => getBreakpointSize());

  useEffect(() => {
    function handleResize() {
      setSize((prev) => {
        const next = getBreakpointSize();
        if (next.bp === prev.bp && next.width === prev.width) return prev;
        if (next.bp !== prev.bp) {
          setIsOpen(false);
          setCurrentPageIndex(-1);
        }
        return next;
      });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const physicalAvailable = (book?.available_copies ?? 0) > 0;

  const spreads = [
    {
      key: 'overview',
      label: 'Overview',
      left: (
        <OverviewLeft
          book={book}
          coverImage={coverImage}
          ratings={ratings}
          physicalAvailable={physicalAvailable}
          ebookAvailable={!!ebookAvailability?.available}
        />
      ),
      right: (
        <OverviewRight
          description={description}
          loadingDescription={loadingDescription}
          ebookAvailability={ebookAvailability}
        />
      ),
    },
    {
      key: 'community',
      label: 'Ratings',
      left: <CommunityPage ratings={ratings} reviews={reviews} />,
      right: (
        <BookGridPage
          title="Readers who read this book also read"
          books={similarBooks}
          emptyText="Not enough data yet — borrow and rate books to help build connections."
          onSelectBook={onSelectBook}
        />
      ),
    },
  ];

  const leaves = spreads.map((s, i) => ({
    key: s.key,
    front: s.right,
    back: i + 1 < spreads.length ? spreads[i + 1].left : (
      <div className="w-full h-full flex items-center justify-center">
        <p className="font-serif italic text-[var(--verso-brown-400)]">The End</p>
      </div>
    ),
  }));

  const activeSpreadIdx = currentPageIndex + 1;
  const activeSpreadLabel = activeSpreadIdx < spreads.length ? spreads[activeSpreadIdx].label : 'The End';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 py-4">
      <div
        className="relative flex items-center justify-center perspective-[1800px] max-w-full"
        style={{ width: size.width * 2.6, height: size.height + 24 }}
      >
        <motion.div
          className="relative preserve-3d"
          style={{ width: size.width, height: size.height }}
          animate={{ x: isOpen ? size.width / 2 : 0 }}
          transition={{ duration: 1.1, ease: [0.25, 0, 0, 1] }}
        >
          <motion.div
            className="absolute inset-0 w-full h-full origin-left"
            style={{ transformStyle: 'preserve-3d' }}
            initial={false}
            animate={{
              rotateY: isOpen ? -180 : (isHoveringCover ? -12 : 0),
              zIndex: isOpen ? 0 : 200,
            }}
            transition={{
              rotateY: { duration: 1.1, ease: [0.25, 0, 0, 1] },
              zIndex: { delay: isOpen ? 0.6 : 0.4 },
            }}
            onClick={!isOpen ? () => setIsOpen(true) : undefined}
            onHoverStart={() => !isOpen && setIsHoveringCover(true)}
            onHoverEnd={() => setIsHoveringCover(false)}
          >
            <div
              className="absolute inset-0 w-full h-full backface-hidden rounded-r-md rounded-l-sm shadow-2xl overflow-hidden cursor-pointer"
              style={{ transform: 'translateZ(0.5px)' }}
            >
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coverImage})` }} />
              <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white/25 to-transparent" />
            </div>
            <div
              className={cn(paperStyles.paper, 'absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-l-md rounded-r-sm bg-[var(--verso-cream-100)] border-r border-[var(--verso-border-light)] shadow-xl p-4 md:p-6 lg:p-8 overflow-hidden')}
              style={{ transform: 'rotateY(180deg) translateZ(0.5px)' }}
            >
              {spreads[0].left}
            </div>
          </motion.div>

          <div className="absolute inset-0 w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
            {leaves.map((leaf, index) => (
              <BookLeaf
                key={leaf.key}
                flipped={index <= currentPageIndex}
                zIndex={index <= currentPageIndex ? index + 1 : leaves.length - index}
                front={leaf.front}
                back={leaf.back}
                direction={
                  index === currentPageIndex + 1 ? 'forward' :
                  index === currentPageIndex ? 'backward' :
                  null
                }
                onCommit={(dir) => {
                  setCurrentPageIndex((prev) =>
                    dir === 'forward' ? Math.min(leaves.length - 1, prev + 1) : Math.max(-1, prev - 1)
                  );
                }}
              />
            ))}

            <div
              className={cn(paperStyles.paper, 'absolute inset-0 w-full h-full bg-[var(--verso-cream-100)] rounded-r-md rounded-l-sm shadow-xl border border-[var(--verso-border-light)] flex items-center justify-center')}
              style={{ transform: 'translateZ(-1px)', zIndex: -1 }}
            >
              <span className="font-serif text-7xl italic font-bold text-black opacity-[0.05]">✦</span>
            </div>
          </div>
        </motion.div>

        {!isOpen && (
          <motion.button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open the book"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className={cn(
              'absolute flex items-center gap-1.5 text-white cursor-pointer',
              size.bp === 'sm' ? 'left-1/2 -translate-x-1/2 flex-row' : 'top-1/2 -translate-y-1/2 flex-col'
            )}
            style={size.bp === 'sm'
              ? { top: `calc(50% + ${size.height / 2 + 14}px)` }
              : { left: '50%', marginLeft: size.width / 2 + 24 }}
          >
            <motion.span
              className="flex"
              animate={{ x: [0, 10, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Icon name="chevronRight" size={22} />
              <Icon name="chevronRight" size={22} className="-ml-3" />
            </motion.span>
            <span className="text-[10px] font-medium uppercase tracking-widest whitespace-nowrap">Open the book</span>
          </motion.button>
        )}
      </div>

      {isOpen && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (currentPageIndex <= -1) {
                // Already on the first spread: flip the cover closed.
                setIsOpen(false);
              } else {
                setCurrentPageIndex((p) => Math.max(-1, p - 1));
              }
            }}
            className="p-2 rounded-full bg-[var(--verso-cream-200)] hover:bg-[var(--verso-cream-100)] transition-colors"
            aria-label={currentPageIndex <= -1 ? 'Close the book' : 'Previous'}
          >
            <Icon name="chevronLeft" size={16} className="text-[var(--verso-brown-700)]" />
          </button>
          <span className="text-xs font-medium text-[var(--verso-cream-200)] min-w-[100px] text-center">
            {activeSpreadLabel}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPageIndex((p) => Math.min(leaves.length - 1, p + 1))}
            disabled={currentPageIndex >= leaves.length - 1}
            className="p-2 rounded-full bg-[var(--verso-cream-200)] hover:bg-[var(--verso-cream-100)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next"
          >
            <Icon name="chevronRight" size={16} className="text-[var(--verso-brown-700)]" />
          </button>
        </div>
      )}
    </div>
  );
}
