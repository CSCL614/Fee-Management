import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, CheckCircle2, Clock, PieChart as PieIcon,
  ChevronDown, ChevronUp, RotateCcw, Calendar
} from 'lucide-react';
import { FeePieCard } from '../common/FeePieCard';
import { fadeInUp } from '../../utils/animations';

export default function StudentFeeAnalyticsSection({ feeSummary, studentName }) {
  const [selectedYear, setSelectedYear] = useState('all');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const yearSummaries = feeSummary?.yearSummaries || [];
  const overall = feeSummary?.overall || {};

  // Available academic year filter options
  const yearOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Overall (All Academic Years)' },
      ...yearSummaries.map(ys => ({
        value: ys.academicYear,
        label: `${ys.year} (${ys.academicYear})`
      }))
    ];
  }, [yearSummaries]);

  // Aggregate category metrics based on selected year
  const { demandData, paidData, pendingData, totalDemanded, totalPaid, totalPending } = useMemo(() => {
    const demandMap = new Map();
    const paidMap = new Map();
    const pendingMap = new Map();

    const activeYears = selectedYear === 'all'
      ? yearSummaries
      : yearSummaries.filter(ys => ys.academicYear === selectedYear);

    for (const ys of activeYears) {
      for (const cat of (ys.categories || [])) {
        const name = cat.category || 'Other Fee';
        const assessed = parseFloat(cat.amount) || 0;
        const paid = parseFloat(cat.paidAmount) || 0;
        const remaining = parseFloat(cat.remainingAmount) || 0;

        demandMap.set(name, (demandMap.get(name) || 0) + assessed);
        paidMap.set(name, (paidMap.get(name) || 0) + paid);
        pendingMap.set(name, (pendingMap.get(name) || 0) + remaining);
      }
    }

    const calcTotal = (map) => Array.from(map.values()).reduce((sum, v) => sum + v, 0);

    const sumDemand = calcTotal(demandMap);
    const sumPaid = calcTotal(paidMap);
    const sumPending = calcTotal(pendingMap);

    const formatSlices = (map, total) => {
      if (total <= 0) return [];
      return Array.from(map.entries())
        .filter(([_, amt]) => amt > 0)
        .map(([name, amt]) => {
          const pct = Math.round((amt / total) * 100);
          return {
            name,
            amount: amt,
            percentage: pct
          };
        })
        .sort((a, b) => b.amount - a.amount);
    };

    return {
      demandData: formatSlices(demandMap, sumDemand),
      paidData: formatSlices(paidMap, sumPaid),
      pendingData: formatSlices(pendingMap, sumPending),
      totalDemanded: sumDemand,
      totalPaid: sumPaid,
      totalPending: sumPending
    };
  }, [yearSummaries, selectedYear]);

  if (!yearSummaries.length) return null;

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      {/* Header bar with controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-blue-600 shrink-0">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Student Fee Analytics & Distribution
              </h3>
              {studentName && (
                <span className="text-[11px] font-semibold text-slate-500 font-mono hidden sm:inline">
                  — {studentName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Individual assessed demand, realized collections, and outstanding receivables by fee category
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Academic Year Selector */}
          {yearOptions.length > 2 && (
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 text-xs font-semibold py-1.5 pl-3 pr-8 rounded-xl transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {yearOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          )}

          {selectedYear !== 'all' && (
            <button
              onClick={() => setSelectedYear('all')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Reset to All Years"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Overall</span>
            </button>
          )}

          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
            title={isCollapsed ? 'Expand analytics charts' : 'Collapse analytics charts'}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Show Charts</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                <span>Hide Charts</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3 Analytics Pie Cards */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            <FeePieCard
              title="Fee to be Collected"
              subtitle="Assessed demand by fee category"
              badgeText="Assessed Demand"
              badgeColor="bg-blue-50 text-blue-700 border border-blue-200"
              icon={Layers}
              data={demandData}
              totalAmount={totalDemanded}
              loading={false}
            />

            <FeePieCard
              title="Fee Paid"
              subtitle="Realized collections by category"
              badgeText="Completed Collections"
              badgeColor="bg-emerald-50 text-emerald-700 border border-emerald-200"
              icon={CheckCircle2}
              data={paidData}
              totalAmount={totalPaid}
              loading={false}
            />

            <FeePieCard
              title="Fee Pending"
              subtitle="Outstanding receivables by category"
              badgeText="Unpaid Receivables"
              badgeColor="bg-amber-50 text-amber-700 border border-amber-200"
              icon={Clock}
              data={pendingData}
              totalAmount={totalPending}
              loading={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
