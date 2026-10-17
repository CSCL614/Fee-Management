import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CreditCard, Mail, Download, User, Phone, AtSign, BookOpen,
  GraduationCap, Calendar, ArrowLeft, Edit, ShieldCheck, Lock,
  AlertCircle, Receipt, FileText, CheckCircle2, History, AlertTriangle, X
} from 'lucide-react';
import { modalVariants, backdropVariants, pageVariants } from '../utils/animations';

export default function StudentProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fee-summary');
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Admin Payment Edit / Cancel Modal state
  const [actionModal, setActionModal] = useState(null); // { type: 'edit'|'cancel', payment }
  const [reason, setReason] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  useEffect(() => { fetchStudent(); }, [id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && actionModal) {
        setActionModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actionModal]);

  const fetchStudent = async () => {
    try {
      const res = await api.get(`/students/${id}`);
      setData(res.data.data);
    } catch { toast.error('Failed to load student'); }
    finally { setLoading(false); }
  };

  const handleAdminAction = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Reason is mandatory for modifying or cancelling payments');
      return;
    }

    setModalSubmitting(true);
    try {
      if (actionModal.type === 'cancel') {
        await api.patch(`/payments/${actionModal.payment._id || actionModal.payment.paymentId}/cancel`, { reason });
        toast.success('Payment cancelled successfully');
      } else if (actionModal.type === 'edit') {
        await api.put(`/payments/${actionModal.payment._id || actionModal.payment.paymentId}`, {
          amountPaid: parseFloat(editAmount),
          reason
        });
        toast.success('Payment updated successfully');
      }
      setActionModal(null);
      setReason('');
      setEditAmount('');
      fetchStudent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setModalSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Topbar title="Student Profile" />
        <div className="p-4 sm:p-6 space-y-6 animate-pulse">
          <div className="h-6 w-32 skeleton rounded" />
          <div className="h-48 bg-white rounded-2xl border border-slate-200/80 p-6 skeleton" />
          <div className="h-64 bg-white rounded-2xl border border-slate-200/80 p-6 skeleton" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Topbar title="Student Profile" />
        <div className="p-12 text-center text-slate-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          Student record not found
        </div>
      </div>
    );
  }

  const { student, feeSummary, feeLedger } = data;
  const overall = feeSummary?.overall || {};
  const yearSummaries = feeSummary?.yearSummaries || [];

  const tabs = [
    { id: 'fee-summary', label: 'Fee Demands & Structure', icon: BookOpen },
    { id: 'payment-history', label: 'Payment Receipts', icon: Receipt },
    { id: 'fee-ledger', label: 'Account Ledger', icon: History },
    { id: 'details', label: 'Academic & Personal Info', icon: User },
  ];

  return (
    <div>
      <Topbar title={`${student.name} (${student.studentId})`} />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 space-y-6"
      >
        
        {/* Navigation Breadcrumb back button */}
        <button
          onClick={() => navigate('/students')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Student Directory
        </button>

        {/* Student Dossier Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 border border-blue-200/70 text-blue-700 flex items-center justify-center font-bold text-xl uppercase shrink-0">
                {student.name.charAt(0)}
              </div>
              
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{student.name}</h1>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(overall.status || student.status)}`}>
                    {overall.status || student.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                  <span className="font-mono text-slate-700 font-semibold">ID: {student.studentId}</span>
                  <span>•</span>
                  <span>Adm No: <strong className="text-slate-700 font-mono">{student.admissionNo}</strong></span>
                  {student.batch && (
                    <>
                      <span>•</span>
                      <span className="font-mono font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">Batch {student.batch}</span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-slate-500" /> {student.course}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${student.level === 'PG' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    {student.level}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-500" /> {student.currentYear}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> {student.currentAcademicYear}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
              <button
                onClick={() => navigate(`/record-payment?student=${student.studentId}`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
              >
                <CreditCard className="w-4 h-4" /> Collect Payment
              </button>
              {isAdmin && (
                <button
                  onClick={() => navigate(`/students/${student.studentId}/edit`)}
                  className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Record
                </button>
              )}
            </div>
          </div>

          {/* Metric Counters Banner */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-slate-100">
            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Assessed Fee</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 font-mono">{formatCurrency(overall.totalFee)}</p>
            </div>
            
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Total Paid</p>
              <p className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5 font-mono">{formatCurrency(overall.totalPaid)}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100">
              <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Net Outstanding</p>
              <p className="text-base sm:text-lg font-bold text-rose-600 mt-0.5 font-mono">{formatCurrency(overall.totalPending)}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
              <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Advance Credit</p>
              <p className="text-base sm:text-lg font-bold text-blue-700 mt-0.5 font-mono">{formatCurrency(overall.advanceCredit)}</p>
            </div>
          </div>
        </motion.div>

        {/* Tab Controls Bar with Sliding layoutId Active Indicator */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-1 shadow-2xs flex overflow-x-auto gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-150 outline-none cursor-pointer ${
                  isActive
                    ? 'text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-profile-tab"
                    className="absolute inset-0 bg-blue-50 border border-blue-200/80 rounded-lg shadow-2xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <Icon className={`relative z-10 w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* TAB 1: Fee Summary */}
          {activeTab === 'fee-summary' && (
            <div className="space-y-4">
              {yearSummaries.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-sm">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No fee demand schedule created for this student yet.
                </div>
              ) : (
                yearSummaries.map((ys, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{ys.year}</h3>
                          <span className="text-xs font-semibold text-slate-500 font-mono">({ys.academicYear})</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{ys.course} • {ys.level}</p>
                      </div>
                      <span className={`self-start sm:self-auto px-3 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(ys.status)}`}>
                        {ys.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                      {ys.categories?.map((cat, ci) => (
                        <div key={ci} className="flex items-center justify-between p-3 bg-slate-50/70 rounded-xl border border-slate-100 text-xs">
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-slate-700 truncate">{cat.category}</p>
                            {cat.semester && (
                              <span className="text-[10px] text-blue-600 font-semibold font-mono">
                                {cat.semester}
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-slate-800 shrink-0">{formatCurrency(cat.amount)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Current Year Fee Demand</span>
                        <span className="font-mono font-medium text-slate-800">{formatCurrency(ys.currentYearFee)}</span>
                      </div>
                      {ys.previousYearDue > 0 && (
                        <div className="flex justify-between text-amber-700">
                          <span>Carried Forward Due (Previous Year)</span>
                          <span className="font-mono font-semibold">{formatCurrency(ys.previousYearDue)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200/80 pt-2">
                        <span>Total Payable Assessed</span>
                        <span className="font-mono">{formatCurrency(ys.totalPayable)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Total Payments Credited</span>
                        <span className="font-mono">{formatCurrency(ys.totalPaid)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-rose-600 border-t border-slate-200/80 pt-2 text-sm">
                        <span>Outstanding Balance</span>
                        <span className="font-mono">{formatCurrency(ys.pending)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Payment History */}
          {activeTab === 'payment-history' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Receipt No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Academic Year</th>
                      <th className="py-3 px-4">Year</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Recorded By</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearSummaries.flatMap(ys => ys.payments || []).length === 0 ? (
                      <tr>
                        <td colSpan="9" className="py-12 text-center text-slate-400 text-xs">
                          <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          No payment receipts found on record
                        </td>
                      </tr>
                    ) : (
                      yearSummaries.flatMap(ys => (ys.payments || []).map(p => ({ ...p, year: ys.year, academicYear: ys.academicYear })))
                        .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
                        .map(p => (
                          <tr
                            key={p.receiptNo}
                            className={`hover:bg-slate-50/70 transition-colors ${p.status === 'Cancelled' ? 'bg-rose-50/30 opacity-70' : ''}`}
                          >
                            <td className="py-3 px-4 font-mono font-semibold text-xs text-blue-700">
                              {p.receiptNo}
                            </td>
                            <td className="py-3 px-4 text-xs font-medium text-slate-600">{formatDate(p.paymentDate)}</td>
                            <td className="py-3 px-4 text-xs font-mono text-slate-600">{p.academicYear}</td>
                            <td className="py-3 px-4 text-xs font-medium text-slate-600">{p.year}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-xs text-emerald-700">
                              {formatCurrency(p.amountPaid)}
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                                {p.paymentMode}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500">{p.recordedBy?.name || '—'}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusColor(p.status)}`}>
                                {p.status}
                              </span>
                              {p.locked && p.status !== 'Cancelled' && (
                                <span className="ml-1.5 inline-flex items-center text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-semibold" title="Permanent audit locked transaction">
                                  <Lock className="w-2.5 h-2.5 mr-0.5" /> LOCKED
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {p.status !== 'Cancelled' && (
                                isAdmin ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        setActionModal({ type: 'edit', payment: p });
                                        setEditAmount(p.amountPaid.toString());
                                        setReason('');
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActionModal({ type: 'cancel', payment: p });
                                        setReason('');
                                      }}
                                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1" title="Payments are locked. Contact Admin for changes.">
                                    <Lock className="w-3 h-3" /> Locked
                                  </span>
                                )
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Fee Ledger */}
          {activeTab === 'fee-ledger' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Particulars / Description</th>
                      <th className="py-3 px-4 text-right">Debit (Fee Assessed)</th>
                      <th className="py-3 px-4 text-right">Credit (Receipts)</th>
                      <th className="py-3 px-4 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {(feeLedger?.entries || []).length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-slate-400 font-sans text-xs">
                          <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          No accounting ledger entries posted
                        </td>
                      </tr>
                    ) : (
                      feeLedger.entries.map((e, i) => (
                        <tr key={i} className={`hover:bg-slate-50/70 transition-colors ${e.type === 'cancellation' ? 'bg-rose-50/30' : ''}`}>
                          <td className="py-3 px-4 text-slate-600 font-sans">{formatDate(e.date)}</td>
                          <td className="py-3 px-4 text-slate-800 font-sans font-medium">{e.description}</td>
                          <td className="py-3 px-4 text-right font-semibold text-rose-600">
                            {e.debit > 0 ? formatCurrency(e.debit) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                            {e.credit > 0 ? formatCurrency(e.credit) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {formatCurrency(e.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {feeLedger?.entries?.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-200 text-xs">
                        <td colSpan="4" className="py-3 px-4 font-bold text-slate-800 text-right uppercase tracking-wider">
                          Net Ledger Closing Balance:
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right text-sm">
                          {formatCurrency(feeLedger.closingBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Student Details */}
          {activeTab === 'details' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Official Student Record</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  {[
                    { label: 'Student ID', value: student.studentId, isMono: true },
                    { label: 'Admission Number', value: student.admissionNo, isMono: true },
                    { label: 'Batch', value: student.batch || '—', isMono: true },
                    { label: 'Student Full Name', value: student.name },
                    { label: "Father / Guardian Name", value: student.fatherName || '—' },
                    { label: 'Course Program', value: student.course },
                    { label: 'Academic Level', value: student.level },
                    { label: 'Current Class Year', value: student.currentYear },
                    { label: 'Current Academic Session', value: student.currentAcademicYear },
                    { label: 'Email Address', value: student.email || '—' },
                    { label: 'Contact Phone', value: student.phone || '—' },
                    { label: 'Gender', value: student.gender || '—' },
                    { label: 'Enrollment Status', value: student.status },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-slate-100 text-xs">
                      <span className="text-slate-500 font-medium">{item.label}</span>
                      <span className={`font-semibold text-slate-800 ${item.isMono ? 'font-mono' : ''}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {student.enrollmentHistory?.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Year Promotion & Enrollment History</h4>
                  <div className="space-y-2">
                    {student.enrollmentHistory.map((eh, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200/60 rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-slate-800">{eh.year}</span>
                          <span className="text-slate-400">•</span>
                          <span className="font-mono text-slate-600">{eh.academicYear}</span>
                        </div>
                        {eh.promotedAt && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Promoted on {formatDate(eh.promotedAt)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Admin Action Modal for Payment Edit / Cancellation */}
        <AnimatePresence>
          {actionModal && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setActionModal(null)}
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
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      {actionModal.type === 'cancel' ? 'Cancel Payment Voucher' : 'Modify Voucher Amount'}
                    </h3>
                  </div>
                  <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
                  <p className="text-slate-500">
                    Receipt: <strong className="text-slate-800 font-mono">{actionModal.payment.receiptNo}</strong>
                  </p>
                  <p className="text-slate-500">
                    Current Amount: <strong className="text-slate-800 font-mono">{formatCurrency(actionModal.payment.amountPaid)}</strong>
                  </p>
                </div>

                <form onSubmit={handleAdminAction} className="space-y-4">
                  {actionModal.type === 'edit' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">New Amount (₹) *</label>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        min="1"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mandatory Reason for Audit Log *
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Enter detailed audit justification for this financial alteration..."
                      rows="3"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setActionModal(null)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={modalSubmitting}
                      className={`px-4 py-2 text-white rounded-xl text-xs font-semibold transition-all ${
                        actionModal.type === 'cancel'
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {modalSubmitting ? 'Processing...' : actionModal.type === 'cancel' ? 'Confirm Cancellation' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
