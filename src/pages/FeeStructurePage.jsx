import { useState, useEffect } from 'react';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, BookOpen } from 'lucide-react';

export default function FeeStructurePage() {
  const [structures, setStructures] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ course: '', level: 'UG', year: '1st Year', academicYear: '', category: '', amount: '' });
  const [academicYears, setAcademicYears] = useState([]);
  const [filterAY, setFilterAY] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/fees/structures'),
      api.get('/fees/categories'),
      api.get('/audit/academic-years')
    ]).then(([sRes, cRes, aRes]) => {
      setStructures(sRes.data.data || []);
      setCategories(cRes.data.data || []);
      setAcademicYears(aRes.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const fetchStructures = async () => {
    const params = {};
    if (filterAY) params.academicYear = filterAY;
    const res = await api.get('/fees/structures', { params });
    setStructures(res.data.data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fees/structures', { ...form, amount: parseFloat(form.amount) });
      toast.success('Fee structure created');
      setShowForm(false);
      setForm({ course: '', level: 'UG', year: '1st Year', academicYear: '', category: '', amount: '' });
      fetchStructures();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  // Group structures by course + year + academicYear
  const grouped = {};
  structures.forEach(s => {
    const key = `${s.course}|${s.level}|${s.year}|${s.academicYear}`;
    if (!grouped[key]) grouped[key] = { course: s.course, level: s.level, year: s.year, academicYear: s.academicYear, items: [] };
    grouped[key].items.push(s);
  });

  return (
    <div>
      <Topbar title="Fee Structure" />
      <div className="p-6 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Fee Structure</h1>
            <p className="text-sm text-gray-500">Manage fee structures for all courses</p>
          </div>
          <div className="flex gap-3">
            <select value={filterAY} onChange={e => { setFilterAY(e.target.value); setTimeout(fetchStructures, 0); }} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              <option value="">All Years</option>
              {academicYears.map(y => <option key={y.year} value={y.year}>{y.year}</option>)}
            </select>
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 bg-navy-700 hover:bg-navy-800 text-white rounded-xl text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Structure
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-800">Add Fee Structure</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <input type="text" value={form.course} onChange={e => setForm(prev => ({ ...prev, course: e.target.value }))} placeholder="Course (e.g. BCA)" className="px-3 py-2 border border-gray-200 rounded-xl text-sm" required />
              <select value={form.level} onChange={e => setForm(prev => ({ ...prev, level: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
                <option value="UG">UG</option><option value="PG">PG</option>
              </select>
              <select value={form.year} onChange={e => setForm(prev => ({ ...prev, year: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
                {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={form.academicYear} onChange={e => setForm(prev => ({ ...prev, academicYear: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" required>
                <option value="">Academic Year</option>
                {academicYears.map(y => <option key={y.year} value={y.year}>{y.year}</option>)}
              </select>
              <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" required>
                <option value="">Category</option>
                {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <input type="number" value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="Amount (₹)" min="0" className="px-3 py-2 border border-gray-200 rounded-xl text-sm" required />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-5 py-2 bg-navy-700 text-white rounded-xl text-sm font-medium hover:bg-navy-800">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        )}

        {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
          <div className="space-y-4">
            {Object.values(grouped).length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No fee structures found</p>
              </div>
            ) : Object.values(grouped).map((g, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">{g.course} ({g.level}) — {g.year} — {g.academicYear}</h3>
                  <p className="text-sm font-bold text-navy-700">{formatCurrency(g.items.reduce((s, i) => s + i.amount, 0))}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {g.items.map(item => (
                    <div key={item.feeId} className="flex justify-between text-sm p-2.5 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">{item.category}</span>
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
