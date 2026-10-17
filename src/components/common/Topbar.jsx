import { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { Search, Bell, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatCurrency, getStatusColor } from '../../utils/helpers';

const breadcrumbMap = {
  '/dashboard': [{ label: 'Dashboard' }],
  '/students': [{ label: 'Students' }],
  '/students/new': [{ label: 'Students', to: '/students' }, { label: 'Add Student' }],
  '/record-payment': [{ label: 'Record Payment' }],
  '/payments': [{ label: 'Payment History' }],
  '/fee-structure': [{ label: 'Fee Structure' }],
  '/pending-fees': [{ label: 'Pending Fees' }],
  '/reports': [{ label: 'Reports' }],
  '/audit-log': [{ label: 'Audit Log' }],
  '/manage-users': [{ label: 'Manage Users' }],
  '/settings': [{ label: 'Settings' }],
};

export default function Topbar({ title }) {
  const context = useOutletContext();
  const collapsed = context?.collapsed || false;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const searchRef = useRef(null);

  // Determine breadcrumbs from current path
  const pathKey = location.pathname;
  const isStudentProfile = /^\/students\/[^/]+$/.test(pathKey) && pathKey !== '/students/new';
  const breadcrumbs = isStudentProfile
    ? [{ label: 'Students', to: '/students' }, { label: title || 'Student Profile' }]
    : breadcrumbMap[pathKey] || [{ label: title }];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        try {
          const res = await api.get(`/students/search?q=${searchQuery}`);
          setSearchResults(res.data.data || []);
          setShowResults(true);
        } catch {
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <header className={`fixed top-0 right-0 z-20 h-16 bg-white border-b border-gray-200/80 px-4 md:px-6 pr-16 lg:pr-6 flex items-center justify-between gap-4 transition-all duration-300 left-0 ${collapsed ? 'lg:left-[72px]' : 'lg:left-64'}`}>
      {/* Left: Title & Breadcrumbs */}
      <div className="min-w-0 flex-shrink-0">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-[11px] text-gray-400 font-medium mb-0.5" aria-label="Breadcrumb">
          <span className="text-gray-400">Home</span>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-gray-300" />
              {crumb.to ? (
                <button onClick={() => navigate(crumb.to)} className="hover:text-navy-600 transition-colors">
                  {crumb.label}
                </button>
              ) : (
                <span className="text-gray-600">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h2 className="text-base sm:text-lg font-bold text-navy-800 truncate leading-tight">{title}</h2>
      </div>

      {/* Center: Global Search */}
      <div className={`relative flex-1 max-w-md ml-auto transition-all duration-200 ${searchFocused ? 'max-w-lg' : ''}`} ref={searchRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => { setSearchFocused(true); if (searchResults.length > 0) setShowResults(true); }}
          className={`w-full pl-9 pr-9 py-2 bg-gray-50 border rounded-lg text-sm transition-all duration-200 focus:outline-none focus-ring ${
            searchFocused 
              ? 'border-blue-300 bg-white shadow-sm ring-2 ring-blue-500/10' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          aria-label="Search students"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Search Results Dropdown with AnimatePresence */}
        <AnimatePresence>
          {showResults && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-200 max-h-80 overflow-y-auto z-50"
            >
              <div className="p-2 border-b border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 px-2 font-mono">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found</p>
              </div>
              {searchResults.map(student => (
                <div
                  key={student.studentId}
                  className="px-3.5 py-2.5 hover:bg-blue-50/50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between transition-colors group"
                  onClick={() => {
                    navigate(`/students/${student.studentId}`);
                    setShowResults(false);
                    setSearchQuery('');
                    setSearchFocused(false);
                  }}
                  role="option"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">{student.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{student.course} • {student.currentYear} • {student.admissionNo}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(student.feeStatus)}`}>
                      {student.feeStatus}
                    </span>
                    {student.totalPending > 0 && (
                      <p className="text-[11px] text-rose-600 font-bold font-mono mt-0.5">{formatCurrency(student.totalPending)}</p>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* No results */}
          {showResults && searchQuery.length >= 2 && searchResults.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-6 text-center"
            >
              <p className="text-xs font-semibold text-slate-700">No students found matching "{searchQuery}"</p>
              <p className="text-[11px] text-slate-400 mt-1">Search by name, student ID, admission roll no, or phone</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Notification & User */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
        </button>
        
        {/* User avatar (visible on larger screens) */}
        <div className="hidden md:flex items-center gap-2 pl-2 ml-1 border-l border-gray-200">
          <div className="w-8 h-8 bg-navy-100 rounded-lg flex items-center justify-center">
            <span className="text-navy-700 text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate max-w-[100px]">{user?.name}</p>
            <p className="text-[10px] text-gray-400 capitalize font-medium">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
