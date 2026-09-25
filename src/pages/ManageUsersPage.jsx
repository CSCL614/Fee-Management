import { useState, useEffect } from 'react';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { UserCog, Plus } from 'lucide-react';

export default function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'accountant' });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => { try { const res = await api.get('/users'); setUsers(res.data.data || []); } catch { } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      toast.success('User created');
      setShowForm(false);
      setForm({ name: '', username: '', password: '', role: 'accountant' });
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const toggleStatus = async (user) => {
    try {
      await api.put(`/users/${user.userId}`, { status: user.status === 'active' ? 'inactive' : 'active' });
      toast.success('User updated');
      fetchUsers();
    } catch (err) { toast.error('Failed'); }
  };

  return (
    <div>
      <Topbar title="Manage Users" />
      <div className="p-6 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div><h1 className="text-xl font-bold text-gray-800">Users</h1><p className="text-sm text-gray-500">Manage admin and accountant accounts</p></div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 bg-navy-700 text-white rounded-xl text-sm font-medium hover:bg-navy-800"><Plus className="w-4 h-4" /> Add User</button>
        </div>
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-800">Add New User</h3>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Full Name" className="px-3 py-2 border border-gray-200 rounded-xl text-sm" required />
              <input type="text" value={form.username} onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))} placeholder="Username" className="px-3 py-2 border border-gray-200 rounded-xl text-sm" required />
              <input type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} placeholder="Password" className="px-3 py-2 border border-gray-200 rounded-xl text-sm" required minLength={6} />
              <select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
                <option value="accountant">Accountant</option><option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-5 py-2 bg-navy-700 text-white rounded-xl text-sm font-medium">Create User</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        )}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-gray-50/80 border-b border-gray-100">
              {['User ID', 'Name', 'Username', 'Role', 'Status', 'Action'].map(h => (<th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.userId} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{u.userId}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.username}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>{u.role}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{u.status}</span></td>
                  <td className="px-4 py-3"><button onClick={() => toggleStatus(u)} className="text-sm text-navy-600 hover:text-navy-700 font-medium">{u.status === 'active' ? 'Deactivate' : 'Activate'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
