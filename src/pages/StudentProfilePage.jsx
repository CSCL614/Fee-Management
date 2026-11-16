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
  AlertCircle, Receipt, FileText, CheckCircle2, History, AlertTriangle, X,
  Power, RotateCcw, Trash2, Eye, Tag, Sparkles, Filter, Search, Award, Check
} from 'lucide-react';
import { modalVariants, backdropVariants, pageVariants } from '../utils/animations';
import TransactionDetailsModal from '../components/common/TransactionDetailsModal';
import StudentFeeAnalyticsSection from '../components/student/StudentFeeAnalyticsSection';
import StudentAvatar from '../components/common/StudentAvatar';

export default function StudentProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fee-summary');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Admin Payment Edit / Cancel Modal state
  const [actionModal, setActionModal] = useState(null); // { type: 'edit'|'cancel', payment }
  const [reason, setReason] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Student Status Modal (Deactivate / Reactivate)
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState('Inactive');
  const [statusReason, setStatusReason] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Student Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState(null);

  // Requirement 6: Tuition Fee Concession Modal State (Admin & Accountant)
  const [concessionModal, setConcessionModal] = useState(null); // { isOpen, academicYear, studyYear, originalTuitionFee, currentConcession, reason, ... }
  const [concessionAmountInput, setConcessionAmountInput] = useState('');
  const [concessionReasonInput, setConcessionReasonInput] = useState('');
  const [concessionSubmitting, setConcessionSubmitting] = useState(false);

  // Requirement 1: Student Fee Ledger Dynamic Filters
  const [ledgerFilters, setLedgerFilters] = useState({
    academicYear: 'All',
    category: 'All',
    paymentMode: 'All',
    status: 'All',
    search: ''
  });
  const [customLedger, setCustomLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Requirement 3: Graduation & Alumni Modals State
  const [showGraduateModal, setShowGraduateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [gradForm, setGradForm] = useState({
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
  const [restoreReason, setRestoreReason] = useState('');
  const [gradSubmitting, setGradSubmitting] = useState(false);

  useEffect(() => { fetchStudent(); }, [id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (actionModal) setActionModal(null);
        if (showStatusModal) setShowStatusModal(false);
        if (showDeleteModal) setShowDeleteModal(false);
        if (concessionModal) setConcessionModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actionModal, showStatusModal, showDeleteModal, concessionModal]);

  const openConcessionModal = (ys) => {
    const tuitionCat = ys.categories?.find(c => (c.category || '').toLowerCase().includes('tuition'));
    const original = tuitionCat?.originalAmount != null
      ? tuitionCat.originalAmount
      : (tuitionCat ? tuitionCat.amount + (tuitionCat.concession || ys.concession?.amount || 0) : 0);
    const currentCon = ys.concession?.amount || tuitionCat?.concession || 0;

    setConcessionModal({
      isOpen: true,
      academicYear: ys.academicYear,
      studyYear: ys.year,
      originalTuitionFee: original,
      currentConcession: currentCon,
      reason: ys.concession?.reason || '',
      appliedByName: ys.concession?.appliedByName || '',
      appliedAt: ys.concession?.appliedAt || null,
      updatedByName: ys.concession?.updatedByName || '',
      updatedAt: ys.concession?.updatedAt || null
    });
    setConcessionAmountInput(currentCon > 0 ? currentCon : '');
    setConcessionReasonInput(ys.concession?.reason || '');
  };

  const handleSaveConcession = async (e) => {
    e.preventDefault();
    if (!concessionModal) return;

    const parsedAmt = parseFloat(concessionAmountInput) || 0;
    if (parsedAmt < 0) {
      toast.error('Concession amount cannot be negative');
      return;
    }
    if (parsedAmt > concessionModal.originalTuitionFee) {
      toast.error(`Concession (₹${parsedAmt}) cannot exceed Tuition Fee (₹${concessionModal.originalTuitionFee})`);
      return;
    }

    setConcessionSubmitting(true);
    try {
      const res = await api.post(`/students/${student.studentId || student._id}/concession`, {
        academicYear: concessionModal.academicYear,
        concessionAmount: parsedAmt,
        reason: concessionReasonInput.trim()
      });
      toast.success(res.data.message || 'Tuition fee concession updated successfully');
      setConcessionModal(null);
      fetchStudent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply concession');
    } finally {
      setConcessionSubmitting(false);
    }
  };

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

  const handleStatusChange = async (e) => {
    e.preventDefault();
    setStatusUpdating(true);
    try {
      await api.patch(`/students/${student.studentId}/status`, {
        status: targetStatus,
        reason: statusReason.trim() || undefined
      });
      toast.success(`Student status changed to ${targetStatus}`);
      setShowStatusModal(false);
      setStatusReason('');
      fetchStudent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeleteStudent = async (e) => {
    if (e) e.preventDefault();
    setDeleting(true);
    setDeleteWarning(null);
    try {
      const res = await api.delete(`/students/${student.studentId}`, {
        data: { reason: deleteReason.trim() }
      });
      toast.success(res.data.message || 'Student deleted successfully');
      setShowDeleteModal(false);
      navigate('/students');
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.hasPayments) {
        setDeleteWarning(errData.message);
      } else {
        toast.error(errData?.message || 'Failed to delete student');
      }
    } finally {
      setDeleting(false);
    }
  };

  const fetchFilteredLedger = async (filtersToUse = ledgerFilters) => {
    setLedgerLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtersToUse.academicYear && filtersToUse.academicYear !== 'All') params.append('academicYear', filtersToUse.academicYear);
      if (filtersToUse.category && filtersToUse.category !== 'All') params.append('category', filtersToUse.category);
      if (filtersToUse.paymentMode && filtersToUse.paymentMode !== 'All') params.append('paymentMode', filtersToUse.paymentMode);
      if (filtersToUse.status && filtersToUse.status !== 'All') params.append('status', filtersToUse.status);
      if (filtersToUse.search) params.append('search', filtersToUse.search);

      const targetId = data?.student?.studentId || id;
      const res = await api.get(`/students/${targetId}/ledger?${params.toString()}`);
      setCustomLedger(res.data.data);
    } catch (err) {
      console.error('Failed to fetch filtered ledger:', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleResetLedgerFilters = () => {
    const defaultF = { academicYear: 'All', category: 'All', paymentMode: 'All', status: 'All', search: '' };
    setLedgerFilters(defaultF);
    setCustomLedger(null);
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
    } catch (err) {
      toast.error('Failed to download PDF receipt', { id: 'pdf-toast' });
    }
  };

  const handleGraduateStudent = async (e) => {
    e.preventDefault();
    setGradSubmitting(true);
    try {
      const res = await api.post(`/students/${data.student._id || data.student.studentId}/graduate`, {
        passingYear: parseInt(gradForm.passingYear, 10),
        passingAcademicYear: gradForm.passingAcademicYear || data.student.currentAcademicYear,
        completionDate: gradForm.completionDate,
        graduationRemarks: gradForm.graduationRemarks,
        academicResult: {
          course: data.student.course,
          specialization: data.student.specialization,
          admissionYear: data.student.admissionYear || data.student.batchStartYear,
          passingYear: parseInt(gradForm.passingYear, 10),
          finalSemester: gradForm.finalSemester,
          resultStatus: gradForm.resultStatus,
          percentage: gradForm.percentage,
          cgpa: gradForm.cgpa,
          gradeOrDivision: gradForm.gradeOrDivision,
          universityRegNo: gradForm.universityRegNo,
          resultDate: gradForm.resultDate || null,
          remarks: gradForm.graduationRemarks
        }
      });
      toast.success(res.data.message || 'Student graduated successfully');
      setShowGraduateModal(false);
      fetchStudent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to graduate student');
    } finally {
      setGradSubmitting(false);
    }
  };

  const handleRestoreStudent = async (e) => {
    e.preventDefault();
    if (!restoreReason || restoreReason.trim().length < 5) {
      toast.error('Mandatory reason (min 5 characters) is required to restore student');
      return;
    }
    setGradSubmitting(true);
    try {
      const res = await api.post(`/students/${data.student._id || data.student.studentId}/restore`, {
        reason: restoreReason.trim()
      });
      toast.success(res.data.message || 'Student restored to Active status');
      setShowRestoreModal(false);
      setRestoreReason('');
      fetchStudent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore student');
    } finally {
      setGradSubmitting(false);
    }
  };

  const handleUpdateResults = async (e) => {
    e.preventDefault();
    setGradSubmitting(true);
    try {
      const res = await api.put(`/students/${data.student._id || data.student.studentId}/academic-results`, {
        finalSemester: gradForm.finalSemester,
        resultStatus: gradForm.resultStatus,
        percentage: gradForm.percentage,
        cgpa: gradForm.cgpa,
        gradeOrDivision: gradForm.gradeOrDivision,
        universityRegNo: gradForm.universityRegNo,
        resultDate: gradForm.resultDate || null,
        remarks: gradForm.graduationRemarks
      });
      toast.success(res.data.message || 'Academic results updated successfully');
      setShowResultsModal(false);
      fetchStudent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update academic results');
    } finally {
      setGradSubmitting(false);
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

  if (!data || !data.student || Array.isArray(data)) {
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
  const hasPaidFees = (overall.totalPaid || 0) > 0;

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
              <StudentAvatar
                src={student.profilePhoto}
                name={student.name}
                size="xl"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl"
              />
              
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{student.name}</h1>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(student.status)}`}>
                    {student.status}
                  </span>
                  {student.status === 'Graduated' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-purple-50 text-purple-700 border-purple-200">
                      <GraduationCap className="w-3.5 h-3.5" /> Alumni Class of {student.graduation?.passingYear || student.batchEndYear || 'Passed-Out'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                  <span className="font-mono text-slate-700 font-semibold">ID: {student.studentId}</span>
                  <span>•</span>
                  <span>Adm No: <strong className="text-slate-700 font-mono">{student.admissionNo}</strong></span>
                  {student.rollNo && (
                    <>
                      <span>•</span>
                      <span>Roll No: <strong className="text-slate-700 font-mono">{student.rollNo}</strong></span>
                    </>
                  )}
                  {student.batch && (
                    <>
                      <span>•</span>
                      <span className="font-mono font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">Batch {student.batch}</span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {/* Requirement 7: Mobile Number prominently displayed in Student Header */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-800 shadow-2xs">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    {student.phone ? (
                      <a
                        href={`tel:${student.phone}`}
                        className="hover:underline font-mono tracking-tight"
                        title="Click to call mobile number"
                      >
                        {student.phone}
                      </a>
                    ) : (
                      <span className="text-emerald-600/70 italic font-normal">Not Provided</span>
                    )}
                  </div>

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
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <CreditCard className="w-4 h-4" /> Collect Payment
              </button>

              <button
                onClick={() => navigate(`/students/${student.studentId}/edit`)}
                className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-blue-600" /> Edit Profile
              </button>

              {isAdmin && student.status === 'Active' && (
                <button
                  onClick={() => {
                    setGradForm({
                      passingYear: new Date().getFullYear(),
                      passingAcademicYear: student.currentAcademicYear || `${new Date().getFullYear()-1}-${String(new Date().getFullYear()).slice(-2)}`,
                      completionDate: new Date().toISOString().split('T')[0],
                      graduationRemarks: '',
                      resultStatus: 'Passed',
                      percentage: '',
                      cgpa: '',
                      gradeOrDivision: 'First Class',
                      universityRegNo: '',
                      finalSemester: student.level === 'PG' ? 'Semester IV' : 'Semester VI',
                      resultDate: ''
                    });
                    setShowGraduateModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 border border-purple-200 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors shadow-2xs cursor-pointer"
                  title="Graduate this student to Alumni status"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600" /> Graduate Student
                </button>
              )}

              {isAdmin && student.status === 'Graduated' && (
                <>
                  <button
                    onClick={() => {
                      setRestoreReason('');
                      setShowRestoreModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
                    title="Restore graduated student back to Active status"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-600" /> Restore to Active
                  </button>
                  <button
                    onClick={() => {
                      const ar = student.graduation?.academicResult || {};
                      setGradForm({
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
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer"
                    title="Edit academic exam results and degree credentials"
                  >
                    <Award className="w-3.5 h-3.5 text-indigo-600" /> Exam Results
                  </button>
                </>
              )}

              {isAdmin && (
                <>
                  {student.status === 'Active' ? (
                    <button
                      onClick={() => {
                        setTargetStatus('Inactive');
                        setStatusReason('');
                        setShowStatusModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                      title="Deactivate this student (preserves financial audit history)"
                    >
                      <Power className="w-3.5 h-3.5 text-amber-600" /> Deactivate
                    </button>
                  ) : student.status !== 'Graduated' ? (
                    <button
                      onClick={() => {
                        setTargetStatus('Active');
                        setStatusReason('');
                        setShowStatusModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
                      title="Reactivate this student to active status"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" /> Reactivate
                    </button>
                  ) : null}

                  <button
                    onClick={() => {
                      setDeleteWarning(null);
                      setDeleteReason('');
                      setShowDeleteModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2.5 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
                    title="Delete student record"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Metric Counters Banner */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-slate-100">
            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Fee Amount to be Collected</p>
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

        {/* Deactivated Inactive Banner */}
        {student.status === 'Inactive' && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">Student Account Deactivated (Inactive)</p>
                <p className="text-amber-800/90 mt-0.5">
                  This student's account is currently marked as Inactive. Historical fee receipts, vouchers, and ledger balances are fully preserved, but active invoicing is paused.
                </p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setTargetStatus('Active');
                  setStatusReason('');
                  setShowStatusModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reactivate Student
              </button>
            )}
          </div>
        )}

        {/* Student Individual Fee Analytics & Visual Pie Charts */}
        <StudentFeeAnalyticsSection
          feeSummary={feeSummary}
          studentName={student.name}
        />

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

                    {/* Requirement 6: Fee Concession Section */}
                    {(() => {
                      const tuitionCat = ys.categories?.find(c => (c.category || '').toLowerCase().includes('tuition'));
                      const concession = ys.concession?.amount || tuitionCat?.concession || 0;
                      const originalTuition = tuitionCat?.originalAmount != null
                        ? tuitionCat.originalAmount
                        : (tuitionCat ? tuitionCat.amount + (tuitionCat.concession || ys.concession?.amount || 0) : 0);
                      const adjustedTuition = Math.max(0, originalTuition - concession);

                      return (
                        <div className="mb-5 p-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-blue-50/40">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100/80">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-indigo-600" />
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Tuition Fee Concession — Session {ys.academicYear}
                              </h4>
                              {concession > 0 ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                  ₹{concession.toLocaleString('en-IN')} Concession Granted
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                                  No Concession
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => openConcessionModal(ys)}
                              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{concession > 0 ? 'Edit Concession' : 'Apply Concession'}</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                            <div className="p-2.5 bg-white/80 rounded-lg border border-indigo-100/60">
                              <span className="block text-[10px] uppercase font-bold text-slate-500">Original Tuition Fee</span>
                              <span className="text-sm font-bold font-mono text-slate-800">
                                {formatCurrency(originalTuition)}
                              </span>
                            </div>

                            <div className="p-2.5 bg-white/80 rounded-lg border border-indigo-100/60">
                              <span className="block text-[10px] uppercase font-bold text-indigo-600">Concession Amount</span>
                              <span className="text-sm font-bold font-mono text-indigo-700">
                                -{formatCurrency(concession)}
                              </span>
                            </div>

                            <div className="p-2.5 bg-white/80 rounded-lg border border-indigo-100/60">
                              <span className="block text-[10px] uppercase font-bold text-emerald-700">Adjusted Tuition Fee</span>
                              <span className="text-sm font-bold font-mono text-emerald-700">
                                {formatCurrency(adjustedTuition)}
                              </span>
                            </div>
                          </div>

                          {ys.concession?.reason && (
                            <p className="text-xs text-slate-600 mt-2.5 pt-2 border-t border-indigo-100/60 flex items-center gap-1.5">
                              <span className="font-semibold text-slate-700">Remarks:</span>
                              <span className="italic">{ys.concession.reason}</span>
                            </p>
                          )}

                          {ys.concession?.appliedByName && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              Recorded by {ys.concession.appliedByName} on {formatDate(ys.concession.appliedAt)}
                              {ys.concession.updatedByName && ys.concession.updatedByName !== ys.concession.appliedByName && (
                                <span> (Updated by {ys.concession.updatedByName} on {formatDate(ys.concession.updatedAt)})</span>
                              )}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Assessed Fee Demand ({ys.academicYear})</span>
                        <span className="font-mono font-medium text-slate-800">{formatCurrency(ys.currentYearFee)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Total Paid ({ys.academicYear})</span>
                        <span className="font-mono">{formatCurrency(ys.totalPaid)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-rose-600 border-t border-slate-200/80 pt-2 text-sm">
                        <span>Pending Due ({ys.academicYear})</span>
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
                            onClick={() => setSelectedTransaction({ ...p, student: data.student })}
                            className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${p.status === 'Cancelled' ? 'bg-rose-50/30 opacity-70' : ''}`}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-xs text-blue-700 hover:underline">
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
                            <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedTransaction({ ...p, student: data.student })}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="View breakdown & voucher"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Details</span>
                                </button>
                                {p.status !== 'Cancelled' && (
                                  isAdmin ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          setActionModal({ type: 'edit', payment: p });
                                          setEditAmount(p.amountPaid.toString());
                                          setReason('');
                                        }}
                                        className="text-xs text-amber-600 hover:text-amber-800 font-semibold px-2 py-1 rounded hover:bg-amber-50 transition-colors cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActionModal({ type: 'cancel', payment: p });
                                          setReason('');
                                        }}
                                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1" title="Payments are locked. Contact Admin for changes.">
                                      <Lock className="w-3 h-3" /> Locked
                                    </span>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Fee Ledger — Every Individual Payment Transaction */}
          {activeTab === 'fee-ledger' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden space-y-4 p-4 sm:p-5">
              
              {/* Dynamic Ledger Filters Toolbar */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Ledger Transaction Filters
                    </span>
                    {(ledgerFilters.academicYear !== 'All' || ledgerFilters.category !== 'All' || ledgerFilters.paymentMode !== 'All' || ledgerFilters.status !== 'All' || ledgerFilters.search) && (
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Active Filters
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleResetLedgerFilters}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={ledgerFilters.search}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newF = { ...ledgerFilters, search: val };
                        setLedgerFilters(newF);
                        fetchFilteredLedger(newF);
                      }}
                      placeholder="Receipt / Txn ID / Keyword..."
                      className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* Academic Year */}
                  <select
                    value={ledgerFilters.academicYear}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newF = { ...ledgerFilters, academicYear: val };
                      setLedgerFilters(newF);
                      fetchFilteredLedger(newF);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 outline-none"
                  >
                    <option value="All">All Academic Years</option>
                    {Array.from(new Set([
                      ...yearSummaries.map(ys => ys.academicYear),
                      ...((customLedger || feeLedger)?.entries || []).map(e => e.academicYear)
                    ].filter(Boolean))).map(ay => (
                      <option key={ay} value={ay}>{ay}</option>
                    ))}
                  </select>

                  {/* Fee Category */}
                  <select
                    value={ledgerFilters.category}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newF = { ...ledgerFilters, category: val };
                      setLedgerFilters(newF);
                      fetchFilteredLedger(newF);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 outline-none"
                  >
                    <option value="All">All Categories</option>
                    {Array.from(new Set([
                      'Tuition Fee', 'Exam Fee', 'Practical Fee', 'UDF Fee', 'Admission Fee',
                      ...((customLedger || feeLedger)?.entries || []).map(e => e.feeCategory || e.category)
                    ].filter(Boolean))).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  {/* Payment Method */}
                  <select
                    value={ledgerFilters.paymentMode}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newF = { ...ledgerFilters, paymentMode: val };
                      setLedgerFilters(newF);
                      fetchFilteredLedger(newF);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 outline-none"
                  >
                    <option value="All">All Payment Modes</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>

                  {/* Status */}
                  <select
                    value={ledgerFilters.status}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newF = { ...ledgerFilters, status: val };
                      setLedgerFilters(newF);
                      fetchFilteredLedger(newF);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="completed">Completed Receipts</option>
                    <option value="cancelled">Cancelled Transactions</option>
                  </select>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Receipt No</th>
                      <th className="py-3 px-3">Txn ID / Ref</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3">Fee Category</th>
                      <th className="py-3 px-3">Academic Year</th>
                      <th className="py-3 px-3">Semester</th>
                      <th className="py-3 px-3">Method</th>
                      <th className="py-3 px-3 text-right">Debit (Assessed)</th>
                      <th className="py-3 px-3 text-right">Credit (Paid)</th>
                      <th className="py-3 px-3 text-right">Running Balance</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3">Recorded By</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {ledgerLoading ? (
                      <tr>
                        <td colSpan="14" className="py-12 text-center text-slate-400">
                          <RotateCcw className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                          Filtering ledger transactions...
                        </td>
                      </tr>
                    ) : ((customLedger || feeLedger)?.entries || []).length === 0 ? (
                      <tr>
                        <td colSpan="14" className="py-12 text-center text-slate-400 font-sans text-xs">
                          <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          No accounting ledger entries match the selected filters
                        </td>
                      </tr>
                    ) : (
                      ((customLedger || feeLedger).entries || []).map((e, i) => {
                        const isPayment = e.type === 'payment' || (e.credit && e.credit > 0) || Boolean(e.receiptNo);
                        const isCancelled = e.status === 'Cancelled' || e.status === 'cancelled' || e.type === 'cancellation';
                        const paymentRefId = e.paymentId || e.id || e._id;

                        return (
                          <tr
                            key={e.id || `${e.receiptNo || 'row'}-${i}`}
                            onClick={() => {
                              if (isPayment) {
                                setSelectedTransaction({
                                  ...e,
                                  _id: paymentRefId,
                                  paymentId: paymentRefId,
                                  student: data.student,
                                  amountPaid: e.credit || e.amountPaid,
                                  paymentDate: e.date || e.paymentDate,
                                  feeCategory: e.feeCategory || e.category,
                                  receiptNo: e.receiptNo || (e.description?.includes('Receipt #') ? e.description.split('#')[1]?.trim()?.split(' ')[0] : undefined),
                                  transactionId: e.transactionId
                                });
                              }
                            }}
                            className={`transition-colors ${isPayment ? 'hover:bg-blue-50/50 cursor-pointer' : 'hover:bg-slate-50/70'} ${isCancelled ? 'bg-rose-50/40 opacity-75' : ''}`}
                          >
                            {/* Date */}
                            <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                              {formatDate(e.date)}
                            </td>

                            {/* Receipt No */}
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                              {e.receiptNo ? (
                                <span className="hover:underline">{e.receiptNo}</span>
                              ) : (
                                <span className="text-slate-300 font-normal">—</span>
                              )}
                            </td>

                            {/* Txn ID */}
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              {e.transactionId || '—'}
                            </td>

                            {/* Particulars / Description */}
                            <td className="py-2.5 px-3 text-slate-800 font-medium">
                              <div className="flex items-center gap-1.5">
                                <span>{e.description}</span>
                                {isCancelled && (
                                  <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">
                                    Cancelled
                                  </span>
                                )}
                              </div>
                              {e.allocations && e.allocations.length > 1 && (
                                <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap gap-1 font-mono">
                                  <span>Allocations:</span>
                                  {e.allocations.map((a, aIdx) => (
                                    <span key={aIdx} className="bg-slate-100 px-1 py-0.2 rounded text-slate-700">
                                      {a.category}: {formatCurrency(a.amount)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Fee Category */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                {e.feeCategory || e.category || 'General Fee'}
                              </span>
                            </td>

                            {/* Academic Year */}
                            <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                              {e.academicYear || '—'}
                            </td>

                            {/* Semester */}
                            <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                              {e.semester || '—'}
                            </td>

                            {/* Method */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {e.paymentMethod || e.paymentMode ? (
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10.5px] font-medium">
                                  {e.paymentMethod || e.paymentMode}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            {/* Debit */}
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-600 whitespace-nowrap">
                              {e.debit > 0 ? formatCurrency(e.debit) : '—'}
                            </td>

                            {/* Credit */}
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                              {e.credit > 0 ? formatCurrency(e.credit) : '—'}
                            </td>

                            {/* Running Balance */}
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {formatCurrency(e.runningBalance != null ? e.runningBalance : e.balance)}
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${getStatusColor(e.status || (isPayment ? 'completed' : 'assessed'))}`}>
                                {e.status || (isPayment ? 'completed' : 'assessed')}
                              </span>
                            </td>

                            {/* Recorded By */}
                            <td className="py-2.5 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                              {e.recordedBy || '—'}
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {isPayment && (
                                  <>
                                    <button
                                      onClick={() => setSelectedTransaction({
                                        ...e,
                                        _id: paymentRefId,
                                        paymentId: paymentRefId,
                                        student: data.student,
                                        amountPaid: e.credit || e.amountPaid,
                                        paymentDate: e.date || e.paymentDate,
                                        feeCategory: e.feeCategory || e.category,
                                        receiptNo: e.receiptNo,
                                        transactionId: e.transactionId
                                      })}
                                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                      title="View Voucher Details"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>

                                    {paymentRefId && !isCancelled && (
                                      <button
                                        onClick={() => downloadReceiptPdf(paymentRefId, e.receiptNo)}
                                        className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                        title="Download PDF Receipt"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {((customLedger || feeLedger)?.entries?.length > 0) && (
                    <tfoot>
                      <tr className="bg-slate-50/90 border-t-2 border-slate-200 text-xs font-bold text-slate-800">
                        <td colSpan="8" className="py-3 px-3 uppercase tracking-wider text-right">
                          Total Summary:
                        </td>
                        <td className="py-3 px-3 font-mono text-rose-600 text-right whitespace-nowrap">
                          {formatCurrency(((customLedger || feeLedger).entries || []).reduce((sum, e) => sum + (e.debit || 0), 0))}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-600 text-right whitespace-nowrap">
                          {formatCurrency(((customLedger || feeLedger).entries || []).filter(e => e.status !== 'Cancelled' && e.status !== 'cancelled' && e.type !== 'cancellation').reduce((sum, e) => sum + (e.credit || 0), 0))}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-900 text-right text-sm whitespace-nowrap">
                          {formatCurrency((customLedger || feeLedger).closingBalance)}
                        </td>
                        <td colSpan="3" className="py-3 px-3 text-[11px] text-slate-500 font-normal">
                          Net Outstanding
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
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Official Student Record</h3>
                  <button
                    onClick={() => navigate(`/students/${student.studentId}/edit`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-blue-600" /> Edit Profile Details
                  </button>
                </div>
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

              {/* Requirement 3: Academic Results & Graduation Record for Alumni */}
              {(student.status === 'Graduated' || student.graduation?.passingYear) && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Alumni Graduation & Academic Degree Credentials
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Class of {student.graduation?.passingYear || student.batchEndYear} • Verified College Record
                        </p>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          const ar = student.graduation?.academicResult || {};
                          setGradForm({
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
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-lg text-xs font-semibold text-purple-700 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-purple-600" /> Edit Academic Results
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 bg-purple-50/40 p-4 rounded-xl border border-purple-100">
                    {[
                      { label: 'Passing Calendar Year', value: student.graduation?.passingYear || '—', isMono: true },
                      { label: 'Passing Academic Session', value: student.graduation?.passingAcademicYear || '—', isMono: true },
                      { label: 'Course Completion Date', value: student.graduation?.completionDate ? formatDate(student.graduation.completionDate) : '—' },
                      { label: 'Final Degree Semester', value: student.graduation?.academicResult?.finalSemester || '—' },
                      { label: 'Result Status', value: student.graduation?.academicResult?.resultStatus || 'Passed', badge: true },
                      { label: 'Graduation Percentage', value: student.graduation?.academicResult?.percentage != null ? `${student.graduation.academicResult.percentage}%` : '—', isMono: true },
                      { label: 'CGPA Score', value: student.graduation?.academicResult?.cgpa != null ? student.graduation.academicResult.cgpa : '—', isMono: true },
                      { label: 'Grade / Division Awarded', value: student.graduation?.academicResult?.gradeOrDivision || '—' },
                      { label: 'University Registration No', value: student.graduation?.academicResult?.universityRegNo || '—', isMono: true },
                      { label: 'Result Publication Date', value: student.graduation?.academicResult?.resultDate ? formatDate(student.graduation.academicResult.resultDate) : '—' },
                      { label: 'Graduated By (Staff)', value: student.graduation?.graduatedByName || 'Administrator' },
                      { label: 'Graduation Date', value: student.graduation?.graduatedAt ? formatDate(student.graduation.graduatedAt) : '—' }
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center py-2 border-b border-purple-100/60 text-xs">
                        <span className="text-slate-600 font-medium">{item.label}</span>
                        {item.badge ? (
                          <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[11px]">
                            {item.value}
                          </span>
                        ) : (
                          <span className={`font-semibold text-slate-900 ${item.isMono ? 'font-mono' : ''}`}>{item.value}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {student.graduation?.graduationRemarks && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Graduation Dossier Remarks</span>
                      <p className="text-slate-700 italic">{student.graduation.graduationRemarks}</p>
                    </div>
                  )}

                  {student.graduation?.restorationHistory?.length > 0 && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-1.5">
                      <span className="text-[10px] font-bold text-amber-800 uppercase block">Status Restoration History</span>
                      {student.graduation.restorationHistory.map((rh, rhIdx) => (
                        <div key={rhIdx} className="text-amber-900 text-[11px] flex items-center justify-between">
                          <span>Restored by <strong>{rh.restoredByName || 'Admin'}</strong>: "{rh.reason}"</span>
                          <span className="font-mono text-amber-700">{formatDate(rh.restoredAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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

        {/* Status Change Modal (Deactivate / Reactivate) */}
        <AnimatePresence>
          {showStatusModal && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowStatusModal(false)}
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
                    {targetStatus === 'Inactive' ? (
                      <Power className="w-5 h-5 text-amber-600" />
                    ) : (
                      <RotateCcw className="w-5 h-5 text-emerald-600" />
                    )}
                    <h3 className="font-bold text-slate-900 text-sm">
                      {targetStatus === 'Inactive' ? 'Deactivate Student Account' : 'Reactivate Student Account'}
                    </h3>
                  </div>
                  <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className={`p-3.5 rounded-xl text-xs space-y-1.5 ${targetStatus === 'Inactive' ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'}`}>
                  <p className="font-semibold">
                    {targetStatus === 'Inactive'
                      ? 'Deactivation preserves all past receipts and financial history for auditing.'
                      : 'Reactivating will restore this student to active directory status.'}
                  </p>
                  <p className="opacity-90">
                    Student: <strong>{student.name}</strong> ({student.admissionNo || student.studentId})
                  </p>
                </div>

                <form onSubmit={handleStatusChange} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason for Audit Trail
                    </label>
                    <textarea
                      value={statusReason}
                      onChange={e => setStatusReason(e.target.value)}
                      placeholder={targetStatus === 'Inactive' ? 'e.g. Student took temporary leave / discontinued studies' : 'e.g. Returned to institute / reactivated enrollment'}
                      rows="3"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowStatusModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={statusUpdating}
                      className={`px-4 py-2 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        targetStatus === 'Inactive'
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {statusUpdating ? 'Updating...' : targetStatus === 'Inactive' ? 'Confirm Deactivation' : 'Confirm Reactivation'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Delete Confirmation with Safety Guard */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowDeleteModal(false)}
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
                    <Trash2 className="w-5 h-5 text-rose-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Delete Student Record</h3>
                  </div>
                  <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {deleteWarning || hasPaidFees ? (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-800">Permanent Deletion Blocked by Audit Rules</p>
                          <p className="mt-1 text-rose-700">
                            {deleteWarning || `This student has recorded fee transactions totaling ${formatCurrency(overall.totalPaid)}. To ensure accounting ledger integrity and government audit compliance, students with financial vouchers cannot be permanently deleted.`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                      <p className="font-semibold text-slate-800">Recommended Alternative: Deactivate</p>
                      <p>
                        Deactivating sets this student's account status to <strong>Inactive</strong>, disabling new demands and payments while keeping all historical receipts accessible.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(false)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteModal(false);
                          setTargetStatus('Inactive');
                          setStatusReason('');
                          setShowStatusModal(true);
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Deactivate Student Instead
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleDeleteStudent} className="space-y-4">
                    <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                      <p className="font-bold">Are you sure you want to delete this student?</p>
                      <p>
                        Permanently deleting <strong>{student.name}</strong> ({student.admissionNo || student.studentId}) will remove their student dossier and unbilled demands.
                      </p>
                      <p className="text-rose-700 font-semibold pt-1">This action cannot be undone.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Reason for Deletion
                      </label>
                      <input
                        type="text"
                        value={deleteReason}
                        onChange={e => setDeleteReason(e.target.value)}
                        placeholder="e.g. Erroneous duplicate student registration"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(false)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={deleting}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {deleting ? 'Deleting...' : 'Permanently Delete'}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Tuition Fee Concession (Requirement 6) */}
        <AnimatePresence>
          {concessionModal && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setConcessionModal(null)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Tuition Fee Concession</h3>
                      <p className="text-[11px] text-slate-500">Session {concessionModal.academicYear} • {concessionModal.studyYear}</p>
                    </div>
                  </div>
                  <button onClick={() => setConcessionModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Student:</span>
                    <strong className="text-slate-800">{student.name} ({student.admissionNo || student.studentId})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Course / Branch:</span>
                    <span className="text-slate-800 font-medium">{student.course}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Study Year & Session:</span>
                    <span className="text-slate-800 font-medium">{concessionModal.studyYear} ({concessionModal.academicYear})</span>
                  </div>
                </div>

                <form onSubmit={handleSaveConcession} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Original Tuition Fee Amount (INR)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`₹${concessionModal.originalTuitionFee.toLocaleString('en-IN')}`}
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-100/80 rounded-xl text-xs font-mono font-bold text-slate-700 outline-none cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Assessed annual tuition amount for this academic year</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Concession Amount in INR <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        max={concessionModal.originalTuitionFee}
                        step="100"
                        value={concessionAmountInput}
                        onChange={e => setConcessionAmountInput(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Dynamic calculation preview */}
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Original Tuition Fee:</span>
                      <span className="font-mono">₹{concessionModal.originalTuitionFee.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-indigo-700 font-medium">
                      <span>Concession:</span>
                      <span className="font-mono">-₹{(parseFloat(concessionAmountInput) || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold border-t border-indigo-200 pt-1">
                      <span>Adjusted Tuition Fee:</span>
                      <span className="font-mono">
                        ₹{Math.max(0, concessionModal.originalTuitionFee - (parseFloat(concessionAmountInput) || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason / Remarks <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      rows="2"
                      value={concessionReasonInput}
                      onChange={e => setConcessionReasonInput(e.target.value)}
                      placeholder="e.g. Merit scholarship approved by Chairman / Sports quota waiver"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>

                  {concessionModal.appliedByName && (
                    <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p>Originally recorded by: <strong>{concessionModal.appliedByName}</strong> {concessionModal.appliedAt ? `on ${formatDate(concessionModal.appliedAt)}` : ''}</p>
                      {concessionModal.updatedByName && (
                        <p>Last updated by: <strong>{concessionModal.updatedByName}</strong> {concessionModal.updatedAt ? `on ${formatDate(concessionModal.updatedAt)}` : ''}</p>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setConcessionModal(null)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={concessionSubmitting}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {concessionSubmitting ? 'Saving Concession...' : 'Save Concession'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Graduate Student (Requirement 3) */}
        <AnimatePresence>
          {showGraduateModal && (
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
                      <p className="text-[11px] text-slate-500">Record course completion & academic degree results</p>
                    </div>
                  </div>
                  <button onClick={() => setShowGraduateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200/80 text-xs space-y-1">
                  <p className="font-bold text-purple-900">
                    Graduating: {student.name} ({student.admissionNo || student.studentId})
                  </p>
                  <p className="text-purple-700 text-[11px]">
                    Course: {student.course} • Batch: {student.batch || '—'}
                  </p>
                  <p className="text-[11px] text-purple-800 font-medium pt-1">
                    Financial Safeguard: All historical fee demands, payment receipts, allocations, and any remaining dues are 100% preserved in the database.
                  </p>
                </div>

                <form onSubmit={handleGraduateStudent} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Passing Calendar Year <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="2000"
                        max="2099"
                        value={gradForm.passingYear}
                        onChange={e => setGradForm({ ...gradForm, passingYear: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Passing Academic Session
                      </label>
                      <input
                        type="text"
                        value={gradForm.passingAcademicYear}
                        onChange={e => setGradForm({ ...gradForm, passingAcademicYear: e.target.value })}
                        placeholder="e.g. 2025-26"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Course Completion Date
                      </label>
                      <input
                        type="date"
                        value={gradForm.completionDate}
                        onChange={e => setGradForm({ ...gradForm, completionDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Final Semester
                      </label>
                      <input
                        type="text"
                        value={gradForm.finalSemester}
                        onChange={e => setGradForm({ ...gradForm, finalSemester: e.target.value })}
                        placeholder="e.g. Semester VI"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Result Status
                      </label>
                      <select
                        value={gradForm.resultStatus}
                        onChange={e => setGradForm({ ...gradForm, resultStatus: e.target.value })}
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
                      <label className="block font-semibold text-slate-700 mb-1">
                        Grade / Division
                      </label>
                      <input
                        type="text"
                        value={gradForm.gradeOrDivision}
                        onChange={e => setGradForm({ ...gradForm, gradeOrDivision: e.target.value })}
                        placeholder="e.g. A+ / First Division"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Graduation Percentage (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={gradForm.percentage}
                        onChange={e => setGradForm({ ...gradForm, percentage: e.target.value })}
                        placeholder="e.g. 78.50"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        CGPA Score (10.0 scale)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={gradForm.cgpa}
                        onChange={e => setGradForm({ ...gradForm, cgpa: e.target.value })}
                        placeholder="e.g. 8.45"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        University Registration No
                      </label>
                      <input
                        type="text"
                        value={gradForm.universityRegNo}
                        onChange={e => setGradForm({ ...gradForm, universityRegNo: e.target.value })}
                        placeholder="e.g. AU2024UG0988"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Result Publication Date
                      </label>
                      <input
                        type="date"
                        value={gradForm.resultDate}
                        onChange={e => setGradForm({ ...gradForm, resultDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Graduation Remarks / Notes
                    </label>
                    <textarea
                      rows="2"
                      value={gradForm.graduationRemarks}
                      onChange={e => setGradForm({ ...gradForm, graduationRemarks: e.target.value })}
                      placeholder="e.g. Successfully cleared all semester courses; provisional certificate issued."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
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
                      disabled={gradSubmitting}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {gradSubmitting ? 'Graduating...' : 'Confirm Graduation'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Restore Graduated Student to Active (Requirement 3) */}
        <AnimatePresence>
          {showRestoreModal && (
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
                      <p className="text-[11px] text-slate-500">Reactivate graduated alumnus back to active directory</p>
                    </div>
                  </div>
                  <button onClick={() => setShowRestoreModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-semibold">
                    Restoring: {student.name} ({student.admissionNo || student.studentId})
                  </p>
                  <p className="text-[11px] opacity-90">
                    A mandatory audit reason is required. The previous graduation records will be preserved in the student's restoration history.
                  </p>
                </div>

                <form onSubmit={handleRestoreStudent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason for Re-activating to Active <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      minLength={5}
                      rows="3"
                      value={restoreReason}
                      onChange={e => setRestoreReason(e.target.value)}
                      placeholder="e.g. Student re-enrolled for supplementary semester / erroneously marked as graduated."
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
                      disabled={gradSubmitting || restoreReason.trim().length < 5}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    >
                      {gradSubmitting ? 'Restoring...' : 'Restore to Active'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Edit Academic Results (Requirement 3) */}
        <AnimatePresence>
          {showResultsModal && (
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
                      <p className="text-[11px] text-slate-500">Alumnus: {student.name} ({student.admissionNo || student.studentId})</p>
                    </div>
                  </div>
                  <button onClick={() => setShowResultsModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleUpdateResults} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Final Semester</label>
                      <input
                        type="text"
                        value={gradForm.finalSemester}
                        onChange={e => setGradForm({ ...gradForm, finalSemester: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Result Status</label>
                      <select
                        value={gradForm.resultStatus}
                        onChange={e => setGradForm({ ...gradForm, resultStatus: e.target.value })}
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
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Percentage (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={gradForm.percentage}
                        onChange={e => setGradForm({ ...gradForm, percentage: e.target.value })}
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
                        value={gradForm.cgpa}
                        onChange={e => setGradForm({ ...gradForm, cgpa: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Grade / Division</label>
                      <input
                        type="text"
                        value={gradForm.gradeOrDivision}
                        onChange={e => setGradForm({ ...gradForm, gradeOrDivision: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">University Reg No</label>
                      <input
                        type="text"
                        value={gradForm.universityRegNo}
                        onChange={e => setGradForm({ ...gradForm, universityRegNo: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Result Publication Date</label>
                    <input
                      type="date"
                      value={gradForm.resultDate}
                      onChange={e => setGradForm({ ...gradForm, resultDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                    <textarea
                      rows="2"
                      value={gradForm.graduationRemarks}
                      onChange={e => setGradForm({ ...gradForm, graduationRemarks: e.target.value })}
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
                      disabled={gradSubmitting}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {gradSubmitting ? 'Saving...' : 'Save Results'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transaction Details Modal */}
        <TransactionDetailsModal
          payment={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />

      </motion.div>
    </div>
  );
}
