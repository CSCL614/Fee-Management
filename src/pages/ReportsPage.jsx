import { useState, useEffect } from 'react';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { FileSpreadsheet, TrendingUp, Filter, Calendar, BookOpen, Layers, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainer, staggerItem, AnimatedNumber } from '../utils/animations';

const PIE_COLORS = ['#1e3a8a', '#2563eb', '#38bdf8', '#818cf8', '#c084fc', '#10b981', '#f59e0b', '#ef4444'];

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [aging, setAging] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ academicYear: '', course: '', batch: '' });
  const [academicYears, setAcademicYears] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/audit/academic-years'),
      api.get('/students/courses')
    ]).then(([aRes, cRes]) => {
      setAcademicYears(aRes.data.data || []);
      setCourses(cRes.data.data.courses || []);
      setBatches(cRes.data.data.batches || []);
    });
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [colRes, agingRes] = await Promise.all([
        api.get('/reports/collection', { params: filters }),
        api.get('/reports/aging', { params: filters })
      ]);
      setData(colRes.data.data);
      setAging(agingRes.data.data);
    } catch {
      setData(null);
      setAging(null);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    const res = await api.get('/exports/excel', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fee_Collection_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
  };

  if (loading) {
    return (
      <div>
        <Topbar title="Reports" />
        <div className="p-4 sm:p-6 space-y-6 animate-pulse">
          <div className="h-28 bg-white rounded-2xl border border-slate-200/80 p-5 skeleton" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-44 bg-white rounded-2xl border border-slate-200/80 p-5 skeleton" />
            <div className="h-44 bg-white rounded-2xl border border-slate-200/80 p-5 skeleton" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-white rounded-2xl border border-slate-200/80 p-5 skeleton" />
            <div className="h-80 bg-white rounded-2xl border border-slate-200/80 p-5 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  const courseData = (data?.courseWise || []).map(c => ({ name: c._id, value: c.total }));
  const yearData = (data?.yearWise || []).map(y => ({ name: y._id, value: y.total }));
  const totalYearCollection = yearData.reduce((acc, curr) => acc + (curr.value || 0), 0);

  const YEAR_GRADIENTS = [
    { from: '#3b82f6', to: '#1d4ed8' }, // 1st Year: Blue
    { from: '#6366f1', to: '#4338ca' }, // 2nd Year: Indigo
    { from: '#0ea5e9', to: '#0284c7' }, // 3rd Year: Sky
    { from: '#8b5cf6', to: '#6d28d9' }  // 4th Year: Violet
  ];

  const CustomYearTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value || 0;
      const pct = totalYearCollection > 0 ? ((val / totalYearCollection) * 100).toFixed(1) : '0';
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700/60 text-xs min-w-[170px]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-semibold text-slate-300 text-[11px]">{label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/25 text-blue-300 font-bold font-mono">
              {pct}%
            </span>
          </div>
          <p className="text-base font-bold text-white tracking-tight">{formatCurrency(val)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total collected for this class</p>
        </div>
      );
    }
    return null;
  };

  const getAgingColor = (range) => {
    if (range.includes('0-30') || range.includes('0 to 30')) return 'border-blue-100 bg-blue-50/40 text-blue-800';
    if (range.includes('31-60') || range.includes('31 to 60')) return 'border-amber-100 bg-amber-50/40 text-amber-800';
    if (range.includes('61-90') || range.includes('61 to 90')) return 'border-orange-100 bg-orange-50/40 text-orange-800';
    return 'border-rose-100 bg-rose-50/40 text-rose-800';
  };

  return (
    <div>
      <Topbar title="Reports" />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 space-y-6"
      >
        {/* Controls & Filter Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Executive Reports & Collection Analytics
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Real-time revenue metrics, defaulter aging brackets, and department breakdowns</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Master Workbook</span>
            </motion.button>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-wider text-[11px] mr-1">
              <Filter className="w-3.5 h-3.5" /> Filter Parameters:
            </div>

            <select
              value={filters.academicYear}
              onChange={e => setFilters(prev => ({ ...prev, academicYear: e.target.value }))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="">All Academic Years</option>
              {academicYears.map(y => <option key={y.year} value={y.year}>{y.year}</option>)}
            </select>

            <select
              value={filters.course}
              onChange={e => setFilters(prev => ({ ...prev, course: e.target.value }))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium max-w-xs truncate"
            >
              <option value="">All Academic Programs</option>
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

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={fetchReports}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors ml-auto"
            >
              Apply Filter
            </motion.button>
          </div>
        </div>

        {/* Top KPI Cards: Total Inflow & Aging Buckets */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Revenue Card */}
          <motion.div
            variants={staggerItem}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Fee Inflow</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                  Verified Collections
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-700 font-mono tracking-tight">
                <AnimatedNumber value={data?.totalCollection || 0} formatCurrency={true} />
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Cumulative across <strong className="text-slate-700 font-mono"><AnimatedNumber value={data?.totalTransactions || 0} /></strong> completed transactions
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Avg per receipt:</span>
              <span className="font-mono font-semibold text-slate-800">
                {data?.totalTransactions ? formatCurrency(Math.round((data.totalCollection || 0) / data.totalTransactions)) : '—'}
              </span>
            </div>
          </motion.div>

          {/* Aging Defaulter Schedule */}
          <motion.div
            variants={staggerItem}
            className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-600" />
                  Outstanding Dues Aging Analysis
                </h3>
                <p className="text-[11px] text-slate-500">Unpaid demand amounts categorized by elapsed days</p>
              </div>
            </div>

            {aging && Object.keys(aging).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {Object.entries(aging).map(([range, val]) => (
                  <div
                    key={range}
                    className={`p-3 rounded-xl border ${getAgingColor(range)} flex flex-col justify-between hover:scale-[1.02] transition-transform duration-150`}
                  >
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider">{range} Days</p>
                      <p className="text-base sm:text-lg font-bold font-mono mt-1 text-slate-900">
                        <AnimatedNumber value={val.total} formatCurrency={true} />
                      </p>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 mt-2">
                      {val.students?.length || 0} student accounts
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No outstanding aging data to report
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Course-Wise Collection Breakdown */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow duration-200 flex flex-col">
            <div className="mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Program Revenue Distribution</h3>
              <p className="text-[11px] text-slate-500">Fee collections grouped by academic course</p>
            </div>

            {courseData.length > 0 ? (
              <div className="flex-1 flex flex-col justify-between">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={courseData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={750}
                      animationEasing="ease-out"
                    >
                      {courseData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                  {courseData.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-slate-600 font-medium truncate">{c.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-800 shrink-0">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
                No program collection data recorded
              </div>
            )}
          </div>

          {/* Year-Wise Collection Chart */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow duration-200">
            <div className="mb-4 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Annual Class Distribution</h3>
                <p className="text-[11px] text-slate-500">Collections segregated by 1st, 2nd, 3rd and 4th Year</p>
              </div>
              {yearData.length > 0 && (
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold font-mono">
                    Total: {formatCurrency(totalYearCollection)}
                  </span>
                </div>
              )}
            </div>

            {yearData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={yearData} margin={{ top: 25, right: 15, left: -10, bottom: 0 }} barCategoryGap="18%">
                  <defs>
                    {YEAR_GRADIENTS.map((g, i) => (
                      <linearGradient key={`grad-${i}`} id={`yearGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={g.from} stopOpacity={1} />
                        <stop offset="100%" stopColor={g.to} stopOpacity={0.92} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={<CustomYearTooltip />}
                    cursor={{ fill: 'rgba(37, 99, 235, 0.05)', radius: 8 }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[8, 8, 0, 0]}
                    barSize={56}
                    maxBarSize={68}
                    isAnimationActive={true}
                    animationDuration={850}
                    animationEasing="ease-out"
                  >
                    {yearData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#yearGrad-${index % YEAR_GRADIENTS.length})`}
                      />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={v => (v > 0 ? `₹${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : '')}
                      fill="#334155"
                      fontSize={11}
                      fontWeight={700}
                      offset={8}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                No annual collection records found
              </div>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
}
