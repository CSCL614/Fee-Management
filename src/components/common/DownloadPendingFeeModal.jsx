import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet, Download, Filter, RotateCcw, AlertTriangle,
  Users, IndianRupee, X, Loader2, CheckCircle2, BookOpen, Calendar,
  GraduationCap, Layers, Check
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/helpers';

/**
 * Normalizes dashes (en-dash, em-dash, hyphen) to standard hyphen for resilient string comparisons
 */
const normalizeDashStr = (s) => (s ? String(s).replace(/[-–—]/g, '-').trim() : '');

export default function DownloadPendingFeeModal({
  isOpen,
  onClose,
  batches = [],
  courses = [],
  academicYears = [],
  degrees = [],
  selectedStudentIds = []
}) {
  // Find default database batch matching '2024-2027' (handles en-dash '2024–2027' or hyphen '2024-2027')
  const defaultBatchDb = useMemo(() => {
    return batches.find(b => normalizeDashStr(b) === '2024-2027') || null;
  }, [batches]);

  // Find default database academic year matching '2026-27'
  const defaultAyDb = useMemo(() => {
    return academicYears.find(ay => normalizeDashStr(ay) === '2026-27') || null;
  }, [academicYears]);

  // Filter configuration state
  const [filterMode, setFilterMode] = useState('combined'); // 'combined' | 'selected'
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedStudyYear, setSelectedStudyYear] = useState('All');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [onlyDefaulters, setOnlyDefaulters] = useState(true);

  // Missing default warnings state
  const [batchWarning, setBatchWarning] = useState(null);
  const [ayWarning, setAyWarning] = useState(null);

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Debounce ref for live preview fetching
  const debounceTimerRef = useRef(null);

  // Initialize or reset default filter configuration whenever modal opens
  useEffect(() => {
    if (isOpen) {
      // 1. Preselect Filter Mode: Combined Filters
      setFilterMode('combined');

      // 2. Preselect Batch: 2024–2027 (if found in DB, else warning)
      if (defaultBatchDb) {
        setSelectedBatch(defaultBatchDb);
        setBatchWarning(null);
      } else {
        setSelectedBatch('');
        setBatchWarning("Default batch '2024–2027' not found in database. Please select an available batch.");
      }

      // 3. Preselect Study Year: All Years
      setSelectedStudyYear('All');

      // 4. Preselect Course: All Courses
      setSelectedCourse('All');

      // 5. Preselect Academic Year: 2026–27 (if found in DB, else warning)
      if (defaultAyDb) {
        setSelectedAcademicYear(defaultAyDb);
        setAyWarning(null);
      } else {
        setSelectedAcademicYear('');
        setAyWarning("Default academic year '2026–27' not found in database. Please select an available academic year.");
      }

      setOnlyDefaulters(true);
    }
  }, [isOpen, defaultBatchDb, defaultAyDb]);

  // Derive dynamic study years based on selected course
  const dynamicStudyYears = useMemo(() => {
    if (selectedCourse && selectedCourse !== 'All') {
      const lower = selectedCourse.toLowerCase();
      if (lower.includes('m.sc') || lower.includes('pg') || lower.includes('master')) {
        return ['1st Year', '2nd Year'];
      }
      if (lower.includes('b.tech') || lower.includes('b.e') || lower.includes('pharm')) {
        return ['1st Year', '2nd Year', '3rd Year', '4th Year'];
      }
    }
    return ['1st Year', '2nd Year', '3rd Year'];
  }, [selectedCourse]);

  // Reset filters handler: restores all defaults
  const handleResetFilters = () => {
    setFilterMode('combined');
    if (defaultBatchDb) {
      setSelectedBatch(defaultBatchDb);
      setBatchWarning(null);
    } else {
      setSelectedBatch('');
      setBatchWarning("Default batch '2024–2027' not found in database. Please select an available batch.");
    }
    setSelectedStudyYear('All');
    setSelectedCourse('All');
    if (defaultAyDb) {
      setSelectedAcademicYear(defaultAyDb);
      setAyWarning(null);
    } else {
      setSelectedAcademicYear('');
      setAyWarning("Default academic year '2026–27' not found in database. Please select an available academic year.");
    }
    setOnlyDefaulters(true);
  };

  // Live preview fetcher with 200ms debounce
  useEffect(() => {
    if (!isOpen) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If batch or academic year are not selected in combined mode, don't fetch preview
    if (filterMode === 'combined' && (!selectedBatch || !selectedAcademicYear)) {
      setPreviewData(null);
      setPreviewLoading(false);
      return;
    }

    setPreviewLoading(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (selectedAcademicYear && selectedAcademicYear !== 'All') {
          params.append('academicYear', selectedAcademicYear);
        }
        if (selectedCourse && selectedCourse !== 'All') {
          params.append('course', selectedCourse);
        }
        if (selectedStudyYear && selectedStudyYear !== 'All') {
          params.append('studyYear', selectedStudyYear);
        }
        if (selectedBatch && selectedBatch !== 'All') {
          params.append('batch', selectedBatch);
        }
        params.append('onlyDefaulters', onlyDefaulters ? 'true' : 'false');

        if (filterMode === 'selected' && selectedStudentIds.length > 0) {
          params.append('studentIds', selectedStudentIds.join(','));
        }

        const res = await api.get(`/exports/pending-fees/preview?${params.toString()}`);
        if (res.data?.success) {
          setPreviewData(res.data.data);
        } else {
          setPreviewData(null);
        }
      } catch (err) {
        console.error('Pending fee export preview error:', err);
        setPreviewData(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [
    isOpen,
    filterMode,
    selectedBatch,
    selectedCourse,
    selectedStudyYear,
    selectedAcademicYear,
    onlyDefaulters,
    selectedStudentIds
  ]);

  // Download Excel Workbook handler
  const handleDownloadExcel = async () => {
    if (exporting) return;
    if (filterMode === 'combined' && (!selectedBatch || !selectedAcademicYear)) {
      toast.error('Please select both a Batch and an Academic Year.');
      return;
    }

    setExporting(true);
    const toastId = toast.loading('Generating Pending Fee Excel workbook...');

    try {
      const params = new URLSearchParams();
      if (selectedAcademicYear && selectedAcademicYear !== 'All') {
        params.append('academicYear', selectedAcademicYear);
      }
      if (selectedCourse && selectedCourse !== 'All') {
        params.append('course', selectedCourse);
      }
      if (selectedStudyYear && selectedStudyYear !== 'All') {
        params.append('studyYear', selectedStudyYear);
      }
      if (selectedBatch && selectedBatch !== 'All') {
        params.append('batch', selectedBatch);
      }
      params.append('onlyDefaulters', onlyDefaulters ? 'true' : 'false');

      if (filterMode === 'selected' && selectedStudentIds.length > 0) {
        params.append('studentIds', selectedStudentIds.join(','));
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

      const safeBatch = selectedBatch ? selectedBatch.replace(/[^a-zA-Z0-9_-]/g, '_') : 'All_Batches';
      const safeAy = selectedAcademicYear ? selectedAcademicYear.replace(/[^a-zA-Z0-9_-]/g, '_') : 'All_Years';
      link.download = `Pending_Fee_Report_${safeBatch}_${safeAy}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      const count = previewData?.count ?? 0;
      toast.success(
        count > 0
          ? `Pending Fee Data downloaded successfully (${count} student${count > 1 ? 's' : ''})!`
          : 'Pending Fee Data workbook downloaded successfully!',
        { id: toastId }
      );
      onClose();
    } catch (err) {
      console.error('Download pending fee report error:', err);
      toast.error('Failed to generate Excel report. Please check server logs and try again.', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const isDownloadDisabled =
    exporting ||
    previewLoading ||
    (filterMode === 'combined' && (!selectedBatch || !selectedAcademicYear)) ||
    (previewData && previewData.count === 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Download Pending Fee Data
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                    Excel Export
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Configure combined filters and preview matching records before downloading
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={exporting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
            {/* Missing DB Defaults Warning Banners */}
            {(batchWarning || ayWarning) && (
              <div className="space-y-2">
                {batchWarning && (
                  <div className="p-3 bg-amber-50 border border-amber-300/80 rounded-xl text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">{batchWarning}</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Please choose one of the available student batches below.
                      </p>
                    </div>
                  </div>
                )}
                {ayWarning && (
                  <div className="p-3 bg-amber-50 border border-amber-300/80 rounded-xl text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">{ayWarning}</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Please choose one of the available academic years configured in the system.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filter Mode Selector */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Filter Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFilterMode('combined')}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    filterMode === 'combined'
                      ? 'bg-blue-50/90 border-blue-400 text-blue-950 ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 hover:bg-slate-100/60 text-slate-700'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    filterMode === 'combined' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400'
                  }`}>
                    {filterMode === 'combined' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="font-bold block text-xs">Combined Filters (Strict AND)</span>
                    <span className="text-[11px] text-slate-500 leading-tight">
                      Match Batch AND Course AND Study Year AND selected Academic Year
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedStudentIds.length === 0) {
                      toast.error('No students currently selected on the table.');
                      return;
                    }
                    setFilterMode('selected');
                  }}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                    selectedStudentIds.length === 0
                      ? 'opacity-60 bg-slate-100 border-slate-200 cursor-not-allowed'
                      : filterMode === 'selected'
                      ? 'bg-blue-50/90 border-blue-400 text-blue-950 ring-1 ring-blue-400 cursor-pointer'
                      : 'bg-white border-slate-200 hover:bg-slate-100/60 text-slate-700 cursor-pointer'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    filterMode === 'selected' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400'
                  }`}>
                    {filterMode === 'selected' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="font-bold block text-xs">
                      Selected Students Only ({selectedStudentIds.length})
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight">
                      {selectedStudentIds.length > 0
                        ? `Export only the ${selectedStudentIds.length} checked students`
                        : 'Select students on table to enable this mode'}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Batch Filter */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Student Batch</span>
                  <span className="text-[10px] text-rose-500 font-bold">*</span>
                </label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl bg-white text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${
                    !selectedBatch ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  }`}
                >
                  <option value="" disabled>-- Select Batch --</option>
                  <option value="All">All Batches</option>
                  {batches.map((b) => (
                    <option key={b} value={b}>
                      Batch {b} {defaultBatchDb === b ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Default: <strong className="text-slate-700">2024–2027</strong> (Fetched dynamically from student records)
                </p>
              </div>

              {/* Academic Year Filter */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Academic Year (Fee Session)</span>
                  <span className="text-[10px] text-rose-500 font-bold">*</span>
                </label>
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl bg-white text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium ${
                    !selectedAcademicYear ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  }`}
                >
                  <option value="" disabled>-- Select Academic Year --</option>
                  <option value="All">All Academic Years</option>
                  {academicYears.map((ay) => (
                    <option key={ay} value={ay}>
                      AY {ay} {defaultAyDb === ay ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Default: <strong className="text-slate-700">2026–27</strong> (Strict year separation; no mixing with older years)
                </p>
              </div>

              {/* Course Filter */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Course / Specialization</span>
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="All">All Courses (Default)</option>
                  {courses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Fetched from Admin Course Management & student records
                </p>
              </div>

              {/* Study Year Filter */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>Year of Study</span>
                </label>
                <select
                  value={selectedStudyYear}
                  onChange={(e) => setSelectedStudyYear(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="All">All Years (Default)</option>
                  {dynamicStudyYears.map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Configured according to course duration
                </p>
              </div>
            </div>

            {/* Selected Filters Summary Chips */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Selected Combined Criteria
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset to Defaults
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-slate-700 shadow-2xs">
                  Batch: <strong>{selectedBatch || 'Not Selected'}</strong>
                </span>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-slate-700 shadow-2xs">
                  AY: <strong>{selectedAcademicYear || 'Not Selected'}</strong>
                </span>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 shadow-2xs">
                  Course: <strong>{selectedCourse === 'All' ? 'All Courses' : selectedCourse}</strong>
                </span>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 shadow-2xs">
                  Study Year: <strong>{selectedStudyYear === 'All' ? 'All Years' : selectedStudyYear}</strong>
                </span>
                {onlyDefaulters && (
                  <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 font-semibold shadow-2xs">
                    Defaulters with Dues &gt; ₹0
                  </span>
                )}
              </div>
            </div>

            {/* Live Preview Before Download Section */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  Live Export Preview
                </span>
                {previewLoading ? (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                    Calculating matching students...
                  </span>
                ) : previewData ? (
                  <span className="text-[11px] font-bold text-slate-700">
                    {previewData.count} Matching Student{previewData.count !== 1 ? 's' : ''}
                  </span>
                ) : null}
              </div>

              <div className="p-4 bg-white">
                {previewLoading ? (
                  <div className="py-6 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-xs">Fetching real-time record count from MongoDB...</span>
                  </div>
                ) : !selectedBatch || !selectedAcademicYear ? (
                  <div className="py-4 text-center text-slate-500 text-xs">
                    Please select both a valid <strong className="text-slate-700">Batch</strong> and{' '}
                    <strong className="text-slate-700">Academic Year</strong> to view matching student data.
                  </div>
                ) : previewData && previewData.count === 0 ? (
                  <div className="py-5 px-4 bg-rose-50/60 border border-rose-200 rounded-xl text-center">
                    <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto mb-1.5" />
                    <p className="font-bold text-rose-900 text-xs">No Matching Students Found</p>
                    <p className="text-[11px] text-rose-700 mt-1 max-w-md mx-auto">
                      No student records match this combination of Batch ({selectedBatch}), Course ({selectedCourse}),
                      Study Year ({selectedStudyYear}), and Academic Year ({selectedAcademicYear}).
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Try selecting <span className="font-semibold text-slate-700">All Courses</span> or{' '}
                      <span className="font-semibold text-slate-700">All Years</span>, or click Reset Filters.
                    </p>
                  </div>
                ) : previewData ? (
                  <div className="space-y-3">
                    {/* Financial summary metrics cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[10.5px] font-medium text-slate-500 block">Total Students</span>
                        <span className="text-base font-extrabold text-slate-900">{previewData.count}</span>
                      </div>
                      <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                        <span className="text-[10.5px] font-medium text-blue-700 block">Total Assessed</span>
                        <span className="text-base font-extrabold text-blue-950 font-mono">
                          {formatCurrency(previewData.totalAssessed)}
                        </span>
                      </div>
                      <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                        <span className="text-[10.5px] font-medium text-emerald-700 block">Total Paid</span>
                        <span className="text-base font-extrabold text-emerald-950 font-mono">
                          {formatCurrency(previewData.totalPaid)}
                        </span>
                      </div>
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
                        <span className="text-[10.5px] font-medium text-amber-700 block">Remaining Dues</span>
                        <span className="text-base font-extrabold text-amber-950 font-mono">
                          {formatCurrency(previewData.totalPending)}
                        </span>
                      </div>
                    </div>

                    {/* Preview Table of Sample Students */}
                    {previewData.sampleStudents && previewData.sampleStudents.length > 0 && (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="max-h-40 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="px-2.5 py-1.5">Roll No</th>
                                <th className="px-2.5 py-1.5">Student Name</th>
                                <th className="px-2.5 py-1.5">Course</th>
                                <th className="px-2.5 py-1.5">Year</th>
                                <th className="px-2.5 py-1.5 text-right">Assessed</th>
                                <th className="px-2.5 py-1.5 text-right">Paid</th>
                                <th className="px-2.5 py-1.5 text-right font-bold text-rose-700">Remaining Due</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-normal">
                              {previewData.sampleStudents.map((st, sIdx) => (
                                <tr key={sIdx} className="hover:bg-slate-50">
                                  <td className="px-2.5 py-1.5 font-mono font-medium text-slate-700">
                                    {st.rollNumber}
                                  </td>
                                  <td className="px-2.5 py-1.5 font-semibold text-slate-900">{st.name}</td>
                                  <td className="px-2.5 py-1.5 text-slate-600 truncate max-w-[140px]">{st.course}</td>
                                  <td className="px-2.5 py-1.5 text-slate-600 whitespace-nowrap">{st.studyYear}</td>
                                  <td className="px-2.5 py-1.5 text-right font-mono text-slate-600">
                                    {formatCurrency(st.totalAssessed)}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right font-mono text-emerald-700">
                                    {formatCurrency(st.totalPaid)}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right font-mono font-bold text-rose-600">
                                    {formatCurrency(st.remainingBalance)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {previewData.count > previewData.sampleStudents.length && (
                          <div className="bg-slate-50 px-3 py-1.5 text-[10.5px] text-slate-500 border-t border-slate-200 text-center font-medium">
                            Showing first {previewData.sampleStudents.length} of {previewData.count} students. All {previewData.count} records will be exported to Excel.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={exporting}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <motion.button
                whileHover={{ scale: isDownloadDisabled ? 1 : 1.02 }}
                whileTap={{ scale: isDownloadDisabled ? 1 : 0.98 }}
                onClick={handleDownloadExcel}
                disabled={isDownloadDisabled}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                <span>
                  {exporting
                    ? 'Generating Excel...'
                    : previewData && previewData.count > 0
                    ? `Download Excel (${previewData.count} Students)`
                    : 'Download Excel'}
                </span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

