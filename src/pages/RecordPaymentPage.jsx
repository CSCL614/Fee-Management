import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency, getStatusColor, formatDate } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Search, CreditCard, CheckCircle2, User,
  Calendar, Hash, Receipt, Printer, RefreshCw, AlertCircle,
  FileText, ShieldCheck, Lock, Clock, ChevronRight, Loader2,
  X, Phone, BookOpen, GraduationCap, Check, Download, Layers,
  DollarSign, ArrowUpRight
} from 'lucide-react';
import { triggerPaymentConfetti, AnimatedCheckmark, pageVariants } from '../utils/animations';
import StudentAvatar from '../components/common/StudentAvatar';

export default function RecordPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Search & Student Selection
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Fee Data
  const [feeSummary, setFeeSummary] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');

  // Allocation & Form State
  const [isMultiCategory, setIsMultiCategory] = useState(false);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('');
  const [multiAllocations, setMultiAllocations] = useState({});

  const [form, setForm] = useState({
    amountPaid: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash',
    transactionId: '',
    remarks: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  // Student's recent payments history
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentPaymentsLoading, setRecentPaymentsLoading] = useState(false);

  // Initial Data Load
  useEffect(() => {
    api.get('/audit/academic-years').then(res => {
      const years = res.data.data || [];
      setAcademicYears(years);
    }).catch(() => {});

    const studentParam = searchParams.get('student');
    if (studentParam) {
      loadStudentDirectly(studentParam);
    }
  }, []);

  const loadStudentDirectly = async (studentId) => {
    try {
      const res = await api.get(`/students/${studentId}`);
      const s = res.data.data.student;
      selectStudent(s);
    } catch {
      toast.error('Could not load student record');
    }
  };

  // Instant Autocomplete Search
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 1) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/students/search?q=${encodeURIComponent(trimmed)}`);
        setSearchResults(res.data.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setSearch('');
    setSearchResults([]);
    setSelectedCategoryKey('');
    setIsMultiCategory(false);
    setMultiAllocations({});
    setForm(prev => ({ ...prev, amountPaid: '' }));

    // Fetch full fee summary across all years
    await loadStudentFeeSummary(student.studentId || student._id);
    fetchStudentPayments(student._id || student.studentId);
  };

  const loadStudentFeeSummary = async (studentId, preferredAY = null) => {
    try {
      const res = await api.get(`/students/${studentId}/fee-summary`);
      const summary = res.data.data;
      setFeeSummary(summary);

      const summaries = summary?.yearSummaries || [];
      // Pick target academic year: either preferredAY, or first year with pending balance, or current year
      let targetAY = preferredAY;
      if (!targetAY) {
        const dueYear = summaries.find(ys => ys.pending > 0);
        if (dueYear) {
          targetAY = dueYear.academicYear;
        } else if (summaries.length > 0) {
          targetAY = summaries[summaries.length - 1].academicYear;
        } else {
          targetAY = summary?.student?.currentAcademicYear || '';
        }
      }
      setSelectedAcademicYear(targetAY);

      // Auto-select first pending category in that target year
      const activeYearSummary = summaries.find(ys => ys.academicYear === targetAY);
      if (activeYearSummary) {
        const firstPendingCat = activeYearSummary.categories?.find(c => c.remainingAmount > 0) || activeYearSummary.categories?.[0];
        if (firstPendingCat) {
          setSelectedCategoryKey(`${firstPendingCat.category}|${firstPendingCat.semester || ''}`);
          setForm(prev => ({
            ...prev,
            amountPaid: firstPendingCat.remainingAmount > 0 ? firstPendingCat.remainingAmount.toString() : ''
          }));
        }
      }
    } catch {
      setFeeSummary(null);
    }
  };

  const fetchStudentPayments = async (idOrObjectId) => {
    setRecentPaymentsLoading(true);
    try {
      const res = await api.get(`/payments?studentId=${idOrObjectId}&limit=10`);
      setRecentPayments(res.data.data || []);
    } catch {
      setRecentPayments([]);
    } finally {
      setRecentPaymentsLoading(false);
    }
  };

  // Switch Academic Year
  const handleSelectAcademicYear = (ay) => {
    setSelectedAcademicYear(ay);
    setSelectedCategoryKey('');
    setIsMultiCategory(false);
    setMultiAllocations({});

    const yearSummary = feeSummary?.yearSummaries?.find(ys => ys.academicYear === ay);
    if (yearSummary) {
      const firstPendingCat = yearSummary.categories?.find(c => c.remainingAmount > 0) || yearSummary.categories?.[0];
      if (firstPendingCat) {
        setSelectedCategoryKey(`${firstPendingCat.category}|${firstPendingCat.semester || ''}`);
        setForm(prev => ({
          ...prev,
          amountPaid: firstPendingCat.remainingAmount > 0 ? firstPendingCat.remainingAmount.toString() : ''
        }));
      } else {
        setForm(prev => ({ ...prev, amountPaid: '' }));
      }
    }
  };

  // Switch Category
  const handleSelectCategory = (cat) => {
    const key = `${cat.category}|${cat.semester || ''}`;
    setSelectedCategoryKey(key);
    if (cat.remainingAmount > 0) {
      setForm(prev => ({ ...prev, amountPaid: cat.remainingAmount.toString() }));
    }
  };

  // Multi-Category Allocation change
  const handleMultiAllocationChange = (key, value) => {
    setMultiAllocations(prev => {
      const next = { ...prev, [key]: value };
      const sum = Object.values(next).reduce((total, v) => total + (parseFloat(v) || 0), 0);
      setForm(f => ({ ...f, amountPaid: sum > 0 ? sum.toString() : '' }));
      return next;
    });
  };

  const handleFillCategoryMax = (cat) => {
    const key = `${cat.category}|${cat.semester || ''}`;
    handleMultiAllocationChange(key, cat.remainingAmount.toString());
  };

  // Active Year Summary and Category Data
  const activeYearSummary = feeSummary?.yearSummaries?.find(
    ys => ys.academicYear === selectedAcademicYear
  ) || feeSummary?.currentYearSummary;

  const currentCategoryData = activeYearSummary?.categories?.find(c => {
    const key = `${c.category}|${c.semester || ''}`;
    return key === selectedCategoryKey;
  });

  // Submit Payment
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }
    if (!selectedAcademicYear) {
      toast.error('Please select an academic year');
      return;
    }

    const amt = parseFloat(form.amountPaid);
    if (!amt || isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid payment amount greater than zero');
      return;
    }

    let allocations = [];
    let primaryCategory = '';
    let semester = null;

    if (isMultiCategory) {
      allocations = Object.entries(multiAllocations)
        .filter(([_, val]) => parseFloat(val) > 0)
        .map(([key, val]) => {
          const [cat, sem] = key.split('|');
          return {
            category: cat,
            semester: sem || null,
            amount: parseFloat(val),
            academicYear: selectedAcademicYear
          };
        });

      if (allocations.length === 0) {
        toast.error('Please allocate amounts across categories');
        return;
      }

      const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
      if (Math.abs(totalAllocated - amt) > 0.01) {
        toast.error(`Total allocated (₹${totalAllocated}) must equal payment amount (₹${amt})`);
        return;
      }
      primaryCategory = allocations.map(a => a.category).join(', ');
    } else {
      if (!selectedCategoryKey) {
        toast.error('Please select a fee category');
        return;
      }
      const [cat, sem] = selectedCategoryKey.split('|');
      primaryCategory = cat;
      semester = sem || null;
      allocations = [{
        category: cat,
        semester: sem || null,
        amount: amt,
        academicYear: selectedAcademicYear
      }];
    }

    setSubmitting(true);
    try {
      const res = await api.post('/payments', {
        studentId: selectedStudent.studentId,
        academicYear: selectedAcademicYear,
        amountPaid: amt,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        transactionId: form.transactionId ? form.transactionId.trim() : '',
        remarks: form.remarks ? form.remarks.trim() : '',
        feeCategory: primaryCategory,
        semester,
        allocations
      });

      setSuccess(res.data.data);
      triggerPaymentConfetti();
      toast.success('Fee receipt voucher generated and posted!');

      // Refresh student summary and payments
      loadStudentFeeSummary(selectedStudent.studentId, selectedAcademicYear);
      fetchStudentPayments(selectedStudent._id || selectedStudent.studentId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReceiptPdf = async (paymentId, receiptNo) => {
    try {
      toast.loading('Downloading receipt...', { id: 'pdf-toast' });
      const res = await api.get(`/payments/${paymentId}/receipt`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Receipt_${receiptNo || 'Payment'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Official PDF receipt downloaded', { id: 'pdf-toast' });
    } catch {
      toast.error('Failed to download PDF receipt', { id: 'pdf-toast' });
    }
  };

  const handleResetTerminal = () => {
    setSuccess(null);
    setSelectedStudent(null);
    setFeeSummary(null);
    setSelectedCategoryKey('');
    setIsMultiCategory(false);
    setMultiAllocations({});
    setForm({
      amountPaid: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'Cash',
      transactionId: '',
      remarks: ''
    });
  };

  return (
    <div>
      <Topbar title="Fee Payment Terminal" />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 space-y-6"
      >
        {/* Terminal Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Collect Student Fee Payment
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant academic-year isolated fee collection and structured receipt generation
            </p>
          </div>

          {selectedStudent && (
            <button
              onClick={handleResetTerminal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Select Different Student
            </button>
          )}
        </div>

        {/* SECTION A: STUDENT SEARCH & SELECTION */}
        {!selectedStudent ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs max-w-3xl mx-auto space-y-4">
            <div className="text-center max-w-md mx-auto space-y-1">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-blue-100">
                <Search className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Find Student to Collect Payment</h2>
              <p className="text-xs text-slate-500">
                Type student name, admission number, roll number, or registered phone
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by student name, roll no, admission no, or mobile..."
                className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Instant Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-lg divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {searchResults.map(s => (
                  <div
                    key={s.studentId}
                    onClick={() => selectStudent(s)}
                    className="p-3.5 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase border border-slate-200">
                        {s.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {s.course} • {s.currentYear} • Adm: {s.admissionNo}
                          {s.rollNo ? ` • Roll: ${s.rollNo}` : ''}
                          {s.phone ? ` • 📞 ${s.phone}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(s.feeStatus)}`}>
                        {s.feeStatus}
                      </span>
                      <p className="text-xs font-mono font-bold text-rose-600 mt-0.5">
                        Due: {formatCurrency(s.totalPending)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {search && !searchLoading && searchResults.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-xs">
                No students found matching "{search}"
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE TERMINAL WORKSPACE */
          <div className="space-y-6">
            {/* Student Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <StudentAvatar
                    src={selectedStudent.profilePhoto}
                    name={selectedStudent.name}
                    size="lg"
                    className="w-14 h-14 rounded-2xl shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight">{selectedStudent.name}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(selectedStudent.status)}`}>
                        {selectedStudent.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium mt-1">
                      <span>Adm: <strong className="text-slate-700 font-mono">{selectedStudent.admissionNo}</strong></span>
                      {selectedStudent.rollNo && (
                        <>
                          <span>•</span>
                          <span>Roll: <strong className="text-slate-700 font-mono">{selectedStudent.rollNo}</strong></span>
                        </>
                      )}
                      <span>•</span>
                      <span>{selectedStudent.course}</span>
                      <span>•</span>
                      <span>{selectedStudent.currentYear}</span>
                      {selectedStudent.batch && (
                        <>
                          <span>•</span>
                          <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">Batch {selectedStudent.batch}</span>
                        </>
                      )}
                    </div>

                    {/* Mobile number with clickable tel link */}
                    <div className="flex items-center gap-1 text-xs text-emerald-700 mt-2 font-medium">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {selectedStudent.phone ? (
                        <a href={`tel:${selectedStudent.phone}`} className="hover:underline font-mono">
                          {selectedStudent.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Mobile: Not Provided</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overall Net Balance Badge */}
                <div className="flex items-center gap-3 self-start md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Overall Net Dues</span>
                    <span className="text-lg font-bold font-mono text-rose-600">
                      {formatCurrency(feeSummary?.overall?.totalPending ?? 0)}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 font-bold">
                    ₹
                  </div>
                </div>
              </div>
            </div>

            {/* MAIN TWO-COLUMN WORKFLOW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* LEFT COLUMN: SECTIONS B, C, D, E */}
              <div className="lg:col-span-2 space-y-6">

                {/* SECTION B: ACADEMIC YEAR SELECTION (ISOLATED) */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        Step 1: Select Academic Year
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Choose the exact academic session this payment is allocated for. Fees remain 100% separate across years.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(feeSummary?.yearSummaries || []).map((ys) => {
                      const isSelected = selectedAcademicYear === ys.academicYear;
                      return (
                        <div
                          key={ys.academicYear}
                          onClick={() => handleSelectAcademicYear(ys.academicYear)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                              : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{ys.academicYear}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${getStatusColor(ys.status)}`}>
                              {ys.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{ys.year}</p>

                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1 text-[11px]">
                            <div className="flex justify-between text-slate-500">
                              <span>Assessed:</span>
                              <span className="font-mono font-semibold text-slate-700">{formatCurrency(ys.currentYearFee)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-700">
                              <span>Paid:</span>
                              <span className="font-mono font-semibold">{formatCurrency(ys.totalPaid)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-rose-600">
                              <span>Pending:</span>
                              <span className="font-mono">{formatCurrency(ys.pending)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION C: FEE CATEGORY SELECTION */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        Step 2: Fee Category Allocation ({selectedAcademicYear})
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Select a single category or split this transaction across multiple fee heads.
                      </p>
                    </div>

                    {/* Mode Toggle */}
                    <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setIsMultiCategory(false)}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          !isMultiCategory ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Single Category
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMultiCategory(true);
                          setMultiAllocations({});
                        }}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          isMultiCategory ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Split Multiple
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Single Category Table */}
                  {!isMultiCategory ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Fee Category</th>
                            <th className="py-2.5 px-3 text-right">Assessed</th>
                            <th className="py-2.5 px-3 text-right">Paid</th>
                            <th className="py-2.5 px-3 text-right">Pending Due</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(activeYearSummary?.categories || []).map((cat, idx) => {
                            const key = `${cat.category}|${cat.semester || ''}`;
                            const isSelected = selectedCategoryKey === key;
                            return (
                              <tr
                                key={idx}
                                onClick={() => handleSelectCategory(cat)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected ? 'bg-blue-50/60 font-semibold' : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                                    }`}>
                                      {isSelected && <Check className="w-2.5 h-2.5" />}
                                    </div>
                                    <div>
                                      <span className="text-slate-900 font-bold">{cat.category}</span>
                                      {cat.semester && (
                                        <span className="ml-1.5 px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded text-[9.5px] font-mono">
                                          {cat.semester}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatCurrency(cat.amount)}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{formatCurrency(cat.paidAmount)}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">{formatCurrency(cat.remainingAmount)}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectCategory(cat);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    {isSelected ? 'Selected' : 'Select'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Mode 2: Multi-Category Split Allocator */
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600">
                        Specify the exact payment distribution for each category. Sum will be automatically verified.
                      </p>
                      <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                        {(activeYearSummary?.categories || []).map((cat, idx) => {
                          const key = `${cat.category}|${cat.semester || ''}`;
                          const val = multiAllocations[key] || '';
                          return (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg gap-2 text-xs">
                              <div>
                                <span className="font-bold text-slate-800">{cat.category}</span>
                                {cat.semester && <span className="ml-1 px-1 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">{cat.semester}</span>}
                                <span className="block text-[11px] text-slate-400">
                                  Due: <strong className="text-rose-600 font-mono">₹{cat.remainingAmount?.toLocaleString('en-IN')}</strong>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {cat.remainingAmount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleFillCategoryMax(cat)}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                                  >
                                    Full Due
                                  </button>
                                )}
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={val}
                                    onChange={e => handleMultiAllocationChange(key, e.target.value)}
                                    className="w-28 pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg font-mono font-bold text-right text-xs focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION D: PAYMENT ENTRY FORM */}
                <form onSubmit={handleSubmitPayment} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                  <div className="pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                      Step 3: Payment Details & Instrument
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Amount Input */}
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-1">
                        Amount to Pay (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          step="any"
                          required
                          min="1"
                          readOnly={isMultiCategory}
                          value={form.amountPaid}
                          onChange={e => setForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                          placeholder="e.g. 5000"
                          className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl font-mono font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                      {currentCategoryData && !isMultiCategory && currentCategoryData.remainingAmount > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, amountPaid: currentCategoryData.remainingAmount.toString() }))}
                            className="text-[10px] text-blue-600 hover:underline font-semibold"
                          >
                            Fill exact remaining due (₹{currentCategoryData.remainingAmount.toLocaleString('en-IN')})
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Payment Mode */}
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-1">
                        Payment Method *
                      </label>
                      <select
                        value={form.paymentMode}
                        onChange={e => setForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Date */}
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-1">
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={form.paymentDate}
                        onChange={e => setForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    {/* Transaction Reference Number */}
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-1">
                        Transaction Ref / UTR / Cheque No
                      </label>
                      <input
                        type="text"
                        value={form.transactionId}
                        onChange={e => setForm(prev => ({ ...prev, transactionId: e.target.value }))}
                        placeholder="e.g. UTR123456789 or Cheque 004812"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="text-xs">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-1">
                      Remarks / Cashier Notes (Optional)
                    </label>
                    <textarea
                      rows="2"
                      value={form.remarks}
                      onChange={e => setForm(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Add any additional notes for this receipt..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs tracking-wider uppercase"
                    >
                      <Lock className="w-4 h-4" />
                      {submitting ? 'Generating Receipt Voucher...' : 'Confirm & Record Fee Payment'}
                    </button>
                  </div>
                </form>

              </div>

              {/* RIGHT COLUMN: SECTION F: LIVE SUMMARY PANEL */}
              <div className="space-y-4 lg:sticky lg:top-20">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 text-xs">
                  <div className="pb-2.5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 uppercase tracking-wider">Payment Summary</h3>
                    <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Session {selectedAcademicYear}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Assessed Fee ({selectedAcademicYear})</span>
                      <span className="font-mono font-semibold text-slate-800">{formatCurrency(activeYearSummary?.currentYearFee ?? 0)}</span>
                    </div>

                    <div className="flex justify-between text-emerald-700">
                      <span>Already Credited</span>
                      <span className="font-mono font-semibold">{formatCurrency(activeYearSummary?.totalPaid ?? 0)}</span>
                    </div>

                    <div className="flex justify-between text-rose-600 font-bold border-t border-slate-100 pt-1.5">
                      <span>Current Outstanding Due</span>
                      <span className="font-mono">{formatCurrency(activeYearSummary?.pending ?? 0)}</span>
                    </div>

                    {form.amountPaid && parseFloat(form.amountPaid) > 0 && (
                      <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl space-y-1.5 mt-2">
                        <div className="flex justify-between font-bold text-blue-900">
                          <span>Payment Entering</span>
                          <span className="font-mono text-sm">{formatCurrency(parseFloat(form.amountPaid))}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-blue-700">
                          <span>Post-Payment Due ({selectedAcademicYear})</span>
                          <span className="font-mono font-bold">
                            {formatCurrency(Math.max(0, (activeYearSummary?.pending ?? 0) - parseFloat(form.amountPaid)))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Allocation Details Preview */}
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1.5">
                      Selected Target Allocation
                    </span>
                    {!isMultiCategory ? (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-800 block">
                          {currentCategoryData?.category || 'No Category Selected'}
                        </span>
                        {currentCategoryData?.semester && (
                          <span className="text-[10px] font-mono text-blue-600">{currentCategoryData.semester}</span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {Object.entries(multiAllocations).filter(([_, v]) => parseFloat(v) > 0).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-[11px] py-1 px-2 bg-slate-50 rounded">
                            <span className="text-slate-700">{k.split('|')[0]}</span>
                            <span className="font-mono font-bold text-slate-900">{formatCurrency(parseFloat(v))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSubmitPayment}
                      disabled={submitting || !form.amountPaid || parseFloat(form.amountPaid) <= 0}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-xs text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Record Voucher
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* SECTION H: RECENT PAYMENT HISTORY FOR THIS STUDENT */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Recent Payments for {selectedStudent.name}
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-500">{recentPayments.length} transactions</span>
              </div>

              {recentPaymentsLoading ? (
                <div className="py-6 text-center text-slate-400 text-xs">Loading transaction records...</div>
              ) : recentPayments.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">No prior payments recorded for this student.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2 px-3">Receipt No</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Session</th>
                        <th className="py-2 px-3">Fee Category</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                        <th className="py-2 px-3">Method</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentPayments.map(p => (
                        <tr key={p._id || p.receiptNo} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{p.receiptNo}</td>
                          <td className="py-2.5 px-3 text-slate-600">{formatDate(p.paymentDate)}</td>
                          <td className="py-2.5 px-3 font-mono">{p.academicYear}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{p.feeCategory || 'Tuition Fee'}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(p.amountPaid)}</td>
                          <td className="py-2.5 px-3 text-slate-600">{p.paymentMode}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold border ${getStatusColor(p.status)}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => downloadReceiptPdf(p._id, p.receiptNo)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              <Download className="w-3 h-3" /> PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* SECTION G: PAYMENT SUCCESS VOUCHER MODAL */}
        <AnimatePresence>
          {success && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
                onClick={() => setSuccess(null)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                className="relative bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-lg w-full p-6 z-10 space-y-4"
              >
                <div className="text-center space-y-1">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-emerald-100">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Fee Receipt Issued Successfully</h3>
                  <p className="text-xs text-slate-500 font-mono">Receipt No: <strong className="text-blue-700 text-sm">{success.payment?.receiptNo}</strong></p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Student:</span>
                    <span className="font-bold text-slate-900">{selectedStudent.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Admission No:</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedStudent.admissionNo}</span>
                  </div>
                  {selectedStudent.rollNo && (
                    <div className="flex justify-between text-slate-600">
                      <span>Roll No:</span>
                      <span className="font-mono font-semibold text-slate-800">{selectedStudent.rollNo}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Course:</span>
                    <span className="font-semibold text-slate-800">{selectedStudent.course}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Academic Session:</span>
                    <span className="font-mono font-semibold text-slate-800">{success.payment?.academicYear}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Method / Channel:</span>
                    <span className="font-semibold text-slate-800">{success.payment?.paymentMode}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-emerald-800 text-sm">
                    <span>Amount Collected:</span>
                    <span className="font-mono text-base">{formatCurrency(success.payment?.amountPaid)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => downloadReceiptPdf(success.payment?._id, success.payment?.receiptNo)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Receipt
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => navigate(`/students/${selectedStudent.studentId || selectedStudent._id}`)}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    View Student Profile →
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuccess(null)}
                    className="text-slate-600 hover:text-slate-900 font-semibold"
                  >
                    Collect Another Payment
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
