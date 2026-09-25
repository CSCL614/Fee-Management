import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency, getStatusColor } from '../utils/helpers';
import { AlertCircle, FileSpreadsheet } from 'lucide-react';

export default function PendingFeesPage() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ course: '', level: '' });
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { api.get('/students/courses').then(res => setCourses(res.data.data.courses || [])); }, []);
  useEffect(() => { fetchPending(); }, [filters]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.course) params.course = filters.course;
      if (filters.level) params.level = filters.level;
      const res = await api.get('/reports/pending', { params });
      setPending(res.data.data || []);
    } catch { } finally { setLoading(false); }
  };

  const exportExcel = async () => {
    const res = await api.get('/exports/filtered-excel', { params: { type: 'pending', ...filters }, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = `Pending_Fees_${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
  };

  const totalPending = pending.reduce((s, p) => s + p.totalPending, 0);

  return (
    <div>
      <Topbar title="Pending Fees" />
      <div className="p-6 pt-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Pending Fees</h1>
            <p className="text-sm text-gray-500">{pending.length} students with pending fees • Total: {formatCurrency(totalPending)}</p>
          </div>
          <div className="flex gap-3">
            <select value={filters.level} onChange={e => setFilters(prev => ({ ...prev, level: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              <option value="">All Levels</option><option value="UG">UG</option><option value="PG">PG</option>
            </select>
            <select value={filters.course} onChange={e => setFilters(prev => ({ ...prev, course: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              <option value="">All Courses</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium">
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                {['Student', 'Course', 'Year', 'Total Payable', 'Paid', 'Previous Due', 'Pending', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="8" className="py-12 text-center text-gray-400">Loading...</td></tr>
                ) : pending.length === 0 ? (
                  <tr><td colSpan="8" className="py-12 text-center"><AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm">No pending fees found</p></td></tr>
                ) : pending.map(p => (
                  <tr key={p.studentId} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`/students/${p.studentId}`)}>
                    <td className="px-4 py-3"><p className="text-sm font-medium text-gray-800">{p.name}</p><p className="text-xs text-gray-500">{p.admissionNo}</p></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.course} ({p.level})</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.currentYear}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(p.totalPayable)}</td>
                    <td className="px-4 py-3 text-sm text-emerald-600 font-medium">{formatCurrency(p.totalPaid)}</td>
                    <td className="px-4 py-3 text-sm text-amber-600 font-medium">{formatCurrency(p.previousYearDue)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-red-600">{formatCurrency(p.totalPending)}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(p.feeStatus)}`}>{p.feeStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
