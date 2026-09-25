import { useState, useEffect } from 'react';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ academicYear: '', paymentMode: '', status: '' });
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => { api.get('/audit/academic-years').then(res => setAcademicYears(res.data.data || [])); }, []);
  useEffect(() => { fetchPayments(); }, [pagination.page, filters]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20, ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await api.get('/payments', { params });
      setPayments(res.data.data || []);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch { } finally { setLoading(false); }
  };

  return (
    <div>
      <Topbar title="Payment History" />
      <div className="p-6 pt-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          <select value={filters.academicYear} onChange={e => { setFilters(prev => ({ ...prev, academicYear: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
            <option value="">All Academic Years</option>
            {academicYears.map(y => <option key={y.year} value={y.year}>{y.year}</option>)}
          </select>
          <select value={filters.paymentMode} onChange={e => { setFilters(prev => ({ ...prev, paymentMode: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
            <option value="">All Modes</option>
            {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filters.status} onChange={e => { setFilters(prev => ({ ...prev, status: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                {['Receipt No', 'Date', 'Student', 'Academic Year', 'Year', 'Amount', 'Mode', 'Transaction ID', 'Entered By', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="10" className="py-12 text-center text-gray-400">Loading...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan="10" className="py-12 text-center"><History className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm">No payments found</p></td></tr>
                ) : payments.map(p => (
                  <tr key={p.receiptNo} className={`hover:bg-gray-50/50 ${p.status === 'cancelled' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{p.receiptNo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-3"><p className="text-sm font-medium text-gray-800">{p.student?.name || p.studentId}</p><p className="text-xs text-gray-500">{p.student?.admissionNo}</p></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.academicYear}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.year}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">{formatCurrency(p.amountPaid)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.paymentMode}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{p.transactionId || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.enteredByName || p.enteredBy?.name || '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(p.status)}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages} ({pagination.total} payments)</p>
              <div className="flex gap-2">
                <button disabled={pagination.page <= 1} onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={pagination.page >= pagination.pages} onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
