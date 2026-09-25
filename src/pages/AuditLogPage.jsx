import { useState, useEffect } from 'react';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatDateTime } from '../utils/helpers';
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react';

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
    } catch { } finally { setLoading(false); }
  };

  return (
    <div>
      <Topbar title="Audit Log" />
      <div className="p-6 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div><h1 className="text-xl font-bold text-gray-800">Audit Log</h1><p className="text-sm text-gray-500">Track all system actions</p></div>
          <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
            <option value="">All Actions</option>
            {['Login', 'Payment Recorded', 'Payment Edited', 'Payment Cancelled', 'Student Created', 'Student Updated', 'Student Promoted', 'Fee Structure Created', 'Fee Demand Created', 'User Created'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                {['Date & Time', 'User', 'Role', 'Action', 'Entity', 'Description', 'Reason'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="7" className="py-12 text-center text-gray-400">Loading...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan="7" className="py-12 text-center"><Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm">No audit logs</p></td></tr>
                ) : logs.map((l, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDateTime(l.timestamp)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{l.userName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{l.userRole}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-navy-50 text-navy-700 rounded text-xs font-medium">{l.action}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{l.entity} {l.entityId ? `(${l.entityId})` : ''}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{l.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{l.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</p>
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
