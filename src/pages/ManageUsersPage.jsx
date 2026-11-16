import { useState, useEffect } from 'react';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  UserCog, Plus, X, Shield, User, Key, CheckCircle, Ban,
  Edit2, Trash2, Mail, Phone, AlertTriangle, Lock, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, modalVariants, backdropVariants } from '../utils/animations';

export default function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'accountant',
    email: '',
    phone: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'accountant',
    status: 'active',
    email: '',
    phone: '',
    newPassword: ''
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete Modal State
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/users', form);
      toast.success('New user account created successfully');
      setShowForm(false);
      setForm({ name: '', username: '', password: '', role: 'accountant', email: '', phone: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      role: user.role || 'accountant',
      status: user.status || 'active',
      email: user.email || '',
      phone: user.phone || '',
      newPassword: ''
    });
    setShowEditPassword(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        role: editForm.role,
        status: editForm.status,
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null
      };
      if (editForm.newPassword && editForm.newPassword.trim().length > 0) {
        if (editForm.newPassword.trim().length < 6) {
          toast.error('Password must be at least 6 characters long');
          setSubmitting(false);
          return;
        }
        payload.password = editForm.newPassword.trim();
      }

      await api.put(`/users/${editingUser.userId || editingUser._id}`, payload);
      toast.success('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/users/${deletingUser.userId || deletingUser._id}`);
      toast.success(`User ${deletingUser.name} deleted successfully`);
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const toggleStatus = async (user) => {
    if (currentUser?.username === user.username && user.status === 'active') {
      toast.error('You cannot deactivate your own administrative account.');
      return;
    }
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await api.put(`/users/${user.userId || user._id}`, { status: newStatus });
      toast.success(`User set to ${newStatus}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change status');
    }
  };

  return (
    <div>
      <Topbar title="Manage Users" />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 space-y-5"
      >
        {/* Header & Controls Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shrink-0">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                User Access & Staff Credentials
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                  {users.length} Users
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure role-based access permissions, edit user profiles, and manage staff credentials
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showForm ? 'Cancel' : 'Create User'}</span>
          </motion.button>
        </div>

        {/* Create User Collapsible Drawer */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleCreateSubmit}
              className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs space-y-4"
            >
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                Add New Staff Member
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={e => setForm(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
                    placeholder="e.g. ramesh.cashier"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Assigned Role *</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  >
                    <option value="accountant">Accountant (Collections & Receipts)</option>
                    <option value="admin">Administrator (Full ERP Control)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. ramesh@college.edu"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Phone / Mobile</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  {submitting ? 'Creating User...' : 'Confirm & Save Account'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Users Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Full Name & Contact</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-4"><div className="w-16 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-32 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-20 h-4 skeleton rounded" /></td>
                      <td className="py-3.5 px-4"><div className="w-20 h-5 skeleton rounded-full" /></td>
                      <td className="py-3.5 px-4 text-center"><div className="w-16 h-5 skeleton rounded-full mx-auto" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="w-24 h-6 skeleton rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : (
                  users.map(u => {
                    const isSelf = currentUser?.username === u.username;
                    return (
                      <tr key={u.userId || u._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-600 text-[11px]">
                          {u.userId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-slate-200">
                              {u.name?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 block truncate">{u.name}</span>
                              <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
                                {u.email && (
                                  <span className="inline-flex items-center gap-0.5 truncate" title={u.email}>
                                    <Mail className="w-2.5 h-2.5" /> {u.email}
                                  </span>
                                )}
                                {u.phone && (
                                  <span className="inline-flex items-center gap-0.5 font-mono" title={u.phone}>
                                    <Phone className="w-2.5 h-2.5" /> {u.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{u.username}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            u.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {u.role === 'admin' ? 'Administrator' : 'Accountant'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {u.status === 'active' ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit User Profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Status Toggle Button */}
                            {!isSelf && (
                              <button
                                onClick={() => toggleStatus(u)}
                                className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                                  u.status === 'active'
                                    ? 'text-amber-700 hover:bg-amber-50'
                                    : 'text-emerald-700 hover:bg-emerald-50'
                                }`}
                                title={u.status === 'active' ? 'Deactivate user' : 'Reactivate user'}
                              >
                                {u.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            )}

                            {/* Delete Button */}
                            {!isSelf ? (
                              <button
                                onClick={() => setDeletingUser(u)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-400">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* EDIT USER MODAL */}
        <AnimatePresence>
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                variants={backdropVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={() => setEditingUser(null)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              />

              <motion.div
                variants={modalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="relative bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-md w-full p-5 sm:p-6 z-10 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Edit2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Edit User Account</h3>
                      <p className="text-[11px] text-slate-500 font-mono">@{editingUser.username} • {editingUser.userId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Role *</label>
                      <select
                        value={editForm.role}
                        onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                      >
                        <option value="accountant">Accountant</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Account Status</label>
                      <select
                        value={editForm.status}
                        onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive / Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g. user@college.edu"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Phone / Mobile</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium font-mono"
                    />
                  </div>

                  {/* Password Reset Section */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Reset Password (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editForm.newPassword}
                        onChange={e => setEditForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Leave blank to keep unchanged"
                        className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        title={showEditPassword ? 'Hide password' : 'Show password'}
                      >
                        {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Provide a new password (min 6 characters) only if you wish to reset this user's password.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                    >
                      {submitting ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* DELETE USER CONFIRMATION MODAL */}
        <AnimatePresence>
          {deletingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                variants={backdropVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={() => setDeletingUser(null)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              />

              <motion.div
                variants={modalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="relative bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-sm w-full p-5 sm:p-6 z-10 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Delete User Account</h3>
                    <p className="text-[11px] text-slate-500">This action requires administrator confirmation</p>
                  </div>
                </div>

                <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3.5 text-xs text-rose-900 space-y-1">
                  <p className="font-semibold">
                    Are you sure you want to delete <span className="font-bold underline">{deletingUser.name}</span> (@{deletingUser.username})?
                  </p>
                  <p className="text-[11px] text-rose-700">
                    If this user has recorded fee payments, concession adjustments, or audit log entries, their account will be safely soft-deleted to ensure legal financial records remain 100% intact.
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingUser(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={handleDeleteConfirm}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    {deleteSubmitting ? 'Deleting...' : 'Confirm & Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
