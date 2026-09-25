import { useState, useEffect } from 'react';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileSpreadsheet, TrendingUp } from 'lucide-react';

const COLORS = ['#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#16a34a', '#f59e0b', '#ef4444'];

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [aging, setAging] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ academicYear: '', course: '' });
  const [academicYears, setAcademicYears] = useState([]);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/audit/academic-years'),
      api.get('/students/courses')
    ]).then(([aRes, cRes]) => {
      setAcademicYears(aRes.data.data || []);
      setCourses(cRes.data.data.courses || []);
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
    } catch { } finally { setLoading(false); }
  };

  const exportExcel = async () => {
    const res = await api.get('/exports/excel', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = `Full_Report_${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
  };

  if (loading) return <div><Topbar title="Reports" /><div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-4 border-navy-200 border-t-navy-600 rounded-full animate-spin" /></div></div>;

  const courseData = (data?.courseWise || []).map(c => ({ name: c._id, value: c.total }));
  const yearData = (data?.yearWise || []).map(y => ({ name: y._id, value: y.total }));

  return (
    <div>
      <Topbar title="Reports" />
      <div className="p-6 pt-4 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-800">Reports & Analytics</h1>
          <div className="flex gap-3">
            <select value={filters.academicYear} onChange={e => setFilters(prev => ({ ...prev, academicYear: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              <option value="">All Years</option>
              {academicYears.map(y => <option key={y.year} value={y.year}>{y.year}</option>)}
            </select>
            <button onClick={fetchReports} className="px-4 py-2 bg-navy-700 text-white rounded-xl text-sm font-medium hover:bg-navy-800">Apply</button>
            <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700">
              <FileSpreadsheet className="w-4 h-4" /> Export Full Excel
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Total Collection</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(data?.totalCollection)}</p>
            <p className="text-sm text-gray-400 mt-1">{data?.totalTransactions || 0} transactions</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">Outstanding Aging</p>
            {aging && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {Object.entries(aging).map(([range, val]) => (
                  <div key={range} className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">{range} days</p>
                    <p className="text-sm font-bold text-gray-800">{formatCurrency(val.total)}</p>
                    <p className="text-xs text-gray-400">{val.students?.length || 0} students</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Course-wise */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Course-wise Collection</h3>
            {courseData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart><Pie data={courseData} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value">
                    {courseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Tooltip formatter={v => formatCurrency(v)} /></PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">{courseData.map((c, i) => (
                  <div key={c.name} className="flex justify-between text-sm"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-gray-600">{c.name}</span></div><span className="font-medium">{formatCurrency(c.value)}</span></div>
                ))}</div>
              </>
            ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>}
          </div>

          {/* Year-wise */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Year-wise Collection</h3>
            {yearData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={yearData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} /><Tooltip formatter={v => formatCurrency(v)} /><Bar dataKey="value" fill="#2563eb" radius={[6,6,0,0]} /></BarChart>
              </ResponsiveContainer>
            ) : <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
