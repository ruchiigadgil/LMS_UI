// src/components/SearchableDropdown.jsx
import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import styles from './SearchableDropdown.module.css';

export default function SearchableDropdown({ options = [], onSelect, placeholder = 'Search...', initialSelectedId = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const containerRef = useRef(null);

  // Open the menu, flipping it upward when there isn't room below.
  function openDropdown() {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 280 && rect.top > spaceBelow);
    }
    setIsOpen(true);
  }

  // Synchronize initial selection
  useEffect(() => {
    if (initialSelectedId && options.length > 0) {
      const match = options.find(o => String(o.id) === String(initialSelectedId));
      if (match) {
        setSelected(match);
        setQuery(match.name || match.title || '');
      }
    }
  }, [initialSelectedId, options]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // Reset query text to show selected label if we have one
        if (selected) {
          setQuery(selected.name || selected.title || '');
        } else {
          setQuery('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selected]);

  const filteredOptions = options.filter(opt => {
    const q = query.toLowerCase();
    const name = (opt.name || opt.title || '').toLowerCase();
    const email = (opt.email || opt.isbn || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  function handleSelect(option) {
    setSelected(option);
    setQuery(option.name || option.title || '');
    setIsOpen(false);
    if (onSelect) {
      onSelect(option.id);
    }
  }

  function handleClear() {
    setSelected(null);
    setQuery('');
    setIsOpen(false);
    if (onSelect) {
      onSelect(null);
    }
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.inputWrapper}>
        <input
          type="text"
          className={styles.input}
          placeholder={placeholder}
          value={query}
          onFocus={openDropdown}
          onMouseDown={() => {
            // Clicking the field (or its arrow) toggles the menu
            if (isOpen) setIsOpen(false);
            else openDropdown();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            openDropdown();
          }}
        />
        {selected ? (
          <button type="button" className={styles.clearBtn} onClick={handleClear} aria-label="Clear selection">
            &times;
          </button>
        ) : (
          <Icon
            name="chevronDown"
            className={`${styles.chevronIcon} ${isOpen && openUp ? styles.chevronUp : ''}`}
          />
        )}
      </div>

      {isOpen && (
        <div className={`${styles.dropdown} ${openUp ? styles.dropdownUp : ''}`}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => {
              const label = opt.name || opt.title || `Item #${opt.id}`;
              let sublabel = opt.email || opt.isbn || '';
              if (opt.active_loans !== undefined) {
                sublabel += ` • ${opt.active_loans} active loan(s)`;
              } else if (opt.available_copies !== undefined) {
                sublabel += ` • ${opt.available_copies} available`;
              }
              
              return (
                <div
                  key={opt.id}
                  className={styles.option}
                  onClick={() => handleSelect(opt)}
                >
                  <span className={styles.label}>{label}</span>
                  {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
                </div>
              );
            })
          ) : (
            <div className={styles.noResults}>No matches found</div>
          )}
        </div>
      )}
    </div>
  );
}
