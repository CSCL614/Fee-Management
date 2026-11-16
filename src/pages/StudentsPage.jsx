import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/common/Topbar';
import StudentAvatar from '../components/common/StudentAvatar';
import StudentSearchInput from '../components/common/StudentSearchInput';
import api from '../services/api';
import { formatCurrency, getStatusColor } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  UserPlus, Filter, ChevronLeft, ChevronRight, Users as UsersIcon,
  Search, X, RotateCcw, ArrowRight, FileSpreadsheet, Edit,
  Trash2, AlertTriangle, CheckSquare, Square, MinusSquare, ShieldAlert, Loader2,
  GraduationCap
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
  const { isAdmin, isAccountant } = useAuth();
  const navigate = useNavigate();

  // Multi-student selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Bulk graduate state
  const [bulkGraduateModalOpen, setBulkGraduateModalOpen] = useState(false);
  const [bulkGraduateLoading, setBulkGraduateLoading] = useState(false);
  const [bulkGraduateForm, setBulkGraduateForm] = useState({
    passingYear: new Date().getFullYear(),
    passingAcademicYear: '',
    completionDate: new Date().toISOString().split('T')[0],
    defaultResultStatus: 'Passed',
    graduationRemarks: 'Bulk graduated from Student Directory'
  });

  useEffect(() => {
    api.get('/students/courses').then(res => {
      setCourses(res.data.data.courses || []);
      setBatches(res.data.data.batches || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [pagination.page, filters.level, filters.course, filters.batch, filters.status, filters.search]);

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

  // Checkbox helpers
  const currentPageIds = students.map(s => s.studentId);
  const allCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));
  const someCurrentPageSelected = currentPageIds.some(id => selectedIds.includes(id)) && !allCurrentPageSelected;

  const toggleSelectAllPage = () => {
    if (allCurrentPageSelected) {
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const toggleSelectOne = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Bulk delete preview trigger
  const handleOpenBulkModal = async () => {
    if (selectedIds.length === 0) return;
    setBulkModalOpen(true);
    setBulkPreviewLoading(true);
    setBulkPreview(null);
    setDeleteReason('');
    try {
      const res = await api.post('/students/bulk-delete/preview', { studentIds: selectedIds });
      setBulkPreview(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to analyze selected students');
      setBulkModalOpen(false);
    } finally {
      setBulkPreviewLoading(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await api.post('/students/bulk-delete', {
        studentIds: selectedIds,
        reason: deleteReason || 'Admin bulk removal'
      });
      toast.success(res.data.message || 'Bulk operation completed successfully');
      setBulkModalOpen(false);
      clearSelection();
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk deletion failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleOpenBulkGraduateModal = () => {
    if (selectedIds.length === 0) return;
    let defaultPassingYear = new Date().getFullYear();
    let defaultAcademicYear = '';
    if (filters.batch && filters.batch.includes('-')) {
      const parts = filters.batch.split('-');
      const endYear = parseInt(parts[1], 10);
      if (!isNaN(endYear)) {
        defaultPassingYear = endYear;
        defaultAcademicYear = `${endYear - 1}-${String(endYear).slice(-2)}`;
      }
    }
    setBulkGraduateForm({
      passingYear: defaultPassingYear,
      passingAcademicYear: defaultAcademicYear,
      completionDate: new Date().toISOString().split('T')[0],
      defaultResultStatus: 'Passed',
      graduationRemarks: filters.batch ? `Graduated Batch ${filters.batch}` : 'Bulk graduated from Student Directory'
    });
    setBulkGraduateModalOpen(true);
  };

  const handleConfirmBulkGraduate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (selectedIds.length === 0) return;
    setBulkGraduateLoading(true);
    try {
      const res = await api.post('/students/bulk-graduate', {
        studentIds: selectedIds,
        passingYear: parseInt(bulkGraduateForm.passingYear, 10),
        passingAcademicYear: bulkGraduateForm.passingAcademicYear,
        completionDate: bulkGraduateForm.completionDate,
        defaultResultStatus: bulkGraduateForm.defaultResultStatus,
        graduationRemarks: bulkGraduateForm.graduationRemarks
      });
      toast.success(res.data.message || `Successfully graduated ${selectedIds.length} student(s) into Alumni!`);
      setBulkGraduateModalOpen(false);
      clearSelection();
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk graduation failed');
    } finally {
      setBulkGraduateLoading(false);
    }
  };

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
                <button
                  onClick={() => navigate('/students/import')}
                  className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Import Excel</span>
                </button>
              )}

              {(isAdmin || isAccountant) && (
                <button
                  onClick={() => navigate('/students/new')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm hover:shadow cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Student</span>
                </button>
              )}
            </div>
          </div>

          {/* Search Input with Live Suggestions */}
          <StudentSearchInput
            value={filters.search}
            onChange={val => setFilters(prev => ({ ...prev, search: val }))}
            onSelectStudent={student => navigate(`/students/${student.studentId}`)}
            onSearchSubmit={query => {
              setFilters(prev => ({ ...prev, search: query }));
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            onClear={() => {
              setFilters(prev => ({ ...prev, search: '' }));
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            placeholder="Search by student name, roll number, admission ID, phone or email..."
            size="md"
            showSearchButton={true}
          />

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
                  <option value="Archived">Archived</option>
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

        {/* Multi-Selection Action Toolbar (Admin Only) */}
        {isAdmin && selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                {selectedIds.length}
              </div>
              <span className="text-xs font-semibold text-indigo-950">
                {selectedIds.length} {selectedIds.length === 1 ? 'student selected' : 'students selected across page(s)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-100/50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
              <button
                onClick={handleOpenBulkGraduateModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Graduate Selected ({selectedIds.length})</span>
              </button>
              <button
                onClick={handleOpenBulkModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Students Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {isAdmin && (
                    <th className="py-3 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllPage}
                        className="text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                        title={allCurrentPageSelected ? 'Deselect all on this page' : 'Select all on this page'}
                      >
                        {allCurrentPageSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : someCurrentPageSelected ? (
                          <MinusSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                  )}
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
                      {isAdmin && <td className="py-3.5 px-3"><div className="w-4 h-4 skeleton rounded mx-auto" /></td>}
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
                    <td colSpan={isAdmin ? 11 : 10} className="py-16 text-center">
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
                  students.map((s, i) => {
                    const isSelected = selectedIds.includes(s.studentId);
                    return (
                      <motion.tr
                        key={s.studentId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className={`cursor-pointer transition-colors group ${
                          isSelected ? 'bg-indigo-50/40 hover:bg-indigo-50/60' : 'hover:bg-blue-50/30'
                        }`}
                        onClick={() => navigate(`/students/${s.studentId}`)}
                      >
                        {isAdmin && (
                          <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={e => toggleSelectOne(s.studentId, e)}
                              className="text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                              )}
                            </button>
                          </td>
                        )}
                        <td className="py-3 px-4 text-xs font-mono font-semibold text-slate-600 group-hover:text-blue-600">
                          {s.studentId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <StudentAvatar student={s} size="sm" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                  {s.name}
                                </p>
                                {s.status === 'Archived' ? (
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    Archived
                                  </span>
                                ) : s.status === 'Inactive' && (
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
                            {(isAdmin || isAccountant) && (
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
                    );
                  })
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

      {/* Bulk Delete / Safe Archival Confirmation Modal */}
      <AnimatePresence>
        {bulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Bulk Student Removal</h3>
                    <p className="text-xs text-slate-500">
                      {selectedIds.length} {selectedIds.length === 1 ? 'student selected' : 'students selected'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBulkModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                {bulkPreviewLoading ? (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    <p className="text-xs">Inspecting financial history of selected records...</p>
                  </div>
                ) : bulkPreview ? (
                  <>
                    {/* Financial Safety Notice */}
                    {bulkPreview.counts.archival > 0 && (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800 space-y-1">
                          <p className="font-bold">
                            Financial Protection: {bulkPreview.counts.archival} {bulkPreview.counts.archival === 1 ? 'student has' : 'students have'} recorded transactions or demands.
                          </p>
                          <p className="text-amber-700">
                            To protect financial integrity, these records will be <span className="font-semibold underline">Safely Archived</span>. All payment transactions, receipts, fee demands, and ledger history will be strictly preserved.
                          </p>
                        </div>
                      </div>
                    )}

                    {bulkPreview.counts.permanent > 0 && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">{bulkPreview.counts.permanent}</span> student(s) with zero payment history will be permanently deleted.
                      </div>
                    )}

                    {/* Breakdown List */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Affected Students ({bulkPreview.preview.length})
                      </div>
                      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {bulkPreview.preview.map(item => (
                          <div key={item.studentId} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-slate-50">
                            <div>
                              <span className="font-semibold text-slate-800">{item.name}</span>
                              <span className="font-mono text-slate-400 ml-2">({item.admissionNo})</span>
                            </div>
                            <div>
                              {item.action === 'archive' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Safe Archival ({item.hasPayments ? 'Has Payments' : 'Has Demands'})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  Permanent Deletion
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reason input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Reason for Removal / Archival <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Graduated batch cleanup, Duplicate record, Admin audit"
                        value={deleteReason}
                        onChange={e => setDeleteReason(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </>
                ) : null}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={bulkDeleting}
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bulkDeleting || bulkPreviewLoading}
                  onClick={handleConfirmBulkDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {bulkDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Removal & Archival</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Bulk Graduate Modal */}
        {bulkGraduateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Graduate Selected Students</h3>
                    <p className="text-xs text-slate-500">Graduating {selectedIds.length} students into Alumni status</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkGraduateModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmBulkGraduate}>
                <div className="p-5 space-y-4">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1">
                    <p className="font-semibold">
                      Transitioning {selectedIds.length} {selectedIds.length === 1 ? 'student' : 'students'} to Graduated (Alumni)
                    </p>
                    <p className="text-[11px] text-purple-700">
                      All fee commitments, past payment receipts, and outstanding dues will remain strictly preserved.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Passing Year *</label>
                      <input
                        type="number"
                        min="2000"
                        max="2099"
                        value={bulkGraduateForm.passingYear}
                        onChange={e => setBulkGraduateForm({ ...bulkGraduateForm, passingYear: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Academic Session</label>
                      <input
                        type="text"
                        placeholder="e.g. 2023-24"
                        value={bulkGraduateForm.passingAcademicYear}
                        onChange={e => setBulkGraduateForm({ ...bulkGraduateForm, passingAcademicYear: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Completion Date</label>
                      <input
                        type="date"
                        value={bulkGraduateForm.completionDate}
                        onChange={e => setBulkGraduateForm({ ...bulkGraduateForm, completionDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Default Result Status</label>
                      <select
                        value={bulkGraduateForm.defaultResultStatus}
                        onChange={e => setBulkGraduateForm({ ...bulkGraduateForm, defaultResultStatus: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 outline-none focus:border-purple-500"
                      >
                        <option value="Passed">Passed</option>
                        <option value="First Class Distinction">First Class Distinction</option>
                        <option value="First Class">First Class</option>
                        <option value="Second Class">Second Class</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="block font-semibold text-slate-700 mb-1">Graduation Remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. Batch completed course curriculum"
                      value={bulkGraduateForm.graduationRemarks}
                      onChange={e => setBulkGraduateForm({ ...bulkGraduateForm, graduationRemarks: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={bulkGraduateLoading}
                    onClick={() => setBulkGraduateModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bulkGraduateLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {bulkGraduateLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Graduation ({selectedIds.length})</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}