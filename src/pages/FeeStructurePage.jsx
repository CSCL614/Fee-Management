import { useState, useEffect, useMemo } from 'react';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, BookOpen, Search, X, Edit2, Trash2, Layers, Check, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, modalVariants, backdropVariants } from '../utils/animations';

const COMMON_TERM_SUGGESTIONS = [
  'Term 1',
  'Term 2',
  'Term 3',
  'Tuition Fee',
  'Admission Fee',
  'Examination Fee',
  'Laboratory Fee',
  'Library Fee',
  'Development Fee'
];

export default function FeeStructurePage() {
  const [structures, setStructures] = useState([]);
  const [categories, setCategories] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAY, setFilterAY] = useState('');

  // Add structure form state (supports multiple terms & prices)
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    course: '',
    level: 'UG',
    year: '1st Year',
    academicYear: '',
    terms: [
      { category: '', amount: '', frequency: 'ANNUAL', semester: '' }
    ]
  });

  // Edit single structure modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  // Quick Add Term Modal (for adding a term directly to a course group)
  const [quickAddModal, setQuickAddModal] = useState(null);
  const [quickTerm, setQuickTerm] = useState({
    category: '',
    amount: '',
    frequency: 'ANNUAL',
    semester: ''
  });

  // Escape key handler for open modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (quickAddModal) setQuickAddModal(null);
        if (editingItem) setEditingItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickAddModal, editingItem]);

  // Initial load
  useEffect(() => {
    Promise.all([
      api.get('/fees/categories'),
      api.get('/audit/academic-years'),
      api.get('/courses')
    ])
      .then(([cRes, aRes, coursesRes]) => {
        setCategories(cRes.data.data || []);
        const ays = aRes.data.data || [];
        setAcademicYears(ays);
        setCourses(coursesRes.data.data?.courses || []);

        const currentAY = ays.find(y => y.isCurrent);
        if (currentAY) {
          setForm(prev => ({ ...prev, academicYear: currentAY.year }));
        }
      })
      .catch((err) => {
        console.error('Failed to load initial metadata', err);
      });
  }, []);

  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);

  // Fetch structures
  const fetchStructures = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterAY) params.academicYear = filterAY;
      const res = await api.get('/fees/structures', { params });
      setStructures(res.data.data || []);
    } catch {
      toast.error('Failed to load fee structures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, [filterAY]);

  // Generate / Seed Demo Fee Structures
  const handleGenerateDemoStructures = async () => {
    if (!window.confirm('Populate / Refresh DEMO Fee Structures for Academic Year 2026–27 across all 5 catalog courses?\n\nDemo amounts:\n• Tuition Fee: ₹30,000/yr (Annual)\n• UDF Fee: ₹1,000/yr (Annual)\n• Exam Fee: ₹1,000/sem (Semester-wise, ₹2,000/yr)\n• Practical Fee: ₹2,000/sem (Semester-wise, ₹4,000/yr)\n• Admission Fee: ₹2,000 (1st Year only)\n\nNote: These are fictional testing values and will be clearly labelled as DEMO.')) {
      return;
    }
    setIsGeneratingDemo(true);
    try {
      toast.loading('Generating 89 demo fee structures for AY 2026–27...', { id: 'demo-seed' });
      const res = await api.post('/fees/demo-structures', { academicYear: '2026-27' });
      toast.success(res.data.message || 'Demo fee structures configured successfully!', { id: 'demo-seed' });
      setFilterAY('2026-27');
      await fetchStructures();
    } catch (err) {
      console.error('Demo structure generation error:', err);
      toast.error(err.response?.data?.message || 'Failed to generate demo fee structures', { id: 'demo-seed' });
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  // Handle course selection in main form
  const handleCourseChange = (selectedCourseName) => {
    const courseObj = courses.find(c => c.courseName === selectedCourseName || `${c.degree} ${c.specialization}` === selectedCourseName);
    const derivedLevel = courseObj?.level || (selectedCourseName.toLowerCase().includes('m.sc') ? 'PG' : 'UG');
    setForm(prev => ({
      ...prev,
      course: selectedCourseName,
      level: derivedLevel,
      year: '1st Year'
    }));
  };

  // Term rows management in main form
  const addTermRow = () => {
    setForm(prev => ({
      ...prev,
      terms: [...prev.terms, { category: '', amount: '', frequency: 'ANNUAL', semester: '' }]
    }));
  };

  const removeTermRow = (index) => {
    if (form.terms.length <= 1) return;
    setForm(prev => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== index)
    }));
  };

  const updateTermRow = (index, field, value) => {
    setForm(prev => {
      const newTerms = [...prev.terms];
      newTerms[index] = { ...newTerms[index], [field]: value };
      return { ...prev, terms: newTerms };
    });
  };

  // Submit full form (creates all terms & prices and syncs)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.course.trim()) {
      toast.error('Please select or enter a course');
      return;
    }
    if (!form.academicYear) {
      toast.error('Please select an academic year');
      return;
    }

    const validTerms = form.terms.filter(t => t.category.trim() && t.amount !== '');
    if (validTerms.length === 0) {
      toast.error('Please enter at least one term name and price');
      return;
    }

    try {
      await api.post('/fees/structures', {
        course: form.course.trim(),
        level: form.level,
        year: form.year,
        academicYear: form.academicYear,
        items: validTerms.map(t => ({
          category: t.category.trim(),
          amount: parseFloat(t.amount),
          frequency: t.frequency || 'ANNUAL',
          semester: t.frequency === 'SEMESTER' ? t.semester : undefined
        }))
      });

      toast.success('Fee structure and terms saved successfully');
      setShowForm(false);
      setForm(prev => ({
        ...prev,
        terms: [{ category: '', amount: '', frequency: 'ANNUAL', semester: '' }]
      }));
      fetchStructures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create fee structure');
    }
  };

  // Submit Quick Add Term for a specific course card
  const handleQuickAddTerm = async (e) => {
    e.preventDefault();
    if (!quickAddModal) return;
    if (!quickTerm.category.trim()) {
      toast.error('Please enter or select a term name');
      return;
    }
    if (quickTerm.amount === '' || isNaN(parseFloat(quickTerm.amount))) {
      toast.error('Please enter a valid price/amount');
      return;
    }

    try {
      await api.post('/fees/structures', {
        course: quickAddModal.course,
        level: quickAddModal.level,
        year: quickAddModal.year,
        academicYear: quickAddModal.academicYear,
        category: quickTerm.category.trim(),
        amount: parseFloat(quickTerm.amount),
        frequency: quickTerm.frequency,
        semester: quickTerm.frequency === 'SEMESTER' ? quickTerm.semester : undefined
      });

      toast.success(`Term "${quickTerm.category}" added & synced with enrolled students!`);
      setQuickAddModal(null);
      setQuickTerm({ category: '', amount: '', frequency: 'ANNUAL', semester: '' });
      fetchStructures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add term');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await api.put(`/fees/structures/${editingItem.feeId}`, { amount: parseFloat(editAmount) });
      toast.success('Fee structure updated & synced');
      setEditingItem(null);
      fetchStructures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update fee structure');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete ${item.category} (₹${item.amount}) for ${item.course} ${item.year}?`)) {
      return;
    }
    try {
      await api.delete(`/fees/structures/${item.feeId}`);
      toast.success('Fee structure item deleted & synced');
      fetchStructures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete fee structure');
    }
  };

  // Group structures by course + level + year + academicYear
  const grouped = useMemo(() => {
    const map = {};
    structures.forEach((s) => {
      const key = `${s.course}|${s.level}|${s.year}|${s.academicYear}`;
      if (!map[key]) {
        map[key] = {
          course: s.course,
          level: s.level,
          year: s.year,
          academicYear: s.academicYear,
          items: []
        };
      }
      map[key].items.push(s);
    });
    return Object.values(map);
  }, [structures]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return grouped;
    const q = searchQuery.toLowerCase();
    return grouped.filter(g =>
      g.course.toLowerCase().includes(q) ||
      g.year.toLowerCase().includes(q) ||
      g.academicYear.toLowerCase().includes(q) ||
      g.items.some(item => item.category.toLowerCase().includes(q))
    );
  }, [grouped, searchQuery]);

  return (
    <div>
      <Topbar title="Fee Structure" />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-6 pt-4 space-y-5"
      >
        {/* Header Controls Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by course, term, year..."
              className="w-full pl-10 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <select
              value={filterAY}
              onChange={(e) => setFilterAY(e.target.value)}
              className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.year} {y.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              disabled={isGeneratingDemo}
              onClick={handleGenerateDemoStructures}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer"
              title="Configure sample demo fee rates for all catalog courses for AY 2026–27"
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingDemo ? 'animate-spin' : ''}`} />
              <span>Generate Demo Structures (2026–27)</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Structure & Terms</span>
            </motion.button>
          </div>
        </div>

        {/* Add Structure & Multiple Terms Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-navy-100 shadow-md space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Add Course Fee Structure & Terms</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure terms and prices. When saved, all fees automatically reflect in enrolled and newly created students!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Course, Year, Academic Year Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Course *</label>
                <select
                  value={form.course}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c._id || c.courseId} value={c.courseName || `${c.degree} ${c.specialization}`}>
                      {c.courseName || `${c.degree} ${c.specialization}`} ({c.duration} Yrs - {c.level})
                    </option>
                  ))}
                  <option value="CUSTOM">+ Other Custom Course</option>
                </select>
                {form.course === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="Enter course name"
                    onChange={e => setForm(prev => ({ ...prev, course: e.target.value }))}
                    className="w-full mt-2 px-3 py-1.5 border border-gray-200 rounded-xl text-sm"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Level *</label>
                <select
                  value={form.level}
                  onChange={(e) => setForm(prev => ({ ...prev, level: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 font-medium"
                >
                  <option value="UG">UG (Undergraduate)</option>
                  <option value="PG">PG (Postgraduate)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Year of Study *</label>
                <select
                  value={form.year}
                  onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white font-medium"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  {form.level !== 'PG' && <option value="3rd Year">3rd Year</option>}
                  {form.level !== 'PG' && <option value="4th Year">4th Year</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Academic Year *</label>
                <select
                  value={form.academicYear}
                  onChange={(e) => setForm(prev => ({ ...prev, academicYear: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white font-medium"
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map(y => (
                    <option key={y.year} value={y.year}>{y.year} {y.isCurrent ? '(Current)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Terms and Prices Section */}
            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-navy-800">Fee Terms & Prices</h4>
                  <p className="text-xs text-gray-500">Add terms like "Term 1", "Term 2", "Tuition Fee" with their prices.</p>
                </div>
                <button
                  type="button"
                  onClick={addTermRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-600 hover:bg-navy-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Term
                </button>
              </div>

              <div className="space-y-2.5">
                {form.terms.map((term, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-gray-200/80">
                    <div className="w-full sm:flex-1">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Term Name / Category *</label>
                      <input
                        type="text"
                        list={`term-suggestions-${index}`}
                        value={term.category}
                        onChange={(e) => updateTermRow(index, 'category', e.target.value)}
                        placeholder="e.g. Term 1, Tuition Fee"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600"
                        required
                      />
                      <datalist id={`term-suggestions-${index}`}>
                        {COMMON_TERM_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                        {categories.map(c => <option key={c.name} value={c.name} />)}
                      </datalist>
                    </div>

                    <div className="w-full sm:w-44">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Price (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        value={term.amount}
                        onChange={(e) => updateTermRow(index, 'amount', e.target.value)}
                        placeholder="e.g. 25000"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600"
                        required
                      />
                    </div>

                    <div className="w-full sm:w-40">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Frequency</label>
                      <select
                        value={term.frequency}
                        onChange={(e) => updateTermRow(index, 'frequency', e.target.value)}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      >
                        <option value="ANNUAL">Annual</option>
                        <option value="SEMESTER">Semester</option>
                        <option value="ONE_TIME">One Time</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </div>

                    {form.terms.length > 1 && (
                      <div className="sm:self-end sm:pb-1">
                        <button
                          type="button"
                          onClick={() => removeTermRow(index)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Remove term"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick suggestions pills */}
              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-400 font-medium">Quick suggestions:</span>
                {COMMON_TERM_SUGGESTIONS.slice(0, 5).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const lastIdx = form.terms.length - 1;
                      if (!form.terms[lastIdx].category) {
                        updateTermRow(lastIdx, 'category', s);
                      } else {
                        setForm(prev => ({
                          ...prev,
                          terms: [...prev.terms, { category: s, amount: '', frequency: 'ANNUAL', semester: '' }]
                        }));
                      }
                    }}
                    className="text-xs px-2.5 py-1 bg-white border border-gray-200 text-gray-600 hover:border-navy-600 hover:text-navy-700 rounded-lg transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Preview and Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-sm font-semibold text-gray-700">
                Total Structure Amount:{' '}
                <span className="text-navy-800 font-bold text-base">
                  {formatCurrency(form.terms.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0))}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-navy-700 hover:bg-navy-800 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors"
                >
                  Save Structure & Terms
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Quick Add Term Modal (Targeted to a specific card) */}
        <AnimatePresence>
          {quickAddModal && (
            <motion.div
              variants={backdropVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={() => setQuickAddModal(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            >
              <motion.form
                variants={modalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={e => e.stopPropagation()}
                onSubmit={handleQuickAddTerm}
                className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full space-y-4"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">Add New Term & Price</h3>
                    <p className="text-xs text-navy-700 mt-0.5 font-medium">
                      {quickAddModal.course} • {quickAddModal.year} ({quickAddModal.academicYear})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuickAddModal(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Term Name / Category *</label>
                  <input
                    type="text"
                    list="quick-term-suggestions"
                    value={quickTerm.category}
                    onChange={(e) => setQuickTerm(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g. Term 2, Lab Fee"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600"
                    required
                    autoFocus
                  />
                  <datalist id="quick-term-suggestions">
                    {COMMON_TERM_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                  </datalist>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {COMMON_TERM_SUGGESTIONS.slice(0, 6).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setQuickTerm(prev => ({ ...prev, category: s }))}
                        className="text-[11px] px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-md hover:bg-navy-50 hover:text-navy-700"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Price / Amount (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    value={quickTerm.amount}
                    onChange={(e) => setQuickTerm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="e.g. 15000"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Frequency</label>
                  <select
                    value={quickTerm.frequency}
                    onChange={(e) => setQuickTerm(prev => ({ ...prev, frequency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                  >
                    <option value="ANNUAL">Annual</option>
                    <option value="SEMESTER">Semester</option>
                    <option value="ONE_TIME">One Time</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => setQuickAddModal(null)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
                  >
                    Save Term & Sync
                  </motion.button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Amount Modal */}
        <AnimatePresence>
          {editingItem && (
            <motion.div
              variants={backdropVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={() => setEditingItem(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            >
              <motion.form
                variants={modalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={e => e.stopPropagation()}
                onSubmit={handleEditSubmit}
                className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full space-y-4"
              >
                <h3 className="font-semibold text-gray-800">Edit Price</h3>
                <p className="text-xs text-gray-500">
                  {editingItem.course} ({editingItem.level}) — {editingItem.year} — {editingItem.category}
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-500 outline-none"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
                  >
                    Update & Sync
                  </motion.button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DEMO Disclaimer Banner */}
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-800 font-bold text-xs mt-0.5">
              DEMO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Demo Fee Structures Active (Academic Year 2026–27)
                </h4>
                <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                  TESTING DATA
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mt-0.5 leading-relaxed">
                Illustrative sample amounts: <strong>Tuition Fee</strong> ₹30,000/yr (Annual) · <strong>UDF Fee</strong> ₹1,000/yr (Annual) · <strong>Exam Fee</strong> ₹1,000/sem (Semester-wise, ₹2,000/yr) · <strong>Practical Fee</strong> ₹2,000/sem (Semester-wise, ₹4,000/yr) · <strong>Admission Fee</strong> ₹2,000 (1st Year only). Fictional values for Excel import verification; not approved college fees.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleGenerateDemoStructures}
              disabled={isGeneratingDemo}
              className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingDemo ? 'animate-spin' : ''}`} />
              <span>Reset Demo Rates</span>
            </button>
          </div>
        </div>

        {/* Results Counter */}
        {!loading && (
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
            <span>
              {filteredGroups.length === 0
                ? 'No fee structures found'
                : `Showing ${filteredGroups.length} configured fee structure program${filteredGroups.length === 1 ? '' : 's'}`}
            </span>
          </div>
        )}

        {/* Main Content Area */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 font-medium">Loading fee structures...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">No fee structures found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {searchQuery.trim()
                ? `No results matching "${searchQuery.trim()}". Try searching with a different course or term.`
                : 'Click "+ Add Structure & Terms" above to create fee terms and prices for your college courses.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGroups.map((g, i) => {
              const hasDemoItems = g.items.some(item => item.isDemo);
              return (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 border-b border-gray-50 pb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800 text-base">
                          {g.course}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${g.level === 'PG' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                          {g.level}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {g.year}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          ({g.academicYear})
                        </span>
                        {hasDemoItems && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            DEMO DATA
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {g.items.length} term{g.items.length === 1 ? '' : 's'} / fee components configured
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAddModal(g);
                          setQuickTerm({ category: '', amount: '', frequency: 'ANNUAL', semester: '' });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-50 hover:bg-navy-100 text-navy-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        title="Add a new term and price to this structure"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Term</span>
                      </button>

                      <div className="text-right">
                        <span className="text-[11px] text-gray-400 block leading-none">Total Program Fee</span>
                        <p className="text-base font-bold text-navy-800 mt-0.5">
                          {formatCurrency(g.items.reduce((s, item) => s + item.amount, 0))}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {g.items.map((item) => (
                      <div
                        key={item.feeId}
                        className="flex flex-col justify-between text-sm p-3.5 bg-gray-50/80 rounded-xl group hover:bg-gray-100/80 border border-gray-100 transition-colors gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-800 font-semibold">{item.category}</span>
                            {item.isDemo && (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                DEMO
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-navy-900">{formatCurrency(item.amount)}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItem(item);
                                  setEditAmount(item.amount.toString());
                                }}
                                title="Edit price"
                                className="p-1 text-gray-400 hover:text-navy-600 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                title="Delete term"
                                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                            {item.frequency || 'ANNUAL'}
                          </span>
                          {item.semester && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">
                              {item.semester}
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400 font-mono ml-auto">
                            {item.feeId}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
