import { useState, useEffect } from 'react';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Settings, Building, CreditCard, Calendar, BookOpen, Plus, Check, Save, Edit3, Power, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants } from '../utils/animations';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [academicYears, setAcademicYears] = useState([]);
  const [newAY, setNewAY] = useState({
    year: '',
    course: 'All',
    studyYear: 'All',
    startDate: '',
    endDate: '',
    feeActivationDate: '',
    feeDueDate: '',
    status: 'active'
  });

  // Filter state for academic years
  const [ayFilterCourse, setAyFilterCourse] = useState('');
  const [ayFilterStudyYear, setAyFilterStudyYear] = useState('');
  const [ayFilterStatus, setAyFilterStatus] = useState('');

  // Editing state for modal
  const [editingAY, setEditingAY] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [updatingAY, setUpdatingAY] = useState(false);

  const [courses, setCourses] = useState([]);
  const [newCourse, setNewCourse] = useState({ degree: 'B.Sc', specialization: '', duration: 3 });
  const [savingField, setSavingField] = useState(null);

  useEffect(() => {
    fetchSettingsAndYears();
  }, []);

  const fetchSettingsAndYears = async () => {
    try {
      const [settRes, ayRes, cRes] = await Promise.all([
        api.get('/audit/settings'),
        api.get('/audit/academic-years'),
        api.get('/courses')
      ]);
      setSettings(settRes.data.data || {});
      setAcademicYears(ayRes.data.data || []);
      setCourses(cRes.data.data?.courses || []);
    } catch {
      // Ignore initial fetch errors
    }
  };

  const saveSetting = async (key, value) => {
    setSavingField(key);
    try {
      await api.put('/audit/settings', { [key]: value });
      setSettings(prev => ({ ...prev, [key]: value }));
      toast.success('Configuration saved');
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSavingField(null);
    }
  };

  const addAcademicYear = async (e) => {
    e.preventDefault();
    if (!newAY.year.trim()) {
      toast.error('Academic year label is required (e.g., 2026-27)');
      return;
    }
    if (!newAY.startDate || !newAY.endDate) {
      toast.error('Start and end dates are required');
      return;
    }
    if (new Date(newAY.startDate) >= new Date(newAY.endDate)) {
      toast.error('Start date must precede end date');
      return;
    }
    if (newAY.feeActivationDate && newAY.feeDueDate && new Date(newAY.feeActivationDate) > new Date(newAY.feeDueDate)) {
      toast.error('Fee activation date cannot be after fee due date');
      return;
    }

    try {
      await api.post('/audit/academic-years', newAY);
      toast.success('Academic session registered successfully');
      setNewAY({
        year: '',
        course: 'All',
        studyYear: 'All',
        startDate: '',
        endDate: '',
        feeActivationDate: '',
        feeDueDate: '',
        status: 'active'
      });
      const res = await api.get('/audit/academic-years');
      setAcademicYears(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create academic year configuration');
    }
  };

  const handleOpenEditAY = (ay) => {
    setEditingAY({
      _id: ay._id,
      year: ay.year,
      course: ay.course || 'All',
      studyYear: ay.studyYear || 'All',
      startDate: ay.startDate ? ay.startDate.slice(0, 10) : '',
      endDate: ay.endDate ? ay.endDate.slice(0, 10) : '',
      feeActivationDate: ay.feeActivationDate ? ay.feeActivationDate.slice(0, 10) : '',
      feeDueDate: ay.feeDueDate ? ay.feeDueDate.slice(0, 10) : '',
      status: ay.status || 'active',
      isCurrent: ay.isCurrent || false
    });
    setEditModalOpen(true);
  };

  const handleSaveEditAY = async (e) => {
    e.preventDefault();
    if (!editingAY) return;
    if (new Date(editingAY.startDate) >= new Date(editingAY.endDate)) {
      toast.error('Start date must precede end date');
      return;
    }
    if (editingAY.feeActivationDate && editingAY.feeDueDate && new Date(editingAY.feeActivationDate) > new Date(editingAY.feeDueDate)) {
      toast.error('Fee activation date cannot be after fee due date');
      return;
    }

    setUpdatingAY(true);
    try {
      await api.put(`/audit/academic-years/${editingAY._id}`, {
        course: editingAY.course,
        studyYear: editingAY.studyYear,
        startDate: editingAY.startDate,
        endDate: editingAY.endDate,
        feeActivationDate: editingAY.feeActivationDate || null,
        feeDueDate: editingAY.feeDueDate || null,
        status: editingAY.status,
        isCurrent: editingAY.isCurrent
      });
      toast.success('Academic year configuration updated');
      setEditModalOpen(false);
      const res = await api.get('/audit/academic-years');
      setAcademicYears(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update academic year');
    } finally {
      setUpdatingAY(false);
    }
  };

  const handleToggleStatus = async (ay) => {
    const nextStatus = ay.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/audit/academic-years/${ay._id}/status`, { status: nextStatus });
      toast.success(`Academic session set to ${nextStatus}`);
      const res = await api.get('/audit/academic-years');
      setAcademicYears(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const addCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.specialization.trim()) {
      toast.error('Specialization title is required');
      return;
    }
    try {
      const derivedLevel = newCourse.degree === 'M.Sc' ? 'PG' : 'UG';
      await api.post('/courses', {
        ...newCourse,
        level: derivedLevel,
        duration: Number(newCourse.duration)
      });
      toast.success('Program curriculum registered successfully');
      setNewCourse({ degree: 'B.Sc', specialization: '', duration: 3 });
      const res = await api.get('/courses');
      setCourses(res.data.data?.courses || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register course');
    }
  };

  // Build unique course name list from courses
  const courseOptions = Array.from(
    new Set(
      courses.map(c => c.courseName || `${c.degree} ${c.specialization}`).filter(Boolean)
    )
  );

  // Filtered academic years
  const filteredAcademicYears = academicYears.filter(ay => {
    if (ayFilterCourse && ay.course !== ayFilterCourse) return false;
    if (ayFilterStudyYear && ay.studyYear !== ayFilterStudyYear) return false;
    if (ayFilterStatus && ay.status !== ayFilterStatus) return false;
    return true;
  });

  return (
    <div>
      <Topbar title="Settings" />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 space-y-6 max-w-5xl"
      >
        
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">System & Institution Configuration</h1>
              <p className="text-xs text-slate-500 mt-0.5">Manage college master parameters, branch-specific academic calendars, and course catalogs</p>
            </div>
          </div>
        </div>

        {/* 1. College Information */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Institution Profile</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                College / Institution Name
              </label>
              <input
                type="text"
                value={settings.collegeName || ''}
                onChange={e => setSettings(prev => ({ ...prev, collegeName: e.target.value }))}
                onBlur={e => saveSetting('collegeName', e.target.value)}
                placeholder="e.g. Sri Sai Degree & PG College"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Displayed on receipts and vouchers. Auto-saved on blur.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Official Campus Address
              </label>
              <input
                type="text"
                value={settings.collegeAddress || ''}
                onChange={e => setSettings(prev => ({ ...prev, collegeAddress: e.target.value }))}
                onBlur={e => saveSetting('collegeAddress', e.target.value)}
                placeholder="e.g. Vizianagaram, Andhra Pradesh"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Appears in header of reports and student demand statements.</span>
            </div>
          </div>
        </div>

        {/* 2. Payment & Accounting Policies */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Fee Collection Rules</h2>
          </div>

          <label className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={settings.allowAdvancePayment || false}
              onChange={e => saveSetting('allowAdvancePayment', e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-xs font-bold text-slate-900">Enable Advance Payment Balance Credit</p>
              <p className="text-xs text-slate-500 mt-0.5">
                When enabled, any payment exceeding the current active demand balance is preserved in the student's ledger as an Advance Credit. Pending balances will never become negative.
              </p>
            </div>
          </label>
        </div>

        {/* 3. Branch-Wise and Study-Year-Wise Academic-Year Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-purple-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Branch & Study-Year Academic Calendars</h2>
                <p className="text-xs text-slate-500 mt-0.5">Configure custom date spans and fee due dates per course and study year</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-mono font-semibold self-start sm:self-auto border border-purple-200/60">
              {academicYears.length} Configurations
            </span>
          </div>

          {/* Academic Years Filters */}
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Filter Calendars:
            </span>

            <select
              value={ayFilterCourse}
              onChange={e => setAyFilterCourse(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Courses</option>
              <option value="All">Global Default (All)</option>
              {courseOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={ayFilterStudyYear}
              onChange={e => setAyFilterStudyYear(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Study Years</option>
              <option value="All">All Years Default</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
              <option value="5th Year">5th Year</option>
            </select>

            <select
              value={ayFilterStatus}
              onChange={e => setAyFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {(ayFilterCourse || ayFilterStudyYear || ayFilterStatus) && (
              <button
                onClick={() => {
                  setAyFilterCourse('');
                  setAyFilterStudyYear('');
                  setAyFilterStatus('');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 hover:bg-rose-50 rounded-lg transition-colors ml-auto"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Academic Years Grid / Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredAcademicYears.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                No academic year configurations match your filter criteria.
              </div>
            ) : (
              filteredAcademicYears.map(y => (
                <div
                  key={y._id || `${y.year}-${y.course}-${y.studyYear}`}
                  className="p-3.5 bg-slate-50/90 hover:bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 font-mono">{y.year}</span>
                        {y.isCurrent && (
                          <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                            Current
                          </span>
                        )}
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          y.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {y.status}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-blue-700 mt-1">
                        {y.course || 'All Courses'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Study Year: <span className="font-semibold text-slate-700">{y.studyYear || 'All'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditAY(y)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Configuration"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(y)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          y.status === 'active'
                            ? 'text-emerald-600 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={y.status === 'active' ? 'Deactivate session' : 'Activate session'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 text-[11px] space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration:</span>
                      <span className="font-mono text-slate-700">
                        {y.startDate ? new Date(y.startDate).toLocaleDateString() : '—'} to {y.endDate ? new Date(y.endDate).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    {y.feeDueDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Fee Due Date:</span>
                        <span className="font-mono text-amber-700 font-semibold">
                          {new Date(y.feeDueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add / Register Academic Configuration Form */}
          <form onSubmit={addAcademicYear} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Configure New Academic Session / Branch Schedule
              </h3>
              <span className="text-[10px] text-slate-400">Unique for each Year + Course + Study Year</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                  Academic Year Label *
                </label>
                <input
                  type="text"
                  value={newAY.year}
                  onChange={e => setNewAY(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="e.g. 2026-27"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-medium focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                  Applicable Course / Branch *
                </label>
                <select
                  value={newAY.course}
                  onChange={e => setNewAY(prev => ({ ...prev, course: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:border-blue-500 focus:outline-none truncate"
                  required
                >
                  <option value="All">All (College-wide Default)</option>
                  {courseOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                  Study Year *
                </label>
                <select
                  value={newAY.studyYear}
                  onChange={e => setNewAY(prev => ({ ...prev, studyYear: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="All">All Study Years</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="5th Year">5th Year</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={newAY.startDate}
                  onChange={e => setNewAY(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={newAY.endDate}
                  onChange={e => setNewAY(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                  Fee Activation Date (Optional)
                </label>
                <input
                  type="date"
                  value={newAY.feeActivationDate}
                  onChange={e => setNewAY(prev => ({ ...prev, feeActivationDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                  Fee Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={newAY.feeDueDate}
                  onChange={e => setNewAY(prev => ({ ...prev, feeDueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                  Initial Status
                </label>
                <select
                  value={newAY.status}
                  onChange={e => setNewAY(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:border-blue-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
              >
                Add Academic Configuration
              </button>
            </div>
          </form>
        </div>

        {/* 4. College Courses Management */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Degree Programs & Courses</h2>
                <p className="text-xs text-slate-500 mt-0.5">Configured academic majors with assigned duration and level</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-semibold">
              {courses.length} Programs
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {courses.map(c => (
              <div
                key={c._id || c.courseId}
                className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="w-14 py-1 text-center font-bold text-xs bg-blue-50 text-blue-700 border border-blue-200/60 rounded-lg">
                    {c.degree}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{c.specialization}</p>
                    <p className="text-[11px] text-slate-500">{c.courseName || `${c.degree} ${c.specialization}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 font-medium rounded-md bg-white border border-slate-200 text-slate-600">
                    {c.duration} Yrs
                  </span>
                  <span className={`px-2 py-0.5 font-bold rounded-md ${c.level === 'PG' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    {c.level}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={addCourse} className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/70 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Register New Academic Program</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Degree *</label>
                <select
                  value={newCourse.degree}
                  onChange={e => {
                    const deg = e.target.value;
                    const dur = deg === 'M.Sc' ? 2 : 3;
                    setNewCourse(prev => ({ ...prev, degree: deg, duration: dur }));
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:border-blue-500 focus:outline-none"
                >
                  <option value="B.Sc">B.Sc</option>
                  <option value="B.Com">B.Com</option>
                  <option value="M.Sc">M.Sc</option>
                  <option value="BCA">BCA</option>
                  <option value="BBA">BBA</option>
                  <option value="MBA">MBA</option>
                  <option value="MCA">MCA</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Specialization Branch *</label>
                <input
                  type="text"
                  value={newCourse.specialization}
                  onChange={e => setNewCourse(prev => ({ ...prev, specialization: e.target.value }))}
                  placeholder="e.g. Physics, Data Science, AI"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Curriculum Duration (Years) *</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={newCourse.duration}
                  onChange={e => setNewCourse(prev => ({ ...prev, duration: parseInt(e.target.value, 10) || 1 }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-medium focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
              >
                Register Course
              </motion.button>
            </div>
          </form>
        </div>

      </motion.div>

      {/* Edit Academic Year Modal */}
      <AnimatePresence>
        {editModalOpen && editingAY && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Academic Configuration</h3>
                  <p className="text-xs text-slate-500 font-mono">{editingAY.year} — {editingAY.course} ({editingAY.studyYear})</p>
                </div>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditAY} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Applicable Course</label>
                    <select
                      value={editingAY.course}
                      onChange={e => setEditingAY(prev => ({ ...prev, course: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="All">All (College-wide Default)</option>
                      {courseOptions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Study Year</label>
                    <select
                      value={editingAY.studyYear}
                      onChange={e => setEditingAY(prev => ({ ...prev, studyYear: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="All">All Study Years</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="5th Year">5th Year</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={editingAY.startDate}
                      onChange={e => setEditingAY(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      value={editingAY.endDate}
                      onChange={e => setEditingAY(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Activation Date</label>
                    <input
                      type="date"
                      value={editingAY.feeActivationDate}
                      onChange={e => setEditingAY(prev => ({ ...prev, feeActivationDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Due Date</label>
                    <input
                      type="date"
                      value={editingAY.feeDueDate}
                      onChange={e => setEditingAY(prev => ({ ...prev, feeDueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      value={editingAY.status}
                      onChange={e => setEditingAY(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={editingAY.isCurrent}
                        onChange={e => setEditingAY(prev => ({ ...prev, isCurrent: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Active Current AY</span>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 -mx-5 -mb-5 mt-5">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingAY}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {updatingAY ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}