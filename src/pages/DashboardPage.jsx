import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';
import { motion } from 'framer-motion';
import {
  Users, IndianRupee, TrendingUp, Clock, ArrowUpRight,
  UserPlus, CreditCard, Search, FileSpreadsheet, FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93bbfd', '#bfdbfe'];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/reports/dashboard');
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
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

  const statCards = [
    { label: 'Total Students', value: stats?.totalStudents || 0, icon: Users, color: 'bg-blue-50 text-blue-600', isCurrency: false },
    { label: 'Total Fee', value: stats?.totalFee || 0, icon: IndianRupee, color: 'bg-indigo-50 text-indigo-600', isCurrency: true },
    { label: 'Total Collected', value: stats?.totalCollected || 0, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600', isCurrency: true },
    { label: 'Total Pending', value: stats?.totalPending || 0, icon: Clock, color: 'bg-amber-50 text-amber-600', isCurrency: true },
    { label: "Today's Collection", value: stats?.todayCollection || 0, icon: ArrowUpRight, color: 'bg-violet-50 text-violet-600', isCurrency: true },
  ];

  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="p-6 pt-4 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {card.isCurrency ? formatCurrency(card.value) : card.value.toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Collection Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <h3 className="text-base font-semibold text-gray-800 mb-4">Monthly Collection</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Collection']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Bar dataKey="amount" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data available</div>
            )}
          </motion.div>

          {/* Payment Mode Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <h3 className="text-base font-semibold text-gray-800 mb-4">Payment Modes</h3>
            {modeData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={modeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {modeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {modeData.map((m, i) => (
                    <div key={m.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-600">{m.name}</span>
                      </div>
                      <span className="font-medium text-gray-800">{formatCurrency(m.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
            )}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Payments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">Recent Payments</h3>
              <button onClick={() => navigate('/payments')} className="text-sm text-navy-600 hover:text-navy-700 font-medium">
                View All →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Student</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Mode</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(stats?.recentPayments || []).slice(0, 8).map(p => (
                    <tr key={p.receiptNo} className="hover:bg-gray-50/50">
                      <td className="py-2.5 pr-4">
                        <p className="text-sm font-medium text-gray-800">{p.student?.name || p.studentId}</p>
                        <p className="text-xs text-gray-500">{p.receiptNo}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-sm font-semibold text-gray-800">{formatCurrency(p.amountPaid)}</td>
                      <td className="py-2.5 pr-4 text-sm text-gray-600">{p.paymentMode}</td>
                      <td className="py-2.5 text-sm text-gray-500">{formatDate(p.paymentDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!stats?.recentPayments || stats.recentPayments.length === 0) && (
                <div className="py-8 text-center text-gray-400 text-sm">No payments recorded yet</div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions + High Pending */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
            >
              <h3 className="text-base font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {isAdmin && (
                  <button onClick={() => navigate('/students/new')} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-navy-700 bg-navy-50 hover:bg-navy-100 transition-colors">
                    <UserPlus className="w-4 h-4" /> Add Student
                  </button>
                )}
                <button onClick={() => navigate('/record-payment')} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                  <CreditCard className="w-4 h-4" /> Record Payment
                </button>
                <button onClick={() => navigate('/students')} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <Search className="w-4 h-4" /> Search Student
                </button>
                {isAdmin && (
                  <>
                    <button onClick={() => navigate('/reports')} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
                      <FileText className="w-4 h-4" /> Fee Reports
                    </button>
                    <button
                      onClick={async () => {
                        const res = await api.get('/exports/excel', { responseType: 'blob' });
                        const url = window.URL.createObjectURL(new Blob([res.data]));
                        const a = document.createElement('a'); a.href = url;
                        a.download = `Fee_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
                        a.click();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Export Excel
                    </button>
                  </>
                )}
              </div>
            </motion.div>

            {/* High Pending Students */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
            >
              <h3 className="text-base font-semibold text-gray-800 mb-4">High Pending Fees</h3>
              <div className="space-y-3">
                {(stats?.highPendingStudents || []).slice(0, 5).map(s => (
                  <div
                    key={s.studentId}
                    onClick={() => navigate(`/students/${s.studentId}`)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.course} • {s.currentYear}</p>
                    </div>
                    <p className="text-sm font-bold text-red-600">{formatCurrency(s.totalPending)}</p>
                  </div>
                ))}
                {(!stats?.highPendingStudents || stats.highPendingStudents.length === 0) && (
                  <div className="py-4 text-center text-gray-400 text-sm">No pending fees</div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
