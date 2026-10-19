import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { pageVariants, modalVariants, backdropVariants } from '../utils/animations';
import { formatCurrency, getStatusColor } from '../utils/helpers';
import {
  ArrowLeft, Save, User, BookOpen, AlertCircle, Calendar,
  ShieldCheck, AlertTriangle, Trash2, Power, RotateCcw,
  Search, X, Check, CheckCircle2, Phone, Mail, GraduationCap
} from 'lucide-react';

export default function EditStudentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentData, setStudentData] = useState(null);

  // Form State
  const [form, setForm] = useState({
    admissionNo: '',
    name: '',
    degree: '',
    specialization: '',
    courseId: '',
    course: '',
    duration: 3,
    level: 'UG',
    currentYear: '1st Year',
    currentAcademicYear: '',
    batch: '',
    status: 'Active',
    email: '',
    phone: '',
    fatherName: '',
    gender: 'Male',
    dateOfBirth: '',
    address: '',
    reason: ''
  });

  const [courses, setCourses] = useState([]);
  const [degreesList, setDegreesList] = useState(['B.Sc', 'B.Com', 'M.Sc']);
  const [academicYears, setAcademicYears] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Searchable course dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Deactivation / Reactivation Modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState('Inactive');
  const [statusReason, setStatusReason] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Delete Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [paymentWarning, setPaymentWarning] = useState(null);

  // Fetch student details and dropdown options
  useEffect(() => {
    fetchStudentAndMetadata();
  }, [id]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchStudentAndMetadata = async () => {
    setLoading(true);
    try {
      const [stuRes, ayRes, coursesRes] = await Promise.all([
        api.get(`/students/${id}`),
        api.get('/audit/academic-years'),
        api.get('/courses')
      ]);

      const stu = stuRes.data.data?.student;
      const feeSummary = stuRes.data.data?.feeSummary;
      const feeLedger = stuRes.data.data?.feeLedger;
      setStudentData({ student: stu, feeSummary, feeLedger });

      if (stu) {
        setForm({
          admissionNo: stu.admissionNo || '',
          name: stu.name || '',
          degree: stu.degree || '',
          specialization: stu.specialization || '',
          courseId: stu.courseId || '',
          course: stu.course || '',
          duration: stu.duration || (stu.level === 'PG' ? 2 : 3),
          level: stu.level || 'UG',
          currentYear: stu.currentYear || '1st Year',
          currentAcademicYear: stu.currentAcademicYear || '',
          batch: stu.batch || '',
          status: stu.status || 'Active',
          email: stu.email || '',
          phone: stu.phone || '',
          fatherName: stu.fatherName || '',
          gender: stu.gender || 'Male',
          dateOfBirth: stu.dateOfBirth ? new Date(stu.dateOfBirth).toISOString().split('T')[0] : '',
          address: stu.address || '',
          reason: ''
        });
      }

      setAcademicYears(ayRes.data.data || []);
      const loadedCourses = coursesRes.data.data?.courses || [];
      setCourses(loadedCourses);

      const loadedDegrees = coursesRes.data.data?.degrees || [];
      if (loadedDegrees.length > 0) {
        setDegreesList(Array.from(new Set([...loadedDegrees, 'B.Sc', 'B.Com', 'M.Sc'])));
      }
    } catch (err) {
      console.error('Failed to load student data:', err);
      toast.error(err.response?.data?.message || 'Failed to load student data');
    } finally {
      setLoading(false);
      setLoadingMetadata(false);
    }
  };

  // Filter courses by degree
  const availableSpecializations = useMemo(() => {
    if (!form.degree) return courses;
    return courses.filter(c => c.degree === form.degree && c.status === 'active');
  }, [courses, form.degree]);

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return availableSpecializations;
    const q = searchQuery.toLowerCase();
    return availableSpecializations.filter(c =>
      c.specialization.toLowerCase().includes(q) ||
      (c.courseName && c.courseName.toLowerCase().includes(q))
    );
  }, [availableSpecializations, searchQuery]);

  // Allowed study years
  const allowedYears = useMemo(() => {
    const dur = form.duration || (form.degree === 'M.Sc' ? 2 : 3);
    const yearsList = [];
    for (let i = 1; i <= dur; i++) {
      const suffix = i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th';
      yearsList.push(`${i}${suffix} Year`);
    }
    return yearsList;
  }, [form.duration, form.degree]);

  const handleDegreeChange = (degree) => {
    const derivedLevel = degree === 'M.Sc' || degree === 'MBA' || degree === 'MCA' ? 'PG' : 'UG';
    const defaultDuration = derivedLevel === 'PG' ? 2 : 3;

    setForm(prev => ({
      ...prev,
      degree,
      specialization: '',
      courseId: '',
      course: '',
      level: derivedLevel,
      duration: defaultDuration,
      currentYear: '1st Year'
    }));
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleSelectCourse = (selectedCourse) => {
    const courseDuration = selectedCourse.duration || (selectedCourse.level === 'PG' ? 2 : 3);
    setForm(prev => ({
      ...prev,
      courseId: selectedCourse._id,
      specialization: selectedCourse.specialization,
      course: selectedCourse.courseName || `${selectedCourse.degree} ${selectedCourse.specialization}`,
      duration: courseDuration,
      level: selectedCourse.level || (selectedCourse.degree === 'M.Sc' ? 'PG' : 'UG')
    }));
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.admissionNo.trim()) {
      toast.error('Admission number is required');
      return;
    }
    if (!form.name.trim()) {
      toast.error('Student name is required');
      return;
    }
    if (!form.course) {
      toast.error('Course / Specialization is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        admissionNo: form.admissionNo.trim(),
        name: form.name.trim(),
        degree: form.degree,
        specialization: form.specialization,
        courseId: form.courseId || undefined,
        course: form.course,
        level: form.level,
        duration: form.duration,
        currentYear: form.currentYear,
        currentAcademicYear: form.currentAcademicYear,
        batch: form.batch,
        status: form.status,
        email: form.email.trim(),
        phone: form.phone.trim(),
        fatherName: form.fatherName.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
        address: form.address.trim(),
        reason: form.reason.trim() || 'Admin profile update'
      };

      const res = await api.put(`/students/${id}`, payload);
      toast.success('Student profile updated successfully');
      navigate(`/students/${res.data.data.studentId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student profile');
    } finally {
      setSubmitting(false);
    }
  };

  // Status Change Handler (Deactivate / Activate / etc.)
  const handleStatusChange = async (e) => {
    e.preventDefault();
    setStatusUpdating(true);
    try {
      await api.patch(`/students/${id}/status`, {
        status: targetStatus,
        reason: statusReason.trim() || undefined
      });
      toast.success(`Student status changed to ${targetStatus}`);
      setShowStatusModal(false);
      setStatusReason('');
      setForm(prev => ({ ...prev, status: targetStatus }));
      fetchStudentAndMetadata();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Delete Handler
  const handleDeleteStudent = async (e) => {
    if (e) e.preventDefault();
    setDeleting(true);
    setPaymentWarning(null);

    try {
      const res = await api.delete(`/students/${id}`, {
        data: { reason: deleteReason.trim() }
      });
      toast.success(res.data.message || 'Student deleted successfully');
      setShowDeleteModal(false);
      navigate('/students');
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.hasPayments) {
        setPaymentWarning(errData.message);
      } else {
        toast.error(errData?.message || 'Failed to delete student');
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Topbar title="Edit Student Profile" />
        <div className="p-6 space-y-6 animate-pulse max-w-5xl mx-auto">
          <div className="h-6 w-32 skeleton rounded" />
          <div className="h-28 bg-white rounded-2xl border border-slate-200/80 p-6 skeleton" />
          <div className="h-96 bg-white rounded-2xl border border-slate-200/80 p-6 skeleton" />
        </div>
      </div>
    );
  }

  if (!studentData?.student) {
    return (
      <div>
        <Topbar title="Edit Student Profile" />
        <div className="p-12 text-center text-slate-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          Student record not found
        </div>
      </div>
    );
  }

  const { student, feeSummary } = studentData;
  const overall = feeSummary?.overall || {};
  const hasPaidFees = (overall.totalPaid || 0) > 0;

  return (
    <div>
      <Topbar title={`Edit ${student.name} (${student.studentId})`} />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6"
      >
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/students/${student.studentId}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Student Profile
          </button>

          <div className="flex items-center gap-2">
            {form.status === 'Active' ? (
              <button
                type="button"
                onClick={() => {
                  setTargetStatus('Inactive');
                  setShowStatusModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <Power className="w-3.5 h-3.5 text-amber-700" /> Deactivate Student
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTargetStatus('Active');
                  setShowStatusModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-700" /> Reactivate Student
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setPaymentWarning(null);
                setShowDeleteModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Delete Student
            </button>
          </div>
        </div>

        {/* Student Snapshot Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/70 text-blue-700 flex items-center justify-center font-bold text-lg uppercase shrink-0">
                {student.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{student.name}</h2>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusColor(form.status)}`}>
                    {form.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: <span className="font-semibold text-slate-700">{student.studentId}</span> • Adm No: <span className="font-semibold text-slate-700">{student.admissionNo}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono bg-slate-50/80 px-4 py-2 rounded-xl border border-slate-200/60">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">Total Assessed</span>
                <span className="font-bold text-slate-800">{formatCurrency(overall.totalFee)}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-emerald-600 block text-[10px] uppercase font-sans font-semibold">Total Paid</span>
                <span className="font-bold text-emerald-700">{formatCurrency(overall.totalPaid)}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-rose-600 block text-[10px] uppercase font-sans font-semibold">Outstanding</span>
                <span className="font-bold text-rose-600">{formatCurrency(overall.totalPending)}</span>
              </div>
            </div>
          </div>

          {form.status === 'Inactive' && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Account Deactivated:</strong> This student is currently inactive. Past payment vouchers and financial ledgers remain intact for auditing.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTargetStatus('Active');
                  setShowStatusModal(true);
                }}
                className="font-bold text-amber-800 hover:text-amber-900 underline ml-2 shrink-0 cursor-pointer"
              >
                Reactivate
              </button>
            </div>
          )}
        </div>

        {/* Edit Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-6 sm:p-8 space-y-8">
          
          {/* 1. Academic & Course Details */}
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Academic & Course Program Information
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Admission Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admission Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.admissionNo}
                  onChange={e => setForm(prev => ({ ...prev, admissionNo: e.target.value }))}
                  placeholder="e.g. UG2026BCOM001"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Unique institutional admission roll number</p>
              </div>

              {/* Student Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Student Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Sathyavathi"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  required
                />
              </div>

              {/* Degree Program */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Degree <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.degree}
                  onChange={e => handleDegreeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select Degree</option>
                  {degreesList.map(deg => (
                    <option key={deg} value={deg}>{deg}</option>
                  ))}
                </select>
              </div>

              {/* Specialization / Course Searchable Select */}
              <div ref={dropdownRef} className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course / Specialization <span className="text-rose-500">*</span>
                </label>

                {form.specialization ? (
                  <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{form.course}</p>
                        <p className="text-[10px] text-slate-500">{form.level} • {form.duration} Years</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, specialization: '', course: '', courseId: '' }));
                        setIsDropdownOpen(true);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline ml-2 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div
                      onClick={() => setIsDropdownOpen(true)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white cursor-pointer flex items-center justify-between text-slate-400"
                    >
                      <span>Choose course specialization...</span>
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-2 space-y-1">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search course name or specialization..."
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                          autoFocus
                        />
                        <div className="max-h-48 overflow-y-auto space-y-0.5 pt-1">
                          {filteredCourses.length === 0 ? (
                            <p className="text-xs text-slate-400 p-2 text-center">No matching courses found</p>
                          ) : (
                            filteredCourses.map(c => (
                              <div
                                key={c._id || c.courseName}
                                onClick={() => handleSelectCourse(c)}
                                className="px-3 py-2 text-xs rounded-lg hover:bg-blue-50 hover:text-blue-700 cursor-pointer flex items-center justify-between"
                              >
                                <span className="font-medium text-slate-800">
                                  {c.courseName || `${c.degree} ${c.specialization}`}
                                </span>
                                <span className="text-[10px] text-slate-400">{c.duration || 3} Yrs</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Year of Study */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Year of Study <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.currentYear}
                  onChange={e => setForm(prev => ({ ...prev, currentYear: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  required
                >
                  {allowedYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Academic Session */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Year <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.currentAcademicYear}
                  onChange={e => setForm(prev => ({ ...prev, currentAcademicYear: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-medium focus:outline-none focus:border-blue-500 font-mono"
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map(ay => (
                    <option key={ay.year || ay} value={ay.year || ay}>
                      {ay.year || ay} {ay.isCurrent ? '(Current Session)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batch Span (e.g. 2026–2029)
                </label>
                <input
                  type="text"
                  value={form.batch}
                  onChange={e => setForm(prev => ({ ...prev, batch: e.target.value }))}
                  placeholder="e.g. 2026–2029"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Enrollment Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enrollment Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="Active">Active (Currently Enrolled)</option>
                  <option value="Inactive">Inactive (Deactivated / Archived)</option>
                  <option value="Graduated">Graduated (Completed Program)</option>
                  <option value="Discontinued">Discontinued (Left Institute)</option>
                  <option value="Transferred">Transferred (Relocated)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Personal & Contact Details */}
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Personal & Contact Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Father Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Father's / Guardian's Name
                </label>
                <input
                  type="text"
                  value={form.fatherName}
                  onChange={e => setForm(prev => ({ ...prev, fatherName: e.target.value }))}
                  placeholder="Father or guardian full name"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => setForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="student@example.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Permanent Residential Address
                </label>
                <textarea
                  rows="2"
                  value={form.address}
                  onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter complete residential address, city, and pincode"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Reason for Profile Update (Audit Log) */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Administrative Audit Log Reason
            </label>
            <input
              type="text"
              value={form.reason}
              onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Corrected course code and updated contact details on student request"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">This entry will be permanently tracked in the college administrative audit log.</p>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate(`/students/${student.studentId}`)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>

        {/* Modal: Deactivate / Activate Confirmation */}
        <AnimatePresence>
          {showStatusModal && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowStatusModal(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    {targetStatus === 'Inactive' ? (
                      <Power className="w-5 h-5 text-amber-600" />
                    ) : (
                      <RotateCcw className="w-5 h-5 text-emerald-600" />
                    )}
                    <h3 className="font-bold text-slate-900 text-sm">
                      {targetStatus === 'Inactive' ? 'Deactivate Student Account' : 'Reactivate Student Account'}
                    </h3>
                  </div>
                  <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className={`p-3.5 rounded-xl text-xs space-y-1.5 ${targetStatus === 'Inactive' ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'}`}>
                  <p className="font-semibold">
                    {targetStatus === 'Inactive'
                      ? 'Deactivation preserves all past receipts and financial history.'
                      : 'Reactivating will restore this student to active directory status.'}
                  </p>
                  <p className="opacity-90">
                    Student: <strong>{student.name}</strong> ({student.admissionNo || student.studentId})
                  </p>
                </div>

                <form onSubmit={handleStatusChange} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason for Audit Trail
                    </label>
                    <textarea
                      value={statusReason}
                      onChange={e => setStatusReason(e.target.value)}
                      placeholder={targetStatus === 'Inactive' ? 'e.g. Student took temporary leave / discontinued studies' : 'e.g. Returned to institute / reactivated enrollment'}
                      rows="3"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowStatusModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={statusUpdating}
                      className={`px-4 py-2 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        targetStatus === 'Inactive'
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {statusUpdating ? 'Updating...' : targetStatus === 'Inactive' ? 'Confirm Deactivation' : 'Confirm Reactivation'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Delete Confirmation with Safety Guard */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowDeleteModal(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Delete Student Record</h3>
                  </div>
                  <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* If payments exist or backend warned */}
                {paymentWarning || hasPaidFees ? (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-800">Permanent Deletion Blocked by Audit Rules</p>
                          <p className="mt-1 text-rose-700">
                            {paymentWarning || `This student has recorded fee transactions totaling ${formatCurrency(overall.totalPaid)}. To ensure accounting ledger integrity and government audit compliance, students with financial vouchers cannot be permanently deleted.`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                      <p className="font-semibold text-slate-800">Recommended Alternative: Deactivate</p>
                      <p>
                        Deactivating sets this student's account status to <strong>Inactive</strong>, disabling new demands and payments while keeping all historical receipts accessible.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(false)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteModal(false);
                          setTargetStatus('Inactive');
                          setShowStatusModal(true);
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Deactivate Student Instead
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleDeleteStudent} className="space-y-4">
                    <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                      <p className="font-bold">Are you sure you want to delete this student?</p>
                      <p>
                        Permanently deleting <strong>{student.name}</strong> ({student.admissionNo || student.studentId}) will remove their student dossier and unbilled demands.
                      </p>
                      <p className="text-rose-700 font-semibold pt-1">This action cannot be undone.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Reason for Deletion
                      </label>
                      <input
                        type="text"
                        value={deleteReason}
                        onChange={e => setDeleteReason(e.target.value)}
                        placeholder="e.g. Erroneous duplicate student registration"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(false)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={deleting}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {deleting ? 'Deleting...' : 'Permanently Delete'}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
