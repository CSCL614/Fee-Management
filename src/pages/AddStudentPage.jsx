import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function AddStudentPage() {
  const [form, setForm] = useState({
    admissionNo: '', name: '', course: '', level: 'UG', currentYear: '1st Year',
    currentAcademicYear: '', email: '', phone: '', fatherName: '', gender: 'Male', address: ''
  });
  const [academicYears, setAcademicYears] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/audit/academic-years').then(res => {
      const years = res.data.data || [];
      setAcademicYears(years);
      const current = years.find(y => y.isCurrent);
      if (current) setForm(prev => ({ ...prev, currentAcademicYear: current.year }));
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/students', form);
      toast.success('Student created successfully');
      navigate(`/students/${res.data.data.studentId}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <Topbar title="Add Student" />
      <div className="p-6 pt-4">
        <button onClick={() => navigate('/students')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
        <div className="max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><UserPlus className="w-5 h-5 text-navy-600" /> Add New Student</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Admission Number *</label><input type="text" value={form.admissionNo} onChange={e => setForm(prev => ({ ...prev, admissionNo: e.target.value }))} placeholder="e.g. UG2026BCA001" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label><input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Full name" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Course *</label><input type="text" value={form.course} onChange={e => setForm(prev => ({ ...prev, course: e.target.value }))} placeholder="e.g. BCA, MBA" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Level *</label><select value={form.level} onChange={e => setForm(prev => ({ ...prev, level: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"><option value="UG">UG</option><option value="PG">PG</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Year *</label><select value={form.currentYear} onChange={e => setForm(prev => ({ ...prev, currentYear: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">{['1st Year', '2nd Year', '3rd Year', '4th Year'].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label><select value={form.currentAcademicYear} onChange={e => setForm(prev => ({ ...prev, currentAcademicYear: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" required><option value="">Select</option>{academicYears.map(y => <option key={y.year} value={y.year}>{y.year}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label><input type="text" value={form.fatherName} onChange={e => setForm(prev => ({ ...prev, fatherName: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Gender</label><select value={form.gender} onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} rows="2" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" /></div>
            <button type="submit" disabled={submitting} className="w-full py-3 bg-navy-700 hover:bg-navy-800 text-white font-semibold rounded-xl text-sm disabled:opacity-50">{submitting ? 'Creating...' : 'Create Student'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
