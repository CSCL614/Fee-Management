import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import { ChevronLeft, ChevronRight, History, Filter, RotateCcw, ArrowRight, Receipt, CreditCard, Calendar, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { pageVariants } from '../utils/animations';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    academicYear: '',
    paymentMode: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [academicYears, setAcademicYears] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/audit/academic-years').then(res => setAcademicYears(res.data.data || []));
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [pagination.page, filters.academicYear, filters.paymentMode, filters.status, filters.dateFrom, filters.dateTo]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20, ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await api.get('/payments', { params });
      setPayments(res.data.data || []);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      academicYear: '',
      paymentMode: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const setTodayFilter = () => {
    const today = new Date().toISOString().split('T')[0];
    setFilters(prev => ({ ...prev, dateFrom: today, dateTo: today }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const setThisMonthFilter = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    setFilters(prev => ({ ...prev, dateFrom: firstDay, dateTo: today }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const activeFiltersCount = [
    filters.academicYear,
    filters.paymentMode,
    filters.status,
    filters.dateFrom,
    filters.dateTo
  ].filter(Boolean).length;

  const startIdx = pagination.total === 0 ? 0 : (pagination.page - 1) * 20 + 1;
  const endIdx = Math.min(pagination.page * 20, pagination.total);

  return (
    <div>
      <Topbar title="Payment History" />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 space-y-5"
      >
        
        {/* Header & Filter Controls Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Fee Payment Ledger & Receipts
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                  {pagination.total || 0} Transactions
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Historical ledger of all verified and cashier collected fees</p>
            </div>

            <button
              onClick={() => navigate('/record-payment')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Collect Fee</span>
            </button>
          </div>

          {/* Filter Dropdowns Row */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-wider text-[11px] mr-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </div>

            {/* Academic Year */}
            <select
              value={filters.academicYear}
              onChange={e => { setFilters(prev => ({ ...prev, academicYear: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="">All Academic Years</option>
              {academicYears.map(y => <option key={y.year} value={y.year}>{y.year}</option>)}
            </select>

            {/* Payment Mode */}
            <select
              value={filters.paymentMode}
              onChange={e => { setFilters(prev => ({ ...prev, paymentMode: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="">All Payment Modes</option>
              {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            {/* Status */}
            <select
              value={filters.status}
              onChange={e => { setFilters(prev => ({ ...prev, status: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="">All Transaction Statuses</option>
              <option value="completed">Completed / Active</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Date Range Picker Group */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => { setFilters(prev => ({ ...prev, dateFrom: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none"
                title="Filter payments from this date"
              />
              <span className="text-[11px] font-semibold text-slate-400">To:</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => { setFilters(prev => ({ ...prev, dateTo: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none"
                title="Filter payments up to this date"
              />
              {(filters.dateFrom || filters.dateTo) && (
                <button
                  type="button"
                  onClick={() => { setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' })); setPagination(prev => ({ ...prev, page: 1 })); }}
                  className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors ml-0.5"
                  title="Clear date filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Date Presets */}
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={setTodayFilter}
                className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200/60 transition-colors"
                title="Filter today's payments"
              >
                Today
              </button>
              <button
                type="button"
                onClick={setThisMonthFilter}
                className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200/60 transition-colors"
                title="Filter current month's payments"
              >
                This Month
              </button>
            </div>

            {/* Reset Filters Button */}
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 font-semibold hover:bg-rose-50 rounded-lg transition-colors ml-auto"
              >
                <RotateCcw className="w-3 h-3" /> Reset ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

        {/* Payments Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Session</th>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [1, 2, 3, 4, 5, 6].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-4"><div className="w-20 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-16 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-28 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-14 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-10 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="w-16 h-4 skeleton rounded ml-auto" /></td>
                      <td className="py-3.5 px-4"><div className="w-12 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-16 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-16 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4 text-center"><div className="w-14 h-4 skeleton rounded-full mx-auto" /></td>
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-16 text-center">
                      <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-800">No payment receipts found</p>
                      <p className="text-xs text-slate-400 mt-1">Try modifying your filter selections or record a new payment voucher.</p>
                    </td>
                  </tr>
                ) : (
                  payments.map(p => {
                    const studentId = p.student?.studentId || p.studentId;
                    return (
                      <tr
                        key={p.receiptNo}
                        className={`hover:bg-slate-50/70 transition-colors ${p.status === 'cancelled' ? 'bg-rose-50/20 opacity-60' : ''}`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-xs text-blue-700">
                          {p.receiptNo}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-600">{formatDate(p.paymentDate)}</td>
                        <td className="py-3 px-4">
                          {studentId ? (
                            <button
                              onClick={() => navigate(`/students/${studentId}`)}
                              className="text-left group"
                            >
                              <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                {p.student?.name || p.studentId}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">{p.student?.admissionNo}</p>
                            </button>
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-slate-800">{p.student?.name || '—'}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{p.student?.admissionNo}</p>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-600">{p.academicYear}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">{p.year}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-xs text-emerald-700">
                          {formatCurrency(p.amountPaid)}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                            {p.paymentMode}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-500">
                          {p.transactionId || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {p.enteredByName || p.enteredBy?.name || '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusColor(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Standard ERP Pagination Footer */}
          {pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/50 gap-3">
              <p className="text-xs text-slate-500 font-medium">
                Showing <span className="font-semibold text-slate-800">{startIdx}</span> to <span className="font-semibold text-slate-800">{endIdx}</span> of <span className="font-semibold text-slate-800">{pagination.total}</span> transactions
              </p>
              
              <div className="flex items-center gap-1.5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>

                <div className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200">
                  {pagination.page} / {pagination.pages || 1}
                </div>

                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}
