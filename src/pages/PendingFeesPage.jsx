import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency, getStatusColor } from '../utils/helpers';
import { pageVariants, staggerContainer, staggerItem, AnimatedNumber } from '../utils/animations';
import {
  AlertCircle, FileSpreadsheet, Filter, RotateCcw,
  Clock, ArrowRight, ShieldAlert, Users, IndianRupee
} from 'lucide-react';

export default function PendingFeesPage() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ course: '', level: '', batch: '' });
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/students/courses').then(res => {
      setCourses(res.data.data.courses || []);
      setBatches(res.data.data.batches || []);
    });
  }, []);

  useEffect(() => {
    fetchPending();
  }, [filters.course, filters.level, filters.batch]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.course) params.course = filters.course;
      if (filters.level) params.level = filters.level;
      if (filters.batch) params.batch = filters.batch;
      const res = await api.get('/reports/pending', { params });
      setPending(res.data.data || []);
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    const res = await api.get('/exports/filtered-excel', { params: { type: 'pending', ...filters }, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pending_Fees_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
  };

  const totalPending = pending.reduce((s, p) => s + p.totalPending, 0);
  const totalPayable = pending.reduce((s, p) => s + (p.totalPayable || 0), 0);
  const totalPaid = pending.reduce((s, p) => s + (p.totalPaid || 0), 0);
  const activeFiltersCount = [filters.level, filters.course, filters.batch].filter(Boolean).length;

  return (
    <div>
      <Topbar title="Pending Fees" />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 space-y-5"
      >
        {/* Metric Cards Row */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <motion.div
            variants={staggerItem}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Total Pending Dues</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-rose-600 font-mono tracking-tight">
              {loading ? '—' : <AnimatedNumber value={totalPending} formatCurrency={true} />}
            </p>
            <p className="text-xs text-slate-500 mt-1">Outstanding fee balance across filtered cohort</p>
          </motion.div>

          <motion.div
            variants={staggerItem}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Students with Dues</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {loading ? '—' : <><AnimatedNumber value={pending.length} /> Students</>}
            </p>
            <p className="text-xs text-slate-500 mt-1">Accounts with overdue or pending instalments</p>
          </motion.div>

          <motion.div
            variants={staggerItem}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Recovered Portion</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono tracking-tight">
              {loading ? '—' : <AnimatedNumber value={totalPaid} formatCurrency={true} />}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Out of {formatCurrency(totalPayable)} total payable
            </p>
          </motion.div>
        </motion.div>

        {/* Filter and Export Toolbar Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Defaulter & Dues Register</h2>
              <p className="text-xs text-slate-500 mt-0.5">Filter students by program and batch for collection follow-ups</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Defaulter Excel</span>
            </motion.button>
          </div>

          {/* Filters Bar */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-wider text-[11px] mr-1">
              <Filter className="w-3.5 h-3.5" /> Filter Cohort:
            </div>

            <select
              value={filters.level}
              onChange={e => setFilters(prev => ({ ...prev, level: e.target.value }))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="">All Academic Levels</option>
              <option value="UG">UG</option>
              <option value="PG">PG</option>
            </select>

            <select
              value={filters.course}
              onChange={e => setFilters(prev => ({ ...prev, course: e.target.value }))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium max-w-xs truncate"
            >
              <option value="">All Courses</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={filters.batch}
              onChange={e => setFilters(prev => ({ ...prev, batch: e.target.value }))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-mono font-medium"
            >
              <option value="">All Batches</option>
              {batches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            {activeFiltersCount > 0 && (
              <button
                onClick={() => setFilters({ course: '', level: '', batch: '' })}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 font-medium hover:bg-rose-50 rounded-lg transition-colors ml-auto"
              >
                <RotateCcw className="w-3 h-3" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Course & Batch</th>
                  <th className="py-3 px-4">Current Year</th>
                  <th className="py-3 px-4 text-right">Total Assessed</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Previous Due</th>
                  <th className="py-3 px-4 text-right">Net Pending</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [1, 2, 3, 4, 5, 6].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-4"><div className="w-28 h-4 skeleton rounded mb-1" /><div className="w-16 h-3 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-24 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-10 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="w-16 h-4 skeleton rounded ml-auto" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="w-16 h-4 skeleton rounded ml-auto" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="w-16 h-4 skeleton rounded ml-auto" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="w-16 h-4 skeleton rounded ml-auto" /></td>
                      <td className="py-3.5 px-4 text-center"><div className="w-14 h-4 skeleton rounded-full mx-auto" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="w-12 h-4 skeleton rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : pending.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center">
                      <AlertCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-800">No pending fee records found</p>
                      <p className="text-xs text-slate-400 mt-1">All student accounts under the selected filters are settled!</p>
                    </td>
                  </tr>
                ) : (
                  pending.map(p => (
                    <tr
                      key={p.studentId}
                      className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                      onClick={() => navigate(`/students/${p.studentId}`)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-slate-200">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{p.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{p.admissionNo || p.studentId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <p className="font-semibold text-slate-700">{p.course} ({p.level})</p>
                        {p.batch && (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200/60 mt-0.5">
                            Batch {p.batch}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-600">{p.currentYear}</td>
                      <td className="py-3 px-4 text-right text-xs font-medium text-slate-700 font-mono">
                        {formatCurrency(p.totalPayable)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-semibold text-emerald-700 font-mono">
                        {formatCurrency(p.totalPaid)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-medium text-amber-700 font-mono">
                        {p.previousYearDue > 0 ? formatCurrency(p.previousYearDue) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-bold text-rose-600 font-mono">
                        {formatCurrency(p.totalPending)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusColor(p.feeStatus)}`}>
                          {p.feeStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                          View <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
