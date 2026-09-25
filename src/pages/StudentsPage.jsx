import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency, getStatusColor } from '../utils/helpers';
import { motion } from 'framer-motion';
import { UserPlus, Filter, ChevronLeft, ChevronRight, Users as UsersIcon } from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', level: '', course: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [courses, setCourses] = useState([]);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/students/courses').then(res => setCourses(res.data.data.courses || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [pagination.page, filters.level, filters.course, filters.status]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 15 };
      if (filters.search) params.search = filters.search;
      if (filters.level) params.level = filters.level;
      if (filters.course) params.course = filters.course;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/students', { params });
      setStudents(res.data.data || []);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchStudents();
  };

  return (
    <div>
      <Topbar title="Students" />
      <div className="p-6 pt-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Student Directory</h1>
            <p className="text-sm text-gray-500">{pagination.total} students found</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${showFilters ? 'bg-navy-50 border-navy-200 text-navy-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate('/students/new')}
                className="flex items-center gap-2 px-5 py-2.5 bg-navy-700 hover:bg-navy-800 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" /> Add Student
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            placeholder="Search by name, ID, admission no, phone, email..."
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-500"
          />
          <button type="submit" className="px-6 py-2.5 bg-navy-700 text-white rounded-xl text-sm font-medium hover:bg-navy-800 transition-colors">
            Search
          </button>
        </form>

        {/* Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-3"
          >
            <select
              value={filters.level}
              onChange={e => { setFilters(prev => ({ ...prev, level: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Levels</option>
              <option value="UG">UG</option>
              <option value="PG">PG</option>
            </select>
            <select
              value={filters.course}
              onChange={e => { setFilters(prev => ({ ...prev, course: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Courses</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filters.status}
              onChange={e => { setFilters(prev => ({ ...prev, status: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Graduated">Graduated</option>
              <option value="Discontinued">Discontinued</option>
              <option value="Transferred">Transferred</option>
            </select>
            <button
              onClick={() => { setFilters({ search: '', level: '', course: '', status: '' }); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear All
            </button>
          </motion.div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {['Student ID', 'Student Name', 'Course', 'Level', 'Year', 'Total Fee', 'Paid', 'Pending', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="10" className="py-12 text-center text-gray-400 text-sm">Loading...</td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan="10" className="py-12 text-center">
                    <UsersIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No students found</p>
                  </td></tr>
                ) : (
                  students.map((s, i) => (
                    <motion.tr
                      key={s.studentId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/students/${s.studentId}`)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{s.studentId}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.admissionNo}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.course}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${s.level === 'PG' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                          {s.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.currentYear}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{formatCurrency(s.totalFee)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-emerald-600">{formatCurrency(s.totalPaid)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-red-600">{formatCurrency(s.totalPending)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(s.feeStatus)}`}>
                          {s.feeStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-sm text-navy-600 hover:text-navy-700 font-medium">View →</button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
