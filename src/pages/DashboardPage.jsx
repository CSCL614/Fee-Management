import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/common/Topbar';
import PageContainer from '../components/common/PageContainer';
import HeroBanner from '../components/dashboard/HeroBanner';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, IndianRupee, TrendingUp, Clock, ArrowUpRight,
  UserPlus, CreditCard, Search, FileSpreadsheet, FileText,
  Calendar, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2,
  X, Loader2, Wallet, Banknote
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList
} from 'recharts';
import {
  AnimatedNumber, staggerContainer, staggerItem,
  fadeInUp
} from '../utils/animations';

const CHART_COLORS = ['#1e3a8a', '#2563eb', '#38bdf8', '#818cf8', '#c084fc', '#f59e0b'];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Accountant Quick Student Search State
  const [accountantSearch, setAccountantSearch] = useState('');
  const [accountantSearchResults, setAccountantSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/reports/dashboard');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountantSearch = async (val) => {
    setAccountantSearch(val);
    if (val.trim().length < 2) {
      setAccountantSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`/students/search?q=${encodeURIComponent(val.trim())}`);
      setAccountantSearchResults(res.data.data || []);
    } catch {
      setAccountantSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Topbar title="Dashboard" />
        <div className="p-4 sm:p-6 space-y-6 animate-pulse">
          {/* Skeleton Hero */}
          <div className="h-64 bg-slate-200/70 rounded-3xl skeleton" />
          {/* Skeleton Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
                <div className="w-10 h-10 skeleton rounded-xl" />
                <div className="w-24 h-6 skeleton rounded" />
                <div className="w-16 h-4 skeleton rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-80 bg-white rounded-2xl border border-slate-200/80 p-6 skeleton" />
            <div className="h-80 bg-white rounded-2xl border border-slate-200/80 p-6 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = (stats?.monthlyCollection || []).map(m => ({
    name: `${monthNames[m._id.month - 1]} ${String(m._id.year).slice(2)}`,
    amount: m.total
  }));

  const modeData = (stats?.modeDistribution || []).map(m => ({
    name: m._id,
    value: m.total
  }));

  const totalFeeVal = stats?.totalFee || 0;
  const totalCollectedVal = stats?.totalCollected || 0;
  const collectionRate = totalFeeVal > 0 ? Math.round((totalCollectedVal / totalFeeVal) * 100) : 0;

  // Admin KPI metrics
  const adminStatCards = [
    {
      label: 'Total Students',
      value: stats?.totalStudents || 0,
      icon: Users,
      color: 'bg-blue-50 text-blue-600 border border-blue-100',
      badge: 'Enrolled',
      badgeColor: 'bg-blue-50 text-blue-700',
      isCurrency: false
    },
    {
      label: 'Total Assessed Fee',
      value: stats?.totalFee || 0,
      icon: IndianRupee,
      color: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      badge: 'All Batches',
      badgeColor: 'bg-indigo-50 text-indigo-700',
      isCurrency: true
    },
    {
      label: 'Fee Collected',
      value: stats?.totalCollected || 0,
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      badge: `${collectionRate}% Recvd`,
      badgeColor: 'bg-emerald-50 text-emerald-700 font-semibold',
      isCurrency: true
    },
    {
      label: 'Outstanding Dues',
      value: stats?.totalPending || 0,
      icon: Clock,
      color: 'bg-amber-50 text-amber-600 border border-amber-100',
      badge: 'Pending',
      badgeColor: 'bg-amber-50 text-amber-700 font-semibold',
      isCurrency: true
    },
    {
      label: "Today's Collection",
      value: stats?.todayCollection || 0,
      icon: ArrowUpRight,
      color: 'bg-teal-50 text-teal-600 border border-teal-100',
      badge: 'Daily',
      badgeColor: 'bg-teal-50 text-teal-700 font-semibold',
      isCurrency: true
    },
  ];

  // Accountant KPI metrics (focused on daily collections and receivables)
  const accountantStatCards = [
    {
      label: "Today's Fee Receipts",
      value: stats?.todayCollection || 0,
      icon: IndianRupee,
      color: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      badge: 'Counter Live',
      badgeColor: 'bg-emerald-50 text-emerald-700 font-bold',
      isCurrency: true
    },
    {
      label: 'Outstanding Dues',
      value: stats?.totalPending || 0,
      icon: Clock,
      color: 'bg-amber-50 text-amber-600 border border-amber-100',
      badge: 'Receivables',
      badgeColor: 'bg-amber-50 text-amber-700 font-semibold',
      isCurrency: true
    },
    {
      label: 'Active Enrolled Students',
      value: stats?.totalStudents || 0,
      icon: Users,
      color: 'bg-blue-50 text-blue-600 border border-blue-100',
      badge: 'Cohort',
      badgeColor: 'bg-blue-50 text-blue-700',
      isCurrency: false
    },
    {
      label: 'Total Campus Collections',
      value: stats?.totalCollected || 0,
      icon: Wallet,
      color: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      badge: `${collectionRate}% Settled`,
      badgeColor: 'bg-indigo-50 text-indigo-700',
      isCurrency: true
    }
  ];

  return (
    <div>
      <Topbar title={isAdmin ? 'Administrative Dashboard' : 'Accountant Collection Desk'} />
      <PageContainer className="p-4 sm:p-6 space-y-6">
        
        {/* 1. Visually Stunning Hero Landing Banner */}
        <HeroBanner />

        {/* 2. ROLE-BASED DASHBOARD CONTENT */}
        {isAdmin ? (
          /* ========================================================
             ADMIN DASHBOARD EXPERIENCE
             Full executive view with KPI stats, trends, activations
             ======================================================== */
          <>
            {/* Metric Cards Banner with Staggered Entrance and Count-up */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
            >
              {adminStatCards.map((card) => (
                <motion.div
                  key={card.label}
                  variants={staggerItem}
                  whileHover={{ y: -3, transition: { duration: 0.18 } }}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-shadow group cursor-default"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                    <AnimatedNumber value={card.value} isCurrency={card.isCurrency} />
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-1">{card.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Collection Bar Chart */}
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="show"
                className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Monthly Fee Inflow</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Aggregated fee collections across academic months</p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                    <Calendar className="w-3.5 h-3.5" /> Recent Months
                  </span>
                </div>

                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={310}>
                    <BarChart data={monthlyData} margin={{ top: 25, right: 15, left: -10, bottom: 0 }} barCategoryGap="16%">
                      <defs>
                        <linearGradient id="dashboardMonthlyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                          <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.92} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(37, 99, 235, 0.05)', radius: 6 }}
                        formatter={(value) => [formatCurrency(value), 'Collection']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontSize: '12px' }}
                      />
                      <Bar
                        dataKey="amount"
                        fill="url(#dashboardMonthlyGrad)"
                        radius={[8, 8, 0, 0]}
                        barSize={52}
                        maxBarSize={64}
                        isAnimationActive={true}
                        animationDuration={850}
                        animationEasing="ease-out"
                      >
                        <LabelList
                          dataKey="amount"
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
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
                    <TrendingUp className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
                    No collection records logged for this period
                  </div>
                )}
              </motion.div>

              {/* Payment Mode Distribution Pie Chart */}
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="show"
                className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col"
              >
                <div className="mb-4 pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Payment Breakdown</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Distribution by instrument/channel</p>
                </div>

                {modeData.length > 0 ? (
                  <div className="flex-1 flex flex-col justify-between">
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie
                          data={modeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={78}
                          paddingAngle={4}
                          dataKey="value"
                          isAnimationActive={true}
                          animationDuration={750}
                          animationEasing="ease-out"
                        >
                          {modeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '10px', fontSize: '12px', border: '1px solid #e2e8f0' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                      {modeData.map((m, i) => (
                        <div key={m.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-slate-600 font-medium truncate">{m.name}</span>
                          </div>
                          <span className="font-semibold text-slate-800 shrink-0 font-mono">{formatCurrency(m.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-sm">
                    <CreditCard className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
                    No payment mode records found
                  </div>
                )}
              </motion.div>
            </div>

            {/* Detailed Sections: Recent Payments + Quick Actions / High Pending */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Recent Payments Table */}
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="show"
                className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Latest Receipts</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Recently processed transactions with issued vouchers</p>
                  </div>
                  <button
                    onClick={() => navigate('/payments')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 px-3 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
                  >
                    Full History <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto -mx-5 sm:mx-0">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                        <th className="py-2.5 px-4 rounded-l-lg">Student / Receipt</th>
                        <th className="py-2.5 px-4">Paid Amount</th>
                        <th className="py-2.5 px-4">Channel</th>
                        <th className="py-2.5 px-4 rounded-r-lg">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(stats?.recentPayments || []).slice(0, 6).map(p => (
                        <tr
                          key={p.receiptNo}
                          onClick={() => navigate(p.student?.studentId ? `/students/${p.student.studentId}` : '/payments')}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase shrink-0 transition-transform duration-200 group-hover:scale-105">
                                {(p.student?.name || p.studentId || 'S').charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                                  {p.student?.name || p.studentId}
                                </p>
                                <p className="text-[11px] font-mono text-slate-500">{p.receiptNo}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-mono">
                              {formatCurrency(p.amountPaid)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {p.paymentMode}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-500">
                            {formatDate(p.paymentDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {(!stats?.recentPayments || stats.recentPayments.length === 0) && (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      No transactions recorded yet
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Quick Actions & Administrative Column */}
              <div className="space-y-6">
                
                {/* ERP Shortcuts Card */}
                <motion.div
                  variants={fadeInUp}
                  initial="hidden"
                  animate="show"
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
                >
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Admin Shortcuts</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <motion.button
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/students/new')}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-blue-900 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <UserPlus className="w-4 h-4 text-blue-600" />
                        <span>Enroll New Student</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/record-payment')}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span>Collect Student Fee</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    </motion.button>

                    <motion.button
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/reports')}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-violet-900 bg-violet-50/70 hover:bg-violet-100/80 border border-violet-200/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-violet-600" />
                        <span>Audit & Defaulter Reports</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-violet-400" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        const res = await api.get('/exports/excel', { responseType: 'blob' });
                        const url = window.URL.createObjectURL(new Blob([res.data]));
                        const a = document.createElement('a'); a.href = url;
                        a.download = `Fee_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
                        a.click();
                      }}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-teal-900 bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                        <span>Download Complete Master Sheet</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                    </motion.button>
                  </div>
                </motion.div>

                {/* Scheduled Fee Activations */}
                {stats?.upcomingFeeActivations?.length > 0 && (
                  <motion.div
                    variants={fadeInUp}
                    initial="hidden"
                    animate="show"
                    className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-[0_1px_3px_rgba(245,158,11,0.06)] bg-gradient-to-br from-white to-amber-50/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Scheduled Activations
                      </h3>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                        {stats.upcomingFeeActivations.length} Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3">Exam, lab & term fees scheduled for automatic ledger entry</p>
                    
                    <div className="space-y-2">
                      {stats.upcomingFeeActivations.map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-white border border-amber-200/60 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-800">{item.category}</p>
                            <p className="text-[11px] text-slate-500">
                              {item.semester ? `${item.semester} • ` : ''}{item.academicYear}
                            </p>
                            <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                              Date: {new Date(item.activationDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-lg border border-amber-200 font-mono">
                            {item.count} std
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Top Outstanding Dues Card */}
                <motion.div
                  variants={fadeInUp}
                  initial="hidden"
                  animate="show"
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Top Outstanding Dues
                    </h3>
                    <button
                      onClick={() => navigate('/pending-fees')}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(stats?.highPendingStudents || []).slice(0, 5).map(s => (
                      <div
                        key={s.studentId}
                        onClick={() => navigate(`/students/${s.studentId}`)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200/70 transition-all group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                            {s.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{s.course} • {s.currentYear}</p>
                        </div>
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 font-mono shrink-0">
                          {formatCurrency(s.totalPending)}
                        </span>
                      </div>
                    ))}

                    {(!stats?.highPendingStudents || stats.highPendingStudents.length === 0) && (
                      <div className="py-4 text-center text-slate-400 text-xs flex items-center justify-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        All student fee accounts are fully settled
                      </div>
                    )}
                  </div>
                </motion.div>

              </div>
            </div>
          </>
        ) : (
          /* ========================================================
             ACCOUNTANT DASHBOARD EXPERIENCE
             Focused on Student Quick Search, Today's Receipts, & Collection Queue
             ======================================================== */
          <>
            {/* Interactive Student Quick-Lookup Bar */}
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="show"
              className="bg-white rounded-2xl p-5 border border-blue-200/80 shadow-[0_4px_20px_rgba(37,99,235,0.06)]"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-600" /> Quick Student Fee Collection Desk
                  </h3>
                  <p className="text-xs text-slate-500">
                    Instantly look up student accounts by admission number, student name, or course to record payment
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5" /> Cashier Mode Active
                </span>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={accountantSearch}
                  onChange={e => handleAccountantSearch(e.target.value)}
                  placeholder="Type student name (e.g. Ramesh), admission no, or student ID..."
                  className="w-full pl-10 pr-10 py-3 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {searching && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 animate-spin" />
                )}
                {accountantSearch && !searching && (
                  <button
                    onClick={() => { setAccountantSearch(''); setAccountantSearchResults([]); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown Cards */}
              <AnimatePresence>
                {accountantSearchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-3 divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50"
                  >
                    {accountantSearchResults.map(s => (
                      <div
                        key={s.studentId}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{s.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {s.admissionNo || s.studentId} • {s.course} ({s.currentYear})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <span className="text-xs font-bold font-mono text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
                            Pending: {formatCurrency(s.totalPending ?? 0)}
                          </span>
                          <button
                            onClick={() => navigate(`/record-payment?student=${s.studentId}`)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Collect Fee</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Accountant Focused KPI Cards */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {accountantStatCards.map((card) => (
                <motion.div
                  key={card.label}
                  variants={staggerItem}
                  whileHover={{ y: -3, transition: { duration: 0.18 } }}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-shadow group cursor-default"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                    <AnimatedNumber value={card.value} isCurrency={card.isCurrency} />
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-1">{card.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Operational Split Layout: Collection Queue & Daily Channel Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (2 cols): Pending Fee Defaulters Queue */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Immediate Collection Queue */}
                <motion.div
                  variants={fadeInUp}
                  initial="hidden"
                  animate="show"
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500" /> Pending Collection Queue
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Students with outstanding fees requiring collection follow-up</p>
                    </div>
                    <button
                      onClick={() => navigate('/pending-fees')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                    >
                      View All Defaulters <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto -mx-5 sm:mx-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                          <th className="py-2.5 px-4 rounded-l-lg">Student Particulars</th>
                          <th className="py-2.5 px-4">Course & Year</th>
                          <th className="py-2.5 px-4 text-right">Outstanding Due</th>
                          <th className="py-2.5 px-4 text-right rounded-r-lg">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {(stats?.highPendingStudents || []).slice(0, 6).map(s => (
                          <tr key={s.studentId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-medium text-slate-800">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {s.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">{s.name}</p>
                                  <p className="text-[11px] text-slate-400 font-mono">{s.admissionNo || s.studentId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <p className="font-medium">{s.course}</p>
                              <span className="text-[11px] text-slate-400">{s.currentYear}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                              {formatCurrency(s.totalPending)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => navigate(`/record-payment?student=${s.studentId}`)}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Collect</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {(!stats?.highPendingStudents || stats.highPendingStudents.length === 0) && (
                      <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        No outstanding dues currently pending!
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Today's & Recent Receipts Desk */}
                <motion.div
                  variants={fadeInUp}
                  initial="hidden"
                  animate="show"
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Issued Receipts</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Transactions committed to student ledgers</p>
                    </div>
                    <button
                      onClick={() => navigate('/payments')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                    >
                      All Transactions <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto -mx-5 sm:mx-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                          <th className="py-2.5 px-4 rounded-l-lg">Student / Voucher</th>
                          <th className="py-2.5 px-4">Amount</th>
                          <th className="py-2.5 px-4">Instrument</th>
                          <th className="py-2.5 px-4 rounded-r-lg">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {(stats?.recentPayments || []).slice(0, 5).map(p => (
                          <tr
                            key={p.receiptNo}
                            onClick={() => navigate(p.student?.studentId ? `/students/${p.student.studentId}` : '/payments')}
                            className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                          >
                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                {p.student?.name || p.studentId}
                              </p>
                              <p className="text-[11px] font-mono text-slate-400">{p.receiptNo}</p>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                              {formatCurrency(p.amountPaid)}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-medium">
                                {p.paymentMode}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-medium">
                              {formatDate(p.paymentDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

              </div>

              {/* Right Column (1 col): Channel Breakdown & Cashier Shortcuts */}
              <div className="space-y-6">
                
                {/* Payment Instruments Distribution */}
                <motion.div
                  variants={fadeInUp}
                  initial="hidden"
                  animate="show"
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
                >
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
                    Receipts by Channel
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">Cumulative distribution of processed collections</p>

                  <div className="space-y-3">
                    {modeData.map((m, idx) => (
                      <div key={m.name} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                          <span className="font-semibold text-slate-700">{m.name}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">{formatCurrency(m.value)}</span>
                      </div>
                    ))}
                    {modeData.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">No collection instruments logged</p>
                    )}
                  </div>
                </motion.div>

                {/* Accountant Fast Actions Desk */}
                <motion.div
                  variants={fadeInUp}
                  initial="hidden"
                  animate="show"
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
                >
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Cashier Fast Actions
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    <motion.button
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/record-payment')}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span>Record Payment Voucher</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    </motion.button>

                    <motion.button
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/pending-fees')}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-amber-900 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Defaulter & Dues Register</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    </motion.button>

                    <motion.button
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/students')}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Search className="w-4 h-4 text-slate-500" />
                        <span>Search Student Directory</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </motion.button>

                    <motion.button
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/payments')}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-blue-900 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>All Payment Receipts History</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                    </motion.button>
                  </div>
                </motion.div>

              </div>
            </div>
          </>
        )}

      </PageContainer>
    </div>
  );
}
