import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import {
  PieChart as PieIcon, Filter, RefreshCw, Layers, CheckCircle2,
  Clock, Calendar, BookOpen, GraduationCap, AlertCircle
} from 'lucide-react';
import { fadeInUp } from '../../utils/animations';

import { FeePieCard } from '../common/FeePieCard';

export default function FeeAnalyticsSection() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    academicYears: [],
    calendarYears: [],
    courses: [],
    studyYears: [],
    semesters: []
  });

  // Filter State
  const [filters, setFilters] = useState({
    academicYear: '',
    calendarYear: '',
    course: '',
    studyYear: '',
    semester: ''
  });

  // Track if overall is selected
  const isOverall = !filters.academicYear && !filters.calendarYear && !filters.course && !filters.studyYear && !filters.semester;

  const fetchAnalytics = async (customFilters = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (customFilters.academicYear) params.append('academicYear', customFilters.academicYear);
      if (customFilters.calendarYear) params.append('calendarYear', customFilters.calendarYear);
      if (customFilters.course) params.append('course', customFilters.course);
      if (customFilters.studyYear) params.append('studyYear', customFilters.studyYear);
      if (customFilters.semester) params.append('semester', customFilters.semester);

      const res = await api.get(`/reports/fee-analytics?${params.toString()}`);
      if (res.data.success) {
        setAnalytics(res.data.data);
        if (res.data.data.filterOptions) {
          setFilterOptions(res.data.data.filterOptions);
        }
      }
    } catch (err) {
      console.error('Failed to load fee analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(filters);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    const emptyFilters = {
      academicYear: '',
      calendarYear: '',
      course: '',
      studyYear: '',
      semester: ''
    };
    setFilters(emptyFilters);
  };

  const totals = analytics?.totals || { totalDemand: 0, totalPaid: 0, totalPending: 0 };
  const feeToBeCollected = analytics?.feeToBeCollected || [];
  const feePaid = analytics?.feePaid || [];
  const feePending = analytics?.feePending || [];

  return (
    <div className="space-y-4">
      {/* Section Header with Shared Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                Fee Category Analytics & Distribution
              </h3>
              <p className="text-xs text-slate-500">
                Comparative analysis of Assessed, Collected, and Outstanding balances by category
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${
                isOverall
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Overall (All Records)
            </button>
            <button
              onClick={() => fetchAnalytics(filters)}
              title="Refresh Analytics"
              className="p-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Shared Filter Controls Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Academic Year Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> Academic Session
            </label>
            <select
              value={filters.academicYear}
              onChange={e => handleFilterChange('academicYear', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            >
              <option value="">All Academic Sessions</option>
              {filterOptions.academicYears.map(ay => (
                <option key={ay} value={ay}>{ay}</option>
              ))}
            </select>
          </div>

          {/* Calendar Year Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> Calendar Year
            </label>
            <select
              value={filters.calendarYear}
              onChange={e => handleFilterChange('calendarYear', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            >
              <option value="">All Calendar Years</option>
              {filterOptions.calendarYears.map(cy => (
                <option key={cy} value={cy}>Calendar Year {cy}</option>
              ))}
            </select>
          </div>

          {/* Course / Branch Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-slate-400" /> Course / Branch
            </label>
            <select
              value={filters.course}
              onChange={e => handleFilterChange('course', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 truncate"
            >
              <option value="">All Courses & Branches</option>
              {filterOptions.courses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Study Year Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-slate-400" /> Study Year
            </label>
            <select
              value={filters.studyYear}
              onChange={e => handleFilterChange('studyYear', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            >
              <option value="">All Study Years</option>
              {filterOptions.studyYears.map(sy => (
                <option key={sy} value={sy}>{sy}</option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" /> Semester
            </label>
            <select
              value={filters.semester}
              onChange={e => handleFilterChange('semester', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            >
              <option value="">All Semesters</option>
              {filterOptions.semesters.map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3 Side-by-Side Pie Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Pie Chart 1: Fee to Be Collected */}
        <FeePieCard
          title="Fee to Be Collected"
          subtitle="Assessed demand by fee category"
          badgeText="Assessed Demand"
          badgeColor="bg-blue-50 text-blue-700 border border-blue-100"
          icon={Layers}
          data={feeToBeCollected}
          totalAmount={totals.totalDemand}
          loading={loading}
        />

        {/* Pie Chart 2: Fee Paid */}
        <FeePieCard
          title="Fee Paid"
          subtitle="Realized collections by category"
          badgeText="Completed Collections"
          badgeColor="bg-emerald-50 text-emerald-700 border border-emerald-100"
          icon={CheckCircle2}
          data={feePaid}
          totalAmount={totals.totalPaid}
          loading={loading}
        />

        {/* Pie Chart 3: Fee Pending */}
        <FeePieCard
          title="Fee Pending"
          subtitle="Outstanding receivables by category"
          badgeText="Unpaid Receivables"
          badgeColor="bg-amber-50 text-amber-700 border border-amber-100"
          icon={Clock}
          data={feePending}
          totalAmount={totals.totalPending}
          loading={loading}
        />
      </div>
    </div>
  );
}
