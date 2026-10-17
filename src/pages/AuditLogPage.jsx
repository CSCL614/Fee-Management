import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatDateTime } from '../utils/helpers';
import { pageVariants } from '../utils/animations';
import { Shield, ChevronLeft, ChevronRight, Filter, ShieldAlert, CheckCircle2, AlertTriangle, UserCheck } from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => { fetchLogs(); }, [pagination.page, filterAction]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 25 };
      if (filterAction) params.action = filterAction;
      const res = await api.get('/audit', { params });
      setLogs(res.data.data || []);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    if (action.includes('Cancelled')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('Recorded') || action.includes('Created')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('Edited') || action.includes('Updated')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (action.includes('Promoted')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const startIdx = pagination.total === 0 ? 0 : (pagination.page - 1) * 25 + 1;
  const endIdx = Math.min(pagination.page * 25, pagination.total);

  return (
    <div>
      <Topbar title="Audit Log" />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 space-y-5"
      >
        
        {/* Header & Filter Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  System Security & Audit Trail
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                    {pagination.total || 0} Events
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Immutable forensic trail of all financial, student, and authorization transactions</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                <Filter className="w-3.5 h-3.5" /> Action:
              </div>
              <select
                value={filterAction}
                onChange={e => { setFilterAction(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="">All Security Events</option>
                {['Login', 'Payment Recorded', 'Payment Edited', 'Payment Cancelled', 'Student Created', 'Student Updated', 'Student Promoted', 'Fee Structure Created', 'Fee Demand Created', 'User Created'].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Audit Description</th>
                  <th className="py-3 px-4">Mandatory Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  [1, 2, 3, 4, 5, 6].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-4"><div className="w-24 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-20 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-14 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-24 h-5 skeleton rounded-full" /></td>
                      <td className="py-3.5 px-4"><div className="w-20 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-36 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-24 h-4 skeleton rounded" /></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center">
                      <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-800">No audit events found</p>
                      <p className="text-xs text-slate-400 mt-1">No log entries match the selected action filter.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {formatDateTime(l.timestamp)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{l.userName}</td>
                      <td className="py-3 px-4 text-slate-500 capitalize">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {l.userRole}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getActionBadge(l.action)}`}>
                          {l.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-mono text-[11px]">
                        {l.entity} {l.entityId ? `(${l.entityId})` : ''}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={l.description}>
                        {l.description}
                      </td>
                      <td className="py-3 px-4">
                        {l.reason ? (
                          <span className="font-medium text-slate-800 bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded text-[11px] inline-block max-w-xs truncate" title={l.reason}>
                            {l.reason}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ERP Pagination Footer */}
          {pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/50 gap-3">
              <p className="text-xs text-slate-500 font-medium">
                Showing <span className="font-semibold text-slate-800">{startIdx}</span> to <span className="font-semibold text-slate-800">{endIdx}</span> of <span className="font-semibold text-slate-800">{pagination.total}</span> audit records
              </p>
              
              <div className="flex items-center gap-1.5">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </motion.button>

                <div className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200">
                  {pagination.page} / {pagination.pages || 1}
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}
