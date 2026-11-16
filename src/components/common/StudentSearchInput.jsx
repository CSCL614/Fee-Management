import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, ArrowRight, Phone, GraduationCap, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import StudentAvatar from './StudentAvatar';

/**
 * Helper component to highlight matching characters case-insensitively
 */
function HighlightMatch({ text, query }) {
  if (!text || !query || !query.trim()) return <span>{text || ''}</span>;
  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = String(text).split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className="bg-yellow-200/80 text-slate-900 font-extrabold px-0.5 rounded-xs"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

/**
 * Reusable Student Search Input Component with Live Suggestions & Keyboard Navigation
 */
export default function StudentSearchInput({
  value = '',
  onChange,
  onSelectStudent,
  onSearchSubmit,
  onClear,
  placeholder = 'Search by student name, roll number, admission ID, phone...',
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg'
  showSearchButton = true,
  searchButtonText = 'Search',
  autoFocus = false,
  disabled = false
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Sync internal query with external value if controlled
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click outside listener to close suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for live suggestions (250ms)
  useEffect(() => {
    const trimmed = query ? query.trim() : '';
    if (!trimmed || trimmed.length < 1) {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/students/search?q=${encodeURIComponent(trimmed)}&limit=10`);
        setSuggestions(res.data?.data || []);
        setIsOpen(true);
        setActiveIndex(-1);
      } catch (err) {
        console.error('Failed to fetch student suggestions:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onChange) onChange(val);
  };

  const handleSelect = (student) => {
    setIsOpen(false);
    if (onSelectStudent) {
      onSelectStudent(student);
    } else {
      setQuery(student.name);
      if (onChange) onChange(student.name);
      if (onSearchSubmit) onSearchSubmit(student.name);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    if (onChange) onChange('');
    if (onClear) onClear();
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setIsOpen(false);
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      handleSelect(suggestions[activeIndex]);
      return;
    }
    if (onSearchSubmit) {
      onSearchSubmit(query.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSubmit(e);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelect(suggestions[activeIndex]);
      } else {
        handleSubmit(e);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  // Size variations
  const sizeClasses = {
    sm: 'py-1.5 pl-8 pr-8 text-xs rounded-lg',
    md: 'py-2 pl-9 pr-9 text-xs rounded-xl',
    lg: 'py-2.5 pl-10 pr-10 text-sm rounded-xl'
  };

  const iconSizeClasses = {
    sm: 'left-2.5 w-3.5 h-3.5',
    md: 'left-3 w-4 h-4',
    lg: 'left-3.5 w-4.5 h-4.5'
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          {/* Search or Loading Icon */}
          <div className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${iconSizeClasses[size]}`}>
            {loading ? (
              <Loader2 className="w-full h-full animate-spin text-blue-600" />
            ) : (
              <Search className="w-full h-full" />
            )}
          </div>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            className={`w-full bg-slate-50/70 border border-slate-200/90 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans text-slate-800 placeholder:text-slate-400 shadow-2xs ${sizeClasses[size]}`}
          />

          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Submit Button */}
        {showSearchButton && (
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{searchButtonText}</span>
          </button>
        )}
      </form>

      {/* Live Suggestions Dropdown */}
      <AnimatePresence>
        {isOpen && query.trim().length >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden max-h-96 flex flex-col"
          >
            {/* Suggestions Header */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>
                Matching Students ({suggestions.length} found)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ↑↓ to navigate · Enter to select
              </span>
            </div>

            {/* Suggestions List */}
            <div className="overflow-y-auto divide-y divide-slate-100">
              {suggestions.length === 0 && !loading ? (
                <div className="p-6 text-center text-slate-500">
                  <User className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No students found matching "{query}"</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Try searching by student name, roll number, admission ID, or mobile number.
                  </p>
                </div>
              ) : (
                suggestions.map((student, idx) => {
                  const isSelected = idx === activeIndex;
                  return (
                    <div
                      key={student._id || student.studentId}
                      onClick={() => handleSelect(student)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/80 text-blue-900' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StudentAvatar
                          src={student.profilePhoto}
                          name={student.name}
                          size="sm"
                          className="w-8 h-8 rounded-xl shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            <HighlightMatch text={student.name} query={query} />
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 font-mono">
                            <span>
                              Adm: <strong className="text-slate-700 font-semibold"><HighlightMatch text={student.admissionNo} query={query} /></strong>
                            </span>
                            {student.rollNo && (
                              <span>
                                · Roll: <strong className="text-slate-700 font-semibold"><HighlightMatch text={student.rollNo} query={query} /></strong>
                              </span>
                            )}
                            {student.phone && (
                              <span className="flex items-center gap-0.5 text-slate-400">
                                · <Phone className="w-2.5 h-2.5 inline" />
                                <HighlightMatch text={student.phone} query={query} />
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              <HighlightMatch text={student.course} query={query} />
                              {student.currentYear ? ` · ${student.currentYear}` : ''}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Right badge / balance info */}
                      <div className="text-right shrink-0">
                        {student.totalPending > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200">
                            Due: ₹{student.totalPending.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Cleared
                          </span>
                        )}
                        <span className="text-[10px] text-blue-600 font-semibold block mt-0.5 flex items-center justify-end gap-0.5">
                          Select <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Suggestions Footer */}
            {suggestions.length > 0 && (
              <div
                onClick={handleSubmit}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border-t border-slate-100 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
              >
                Press Enter or click here to view all matching results →
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

