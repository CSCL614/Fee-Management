import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency, getStatusColor } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Filter, ChevronLeft, ChevronRight, Users as UsersIcon,
  Search, X, RotateCcw, ArrowRight, CheckCircle2, AlertCircle, FileSpreadsheet, Edit
} from 'lucide-react';
import { pageVariants } from '../utils/animations';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', level: '', course: '', batch: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/students/courses').then(res => {
      setCourses(res.data.data.courses || []);
      setBatches(res.data.data.batches || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [pagination.page, filters.level, filters.course, filters.batch, filters.status]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 15 };
      if (filters.search) params.search = filters.search;
      if (filters.level) params.level = filters.level;
      if (filters.course) params.course = filters.course;
      if (filters.batch) params.batch = filters.batch;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/students', { params });
      setStudents(res.data.data || []);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchStudents();
  };

  const clearAllFilters = () => {
    setFilters({ search: '', level: '', course: '', batch: '', status: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const activeFiltersCount = [filters.level, filters.course, filters.batch, filters.status].filter(Boolean).length;

  const startIdx = pagination.total === 0 ? 0 : (pagination.page - 1) * 15 + 1;
  const endIdx = Math.min(pagination.page * 15, pagination.total);

  return (
    <div>
      <Topbar title="Students" />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 space-y-5"
      >
        
        {/* Header & Controls Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Student Directory
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                  {pagination.total} Records
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Manage student enrollments, fee balances, and records</p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => navigate('/students/import')}
                    className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Import Excel</span>
                  </button>
                  <button
                    onClick={() => navigate('/students/new')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm hover:shadow cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Student</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name, roll number, admission ID, phone or email..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters(prev => ({ ...prev, search: '' }));
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shrink-0"
            >
              Search
            </button>
          </form>

          {/* Collapsible Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3"
              >
                <div className="text-xs font-semibold text-slate-500 mr-1">Filter by:</div>
                
                <select
                  value={filters.level}
                  onChange={e => { setFilters(prev => ({ ...prev, level: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Academic Levels</option>
                  <option value="UG">UG (Undergraduate)</option>
                  <option value="PG">PG (Postgraduate)</option>
                </select>

                <select
                  value={filters.course}
                  onChange={e => { setFilters(prev => ({ ...prev, course: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 max-w-xs truncate"
                >
                  <option value="">All Courses</option>
                  {courses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  value={filters.batch}
                  onChange={e => { setFilters(prev => ({ ...prev, batch: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="">All Batches</option>
                  {batches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>

                <select
                  value={filters.status}
                  onChange={e => { setFilters(prev => ({ ...prev, status: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Graduated">Graduated</option>
                  <option value="Discontinued">Discontinued</option>
                  <option value="Transferred">Transferred</option>
                </select>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium hover:bg-rose-50 rounded-lg transition-colors ml-auto"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Filters
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Students Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Course & Batch</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4 text-right">Total Fee</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Pending</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [1, 2, 3, 4, 5, 6].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-4"><div className="w-20 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-32 h-4 skeleton rounded mb-1" /><div className="w-20 h-3 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-28 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-10 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-8 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="w-16 h-4 skeleton rounded ml-auto" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="w-16 h-4 skeleton rounded ml-auto" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="w-16 h-4 skeleton rounded ml-auto" /></td>
                      <td className="py-3.5 px-4 text-center"><div className="w-14 h-5 skeleton rounded-full mx-auto" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="w-12 h-4 skeleton rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
                        <UsersIcon className="w-6 h-6 text-slate-400 stroke-[1.5]" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">No students match your query</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Try adjusting your search criteria, clearing active filters, or adding a new student to the system.
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={clearAllFilters}
                          className="mt-4 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          Clear Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  students.map((s, i) => (
                    <motion.tr
                      key={s.studentId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                      onClick={() => navigate(`/students/${s.studentId}`)}
                    >
                      <td className="py-3 px-4 text-xs font-mono font-semibold text-slate-600 group-hover:text-blue-600">
                        {s.studentId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-slate-200">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                {s.name}
                              </p>
                              {s.status === 'Inactive' && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">{s.admissionNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-medium text-slate-800">{s.course}</p>
                        {s.batch && (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200/60 mt-0.5">
                            Batch {s.batch}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${s.level === 'PG' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                          {s.level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-600">{s.currentYear}</td>
                      <td className="py-3 px-4 text-right text-xs font-medium text-slate-700 font-mono">
                        {formatCurrency(s.totalFee)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-bold text-emerald-700 font-mono">
                        {formatCurrency(s.totalPaid)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-bold font-mono">
                        <span className={s.totalPending > 0 ? 'text-rose-600' : 'text-slate-400'}>
                          {formatCurrency(s.totalPending)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusColor(s.feeStatus)}`}>
                          {s.feeStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          {isAdmin && (
                            <button
                              onClick={() => navigate(`/students/${s.studentId}/edit`)}
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit Student Profile"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/students/${s.studentId}`)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                          >
                            View <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ERP Standard Pagination Footer */}
          {pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/50 gap-3">
              <p className="text-xs text-slate-500 font-medium">
                Showing <span className="font-semibold text-slate-800">{startIdx}</span> to <span className="font-semibold text-slate-800">{endIdx}</span> of <span className="font-semibold text-slate-800">{pagination.total}</span> records
              </p>
              
              <div className="flex items-center gap-1.5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>

                <div className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200">
                  {pagination.page} / {pagination.pages || 1}
                </div>

                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}
