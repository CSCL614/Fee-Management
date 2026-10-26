import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import {
  X, Receipt, User, Calendar, CreditCard, CheckCircle2,
  Lock, Copy, Check, Printer, ArrowRight, ExternalLink,
  ShieldCheck, FileText, Layers, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TransactionDetailsModal({ payment, onClose }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  if (!payment) return null;

  const handleCopyReceipt = () => {
    if (payment.receiptNo) {
      navigator.clipboard.writeText(payment.receiptNo);
      setCopied(true);
      toast.success('Receipt voucher number copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const studentName = payment.student?.name || payment.studentName || payment.studentId || 'Student';
  const studentAdmission = payment.student?.admissionNo || payment.studentAdmissionNo || payment.admissionNo || payment.studentId;
  const studentCourse = payment.student?.course || payment.course || 'Undergraduate Program';
  const studentYear = payment.year || payment.student?.currentYear || '—';
  const academicYear = payment.academicYear || '—';
  const targetStudentId = payment.student?.studentId || payment.studentId;

  // Determine category allocations
  const allocations = Array.isArray(payment.allocations) && payment.allocations.length > 0
    ? payment.allocations
    : [
        {
          category: payment.feeCategory || payment.category || 'Tuition Fee / General Assessment',
          semester: payment.semester || null,
          academicYear: payment.academicYear,
          year: payment.year,
          amount: payment.amountPaid || payment.credit || 0
        }
      ];

  const totalAllocated = allocations.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
  const isCancelled = payment.status === 'Cancelled' || payment.status === 'cancelled';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white w-full max-w-xl rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden z-10 my-8"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                  <Receipt className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Fee Receipt Voucher Details
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${
                      isCancelled
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {payment.status || 'Completed'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200/80 mt-0.5">
                    Permanent accounting record committed to college ledger
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Number Badge */}
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-blue-300/80 font-medium">Receipt No:</span>
                <span className="font-mono font-bold text-sm text-white tracking-wider bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/15">
                  {payment.receiptNo || payment.referenceId || 'N/A'}
                </span>
                <button
                  onClick={handleCopyReceipt}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-blue-300 hover:text-white"
                  title="Copy Receipt No"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-blue-200/90 text-xs font-medium">
                <Calendar className="w-3.5 h-3.5 text-blue-300" />
                <span>{formatDate(payment.paymentDate || payment.date)}</span>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            
            {/* Student Particulars Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" /> Student Profile
                </span>
                {targetStudentId && (
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/students/${targetStudentId}`);
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>View Full Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {studentName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{studentName}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                    {studentAdmission} • {studentCourse}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    {academicYear} {studentYear ? `• ${studentYear}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* "What They Paid & How Much They Paid" - Category Allocations Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-50/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Payment Breakdown ("What They Paid")
                </h4>
                <span className="text-[11px] font-semibold text-slate-500 font-mono">
                  {allocations.length} {allocations.length === 1 ? 'Category' : 'Categories'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Fee Category</th>
                      <th className="py-2.5 px-3">Session / Period</th>
                      <th className="py-2.5 px-4 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {allocations.map((alloc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 text-slate-900 font-semibold">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            <span>{alloc.category}</span>
                            {alloc.semester && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-100 font-bold">
                                {alloc.semester}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {alloc.academicYear || academicYear}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(alloc.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50/70 border-t-2 border-emerald-200/80 font-bold">
                      <td colSpan="2" className="py-2.5 px-4 text-emerald-950 uppercase tracking-wider text-xs">
                        Total Amount Received:
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-700 text-sm">
                        {formatCurrency(payment.amountPaid || payment.credit || totalAllocated)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Payment Settlement Particulars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Payment Mode</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  {payment.paymentMode || 'Cash'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Transaction / UTR Ref</span>
                <span className="font-mono font-semibold text-slate-800 truncate block mt-0.5" title={payment.transactionId}>
                  {payment.transactionId || '—'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Cashier / Recorded By</span>
                <span className="font-semibold text-slate-800 truncate block mt-0.5">
                  {payment.enteredByName || payment.enteredBy?.name || payment.recordedBy?.name || 'Authorized Cashier'}
                </span>
              </div>
            </div>

            {/* Remarks / Concession Notes */}
            {payment.remarks && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Remarks / Audit Note</span>
                <p className="text-slate-700 italic">{payment.remarks}</p>
              </div>
            )}

            {/* Cancellation Notice if cancelled */}
            {isCancelled && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">This transaction has been CANCELLED</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    {payment.cancellationReason || 'Payment reversed by administrator. All collection credits have been unposted from the ledger.'}
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Official Voucher</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
