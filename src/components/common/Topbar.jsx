import { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, getStatusColor } from '../../utils/helpers';

export default function Topbar({ title }) {
  const context = useOutletContext();
  const collapsed = context?.collapsed || false;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
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

  return (
    <header className={`fixed top-0 right-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 md:px-6 pr-16 lg:pr-6 flex items-center justify-between gap-4 transition-all duration-300 left-0 ${collapsed ? 'lg:left-[72px]' : 'lg:left-64'}`}>
      <h2 className="text-base sm:text-xl font-bold text-gray-800 truncate">{title}</h2>

      {/* Search */}
      <div className="relative flex-1 max-w-lg ml-auto" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search students by name, ID, phone..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 transition-all"
        />

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 max-h-80 overflow-y-auto z-50 animate-fade-in">
            {searchResults.map(student => (
              <div
                key={student.studentId}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center justify-between"
                onClick={() => {
                  navigate(`/students/${student.studentId}`);
                  setShowResults(false);
                  setSearchQuery('');
                }}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.course} • {student.currentYear} • {student.admissionNo}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(student.feeStatus)}`}>
                    {student.feeStatus}
                  </span>
                  {student.totalPending > 0 && (
                    <p className="text-xs text-red-600 font-medium mt-1">{formatCurrency(student.totalPending)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
        <Bell className="w-5 h-5" />
      </button>
    </header>
  );
}
