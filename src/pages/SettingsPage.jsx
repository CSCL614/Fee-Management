import { useState, useEffect } from 'react';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [academicYears, setAcademicYears] = useState([]);
  const [newAY, setNewAY] = useState({ year: '', startDate: '', endDate: '' });

  useEffect(() => {
    api.get('/audit/settings').then(res => setSettings(res.data.data || {}));
    api.get('/audit/academic-years').then(res => setAcademicYears(res.data.data || []));
  }, []);

  const saveSetting = async (key, value) => {
    try {
      await api.put('/audit/settings', { [key]: value });
      setSettings(prev => ({ ...prev, [key]: value }));
      toast.success('Setting saved');
    } catch { toast.error('Failed'); }
  };

  const addAcademicYear = async (e) => {
    e.preventDefault();
    try {
      await api.post('/audit/academic-years', newAY);
      toast.success('Academic year added');
      setNewAY({ year: '', startDate: '', endDate: '' });
      const res = await api.get('/audit/academic-years');
      setAcademicYears(res.data.data || []);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <Topbar title="Settings" />
      <div className="p-6 pt-4 space-y-6">
        <h1 className="text-xl font-bold text-gray-800">System Settings</h1>

        {/* College Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">College Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">College Name</label>
              <input type="text" value={settings.collegeName || ''} onChange={e => setSettings(prev => ({ ...prev, collegeName: e.target.value }))} onBlur={e => saveSetting('collegeName', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Address</label>
              <input type="text" value={settings.collegeAddress || ''} onChange={e => setSettings(prev => ({ ...prev, collegeAddress: e.target.value }))} onBlur={e => saveSetting('collegeAddress', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Payment Settings</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.allowAdvancePayment || false} onChange={e => saveSetting('allowAdvancePayment', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-navy-600 focus:ring-navy-500" />
            <div><p className="text-sm font-medium text-gray-700">Allow Advance Payments</p><p className="text-xs text-gray-500">If enabled, excess payment becomes Advance Credit. Pending will never go negative.</p></div>
          </label>
        </div>

        {/* Academic Years */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Academic Years</h2>
          <div className="space-y-3 mb-4">
            {academicYears.map(y => (
              <div key={y.year} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-800">{y.year}</span>
                  {y.isCurrent && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">Current</span>}
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${y.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{y.status}</span>
              </div>
            ))}
          </div>
          <form onSubmit={addAcademicYear} className="flex flex-wrap gap-3">
            <input type="text" value={newAY.year} onChange={e => setNewAY(prev => ({ ...prev, year: e.target.value }))} placeholder="e.g. 2027-28" className="px-3 py-2 border border-gray-200 rounded-xl text-sm" required />
            <input type="date" value={newAY.startDate} onChange={e => setNewAY(prev => ({ ...prev, startDate: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" required />
            <input type="date" value={newAY.endDate} onChange={e => setNewAY(prev => ({ ...prev, endDate: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" required />
            <button type="submit" className="px-4 py-2 bg-navy-700 text-white rounded-xl text-sm font-medium">Add</button>
          </form>
        </div>
      </div>
    </div>
  );
}
