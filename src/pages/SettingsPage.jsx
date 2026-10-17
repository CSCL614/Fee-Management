import { useState, useEffect } from 'react';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Settings, Building, CreditCard, Calendar, BookOpen, Plus, Check, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { pageVariants } from '../utils/animations';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [academicYears, setAcademicYears] = useState([]);
  const [newAY, setNewAY] = useState({ year: '', startDate: '', endDate: '' });

  const [courses, setCourses] = useState([]);
  const [newCourse, setNewCourse] = useState({ degree: 'B.Sc', specialization: '', duration: 3 });
  const [savingField, setSavingField] = useState(null);

  useEffect(() => {
    api.get('/audit/settings').then(res => setSettings(res.data.data || {}));
    api.get('/audit/academic-years').then(res => setAcademicYears(res.data.data || []));
    api.get('/courses').then(res => setCourses(res.data.data?.courses || []));
  }, []);

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
    try {
      await api.post('/audit/academic-years', newAY);
      toast.success('Academic session registered successfully');
      setNewAY({ year: '', startDate: '', endDate: '' });
      const res = await api.get('/audit/academic-years');
      setAcademicYears(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create academic year');
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
              <p className="text-xs text-slate-500 mt-0.5">Manage college master parameters, academic sessions, and course catalogs</p>
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

        {/* 3. Academic Sessions Management */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Academic Years</h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-semibold">
              {academicYears.length} Sessions
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {academicYears.map(y => (
              <div key={y.year} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 font-mono">{y.year}</span>
                    {y.isCurrent && (
                      <span className="px-2 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                        Active Current
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {y.startDate ? new Date(y.startDate).toLocaleDateString() : 'N/A'} - {y.endDate ? new Date(y.endDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${y.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {y.status}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={addAcademicYear} className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/70 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Register Academic Session</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Session Year *</label>
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
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Term Start Date *</label>
                <input
                  type="date"
                  value={newAY.startDate}
                  onChange={e => setNewAY(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Term End Date *</label>
                <input
                  type="date"
                  value={newAY.endDate}
                  onChange={e => setNewAY(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
              >
                Add Academic Year
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
    </div>
  );
}
