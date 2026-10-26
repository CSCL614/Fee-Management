import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency, getStatusColor, formatDate } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Search, CreditCard, CheckCircle2, User,
  Calendar, Hash, Receipt, Printer, RefreshCw, AlertCircle,
  FileText, ShieldCheck, Lock, Clock, ChevronRight, Loader2
} from 'lucide-react';
import { triggerPaymentConfetti, AnimatedCheckmark, pageVariants } from '../utils/animations';

export default function RecordPaymentPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feeSummary, setFeeSummary] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [configuredCategories, setConfiguredCategories] = useState([]);
  const [selectedFeeCategoryKey, setSelectedFeeCategoryKey] = useState('');
  const [isSplitAllocation, setIsSplitAllocation] = useState(false);
  const [splitAllocations, setSplitAllocations] = useState({});
  const [form, setForm] = useState({
    academicYear: '',
    amountPaid: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash',
    transactionId: '',
    remarks: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/audit/academic-years'),
      api.get('/fees/categories')
    ]).then(([ayRes, catRes]) => {
      const years = ayRes.data.data || [];
      setAcademicYears(years);
      setConfiguredCategories(catRes.data.data || []);
      const current = years.find(y => y.isCurrent);
      if (current) setForm(prev => ({ ...prev, academicYear: current.year }));
    }).catch(() => {});

    const studentId = searchParams.get('student');
    if (studentId) {
      api.get(`/students/${studentId}`).then(res => {
        const s = res.data.data.student;
        setSelectedStudent(s);
        loadFeeSummary(s.studentId, form.academicYear || s.currentAcademicYear);
      });
    }
  }, []);

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await api.get(`/students/search?q=${q}`);
      setSearchResults(res.data.data || []);
    } catch { setSearchResults([]); }
  };

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setSearch('');
    setSelectedFeeCategoryKey('');
    setIsSplitAllocation(false);
    setSplitAllocations({});
    loadFeeSummary(student.studentId, form.academicYear || student.currentAcademicYear);
  };

  const loadFeeSummary = async (studentId, ay) => {
    try {
      const res = await api.get(`/students/${studentId}/fee-summary${ay ? `?academicYear=${ay}` : ''}`);
      const summary = res.data.data;
      setFeeSummary(summary);
      const cats = summary?.currentYearSummary?.categories || [];
      const firstDue = cats.find(c => c.remainingAmount > 0) || cats[0];
      if (firstDue) {
        setSelectedFeeCategoryKey(`${firstDue.category}|${firstDue.semester || ''}`);
      }
    } catch {
      setFeeSummary(null);
    }
  };

  const handleAcademicYearChange = (ay) => {
    setForm(prev => ({ ...prev, academicYear: ay }));
    if (selectedStudent) loadFeeSummary(selectedStudent.studentId, ay);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) { toast.error('Please select a student'); return; }
    const amt = parseFloat(form.amountPaid);
    if (!amt || amt <= 0) { toast.error('Please enter a valid amount'); return; }
    if (!form.academicYear) { toast.error('Please select an academic year'); return; }

    let allocations = [];
    let feeCategory = '';
    let semester = null;

    if (isSplitAllocation) {
      allocations = Object.entries(splitAllocations)
        .filter(([_, a]) => parseFloat(a) > 0)
        .map(([key, a]) => {
          const [cat, sem] = key.split('|');
          return {
            category: cat,
            semester: sem || null,
            amount: parseFloat(a),
            academicYear: form.academicYear
          };
        });

      if (allocations.length === 0) {
        toast.error('Please allocate amounts across categories');
        return;
      }

      const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
      if (Math.abs(totalAllocated - amt) > 0.01) {
        toast.error(`The amount allocated across categories (₹${totalAllocated}) must equal the total receipt amount (₹${amt}).`);
        return;
      }
      feeCategory = allocations.map(a => a.category).join(', ');
    } else {
      if (!selectedFeeCategoryKey) {
        toast.error('Please select a fee category');
        return;
      }
      const [cat, sem] = selectedFeeCategoryKey.split('|');
      feeCategory = cat;
      semester = sem || null;
      allocations = [{
        category: cat,
        semester: sem || null,
        amount: amt,
        academicYear: form.academicYear
      }];
    }

    setSubmitting(true);
    try {
      const res = await api.post('/payments', {
        studentId: selectedStudent.studentId,
        academicYear: form.academicYear,
        amountPaid: amt,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        transactionId: form.transactionId,
        remarks: form.remarks,
        feeCategory,
        semester,
        allocations
      });
      setSuccess(res.data.data);
      triggerPaymentConfetti();
      toast.success('Payment recorded successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Payment Confirmation Success Screen
  if (success) {
    const payment = success.payment;
    const summary = success.feeSummary;
    return (
      <div>
        <Topbar title="Payment Recorded" />
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 text-center"
          >
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AnimatedCheckmark size={44} color="#10B981" />
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Fee Receipt Voucher Issued</h2>
            <p className="text-xs text-slate-500 mt-1">Transaction has been permanently committed to the fee ledger</p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-semibold my-4">
              <Lock className="w-3 h-3 text-amber-600" />
              <span>Audit Status: LOCKED (One-Time Voucher)</span>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-5 mb-6 text-left space-y-3">
              <div className="text-center pb-2.5 border-b border-slate-200/80">
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                  SRI SAI DEGREE & PG COLLEGE
                </h3>
                <p className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                  VIZIANAGARAM · ANDHRA PRADESH
                </p>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Receipt Voucher No</span>
                <span className="font-mono font-bold text-blue-700 text-sm">{payment.receiptNo}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Student Name</span>
                <span className="font-semibold text-slate-800">{selectedStudent.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Admission / Student ID</span>
                <span className="font-mono text-slate-700">{selectedStudent.admissionNo || selectedStudent.studentId}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Academic Session</span>
                <span className="font-mono font-medium text-slate-700">{payment.academicYear}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Payment Instrument</span>
                <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200/70">{payment.paymentMode}</span>
              </div>
              {payment.feeCategory && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Fee Category</span>
                  <span className="font-semibold text-blue-700">{payment.feeCategory}</span>
                </div>
              )}
              {payment.allocations && payment.allocations.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold mb-1">
                    Category Allocation Breakdown
                  </span>
                  <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-200/80">
                    {payment.allocations.map((alloc, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-slate-700">
                          {alloc.category} {alloc.semester ? `(${alloc.semester})` : ''}
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(alloc.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/60">
                <span className="text-emerald-700 font-bold uppercase tracking-wider">Amount Collected</span>
                <span className="font-mono font-bold text-base text-emerald-700">{formatCurrency(payment.amountPaid)}</span>
              </div>
              {summary?.currentYearSummary && (
                <div className="flex justify-between items-center text-xs pt-2 border-t border-dashed border-slate-200/80">
                  <span className="text-slate-500 font-medium">Remaining Active Due</span>
                  <span className="font-mono font-bold text-rose-600">{formatCurrency(summary.currentYearSummary.pending)}</span>
                </div>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-500" /> Print Voucher
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/students/${selectedStudent.studentId}`)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-500" /> Student Profile
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSuccess(null);
                  setSelectedStudent(null);
                  setFeeSummary(null);
                  setSelectedFeeCategoryKey('');
                  setIsSplitAllocation(false);
                  setSplitAllocations({});
                  setForm({
                    academicYear: form.academicYear,
                    amountPaid: '',
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentMode: 'Cash',
                    transactionId: '',
                    remarks: ''
                  });
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Next Payment
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentSummary = feeSummary?.currentYearSummary;
  const remainingCalculated = currentSummary ? Math.max(0, currentSummary.pending - (parseFloat(form.amountPaid) || 0)) : 0;

  return (
    <div>
      <Topbar title="Record Payment" />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 space-y-5"
      >
        
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Previous Screen
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Payment Form Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-6">
            <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Fee Receipt Entry Terminal</h2>
                <p className="text-xs text-slate-500">Record cashier collections with immediate ledger posting</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Student Lookup */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Student *
                </label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                        {selectedStudent.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-950">{selectedStudent.name}</p>
                        <p className="text-[11px] text-blue-800 font-mono">
                          {selectedStudent.admissionNo || selectedStudent.studentId} • {selectedStudent.course} • {selectedStudent.currentYear}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedStudent(null); setFeeSummary(null); }}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Change Student
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => handleSearch(e.target.value)}
                      placeholder="Search student by name, student ID, roll no, admission no..."
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute top-full mt-1.5 w-full bg-white rounded-xl shadow-xl border border-slate-200 max-h-64 overflow-y-auto z-30">
                        {searchResults.map(s => (
                          <div
                            key={s.studentId}
                            onClick={() => selectStudent(s)}
                            className="px-4 py-3 hover:bg-blue-50/50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                          >
                            <p className="text-xs font-bold text-slate-800">{s.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {s.admissionNo} • {s.course} • {s.currentYear}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Academic Session *
                  </label>
                  <select
                    value={form.academicYear}
                    onChange={e => handleAcademicYearChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
                  >
                    <option value="">Select Academic Year</option>
                    {academicYears.map(y => (
                      <option key={y.year} value={y.year}>
                        {y.year} {y.isCurrent ? '(Active Current Session)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Receipt Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={form.amountPaid}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, amountPaid: val }));
                      // If single category selected and not split, allocations are auto 1:1
                    }}
                    placeholder="Enter collected amount"
                    min="1"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Fee Category Allocation Section */}
              <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Fee Category Allocation *
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Select target fee demand from student's active schedule
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isSplitAllocation;
                      setIsSplitAllocation(next);
                      if (next && currentSummary?.categories) {
                        // initialize split allocations with current amount or empty
                        const initial = {};
                        currentSummary.categories.forEach(c => {
                          const key = `${c.category}|${c.semester || ''}`;
                          initial[key] = '';
                        });
                        setSplitAllocations(initial);
                      }
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-all ${
                      isSplitAllocation
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSplitAllocation ? '✓ Split Mode Active' : '+ Split Across Categories'}
                  </button>
                </div>

                {!isSplitAllocation ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Select Fee Category
                    </label>
                    <select
                      value={selectedFeeCategoryKey}
                      onChange={e => {
                        const key = e.target.value;
                        setSelectedFeeCategoryKey(key);
                        // Auto-fill outstanding amount for convenience if amount is empty
                        if (currentSummary?.categories) {
                          const matched = currentSummary.categories.find(
                            c => `${c.category}|${c.semester || ''}` === key
                          );
                          if (matched && matched.remainingAmount > 0 && !form.amountPaid) {
                            setForm(prev => ({ ...prev, amountPaid: matched.remainingAmount.toString() }));
                          }
                        }
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-semibold"
                    >
                      <option value="">-- Choose Category --</option>
                      {/* Applicable categories from student demands */}
                      {currentSummary?.categories?.map((cat, idx) => (
                        <option
                          key={`cat-${idx}`}
                          value={`${cat.category}|${cat.semester || ''}`}
                        >
                          {cat.category} {cat.semester ? `(${cat.semester})` : ''} — Outstanding Due: ₹{cat.remainingAmount?.toLocaleString('en-IN') ?? 0} (Assessed: ₹{cat.amount?.toLocaleString('en-IN') ?? 0})
                        </option>
                      ))}
                      {/* Fallback to configured categories if not yet in demand */}
                      {configuredCategories
                        ?.filter(c => !currentSummary?.categories?.some(sc => sc.category === c.name))
                        .map(c => (
                          <option key={`cfg-${c.name}`} value={`${c.name}|`}>
                            {c.name} (General / Unassessed)
                          </option>
                        ))}
                    </select>

                    {/* Active Selected Category Summary Card */}
                    {selectedFeeCategoryKey && (() => {
                      const [catName, catSem] = selectedFeeCategoryKey.split('|');
                      const catData = currentSummary?.categories?.find(
                        c => c.category === catName && (c.semester || '') === catSem
                      );
                      const catAssessed = catData?.amount || 0;
                      const catPaid = catData?.paidAmount || 0;
                      const catDue = catData?.remainingAmount || 0;
                      const enteredAmount = parseFloat(form.amountPaid) || 0;
                      const postPaymentDue = Math.max(0, catDue - enteredAmount);

                      return (
                        <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                            <div>
                              <span className="font-bold text-slate-900">{catName}</span>
                              {catSem && <span className="ml-1.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-mono font-bold">{catSem}</span>}
                            </div>
                            {catDue > 0 && (
                              <button
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, amountPaid: catDue.toString() }))}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                              >
                                Auto-fill Due (₹{catDue.toLocaleString('en-IN')})
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-xs">
                            <div className="p-1.5 bg-slate-50 rounded-lg">
                              <span className="text-[10px] text-slate-500 uppercase block">Assessed Fee</span>
                              <span className="font-mono font-bold text-slate-700">₹{catAssessed.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-lg">
                              <span className="text-[10px] text-slate-500 uppercase block">Paid So Far</span>
                              <span className="font-mono font-bold text-emerald-600">₹{catPaid.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="p-1.5 bg-amber-50/70 border border-amber-200/50 rounded-lg">
                              <span className="text-[10px] text-amber-800 uppercase block">Current Due</span>
                              <span className="font-mono font-bold text-amber-700">₹{catDue.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="p-1.5 bg-blue-50/70 border border-blue-200/50 rounded-lg">
                              <span className="text-[10px] text-blue-800 uppercase block">Post Payment Due</span>
                              <span className="font-mono font-bold text-blue-700">₹{postPaymentDue.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* Multi-Category Split Allocation Controls */
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-slate-600">
                      Enter the exact portion of payment allocated toward each fee category. The sum must match Receipt Amount.
                    </p>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {currentSummary?.categories?.map((cat, idx) => {
                        const key = `${cat.category}|${cat.semester || ''}`;
                        const allocatedVal = splitAllocations[key] || '';
                        return (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl gap-2 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">{cat.category}</span>
                                {cat.semester && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                    {cat.semester}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10.5px] text-slate-500">
                                Outstanding Due: <strong className="text-amber-700 font-mono">₹{cat.remainingAmount?.toLocaleString('en-IN') ?? 0}</strong> (Assessed: ₹{cat.amount?.toLocaleString('en-IN') ?? 0})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {cat.remainingAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSplitAllocations(prev => {
                                      const next = { ...prev, [key]: cat.remainingAmount.toString() };
                                      const total = Object.values(next).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                                      setForm(f => ({ ...f, amountPaid: total ? total.toString() : f.amountPaid }));
                                      return next;
                                    });
                                  }}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold"
                                >
                                  Full Due
                                </button>
                              )}
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={allocatedVal}
                                  placeholder="0"
                                  onChange={e => {
                                    const val = e.target.value;
                                    setSplitAllocations(prev => {
                                      const next = { ...prev, [key]: val };
                                      const total = Object.values(next).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                                      setForm(f => ({ ...f, amountPaid: total ? total.toString() : f.amountPaid }));
                                      return next;
                                    });
                                  }}
                                  className="w-28 pl-6 pr-2.5 py-1.5 border border-slate-200 rounded-lg font-mono font-bold text-right text-xs focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Split Allocation Balance Bar */}
                    {(() => {
                      const totalAllocated = Object.values(splitAllocations).reduce(
                        (s, v) => s + (parseFloat(v) || 0),
                        0
                      );
                      const receiptAmt = parseFloat(form.amountPaid) || 0;
                      const diff = receiptAmt - totalAllocated;
                      const isMatch = Math.abs(diff) < 0.01 && totalAllocated > 0;

                      return (
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          isMatch
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                          <span className="font-semibold">
                            Total Allocated: <strong className="font-mono">₹{totalAllocated.toLocaleString('en-IN')}</strong> / Receipt: <strong className="font-mono">₹{receiptAmt.toLocaleString('en-IN')}</strong>
                          </span>
                          <span className="font-bold text-[11px]">
                            {isMatch ? '✓ Fully Matched' : diff > 0 ? `₹${diff.toLocaleString('en-IN')} Unallocated` : `₹${Math.abs(diff).toLocaleString('en-IN')} Overallocated`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    value={form.paymentDate}
                    onChange={e => setForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Instrument / Channel *
                  </label>
                  <select
                    value={form.paymentMode}
                    onChange={e => setForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
                  >
                    {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Voucher / UTR / Cheque Reference Number
                </label>
                <input
                  type="text"
                  value={form.transactionId}
                  onChange={e => setForm(prev => ({ ...prev, transactionId: e.target.value }))}
                  placeholder="e.g. UPI / UTR ref no, NEFT Txn ID, or Bank Cheque serial..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Internal Remarks & Audit Notes
                </label>
                <textarea
                  value={form.remarks}
                  onChange={e => setForm(prev => ({ ...prev, remarks: e.target.value }))}
                  rows="2"
                  placeholder="Optional audit notes or fee concessions..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none text-slate-800"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !selectedStudent}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  {submitting ? 'Posting Voucher...' : 'Generate Receipt & Post to Ledger'}
                </button>
              </div>
            </form>
          </div>

          {/* Fee Breakdown & Real-Time Calculation Sidebar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-6 h-fit lg:sticky lg:top-20 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Demand Summary</h3>
              <p className="text-[11px] text-slate-500">Live ledger dues for the selected session</p>
            </div>

            {!selectedStudent ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                Select a student to inspect current balance and dues
              </div>
            ) : !currentSummary ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No assessed fee demand for session {form.academicYear || 'selected'}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Current Session Demands</span>
                    <span className="font-mono font-medium text-slate-800">{formatCurrency(currentSummary.currentYearFee)}</span>
                  </div>
                  {currentSummary.previousYearDue > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>Arrears / Previous Due</span>
                      <span className="font-mono font-semibold">{formatCurrency(currentSummary.previousYearDue)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200/80 pt-2 flex justify-between font-bold text-slate-900">
                    <span>Total Assessed</span>
                    <span className="font-mono">{formatCurrency(currentSummary.totalPayable)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Already Received</span>
                    <span className="font-mono">{formatCurrency(currentSummary.totalPaid)}</span>
                  </div>
                  
                  {form.amountPaid && parseFloat(form.amountPaid) > 0 && (
                    <div className="flex justify-between text-blue-600 font-bold bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                      <span>Voucher Amount Entering</span>
                      <span className="font-mono">{formatCurrency(parseFloat(form.amountPaid))}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200/80 pt-2 flex justify-between font-bold text-sm">
                    <span className="text-rose-600">Post-Payment Due</span>
                    <span className="font-mono text-rose-600">{formatCurrency(remainingCalculated)}</span>
                  </div>

                  <div className="pt-1">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusColor(currentSummary.status)}`}>
                      Status: {currentSummary.status}
                    </span>
                  </div>
                </div>

                {/* Active Fee Categories List */}
                {currentSummary.activeCategories?.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Active Fee Breakdown</h4>
                    <div className="space-y-1.5">
                      {currentSummary.activeCategories.map((cat, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs py-1.5 px-2 bg-slate-50 rounded-lg">
                          <div>
                            <span className="font-semibold text-slate-700">{cat.category}</span>
                            {cat.semester && <span className="text-blue-600 text-[10px] ml-1 font-mono">({cat.semester})</span>}
                          </div>
                          <span className="font-mono font-bold text-slate-800">{formatCurrency(cat.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Scheduled Fees */}
                {currentSummary.upcomingCategories?.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Scheduled Fees
                      </h4>
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">Pending date</span>
                    </div>
                    <div className="space-y-1.5">
                      {currentSummary.upcomingCategories.map((cat, idx) => (
                        <div key={idx} className="p-2 bg-amber-50/50 border border-amber-200/60 rounded-lg text-xs flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-slate-800">{cat.category}</p>
                            <p className="text-[10px] text-amber-700">
                              {cat.semester ? `${cat.semester} • ` : ''}
                              Activates {cat.activationDate ? new Date(cat.activationDate).toLocaleDateString() : 'Scheduled'}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-slate-600">{formatCurrency(cat.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}
