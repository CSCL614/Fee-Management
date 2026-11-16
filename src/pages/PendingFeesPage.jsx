import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Topbar from '../components/common/Topbar';
import StudentSearchInput from '../components/common/StudentSearchInput';
import DownloadPendingFeeModal from '../components/common/DownloadPendingFeeModal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatCurrency, getStatusColor } from '../utils/helpers';
import { pageVariants, staggerContainer, staggerItem, AnimatedNumber } from '../utils/animations';
import {
  AlertCircle, FileSpreadsheet, Filter, RotateCcw,
  Clock, ArrowRight, ShieldAlert, Users, IndianRupee,
  Download, Loader2, CheckSquare, Square, MinusSquare, Check, X
} from 'lucide-react';

export default function PendingFeesPage() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    academicYear: '2026-27',
    level: '',
    degree: '',
    course: '',
    studyYear: '',
    batch: '',
    search: ''
  });

  // Master dropdown data
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [academicYears, setAcademicYears] = useState(['2026-27', '2025-26', '2024-25']);
  const [degrees, setDegrees] = useState(['B.Sc', 'B.Com', 'M.Sc']);

  // Multi-student selection state
  const [selectedIds, setSelectedIds] = useState([]);

  const navigate = useNavigate();

  // Load master courses, batches, academic years
  useEffect(() => {
    api.get('/students/courses').then(res => {
      setCourses(res.data.data.courses || []);
      setBatches(res.data.data.batches || []);
      if (res.data.data.degrees && res.data.data.degrees.length > 0) {
        setDegrees(res.data.data.degrees);
      }
    }).catch(() => {});

    api.get('/courses').then(res => {
      if (res.data?.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        const courseNames = list.map(c => c.courseName || `${c.degree} ${c.specialization}`).filter(Boolean);
        if (courseNames.length > 0) {
          setCourses(prev => Array.from(new Set([...prev, ...courseNames])).sort());
        }
        if (res.data.data.degrees && res.data.data.degrees.length > 0) {
          setDegrees(res.data.data.degrees);
        }
      }
    }).catch(() => {});

    api.get('/audit/academic-years').then(res => {
      if (res.data?.data && Array.isArray(res.data.data)) {
        const rawList = res.data.data.map(item => item.year || item).filter(Boolean);
        const distinctAYs = Array.from(new Set(rawList)).sort().reverse();
        if (distinctAYs.length > 0) {
          setAcademicYears(distinctAYs);
        }
      }
    }).catch(() => {});
  }, []);

  // Fetch pending whenever filters change
  useEffect(() => {
    fetchPending();
  }, [
    filters.academicYear,
    filters.level,
    filters.degree,
    filters.course,
    filters.studyYear,
    filters.batch,
    filters.search
  ]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.academicYear && filters.academicYear !== 'All') params.academicYear = filters.academicYear;
      if (filters.level && filters.level !== 'All') params.level = filters.level;
      if (filters.degree && filters.degree !== 'All') params.degree = filters.degree;
      if (filters.course && filters.course !== 'All') params.course = filters.course;
      if (filters.studyYear && filters.studyYear !== 'All') params.studyYear = filters.studyYear;
      if (filters.batch && filters.batch !== 'All') params.batch = filters.batch;
      if (filters.search && filters.search.trim()) params.search = filters.search.trim();

      const res = await api.get('/reports/pending', { params });
      setPending(res.data.data || []);
      // Reset selected IDs when results change
      setSelectedIds([]);
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Download Detailed Pending Fee Data Excel Report
   * Calls GET /api/exports/pending-fees with current filters & selected students
   */
  const handleDownloadPendingData = async (onlySelected = false) => {
    setExporting(true);
    const toastId = toast.loading('Generating detailed Pending Fee Excel report...');
    try {
      const params = new URLSearchParams();
      if (filters.academicYear && filters.academicYear !== 'All') params.append('academicYear', filters.academicYear);
      if (filters.level && filters.level !== 'All') params.append('level', filters.level);
      if (filters.degree && filters.degree !== 'All') params.append('degree', filters.degree);
      if (filters.course && filters.course !== 'All') params.append('course', filters.course);
      if (filters.studyYear && filters.studyYear !== 'All') params.append('studyYear', filters.studyYear);
      if (filters.batch && filters.batch !== 'All') params.append('batch', filters.batch);
      if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());

      // If exporting only selected students
      if (onlySelected && selectedIds.length > 0) {
        params.append('studentIds', selectedIds.join(','));
      }

      const res = await api.get(`/exports/pending-fees?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeAy = (filters.academicYear && filters.academicYear !== 'All')
        ? filters.academicYear.replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'All_Years';
      link.download = `Pending_Fee_Report_${safeAy}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(
        onlySelected
          ? `Downloaded pending fee report for ${selectedIds.length} selected students!`
          : `Pending Fee Data downloaded successfully!`,
        { id: toastId }
      );
    } catch (err) {
      console.error('Download pending fee report error:', err);
      toast.error('Failed to generate Excel report. Please try again.', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      academicYear: '2026-27',
      level: '',
      degree: '',
      course: '',
      studyYear: '',
      batch: '',
      search: ''
    });
    setSelectedIds([]);
  };

  // Checkbox helpers
  const allCurrentSelected = pending.length > 0 && pending.every(p => selectedIds.includes(p.studentId));
  const someCurrentSelected = pending.some(p => selectedIds.includes(p.studentId)) && !allCurrentSelected;

  const toggleSelectAll = () => {
    if (allCurrentSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pending.map(p => p.studentId));
    }
  };

  const toggleSelectOne = (studentId, e) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const totalPending = pending.reduce((s, p) => s + p.totalPending, 0);
  const totalPayable = pending.reduce((s, p) => s + (p.totalPayable || 0), 0);
  const totalPaid = pending.reduce((s, p) => s + (p.totalPaid || 0), 0);

  const activeFiltersCount = [
    filters.academicYear !== '2026-27' && filters.academicYear,
    filters.level,
    filters.degree,
    filters.course,
    filters.studyYear,
    filters.batch,
    filters.search
  ].filter(Boolean).length;

  return (
    <div>
      <Topbar title="Pending Fees" />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto"
      >
        {/* Metric Cards Row */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {/* Card 1: Total Pending Dues */}
          <motion.div
            variants={staggerItem}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Total Pending Dues</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-rose-600 font-mono tracking-tight">
              {loading ? '—' : <AnimatedNumber value={totalPending} formatCurrency={true} />}
            </p>
            <p className="text-xs text-slate-500 mt-1">Outstanding fee balance across filtered cohort</p>
          </motion.div>

          {/* Card 2: Students with Dues */}
          <motion.div
            variants={staggerItem}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Students with Dues</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {loading ? '—' : <><AnimatedNumber value={pending.length} /> Students</>}
            </p>
            <p className="text-xs text-slate-500 mt-1">Accounts with overdue or pending instalments</p>
          </motion.div>

          {/* Card 3: Recovered Portion */}
          <motion.div
            variants={staggerItem}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Recovered Portion</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono tracking-tight">
              {loading ? '—' : <AnimatedNumber value={totalPaid} formatCurrency={true} />}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Out of {formatCurrency(totalPayable)} total payable
            </p>
          </motion.div>
        </motion.div>

        {/* Filter and Export Toolbar Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
          {/* Header Row: Title and Prominent Download Pending Fee Data Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>Defaulter & Dues Register</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 font-mono">
                  AY {filters.academicYear || 'All'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed category-wise assessed, paid, and pending fee records with multi-year separation
              </p>
            </div>

            {/* Prominent Download Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {selectedIds.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleDownloadPendingData(true)}
                  disabled={exporting}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  title={`Download Excel report for only the ${selectedIds.length} selected students`}
                >
                  {exporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Export Selected ({selectedIds.length})</span>
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowDownloadModal(true)}
                disabled={exporting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Configure combined filters and download complete Category-Wise Pending Fee Excel Workbook"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                <span>Download Pending Fee Data</span>
              </motion.button>
            </div>
          </div>

          {/* Live Student Search Bar */}
          <div className="pt-2 border-t border-slate-100">
            <StudentSearchInput
              value={filters.search}
              onChange={val => setFilters(prev => ({ ...prev, search: val }))}
              onSelectStudent={student => {
                setFilters(prev => ({ ...prev, search: student.name }));
              }}
              onSearchSubmit={query => {
                setFilters(prev => ({ ...prev, search: query }));
              }}
              onClear={() => {
                setFilters(prev => ({ ...prev, search: '' }));
              }}
              placeholder="Live student search by name (e.g. Chaitanya), admission no, roll no, or phone..."
              size="md"
              showSearchButton={true}
              searchButtonText="Search Dues"
            />
          </div>

          {/* Secondary Filters Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1 font-bold text-slate-500 uppercase tracking-wider text-[10.5px] mr-1">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </div>

            {/* Academic Year Filter */}
            <select
              value={filters.academicYear}
              onChange={e => setFilters(prev => ({ ...prev, academicYear: e.target.value }))}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-mono font-bold"
            >
              <option value="All">All Academic Sessions</option>
              {academicYears.map(ay => (
                <option key={ay} value={ay}>Session {ay}</option>
              ))}
            </select>

            {/* Level Filter */}
            <select
              value={filters.level}
              onChange={e => setFilters(prev => ({ ...prev, level: e.target.value }))}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="">All Levels (UG & PG)</option>
              <option value="UG">UG (Undergraduate)</option>
              <option value="PG">PG (Postgraduate)</option>
            </select>

            {/* Degree Filter */}
            <select
              value={filters.degree}
              onChange={e => setFilters(prev => ({ ...prev, degree: e.target.value }))}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="">All Degrees</option>
              {degrees.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Course Filter */}
            <select
              value={filters.course}
              onChange={e => setFilters(prev => ({ ...prev, course: e.target.value }))}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium max-w-xs truncate"
            >
              <option value="">All Courses & Branches</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Study Year Filter */}
            <select
              value={filters.studyYear}
              onChange={e => setFilters(prev => ({ ...prev, studyYear: e.target.value }))}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="">All Study Years</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
            </select>

            {/* Batch Filter */}
            <select
              value={filters.batch}
              onChange={e => setFilters(prev => ({ ...prev, batch: e.target.value }))}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-mono font-medium"
            >
              <option value="">All Batches</option>
              {batches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            {/* Reset Filters */}
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 font-semibold hover:bg-rose-50 rounded-lg transition-colors ml-auto cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Clear Filters ({activeFiltersCount})
              </button>
            )}
          </div>

          {/* Active Multi-Selection Bar */}
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2.5 bg-blue-50/90 border border-blue-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="font-semibold text-blue-900">
                  {selectedIds.length} student{selectedIds.length > 1 ? 's' : ''} selected
                </span>
                <span className="text-[11px] text-blue-600">
                  (out of {pending.length} matching defaulters)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPendingData(true)}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Selected ({selectedIds.length})</span>
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="inline-flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-medium cursor-pointer"
                >
                  <X className="w-3 h-3" /> Deselect
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title={allCurrentSelected ? 'Deselect all' : 'Select all matching students'}
                    >
                      {allCurrentSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : someCurrentSelected ? (
                        <MinusSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Course & Batch</th>
                  <th className="py-3 px-3">Study Year</th>
                  <th className="py-3 px-3 text-right">Total Assessed</th>
                  <th className="py-3 px-3 text-right">Total Paid</th>
                  <th className="py-3 px-3 text-right">Previous Due</th>
                  <th className="py-3 px-3 text-right">Net Pending</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [1, 2, 3, 4, 5, 6].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-3 text-center"><div className="w-4 h-4 skeleton rounded mx-auto" /></td>
                      <td className="py-3.5 px-3"><div className="w-28 h-4 skeleton rounded mb-1" /><div className="w-16 h-3 skeleton rounded" /></td>
                      <td className="py-3.5 px-3"><div className="w-24 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-3"><div className="w-10 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-3 text-right"><div className="w-16 h-4 skeleton rounded ml-auto" /></td>
                      <td className="py-3.5 px-3 text-right"><div className="w-16 h-4 skeleton rounded ml-auto" /></td>
                      <td className="py-3.5 px-3 text-right"><div className="w-16 h-4 skeleton rounded ml-auto" /></td>
                      <td className="py-3.5 px-3 text-right"><div className="w-16 h-4 skeleton rounded ml-auto" /></td>
                      <td className="py-3.5 px-3 text-center"><div className="w-14 h-4 skeleton rounded-full mx-auto" /></td>
                      <td className="py-3.5 px-3 text-right"><div className="w-12 h-4 skeleton rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : pending.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-16 text-center">
                      <AlertCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-800">No pending fee records found</p>
                      <p className="text-xs text-slate-400 mt-1">All student accounts under the selected filters are settled!</p>
                    </td>
                  </tr>
                ) : (
                  pending.map(p => {
                    const isSelected = selectedIds.includes(p.studentId);
                    return (
                      <tr
                        key={p.studentId}
                        className={`hover:bg-blue-50/30 cursor-pointer transition-colors group ${
                          isSelected ? 'bg-blue-50/50' : ''
                        }`}
                        onClick={() => navigate(`/students/${p.studentId}`)}
                      >
                        <td className="py-3 px-3 text-center" onClick={e => toggleSelectOne(p.studentId, e)}>
                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-slate-200">
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.name}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{p.admissionNo || p.studentId}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-xs">
                          <p className="font-semibold text-slate-700">{p.course} ({p.level})</p>
                          {p.batch && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200/60 mt-0.5">
                              Batch {p.batch}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-xs font-medium text-slate-600">{p.currentYear}</td>

                        <td className="py-3 px-3 text-right text-xs font-medium text-slate-700 font-mono">
                          {formatCurrency(p.totalPayable)}
                        </td>

                        <td className="py-3 px-3 text-right text-xs font-semibold text-emerald-700 font-mono">
                          {formatCurrency(p.totalPaid)}
                        </td>

                        <td className="py-3 px-3 text-right text-xs font-medium text-amber-700 font-mono">
                          {p.previousYearDue > 0 ? formatCurrency(p.previousYearDue) : '—'}
                        </td>

                        <td className="py-3 px-3 text-right text-xs font-bold text-rose-600 font-mono">
                          {formatCurrency(p.totalPending)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusColor(p.feeStatus)}`}>
                            {p.feeStatus}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                            View <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Fee Excel Export Configuration Modal with Live Preview */}
        <DownloadPendingFeeModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          batches={batches}
          courses={courses}
          academicYears={academicYears}
          degrees={degrees}
          selectedStudentIds={selectedIds}
        />

      </motion.div>
    </div>
  );
}
