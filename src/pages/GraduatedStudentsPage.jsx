import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Users, Search, Filter, RotateCcw, Award,
  BookOpen, Calendar, Eye, CreditCard, ChevronRight, Download,
  CheckCircle2, AlertTriangle, X, ShieldCheck, Sparkles, Layers,
  ExternalLink, FileText, ArrowRight, UserCheck, Phone, Printer,
  MessageSquare, FileSpreadsheet, Check
} from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import { pageVariants, fadeInUp, modalVariants, backdropVariants } from '../utils/animations';
import StudentAvatar from '../components/common/StudentAvatar';

export default function GraduatedStudentsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // Data states
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({
    totalGraduated: 0,
    graduatedThisYear: 0,
    topCourse: 'N/A',
    totalOutstandingBalance: 0
  });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  // View state: 'table' | 'cohort' | 'suggestions'
  const [viewTab, setViewTab] = useState('table');

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    passingYear: 'All',
    course: 'All',
    resultStatus: 'All',
    feeStatus: 'All'
  });

  // Action Modals State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showGraduateModal, setShowGraduateModal] = useState(false);
  const [showNocModal, setShowNocModal] = useState(false);
  const [nocStudent, setNocStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for results / graduation
  const [resultForm, setResultForm] = useState({
    passingYear: new Date().getFullYear(),
    passingAcademicYear: '',
    completionDate: new Date().toISOString().split('T')[0],
    graduationRemarks: '',
    resultStatus: 'Passed',
    percentage: '',
    cgpa: '',
    gradeOrDivision: 'First Class',
    universityRegNo: '',
    finalSemester: 'Semester VI',
    resultDate: ''
  });

  // Bulk Graduation State
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [showBulkGraduateModal, setShowBulkGraduateModal] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [suggestionSearch, setSuggestionSearch] = useState('');
  const [suggestionCourse, setSuggestionCourse] = useState('All');
  const [bulkForm, setBulkForm] = useState({
    passingYear: new Date().getFullYear(),
    passingAcademicYear: '',
    completionDate: new Date().toISOString().split('T')[0],
    graduationRemarks: '',
    defaultResultStatus: 'Passed'
  });

  useEffect(() => {
    fetchCourses();
    fetchGraduated();
  }, [filters, pagination.page]);

  useEffect(() => {
    if (viewTab === 'suggestions' && suggestions.length === 0) {
      fetchSuggestions();
    }
  }, [viewTab]);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      const raw = res.data?.data;
      let courseList = [];
      if (Array.isArray(raw)) {
        courseList = raw;
      } else if (Array.isArray(raw?.courses)) {
        courseList = raw.courses;
      } else if (Array.isArray(res.data?.courses)) {
        courseList = res.data.courses;
      }
      setCourses(courseList);
    } catch {
      setCourses([]);
    }
  };

  const fetchGraduated = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.passingYear !== 'All') params.append('passingYear', filters.passingYear);
      if (filters.course !== 'All') params.append('course', filters.course);
      if (filters.resultStatus !== 'All') params.append('resultStatus', filters.resultStatus);
      if (filters.feeStatus && filters.feeStatus !== 'All') params.append('feeStatus', filters.feeStatus);
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);

      const res = await api.get(`/students/graduated?${params.toString()}`);
      setStudents(res.data.data || []);
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load graduated students:', err);
      toast.error('Failed to fetch graduated student records');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const res = await api.get('/students/graduation/suggestions');
      setSuggestions(res.data.data || []);
    } catch (err) {
      toast.error('Failed to fetch graduation suggestions');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      passingYear: 'All',
      course: 'All',
      resultStatus: 'All',
      feeStatus: 'All'
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const openNocModal = (student) => {
    setNocStudent(student);
    setShowNocModal(true);
  };

  const exportAlumniDuesReport = () => {
    if (!students || students.length === 0) {
      toast.error('No alumni records available to export');
      return;
    }
    const headers = [
      'Student ID', 'Full Name', 'Admission No', 'Phone', 'Course',
      'Graduation Year', 'Degree Result', 'Total Fee Assessed', 'Total Paid',
      'Outstanding Balance', 'Fee Clearance Status'
    ];
    const rows = students.map(s => [
      `"${s.studentId || ''}"`,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${s.admissionNo || ''}"`,
      `"${s.phone || ''}"`,
      `"${s.course || ''}"`,
      `"${s.graduation?.passingYear || ''}"`,
      `"${s.graduation?.academicResult?.resultStatus || 'Passed'}"`,
      s.totalFee || 0,
      s.totalPaid || 0,
      s.totalPending || 0,
      `"${(s.totalPending || 0) === 0 ? 'No Dues (Cleared)' : 'Pending Dues'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Graduated_Alumni_Dues_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Alumni Dues Report exported successfully');
  };

  const openRestoreModal = (student) => {
    setSelectedStudent(student);
    setRestoreReason('');
    setShowRestoreModal(true);
  };

  const openResultsModal = (student) => {
    setSelectedStudent(student);
    const ar = student.graduation?.academicResult || {};
    setResultForm({
      passingYear: student.graduation?.passingYear || new Date().getFullYear(),
      passingAcademicYear: student.graduation?.passingAcademicYear || '',
      completionDate: student.graduation?.completionDate ? new Date(student.graduation.completionDate).toISOString().split('T')[0] : '',
      graduationRemarks: student.graduation?.graduationRemarks || ar.remarks || '',
      resultStatus: ar.resultStatus || 'Passed',
      percentage: ar.percentage != null ? String(ar.percentage) : '',
      cgpa: ar.cgpa != null ? String(ar.cgpa) : '',
      gradeOrDivision: ar.gradeOrDivision || '',
      universityRegNo: ar.universityRegNo || '',
      finalSemester: ar.finalSemester || 'Semester VI',
      resultDate: ar.resultDate ? new Date(ar.resultDate).toISOString().split('T')[0] : ''
    });
    setShowResultsModal(true);
  };

  const openGraduateModalForCandidate = (candidate) => {
    setSelectedStudent(candidate);
    setResultForm({
      passingYear: candidate.suggestedPassingYear || new Date().getFullYear(),
      passingAcademicYear: candidate.suggestedPassingAcademicYear || candidate.currentAcademicYear || '',
      completionDate: new Date().toISOString().split('T')[0],
      graduationRemarks: candidate.reasons?.join('; ') || '',
      resultStatus: 'Passed',
      percentage: '',
      cgpa: '',
      gradeOrDivision: 'First Class',
      universityRegNo: '',
      finalSemester: candidate.level === 'PG' ? 'Semester IV' : 'Semester VI',
      resultDate: ''
    });
    setShowGraduateModal(true);
  };

  const handleRestoreSubmit = async (e) => {
    e.preventDefault();
    if (!restoreReason || restoreReason.trim().length < 5) {
      toast.error('Mandatory reason (min 5 characters) is required to restore student');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/students/${selectedStudent._id || selectedStudent.studentId}/restore`, {
        reason: restoreReason.trim()
      });
      toast.success(res.data.message || 'Student restored to Active status');
      setShowRestoreModal(false);
      setSelectedStudent(null);
      fetchGraduated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResultsSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.put(`/students/${selectedStudent._id || selectedStudent.studentId}/academic-results`, {
        passingYear: parseInt(resultForm.passingYear, 10),
        finalSemester: resultForm.finalSemester,
        resultStatus: resultForm.resultStatus,
        percentage: resultForm.percentage,
        cgpa: resultForm.cgpa,
        gradeOrDivision: resultForm.gradeOrDivision,
        universityRegNo: resultForm.universityRegNo,
        resultDate: resultForm.resultDate || null,
        remarks: resultForm.graduationRemarks
      });
      toast.success(res.data.message || 'Academic results updated successfully');
      setShowResultsModal(false);
      setSelectedStudent(null);
      fetchGraduated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update academic results');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGraduateCandidateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post(`/students/${selectedStudent._id || selectedStudent.studentId}/graduate`, {
        passingYear: parseInt(resultForm.passingYear, 10),
        passingAcademicYear: resultForm.passingAcademicYear || selectedStudent.currentAcademicYear,
        completionDate: resultForm.completionDate,
        graduationRemarks: resultForm.graduationRemarks,
        academicResult: {
          course: selectedStudent.course,
          specialization: selectedStudent.specialization,
          admissionYear: selectedStudent.admissionYear || selectedStudent.batchStartYear,
          passingYear: parseInt(resultForm.passingYear, 10),
          finalSemester: resultForm.finalSemester,
          resultStatus: resultForm.resultStatus,
          percentage: resultForm.percentage,
          cgpa: resultForm.cgpa,
          gradeOrDivision: resultForm.gradeOrDivision,
          universityRegNo: resultForm.universityRegNo,
          resultDate: resultForm.resultDate || null,
          remarks: resultForm.graduationRemarks
        }
      });
      toast.success(res.data.message || 'Student graduated successfully');
      setShowGraduateModal(false);
      setSelectedStudent(null);
      fetchSuggestions();
      fetchGraduated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to graduate student');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSuggestions = useMemo(() => {
    return (Array.isArray(suggestions) ? suggestions : []).filter(candidate => {
      if (!candidate) return false;
      const s = suggestionSearch.toLowerCase().trim();
      const matchesSearch = !s ||
        candidate.name?.toLowerCase().includes(s) ||
        candidate.studentId?.toLowerCase().includes(s) ||
        candidate.admissionNo?.toLowerCase().includes(s);
      const matchesCourse = suggestionCourse === 'All' || candidate.course === suggestionCourse;
      return matchesSearch && matchesCourse;
    });
  }, [suggestions, suggestionSearch, suggestionCourse]);

  const toggleCandidateSelection = (id) => {
    setSelectedCandidateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredSuggestions.map(c => c._id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedCandidateIds.includes(id));
    if (allSelected) {
      setSelectedCandidateIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedCandidateIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const openBulkGraduateModal = () => {
    if (selectedCandidateIds.length === 0) {
      toast.error('Please select at least one candidate to graduate');
      return;
    }
    const selectedObjs = suggestions.filter(s => selectedCandidateIds.includes(s._id));
    const sample = selectedObjs[0] || {};
    setBulkForm({
      passingYear: sample.suggestedPassingYear || new Date().getFullYear(),
      passingAcademicYear: sample.suggestedPassingAcademicYear || sample.currentAcademicYear || '',
      completionDate: new Date().toISOString().split('T')[0],
      graduationRemarks: `Bulk graduated cohort of ${selectedCandidateIds.length} students`,
      defaultResultStatus: 'Passed'
    });
    setShowBulkGraduateModal(true);
  };

  const handleBulkGraduateSubmit = async (e) => {
    e.preventDefault();
    if (selectedCandidateIds.length === 0) return;
    setBulkSubmitting(true);
    try {
      const res = await api.post('/students/bulk-graduate', {
        studentIds: selectedCandidateIds,
        passingYear: parseInt(bulkForm.passingYear, 10),
        passingAcademicYear: bulkForm.passingAcademicYear,
        completionDate: bulkForm.completionDate,
        graduationRemarks: bulkForm.graduationRemarks,
        defaultResultStatus: bulkForm.defaultResultStatus
      });
      toast.success(res.data.message || `Successfully graduated ${selectedCandidateIds.length} student(s)!`);
      setShowBulkGraduateModal(false);
      setSelectedCandidateIds([]);
      fetchSuggestions();
      fetchGraduated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to bulk graduate students');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Group cohorts by Passing Year + Course
  const cohorts = (Array.isArray(students) ? students : []).reduce((acc, s) => {
    if (!s) return acc;
    const key = `${s.graduation?.passingYear || 'Unknown'} • ${s.course || 'Unknown'}`;
    if (!acc[key]) {
      acc[key] = {
        passingYear: s.graduation?.passingYear || 'Unknown',
        course: s.course || 'Unknown',
        level: s.level || 'UG',
        students: [],
        totalCollected: 0,
        totalPending: 0
      };
    }
    acc[key].students.push(s);
    acc[key].totalCollected += s.totalPaid || 0;
    acc[key].totalPending += s.totalPending || 0;
    return acc;
  }, {});

  const currentYear = new Date().getFullYear();
  const passingYearsList = Array.from(new Set([
    currentYear, currentYear - 1, currentYear - 2, currentYear - 3,
    ...(Array.isArray(students) ? students : []).map(s => s?.graduation?.passingYear)
  ].filter(Boolean))).sort((a, b) => b - a);

  return (
    <div>
      <Topbar title="Graduated Students & Alumni Directory" />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
      >
        {/* Header Breadcrumb Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span onClick={() => navigate('/dashboard')} className="hover:text-blue-600 cursor-pointer">Dashboard</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span onClick={() => navigate('/students')} className="hover:text-blue-600 cursor-pointer">Students</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-900 font-bold">Graduated Alumni</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <GraduationCap className="w-6 h-6 text-purple-600" />
              Graduated Students & Alumni Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Separate directory for passed-out graduates. Historical fee ledgers, receipts, and outstanding dues are permanently preserved.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={exportAlumniDuesReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
              title="Download Excel / CSV Debtors and Clearance Summary"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Dues Report</span>
            </button>
            <button
              onClick={() => navigate('/students')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Active Students</span>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/60 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Master Workbook</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Dashboard Cards (Including Prominent Total Outstanding Due) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: TOTAL OUTSTANDING DUE (PROMINENT FOCUS CARD) */}
          <div
            onClick={() => setFilters(prev => ({ ...prev, feeStatus: prev.feeStatus === 'due' ? 'All' : 'due' }))}
            className={`rounded-2xl border p-5 transition-all cursor-pointer relative overflow-hidden shadow-xs ${
              filters.feeStatus === 'due'
                ? 'bg-gradient-to-br from-rose-100/90 via-rose-50 to-white border-rose-400 ring-2 ring-rose-400/30'
                : 'bg-white hover:bg-rose-50/20 border-rose-200/90 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Total Outstanding Due</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shadow-2xs">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-900 block tracking-tight">
                {formatCurrency(summary?.totalOutstandingBalance || 0)}
              </span>
              <p className="text-[11px] text-rose-700 mt-1 font-medium">
                {summary?.notFullyPaidCount || 0} Alumni with Overdue Fees
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center justify-between text-[11px] text-rose-600">
              <span className="font-semibold">
                Avg: {formatCurrency(summary?.averageOutstandingDue || 0)}
              </span>
              <span className="text-[10px] font-bold uppercase underline">
                {filters.feeStatus === 'due' ? 'Active Filter ✓' : 'Filter Dues →'}
              </span>
            </div>
          </div>

          {/* Card 2: PAID STUDENTS (ZERO DUE) */}
          <div
            onClick={() => setFilters(prev => ({ ...prev, feeStatus: prev.feeStatus === 'paid' ? 'All' : 'paid' }))}
            className={`rounded-2xl border p-5 transition-all cursor-pointer relative overflow-hidden shadow-xs ${
              filters.feeStatus === 'paid'
                ? 'bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white border-emerald-400 ring-2 ring-emerald-400/30'
                : 'bg-white hover:bg-emerald-50/20 border-emerald-200/90 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Paid Students</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-950">
                {summary?.fullyPaidCount ?? 0}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                {summary?.fullyPaidPercentage ?? 100}% Cleared
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-[11px] text-emerald-700">
              <span className="font-medium">Zero Dues (₹0 Balance)</span>
              <span className="text-[10px] font-bold uppercase underline">
                {filters.feeStatus === 'paid' ? 'Active Filter ✓' : 'Filter Paid →'}
              </span>
            </div>
          </div>

          {/* Card 3: UNPAID ALUMNI (PENDING COUNT) */}
          <div
            onClick={() => setFilters(prev => ({ ...prev, feeStatus: prev.feeStatus === 'due' ? 'All' : 'due' }))}
            className="bg-white hover:bg-amber-50/30 rounded-2xl border border-amber-200/90 hover:border-amber-300 p-5 shadow-xs transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending Students</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shadow-2xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-950 block tracking-tight">
                {summary?.notFullyPaidCount ?? 0}
              </span>
              <p className="text-[11px] text-amber-800 mt-1 font-medium">
                Alumni Requiring Collection
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-700">
              <span className="font-medium">Unsettled Alumni</span>
              <span className="text-[10px] font-bold uppercase underline">Inspect Debtors →</span>
            </div>
          </div>

          {/* Card 4: TOTAL ALUMNI DIRECTORY */}
          <div
            onClick={() => setFilters(prev => ({ ...prev, feeStatus: 'All' }))}
            className="bg-white hover:bg-purple-50/30 rounded-2xl border border-purple-200/90 hover:border-purple-300 p-5 shadow-xs transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Total Alumni</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-950">
                {summary?.totalGraduated ?? 0}
              </span>
              <span className="text-[11px] text-purple-700 font-medium">
                ({summary?.graduatedThisYear || 0} this year)
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-purple-100 flex items-center justify-between text-[11px] text-purple-700">
              <span className="font-medium truncate" title={summary?.topCourse || 'All Courses'}>
                Top: {summary?.topCourse || 'All Courses'}
              </span>
              <span className="text-[10px] font-bold uppercase underline">Reset Filter</span>
            </div>
          </div>
        </div>

        {/* View Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewTab('table')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewTab === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Alumni Directory</span>
            </button>
            <button
              onClick={() => setViewTab('cohort')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewTab === 'cohort' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cohorts & Batches</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setViewTab('suggestions')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewTab === 'suggestions' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-purple-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Eligibility Suggestions</span>
                {suggestions.length > 0 && (
                  <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {suggestions.length}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{students.length}</strong> of <strong className="text-slate-800">{pagination.total}</strong> alumni
          </div>
        </div>

        {/* VIEW 1: ALL ALUMNI TABLE */}
        {viewTab === 'table' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={e => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search name, admission no, roll..."
                    className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Course Filter */}
                <select
                  value={filters.course}
                  onChange={e => setFilters({ ...filters, course: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 outline-none"
                >
                  <option value="All">All Degrees & Courses</option>
                  {(Array.isArray(courses) ? courses : []).map((c, idx) => {
                    const cName = typeof c === 'string' ? c : (c.courseName || `${c.degree || ''} ${c.specialization || ''}`.trim());
                    return (
                      <option key={c._id || cName || idx} value={cName}>{cName}</option>
                    );
                  })}
                </select>

                {/* Passing Year */}
                <select
                  value={filters.passingYear}
                  onChange={e => setFilters({ ...filters, passingYear: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 outline-none"
                >
                  <option value="All">All Passing Years</option>
                  {passingYearsList.map(yr => (
                    <option key={yr} value={yr}>Class of {yr}</option>
                  ))}
                </select>

                {/* Result Status */}
                <select
                  value={filters.resultStatus}
                  onChange={e => setFilters({ ...filters, resultStatus: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 outline-none"
                >
                  <option value="All">All Result Statuses</option>
                  <option value="Passed">Passed</option>
                  <option value="First Class Distinction">First Class Distinction</option>
                  <option value="First Class">First Class</option>
                  <option value="Second Class">Second Class</option>
                  <option value="Passed with Compartment">Passed with Compartment</option>
                </select>

                {/* Fee Status Filter */}
                <select
                  value={filters.feeStatus || 'All'}
                  onChange={e => setFilters({ ...filters, feeStatus: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 outline-none font-medium"
                >
                  <option value="All">All Fee Statuses</option>
                  <option value="due">Pending Dues Only (&gt; ₹0)</option>
                  <option value="paid">Fully Cleared (₹0 Due)</option>
                </select>
              </div>

              {/* Quick Filter Chips & Reset Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400 font-semibold mr-1">Quick Filter:</span>
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, feeStatus: 'All' }))}
                    className={`px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                      filters.feeStatus === 'All'
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Alumni ({summary?.totalGraduated || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, feeStatus: 'due' }))}
                    className={`px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                      filters.feeStatus === 'due'
                        ? 'bg-rose-600 text-white font-bold'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    Pending Dues ({summary?.notFullyPaidCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, feeStatus: 'paid' }))}
                    className={`px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                      filters.feeStatus === 'paid'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    Dues Cleared ({summary?.fullyPaidCount || 0})
                  </button>
                </div>

                {(filters.search || filters.course !== 'All' || filters.passingYear !== 'All' || filters.resultStatus !== 'All' || filters.feeStatus !== 'All') && (
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3">Student / Admission No</th>
                      <th className="py-3 px-3">Course & Specialization</th>
                      <th className="py-3 px-3">Graduation Cohort</th>
                      <th className="py-3 px-3">Degree Result & Grade</th>
                      <th className="py-3 px-3">University Reg No</th>
                      <th className="py-3 px-3 text-right">Fee Settlement</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-slate-400">
                          <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2" />
                          Loading graduated student directory...
                        </td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-slate-400 font-sans">
                          <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          No graduated alumni found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      (Array.isArray(students) ? students : []).map(student => {
                        if (!student) return null;
                        const ar = student.graduation?.academicResult || {};
                        const hasRemainingDues = (student.totalPending || 0) > 0;

                        return (
                          <tr
                            key={student._id}
                            className="hover:bg-purple-50/30 transition-colors"
                          >
                            {/* Student Info */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <StudentAvatar
                                  src={student.profilePhoto}
                                  name={student.name}
                                  size="md"
                                  className="w-9 h-9 rounded-xl shrink-0"
                                />
                                <div>
                                  <div
                                    onClick={() => navigate(`/students/${student.studentId}`)}
                                    className="font-bold text-slate-900 hover:text-purple-600 cursor-pointer"
                                  >
                                    {student.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono">
                                    Adm: <strong className="text-slate-700">{student.admissionNo}</strong> · ID: {student.studentId}
                                  </div>
                                  {student.phone && (
                                    <a
                                      href={`tel:${student.phone}`}
                                      className="inline-flex items-center gap-1 text-[10.5px] text-slate-500 hover:text-blue-600 font-mono mt-0.5"
                                      title="Click to call student"
                                    >
                                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                                      <span>{student.phone}</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Course */}
                            <td className="py-3 px-3">
                              <span className="font-semibold text-slate-800 block">{student.course}</span>
                              <span className="text-[11px] text-slate-500">
                                {student.level} · {student.specialization || 'General'}
                              </span>
                            </td>

                            {/* Cohort */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  Class of {student.graduation?.passingYear || student.batchEndYear || 'Alumnus'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Session {student.graduation?.passingAcademicYear || student.currentAcademicYear}
                              </span>
                            </td>

                            {/* Degree Result */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1">
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[10.5px] font-semibold ${
                                  ar.resultStatus?.includes('Distinction')
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {ar.resultStatus || 'Passed'}
                                </span>
                                {ar.gradeOrDivision && (
                                  <span className="text-[10px] text-slate-500">({ar.gradeOrDivision})</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {ar.percentage != null && <span>Score: {ar.percentage}%</span>}
                                {ar.cgpa != null && <span className="ml-1.5">CGPA: {ar.cgpa}</span>}
                              </div>
                            </td>

                            {/* University Reg No */}
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                              {ar.universityRegNo || <span className="text-slate-300">—</span>}
                            </td>

                            {/* Fee Status */}
                            <td className="py-3 px-3 text-right">
                              {hasRemainingDues ? (
                                <div className="space-y-1">
                                  <span className="text-rose-600 font-mono font-bold block">
                                    Dues: {formatCurrency(student.totalPending)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    Paid: {formatCurrency(student.totalPaid)}
                                  </span>
                                  {student.phone && (
                                    <a
                                      href={`https://wa.me/91${student.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                        `Dear ${student.name}, this is a gentle reminder from Sri Sai Degree & PG College regarding your pending alumni dues of ₹${student.totalPending?.toLocaleString('en-IN')}. Please contact the college accounts office to clear your dues and collect your No Dues Clearance Certificate.`
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                                      title="Send WhatsApp Fee Reminder"
                                    >
                                      <MessageSquare className="w-2.5 h-2.5 text-emerald-600" />
                                      <span>WhatsApp Reminder</span>
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    All Fees Cleared
                                  </span>
                                  <span className="text-[10px] text-slate-400 block font-mono">
                                    Paid: {formatCurrency(student.totalPaid)}
                                  </span>
                                  <button
                                    onClick={() => openNocModal(student)}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded border border-emerald-300 transition-colors cursor-pointer"
                                    title="Generate & Print Official No Dues Clearance Certificate (NOC)"
                                  >
                                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" />
                                    <span>No Dues NOC</span>
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => navigate(`/students/${student.studentId}`)}
                                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="View Full Student Dossier & Fee Ledger"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {hasRemainingDues ? (
                                  <button
                                    onClick={() => navigate(`/record-payment?student=${student.studentId}`)}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Collect Remaining Alumni Dues"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openNocModal(student)}
                                    className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Print No Dues Clearance Certificate (NOC)"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                )}

                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() => openResultsModal(student)}
                                      className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                      title="Edit Academic Degree Results"
                                    >
                                      <Award className="w-4 h-4" />
                                    </button>

                                    <button
                                      onClick={() => openRestoreModal(student)}
                                      className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                      title="Restore to Active Directory"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>Page {pagination.page} of {pagination.pages} ({pagination.total} alumni)</span>
                  <div className="flex gap-1.5">
                    <button
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: COHORTS & BATCHES GROUPED VIEW */}
        {viewTab === 'cohort' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(cohorts).length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No cohort groups available.
                </div>
              ) : (
                Object.entries(cohorts).map(([key, cohort]) => (
                  <div
                    key={key}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3 hover:border-purple-200 transition-colors"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        Class of {cohort.passingYear}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {cohort.students.length} Graduates
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{cohort.course}</h4>
                      <p className="text-[11px] text-slate-500">{cohort.level} Degree Program</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Collected:</span>
                        <span className="font-mono font-bold text-emerald-700">{formatCurrency(cohort.totalCollected)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Remaining Dues:</span>
                        <span className="font-mono font-bold text-rose-600">{formatCurrency(cohort.totalPending)}</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between">
                      <div className="flex -space-x-2 overflow-hidden">
                        {(cohort.students || []).slice(0, 5).map((s, sIdx) => (
                          <div key={sIdx} className="inline-block h-6 w-6 rounded-full ring-2 ring-white">
                            <StudentAvatar src={s?.profilePhoto} name={s?.name || ''} size="sm" className="w-6 h-6 rounded-full" />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setFilters({ ...filters, course: cohort.course, passingYear: cohort.passingYear });
                          setViewTab('table');
                        }}
                        className="text-xs text-purple-600 hover:text-purple-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Students</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: GRADUATION ELIGIBILITY SUGGESTIONS */}
        {viewTab === 'suggestions' && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs text-purple-900 leading-relaxed">
                <span className="font-bold">Intelligent Graduation Eligibility Suggestions:</span>
                <p className="text-[11px] text-purple-800 mt-0.5">
                  The system scans active students against official course catalog duration and admission year progression. Review and graduate eligible students into Alumni status individually or in bulk.
                </p>
              </div>
            </div>

            {/* Filter and Bulk Action Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, adm no..."
                    value={suggestionSearch}
                    onChange={e => setSuggestionSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-500"
                  />
                </div>
                <select
                  value={suggestionCourse}
                  onChange={e => setSuggestionCourse(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 outline-none"
                >
                  <option value="All">All Courses</option>
                  {(courses || []).map(c => {
                    const cName = c.courseName || `${c.degree || ''} ${c.specialization || ''}`.trim();
                    return (
                      <option key={c._id || cName} value={cName}>
                        {cName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedCandidateIds.length > 0 ? (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl">
                  <span className="text-xs font-bold text-purple-900">
                    {selectedCandidateIds.length} candidate(s) selected
                  </span>
                  <button
                    onClick={openBulkGraduateModal}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Graduate Selected ({selectedCandidateIds.length})</span>
                  </button>
                  <button
                    onClick={() => setSelectedCandidateIds([])}
                    className="text-xs text-purple-700 hover:text-purple-900 font-semibold cursor-pointer px-1"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-medium self-center">
                  Showing {filteredSuggestions.length} eligible candidates
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="w-10 py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={filteredSuggestions.length > 0 && filteredSuggestions.every(c => selectedCandidateIds.includes(c._id))}
                          onChange={toggleSelectAllVisible}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                          title="Select all visible candidates"
                        />
                      </th>
                      <th className="py-3 px-3">Student Name</th>
                      <th className="py-3 px-3">Course / Duration</th>
                      <th className="py-3 px-3">Current Class</th>
                      <th className="py-3 px-3">Eligibility Reason</th>
                      <th className="py-3 px-3">Suggested Passing Year</th>
                      <th className="py-3 px-3 text-right">Fee Clearance</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {suggestionsLoading ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-slate-400">
                          <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2" />
                          Analyzing active student directory for graduation eligibility...
                        </td>
                      </tr>
                    ) : filteredSuggestions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-slate-400 font-sans">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                          {suggestions.length === 0
                            ? 'No active students currently pending graduation. All student years are up to date!'
                            : 'No candidates matched the current search or filter criteria.'}
                        </td>
                      </tr>
                    ) : (
                      filteredSuggestions.map(candidate => {
                        if (!candidate) return null;
                        const isSelected = selectedCandidateIds.includes(candidate._id);
                        return (
                          <tr
                            key={candidate._id || candidate.studentId}
                            className={`transition-colors ${isSelected ? 'bg-purple-50/60' : 'hover:bg-purple-50/30'}`}
                          >
                            <td className="w-10 py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCandidateSelection(candidate._id)}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900 block">{candidate.name}</span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                Adm: {candidate.admissionNo} · ID: {candidate.studentId}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <span className="font-semibold text-slate-800 block">{candidate.course}</span>
                              <span className="text-[10.5px] text-slate-500">{candidate.duration} Years Course</span>
                            </td>

                            <td className="py-3 px-3 font-semibold text-purple-700">
                              {candidate.currentYear}
                            </td>

                            <td className="py-3 px-3">
                              {candidate.reasons?.map((r, rIdx) => (
                                <span key={rIdx} className="inline-block text-[10.5px] bg-purple-50 text-purple-800 border border-purple-100 px-1.5 py-0.2 rounded font-medium">
                                  {r}
                                </span>
                              ))}
                            </td>

                            <td className="py-3 px-3 font-mono font-bold text-slate-800">
                              Class of {candidate.suggestedPassingYear}
                            </td>

                            <td className="py-3 px-3 text-right font-mono">
                              {candidate.totalPending > 0 ? (
                                <span className="text-rose-600 font-bold">
                                  Dues: {formatCurrency(candidate.totalPending)}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold">Cleared</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => openGraduateModalForCandidate(candidate)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                              >
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span>Graduate</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: RESTORE GRADUATED STUDENT */}
        <AnimatePresence>
          {showRestoreModal && selectedStudent && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowRestoreModal(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Restore Student to Active</h3>
                      <p className="text-[11px] text-slate-500">Reactivate alumnus back into active directory</p>
                    </div>
                  </div>
                  <button onClick={() => setShowRestoreModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-semibold">
                    Restoring: {selectedStudent.name} ({selectedStudent.admissionNo || selectedStudent.studentId})
                  </p>
                  <p className="text-[11px] opacity-90">
                    A mandatory audit reason is required. The student's previous graduation record will be preserved in their restoration history.
                  </p>
                </div>

                <form onSubmit={handleRestoreSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason for Restoration <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      minLength={5}
                      rows="3"
                      value={restoreReason}
                      onChange={e => setRestoreReason(e.target.value)}
                      placeholder="e.g. Student re-enrolled for supplementary examinations / erroneously marked as graduated."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Minimum 5 characters required for audit trail.</p>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRestoreModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || restoreReason.trim().length < 5}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    >
                      {submitting ? 'Restoring...' : 'Restore to Active'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL: EDIT ACADEMIC RESULTS */}
        <AnimatePresence>
          {showResultsModal && selectedStudent && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowResultsModal(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Update Academic Results</h3>
                      <p className="text-[11px] text-slate-500">Alumnus: {selectedStudent.name} ({selectedStudent.admissionNo || selectedStudent.studentId})</p>
                    </div>
                  </div>
                  <button onClick={() => setShowResultsModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleResultsSubmit} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Passing Year</label>
                      <input
                        type="number"
                        min="2000"
                        max="2099"
                        value={resultForm.passingYear}
                        onChange={e => setResultForm({ ...resultForm, passingYear: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Final Semester</label>
                      <input
                        type="text"
                        value={resultForm.finalSemester}
                        onChange={e => setResultForm({ ...resultForm, finalSemester: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Result Status</label>
                      <select
                        value={resultForm.resultStatus}
                        onChange={e => setResultForm({ ...resultForm, resultStatus: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 outline-none"
                      >
                        <option value="Passed">Passed</option>
                        <option value="First Class Distinction">First Class Distinction</option>
                        <option value="First Class">First Class</option>
                        <option value="Second Class">Second Class</option>
                        <option value="Passed with Compartment">Passed with Compartment</option>
                        <option value="Awaiting Result">Awaiting Result</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Grade / Division</label>
                      <input
                        type="text"
                        value={resultForm.gradeOrDivision}
                        onChange={e => setResultForm({ ...resultForm, gradeOrDivision: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Percentage (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={resultForm.percentage}
                        onChange={e => setResultForm({ ...resultForm, percentage: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">CGPA (10.0 scale)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={resultForm.cgpa}
                        onChange={e => setResultForm({ ...resultForm, cgpa: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">University Reg No</label>
                      <input
                        type="text"
                        value={resultForm.universityRegNo}
                        onChange={e => setResultForm({ ...resultForm, universityRegNo: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Result Publication Date</label>
                      <input
                        type="date"
                        value={resultForm.resultDate}
                        onChange={e => setResultForm({ ...resultForm, resultDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                    <textarea
                      rows="2"
                      value={resultForm.graduationRemarks}
                      onChange={e => setResultForm({ ...resultForm, graduationRemarks: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowResultsModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : 'Save Results'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL: GRADUATE ELIGIBLE CANDIDATE */}
        <AnimatePresence>
          {showGraduateModal && selectedStudent && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowGraduateModal(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Graduate Student to Alumni</h3>
                      <p className="text-[11px] text-slate-500">Class of {resultForm.passingYear} Graduation Confirmation</p>
                    </div>
                  </div>
                  <button onClick={() => setShowGraduateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-950 space-y-1">
                  <p className="font-bold">{selectedStudent.name} ({selectedStudent.admissionNo || selectedStudent.studentId})</p>
                  <p className="text-[11px] text-purple-800">{selectedStudent.course} • Current: {selectedStudent.currentYear}</p>
                </div>

                <form onSubmit={handleGraduateCandidateSubmit} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Passing Year *</label>
                      <input
                        type="number"
                        min="2000"
                        max="2099"
                        value={resultForm.passingYear}
                        onChange={e => setResultForm({ ...resultForm, passingYear: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Academic Session</label>
                      <input
                        type="text"
                        value={resultForm.passingAcademicYear}
                        onChange={e => setResultForm({ ...resultForm, passingAcademicYear: e.target.value })}
                        placeholder="e.g. 2025-26"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Completion Date</label>
                      <input
                        type="date"
                        value={resultForm.completionDate}
                        onChange={e => setResultForm({ ...resultForm, completionDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Result Status</label>
                      <select
                        value={resultForm.resultStatus}
                        onChange={e => setResultForm({ ...resultForm, resultStatus: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 outline-none"
                      >
                        <option value="Passed">Passed</option>
                        <option value="First Class Distinction">First Class Distinction</option>
                        <option value="First Class">First Class</option>
                        <option value="Second Class">Second Class</option>
                        <option value="Passed with Compartment">Passed with Compartment</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Percentage (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={resultForm.percentage}
                        onChange={e => setResultForm({ ...resultForm, percentage: e.target.value })}
                        placeholder="e.g. 78.50"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">CGPA</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={resultForm.cgpa}
                        onChange={e => setResultForm({ ...resultForm, cgpa: e.target.value })}
                        placeholder="e.g. 8.25"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">University Registration No</label>
                    <input
                      type="text"
                      value={resultForm.universityRegNo}
                      onChange={e => setResultForm({ ...resultForm, universityRegNo: e.target.value })}
                      placeholder="e.g. AU2024UG0988"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowGraduateModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {submitting ? 'Graduating...' : 'Confirm Graduation'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL: BULK GRADUATE CANDIDATES */}
        <AnimatePresence>
          {showBulkGraduateModal && selectedCandidateIds.length > 0 && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowBulkGraduateModal(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Bulk Graduate Students to Alumni</h3>
                      <p className="text-[11px] text-slate-500">Graduating {selectedCandidateIds.length} Selected Candidates</p>
                    </div>
                  </div>
                  <button onClick={() => setShowBulkGraduateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-950 space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span>Selected Candidates ({selectedCandidateIds.length})</span>
                    <span className="text-[11px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-mono">
                      Batch Operation
                    </span>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                    {suggestions
                      .filter(s => selectedCandidateIds.includes(s._id))
                      .map((cand, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] bg-white/70 px-2 py-1 rounded">
                          <span className="font-semibold text-slate-800">{cand.name}</span>
                          <span className="text-slate-500">{cand.course} • Adm: {cand.admissionNo}</span>
                        </div>
                      ))}
                  </div>
                  <p className="text-[10.5px] text-purple-800 pt-1">
                    Financial records, fee ledger history, and pending balances are fully preserved.
                  </p>
                </div>

                <form onSubmit={handleBulkGraduateSubmit} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Passing Year *</label>
                      <input
                        type="number"
                        min="2000"
                        max="2099"
                        value={bulkForm.passingYear}
                        onChange={e => setBulkForm({ ...bulkForm, passingYear: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Academic Session</label>
                      <input
                        type="text"
                        value={bulkForm.passingAcademicYear}
                        onChange={e => setBulkForm({ ...bulkForm, passingAcademicYear: e.target.value })}
                        placeholder="e.g. 2025-26"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Completion Date</label>
                      <input
                        type="date"
                        value={bulkForm.completionDate}
                        onChange={e => setBulkForm({ ...bulkForm, completionDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Default Result Status</label>
                      <select
                        value={bulkForm.defaultResultStatus}
                        onChange={e => setBulkForm({ ...bulkForm, defaultResultStatus: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 outline-none"
                      >
                        <option value="Passed">Passed</option>
                        <option value="First Class Distinction">First Class Distinction</option>
                        <option value="First Class">First Class</option>
                        <option value="Second Class">Second Class</option>
                        <option value="Passed with Compartment">Passed with Compartment</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Batch Remarks</label>
                    <textarea
                      rows="2"
                      value={bulkForm.graduationRemarks}
                      onChange={e => setBulkForm({ ...bulkForm, graduationRemarks: e.target.value })}
                      placeholder="e.g. Completed degree curriculum; promoted to alumni."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowBulkGraduateModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bulkSubmitting}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {bulkSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Graduating {selectedCandidateIds.length} Students...</span>
                        </>
                      ) : (
                        <>
                          <GraduationCap className="w-4 h-4" />
                          <span>Confirm Bulk Graduation ({selectedCandidateIds.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL: NO DUES CLEARANCE CERTIFICATE (NOC) */}
        <AnimatePresence>
          {showNocModal && nocStudent && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowNocModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8 print:m-0 print:p-0 print:border-none print:shadow-none"
              >
                {/* Actions Toolbar in Modal (Hidden when printing) */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Official No Dues Clearance Certificate</h3>
                      <p className="text-[11px] text-slate-500">Document Reference: NOC-{nocStudent.graduation?.passingYear || new Date().getFullYear()}-{nocStudent.admissionNo || nocStudent.studentId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Certificate</span>
                    </button>
                    <button
                      onClick={() => setShowNocModal(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Printable Certificate Body */}
                <div className="border-2 border-slate-800 p-6 sm:p-8 rounded-xl space-y-6 relative bg-white">
                  {/* Decorative Corner Seals */}
                  <div className="absolute top-2 left-2 text-[10px] text-slate-400 font-mono tracking-widest uppercase">Sri Sai Institutions</div>
                  <div className="absolute top-2 right-2 text-[10px] text-slate-400 font-mono tracking-widest uppercase">Office of Accounts</div>

                  {/* Header */}
                  <div className="text-center space-y-1.5 border-b-2 border-slate-800 pb-4 pt-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase font-serif">
                      Sri Sai Degree &amp; PG College
                    </h2>
                    <p className="text-xs text-slate-600 font-medium">
                      (Affiliated to Mahatma Gandhi University | Approved by Govt. of Telangana)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      College Campus, Station Road, Telangana · Phone: +91 98765 43210
                    </p>
                    <div className="pt-2">
                      <span className="inline-block px-4 py-1 bg-slate-900 text-white font-bold text-xs sm:text-sm tracking-wider uppercase rounded">
                        NO DUES CLEARANCE CERTIFICATE (NOC)
                      </span>
                    </div>
                  </div>

                  {/* Meta Bar */}
                  <div className="flex justify-between items-center text-xs font-mono text-slate-600 border-b border-slate-200 pb-2">
                    <span><strong>Ref No:</strong> NOC/{nocStudent.graduation?.passingYear || new Date().getFullYear()}/{nocStudent.admissionNo || nocStudent.studentId}</span>
                    <span><strong>Date:</strong> {formatDate(new Date())}</span>
                  </div>

                  {/* Body Paragraph */}
                  <div className="text-xs leading-relaxed text-slate-800 space-y-3 font-sans">
                    <p>
                      This is to certify that the student named below has completed all academic fee payments and financial requirements with this institution. There are <strong>NO OUTSTANDING DUES</strong> or pending fee liabilities of any kind recorded against this student.
                    </p>

                    {/* Student Info Box */}
                    <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs grid grid-cols-2 gap-y-2 gap-x-4">
                      <div>
                        <span className="text-slate-500 font-medium block">Student Name:</span>
                        <strong className="text-slate-900 text-sm">{nocStudent.name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Admission / Roll No:</span>
                        <strong className="text-slate-900 font-mono">{nocStudent.admissionNo || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Program / Course:</span>
                        <strong className="text-slate-900">{nocStudent.course} ({nocStudent.level || 'UG'})</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Specialization:</span>
                        <strong className="text-slate-900">{nocStudent.specialization || 'General'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Graduation Cohort:</span>
                        <strong className="text-slate-900 font-mono">Class of {nocStudent.graduation?.passingYear || 'Alumnus'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">University Reg No:</span>
                        <strong className="text-slate-900 font-mono">{nocStudent.graduation?.academicResult?.universityRegNo || 'N/A'}</strong>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="border border-slate-300 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                            <th className="py-2 px-3 text-left">Fee Head / Description</th>
                            <th className="py-2 px-3 text-right">Total Assessed</th>
                            <th className="py-2 px-3 text-right">Total Paid</th>
                            <th className="py-2 px-3 text-right">Net Balance Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          <tr>
                            <td className="py-2 px-3 text-slate-800">All Academic Semesters (Cumulative Course Fee)</td>
                            <td className="py-2 px-3 text-right">{formatCurrency(nocStudent.totalFee || 0)}</td>
                            <td className="py-2 px-3 text-right text-emerald-700 font-bold">{formatCurrency(nocStudent.totalPaid || 0)}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">₹0.00 (NIL)</td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr className="bg-emerald-50 text-emerald-900 font-bold border-t border-slate-300">
                            <td className="py-2 px-3">CLEARANCE STATUS</td>
                            <td colSpan="3" className="py-2 px-3 text-right text-emerald-800 font-sans tracking-wide uppercase">
                              ✓ ZERO BALANCE — FULLY CLEARED &amp; DISCHARGED
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <p className="text-[11px] text-slate-600 italic pt-1">
                      This certificate is issued on student request for the release of Transfer Certificate (TC), Original Marks Memos, Conduct Certificate, and Final Degree Convocation records.
                    </p>
                  </div>

                  {/* Signatures */}
                  <div className="pt-8 grid grid-cols-3 gap-4 text-center text-xs">
                    <div className="border-t border-slate-400 pt-2">
                      <p className="font-bold text-slate-800">Prepared By</p>
                      <p className="text-[10px] text-slate-500">Accounts Assistant</p>
                    </div>
                    <div className="border-t border-slate-400 pt-2">
                      <p className="font-bold text-slate-800">Verified By</p>
                      <p className="text-[10px] text-slate-500">Finance Officer</p>
                    </div>
                    <div className="border-t border-slate-400 pt-2">
                      <p className="font-bold text-slate-800">Principal</p>
                      <p className="text-[10px] text-slate-500">Sri Sai Degree &amp; PG College</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
