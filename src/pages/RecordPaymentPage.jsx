import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency, getStatusColor } from '../utils/helpers';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Search, CreditCard, CheckCircle } from 'lucide-react';

export default function RecordPaymentPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feeSummary, setFeeSummary] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
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
    api.get('/audit/academic-years').then(res => {
      const years = res.data.data || [];
      setAcademicYears(years);
      const current = years.find(y => y.isCurrent);
      if (current) setForm(prev => ({ ...prev, academicYear: current.year }));
    });

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
    loadFeeSummary(student.studentId, form.academicYear || student.currentAcademicYear);
  };

  const loadFeeSummary = async (studentId, ay) => {
    try {
      const res = await api.get(`/students/${studentId}/fee-summary${ay ? `?academicYear=${ay}` : ''}`);
      setFeeSummary(res.data.data);
    } catch { setFeeSummary(null); }
  };

  const handleAcademicYearChange = (ay) => {
    setForm(prev => ({ ...prev, academicYear: ay }));
    if (selectedStudent) loadFeeSummary(selectedStudent.studentId, ay);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) { toast.error('Please select a student'); return; }
    if (!form.amountPaid || parseFloat(form.amountPaid) <= 0) { toast.error('Please enter a valid amount'); return; }
    if (!form.academicYear) { toast.error('Please select an academic year'); return; }

    setSubmitting(true);
    try {
      const res = await api.post('/payments', {
        studentId: selectedStudent.studentId,
        academicYear: form.academicYear,
        amountPaid: parseFloat(form.amountPaid),
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        transactionId: form.transactionId,
        remarks: form.remarks
      });
      setSuccess(res.data.data);
      toast.success('Payment recorded successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (success) {
    const payment = success.payment;
    const summary = success.feeSummary;
    return (
      <div>
        <Topbar title="Payment Recorded" />
        <div className="p-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Recorded Successfully!</h2>
            <p className="text-gray-500 text-sm mb-6">Receipt: {payment.receiptNo}</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Student</span><span className="font-medium">{selectedStudent.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Amount</span><span className="font-bold text-emerald-600">{formatCurrency(payment.amountPaid)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Mode</span><span className="font-medium">{payment.paymentMode}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Academic Year</span><span className="font-medium">{payment.academicYear}</span></div>
              {summary?.currentYearSummary && (
                <>
                  <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between text-sm"><span className="text-gray-500">Remaining Due</span><span className="font-bold text-red-600">{formatCurrency(summary.currentYearSummary.pending)}</span></div>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate(`/students/${selectedStudent.studentId}`)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                View Student
              </button>
              <button onClick={() => { setSuccess(null); setSelectedStudent(null); setFeeSummary(null); setForm({ academicYear: form.academicYear, amountPaid: '', paymentDate: new Date().toISOString().split('T')[0], paymentMode: 'Cash', transactionId: '', remarks: '' }); }} className="flex-1 py-2.5 bg-navy-700 text-white rounded-xl text-sm font-medium hover:bg-navy-800">
                New Payment
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentSummary = feeSummary?.currentYearSummary;

  return (
    <div>
      <Topbar title="Record Payment" />
      <div className="p-6 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-navy-600" /> Record Payment
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Student Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Student *</label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between p-3 bg-navy-50 border border-navy-200 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-navy-800">{selectedStudent.name}</p>
                      <p className="text-xs text-navy-600">{selectedStudent.admissionNo || selectedStudent.studentId} • {selectedStudent.course} • {selectedStudent.currentYear}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedStudent(null); setFeeSummary(null); }} className="text-xs text-navy-600 hover:text-navy-800 font-medium">Change</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => handleSearch(e.target.value)}
                      placeholder="Search student by name, ID, phone..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 max-h-60 overflow-y-auto z-20">
                        {searchResults.map(s => (
                          <div key={s.studentId} onClick={() => selectStudent(s)} className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                            <p className="text-sm font-medium text-gray-800">{s.name}</p>
                            <p className="text-xs text-gray-500">{s.admissionNo} • {s.course} • {s.currentYear}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Academic Year *</label>
                  <select value={form.academicYear} onChange={e => handleAcademicYearChange(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500">
                    <option value="">Select</option>
                    {academicYears.map(y => <option key={y.year} value={y.year}>{y.year}{y.isCurrent ? ' (Current)' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹) *</label>
                  <input type="number" value={form.amountPaid} onChange={e => setForm(prev => ({ ...prev, amountPaid: e.target.value }))} placeholder="Enter amount" min="1" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Date *</label>
                  <input type="date" value={form.paymentDate} onChange={e => setForm(prev => ({ ...prev, paymentDate: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Mode *</label>
                  <select value={form.paymentMode} onChange={e => setForm(prev => ({ ...prev, paymentMode: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500">
                    {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Transaction / Reference Number</label>
                <input type="text" value={form.transactionId} onChange={e => setForm(prev => ({ ...prev, transactionId: e.target.value }))} placeholder="e.g. UPI123456, NEFT ref, Cheque no." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks</label>
                <textarea value={form.remarks} onChange={e => setForm(prev => ({ ...prev, remarks: e.target.value }))} rows="2" placeholder="Optional notes" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500 resize-none" />
              </div>

              <button type="submit" disabled={submitting || !selectedStudent} className="w-full py-3.5 bg-navy-700 hover:bg-navy-800 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 text-sm">
                {submitting ? 'Processing...' : 'SAVE PAYMENT'}
              </button>
            </form>
          </div>

          {/* Fee Breakdown Sidebar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit lg:sticky lg:top-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Fee Breakdown</h3>
            {!selectedStudent ? (
              <p className="text-sm text-gray-400 py-8 text-center">Select a student to view fee breakdown</p>
            ) : !currentSummary ? (
              <p className="text-sm text-gray-400 py-8 text-center">No fee demand for this year</p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Current Year Fee</span><span className="font-medium">{formatCurrency(currentSummary.currentYearFee)}</span></div>
                {currentSummary.previousYearDue > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-amber-600">Previous Year Due</span><span className="font-medium text-amber-600">{formatCurrency(currentSummary.previousYearDue)}</span></div>
                )}
                <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between text-sm font-semibold"><span>Total Payable</span><span>{formatCurrency(currentSummary.totalPayable)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-emerald-600">Already Paid</span><span className="text-emerald-600 font-medium">{formatCurrency(currentSummary.totalPaid)}</span></div>
                {form.amountPaid && parseFloat(form.amountPaid) > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-blue-600">Current Payment</span><span className="text-blue-600 font-medium">{formatCurrency(parseFloat(form.amountPaid))}</span></div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
                  <span className="text-red-600">Remaining Due</span>
                  <span className="text-red-600">{formatCurrency(Math.max(0, currentSummary.pending - (parseFloat(form.amountPaid) || 0)))}</span>
                </div>
                <div className="mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(currentSummary.status)}`}>{currentSummary.status}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
