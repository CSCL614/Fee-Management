import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from '../utils/helpers';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CreditCard, Mail, Download, User, Phone, AtSign, BookOpen,
  GraduationCap, Calendar, ArrowLeft, Edit
} from 'lucide-react';

export default function StudentProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fee-summary');
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchStudent(); }, [id]);

  const fetchStudent = async () => {
    try {
      const res = await api.get(`/students/${id}`);
      setData(res.data.data);
    } catch { toast.error('Failed to load student'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-navy-200 border-t-navy-600 rounded-full animate-spin" /></div>;
  if (!data) return <div className="flex items-center justify-center h-screen text-gray-400">Student not found</div>;

  const { student, feeSummary, feeLedger } = data;
  const overall = feeSummary?.overall || {};
  const yearSummaries = feeSummary?.yearSummaries || [];

  const tabs = [
    { id: 'fee-summary', label: 'Fee Summary' },
    { id: 'payment-history', label: 'Payment History' },
    { id: 'fee-ledger', label: 'Fee Ledger' },
    { id: 'details', label: 'Details' },
  ];

  return (
    <div>
      <Topbar title="Student Profile" />
      <div className="p-6 pt-4 space-y-6">
        {/* Back */}
        <button onClick={() => navigate('/students')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </button>

        {/* Student Header Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 bg-navy-100 rounded-2xl flex items-center justify-center shrink-0">
                <User className="w-8 h-8 text-navy-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{student.name}</h1>
                <p className="text-sm text-gray-500 mt-1">Admission No: {student.admissionNo}</p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <span className="flex items-center gap-1.5 text-sm text-gray-600"><BookOpen className="w-4 h-4 text-gray-400" />{student.course}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${student.level === 'PG' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>{student.level}</span>
                  <span className="flex items-center gap-1.5 text-sm text-gray-600"><GraduationCap className="w-4 h-4 text-gray-400" />{student.currentYear}</span>
                  <span className="flex items-center gap-1.5 text-sm text-gray-600"><Calendar className="w-4 h-4 text-gray-400" />{student.currentAcademicYear}</span>
                  {student.email && <span className="flex items-center gap-1.5 text-sm text-gray-600"><AtSign className="w-4 h-4 text-gray-400" />{student.email}</span>}
                  {student.phone && <span className="flex items-center gap-1.5 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{student.phone}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate(`/record-payment?student=${student.studentId}`)} className="flex items-center gap-2 px-5 py-2.5 bg-navy-700 hover:bg-navy-800 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                <CreditCard className="w-4 h-4" /> Record Payment
              </button>
              {isAdmin && (
                <button onClick={() => navigate(`/students/${student.studentId}/edit`)} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <Edit className="w-4 h-4" /> Edit
                </button>
              )}
            </div>
          </div>

          {/* Overall Fee Summary Bar */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-xl">
            <div><p className="text-xs text-gray-500">Total Fee</p><p className="text-lg font-bold text-gray-800">{formatCurrency(overall.totalFee)}</p></div>
            <div><p className="text-xs text-gray-500">Total Paid</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(overall.totalPaid)}</p></div>
            <div><p className="text-xs text-gray-500">Total Pending</p><p className="text-lg font-bold text-red-600">{formatCurrency(overall.totalPending)}</p></div>
            <div><p className="text-xs text-gray-500">Advance Credit</p><p className="text-lg font-bold text-blue-600">{formatCurrency(overall.advanceCredit)}</p></div>
            <div><p className="text-xs text-gray-500">Status</p><span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(overall.status)}`}>{overall.status || 'N/A'}</span></div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-navy-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeTab === 'fee-summary' && (
            <div className="space-y-4">
              {yearSummaries.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">No fee demands found</div>
              ) : (
                yearSummaries.map((ys, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-gray-800">{ys.year} — {ys.academicYear}</h3>
                        <p className="text-xs text-gray-500">{ys.course} ({ys.level})</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(ys.status)}`}>{ys.status}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      {ys.categories?.map((cat, ci) => (
                        <div key={ci} className="flex justify-between text-sm p-2 bg-gray-50 rounded-lg">
                          <span className="text-gray-600">{cat.category}</span>
                          <span className="font-medium text-gray-800">{formatCurrency(cat.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 pt-4 space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-gray-500">Current Year Fee</span><span className="font-medium">{formatCurrency(ys.currentYearFee)}</span></div>
                      {ys.previousYearDue > 0 && (
                        <div className="flex justify-between text-sm"><span className="text-amber-600">Previous Year Due</span><span className="font-medium text-amber-600">{formatCurrency(ys.previousYearDue)}</span></div>
                      )}
                      <div className="flex justify-between text-sm font-semibold border-t border-dashed border-gray-200 pt-2"><span>Total Payable</span><span>{formatCurrency(ys.totalPayable)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-emerald-600">Paid</span><span className="font-medium text-emerald-600">{formatCurrency(ys.totalPaid)}</span></div>
                      <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2"><span className="text-red-600">Remaining Due</span><span className="text-red-600">{formatCurrency(ys.pending)}</span></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'payment-history' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                    {['Receipt No', 'Date', 'Academic Year', 'Year', 'Amount', 'Mode', 'Transaction ID', 'Entered By', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {yearSummaries.flatMap(ys => ys.payments || []).length === 0 ? (
                      <tr><td colSpan="9" className="py-8 text-center text-gray-400 text-sm">No payments recorded yet</td></tr>
                    ) : (
                      yearSummaries.flatMap(ys => (ys.payments || []).map(p => ({ ...p, year: ys.year, academicYear: ys.academicYear }))).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).map(p => (
                        <tr key={p.receiptNo} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-700">{p.receiptNo}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDate(p.paymentDate)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{p.academicYear}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{p.year}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{formatCurrency(p.amountPaid)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{p.paymentMode}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 font-mono">{p.transactionId || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">—</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(p.status)}`}>{p.status}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'fee-ledger' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                    {['Date', 'Description', 'Debit', 'Credit', 'Balance'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {(feeLedger?.entries || []).length === 0 ? (
                      <tr><td colSpan="5" className="py-8 text-center text-gray-400 text-sm">No ledger entries</td></tr>
                    ) : (
                      feeLedger.entries.map((e, i) => (
                        <tr key={i} className={`hover:bg-gray-50/50 ${e.type === 'cancellation' ? 'bg-red-50/30' : ''}`}>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDate(e.date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{e.description}</td>
                          <td className="px-4 py-3 text-sm font-medium text-red-600">{e.debit > 0 ? formatCurrency(e.debit) : '—'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-emerald-600">{e.credit > 0 ? formatCurrency(e.credit) : '—'}</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-800">{formatCurrency(e.balance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {feeLedger?.entries?.length > 0 && (
                    <tfoot><tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan="4" className="px-4 py-3 text-sm font-bold text-gray-700 text-right">Closing Balance:</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-800">{formatCurrency(feeLedger.closingBalance)}</td>
                    </tr></tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Student ID', value: student.studentId },
                  { label: 'Admission No', value: student.admissionNo },
                  { label: 'Name', value: student.name },
                  { label: 'Father\'s Name', value: student.fatherName || '—' },
                  { label: 'Course', value: student.course },
                  { label: 'Level', value: student.level },
                  { label: 'Current Year', value: student.currentYear },
                  { label: 'Academic Year', value: student.currentAcademicYear },
                  { label: 'Email', value: student.email || '—' },
                  { label: 'Phone', value: student.phone || '—' },
                  { label: 'Gender', value: student.gender || '—' },
                  { label: 'Status', value: student.status },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <span className="text-sm font-medium text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
              {student.enrollmentHistory?.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Enrollment History</h3>
                  <div className="space-y-2">
                    {student.enrollmentHistory.map((eh, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600 font-medium">{eh.year}</span>
                        <span className="text-gray-400">—</span>
                        <span className="text-gray-600">{eh.academicYear}</span>
                        {eh.promotedAt && <span className="text-gray-400 text-xs ml-auto">{formatDate(eh.promotedAt)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
