import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Topbar from '../components/common/Topbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { pageVariants } from '../utils/animations';
import { ArrowLeft, UserPlus, Search, X, Check, ChevronDown, BookOpen, AlertCircle, Calendar } from 'lucide-react';

export default function AddStudentPage() {
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
    email: '',
    phone: '',
    fatherName: '',
    gender: 'Male',
    address: ''
  });

  const [courses, setCourses] = useState([]);
  const [degreesList, setDegreesList] = useState(['B.Sc', 'B.Com', 'M.Sc']);
  const [academicYears, setAcademicYears] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Searchable dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Load initial academic years and MongoDB courses
  useEffect(() => {
    Promise.all([
      api.get('/audit/academic-years'),
      api.get('/courses')
    ])
      .then(([ayRes, coursesRes]) => {
        const years = ayRes.data.data || [];
        setAcademicYears(years);
        const currentAY = years.find(y => y.isCurrent);
        if (currentAY) {
          setForm(prev => ({ ...prev, currentAcademicYear: currentAY.year }));
        }

        const loadedCourses = coursesRes.data.data?.courses || [];
        setCourses(loadedCourses);

        const loadedDegrees = coursesRes.data.data?.degrees || [];
        if (loadedDegrees.length > 0) {
          // Ensure B.Sc, B.Com, M.Sc are present in degrees list
          const combinedDegrees = Array.from(new Set([...loadedDegrees, 'B.Sc', 'B.Com', 'M.Sc']));
          setDegreesList(combinedDegrees);
        }
      })
      .catch(err => {
        console.error('Failed to load initial form data:', err);
        toast.error('Failed to load courses or academic years');
      })
      .finally(() => {
        setLoadingCourses(false);
      });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter courses for currently selected degree
  const availableSpecializations = useMemo(() => {
    if (!form.degree) return [];
    return courses.filter(c => c.degree === form.degree && c.status === 'active');
  }, [courses, form.degree]);

  // Search filtered courses
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return availableSpecializations;
    const q = searchQuery.toLowerCase();
    return availableSpecializations.filter(c =>
      c.specialization.toLowerCase().includes(q) ||
      (c.courseName && c.courseName.toLowerCase().includes(q))
    );
  }, [availableSpecializations, searchQuery]);

  // Calculate allowed study years based on course duration
  const allowedYears = useMemo(() => {
    const dur = form.duration || (form.degree === 'M.Sc' ? 2 : 3);
    const yearsList = [];
    for (let i = 1; i <= dur; i++) {
      const suffix = i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th';
      yearsList.push(`${i}${suffix} Year`);
    }
    return yearsList;
  }, [form.duration, form.degree]);

  // Calculate batch automatically: Admission Year + Duration (e.g. 2025 -> 2025-2028)
  const calculatedBatch = useMemo(() => {
    let startYear;
    if (form.admissionNo) {
      const match = form.admissionNo.match(/\d{4}/);
      if (match) startYear = parseInt(match[0], 10);
    }
    if (!startYear && form.currentAcademicYear) {
      const parts = form.currentAcademicYear.split('-');
      if (parts[0]) startYear = parseInt(parts[0], 10);
    }
    if (!startYear) startYear = new Date().getFullYear();

    const duration = form.duration || (form.level === 'PG' ? 2 : 3);
    const endYear = startYear + duration;
    return `${startYear}–${endYear}`;
  }, [form.admissionNo, form.currentAcademicYear, form.duration, form.level]);

  // Handle Degree Change
  const handleDegreeChange = (degree) => {
    // Derive level: B.Sc and B.Com = UG; M.Sc = PG
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
      currentYear: '1st Year' // Reset year of study
    }));

    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  // Handle Specialization / Course Selection
  const handleSelectCourse = (selectedCourse) => {
    const courseDuration = selectedCourse.duration || (selectedCourse.level === 'PG' ? 2 : 3);
    setForm(prev => ({
      ...prev,
      courseId: selectedCourse._id,
      specialization: selectedCourse.specialization,
      course: selectedCourse.courseName || `${selectedCourse.degree} ${selectedCourse.specialization}`,
      duration: courseDuration,
      level: selectedCourse.level || (selectedCourse.degree === 'M.Sc' ? 'PG' : 'UG'),
      currentYear: '1st Year' // Reset year on course change
    }));
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  // Clear selected course
  const handleClearCourse = () => {
    setForm(prev => ({
      ...prev,
      courseId: '',
      specialization: '',
      course: '',
      currentYear: '1st Year'
    }));
    setSearchQuery('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!form.admissionNo.trim()) {
      toast.error('Admission number is required');
      return;
    }
    if (!form.name.trim()) {
      toast.error('Student name is required');
      return;
    }
    if (!form.degree) {
      toast.error('Please select a degree');
      return;
    }
    if (!form.specialization) {
      toast.error('Please select a course / specialization');
      return;
    }
    if (!form.currentYear) {
      toast.error('Please select a year of study');
      return;
    }
    if (!form.currentAcademicYear) {
      toast.error('Please select an academic year');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        admissionNo: form.admissionNo.trim(),
        name: form.name.trim(),
        degree: form.degree,
        specialization: form.specialization,
        courseId: form.courseId,
        course: form.course,
        level: form.level,
        duration: form.duration,
        currentYear: form.currentYear,
        currentAcademicYear: form.currentAcademicYear,
        batch: calculatedBatch,
        email: form.email.trim(),
        phone: form.phone.trim(),
        fatherName: form.fatherName.trim(),
        gender: form.gender,
        address: form.address.trim()
      };

      const res = await api.post('/students', payload);
      toast.success('Student created successfully');
      navigate(`/students/${res.data.data.studentId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create student');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Topbar title="Add Student" />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-6 pt-4"
      >
        <button
          onClick={() => navigate('/students')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </button>

        <div className="max-w-3xl bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-6 sm:p-8">
          <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              Enroll New Student
            </h2>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
              Admission Registration
            </span>
          </div>

          {/* Helpful warning if no courses are in database */}
          {!loadingCourses && courses.length === 0 && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">No Courses Available in System</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  No courses are configured in MongoDB. Please visit System Settings to configure college courses before adding students.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Academic & Course Information Section */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-navy-700 mb-3 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Academic & Course Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Admission Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admission Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.admissionNo}
                    onChange={e => setForm(prev => ({ ...prev, admissionNo: e.target.value }))}
                    placeholder="e.g. UG2025BSC001"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600 transition-all font-mono"
                    required
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Unique student admission identifier</p>
                </div>

                {/* Student Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Full name of student"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600 transition-all"
                    required
                  />
                </div>

                {/* Degree Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Degree <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.degree}
                    onChange={e => handleDegreeChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600 transition-all font-medium text-gray-800"
                    required
                  >
                    <option value="">Select Degree Program</option>
                    {degreesList.map(deg => (
                      <option key={deg} value={deg}>{deg}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">Program degree category</p>
                </div>

                {/* Searchable Course / Specialization Dropdown */}
                <div ref={dropdownRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization / Course <span className="text-red-500">*</span>
                  </label>

                  {/* If course is selected, show selected badge card */}
                  {form.specialization ? (
                    <div className="flex items-center justify-between p-2.5 bg-navy-50/80 border border-navy-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-navy-600 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-navy-900 leading-tight">
                            {form.specialization}
                          </p>
                          <p className="text-xs text-navy-700">
                            {form.degree} • {form.duration} Years • {form.level}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearCourse}
                        className="p-1 text-gray-400 hover:text-navy-700 rounded-lg hover:bg-navy-100/60 transition-colors"
                        title="Clear course selection"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    /* Search input trigger */
                    <div className="relative">
                      <input
                        type="text"
                        disabled={!form.degree}
                        value={searchQuery}
                        onChange={e => {
                          setSearchQuery(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => {
                          if (form.degree) setIsDropdownOpen(true);
                        }}
                        placeholder={
                          !form.degree
                            ? 'Please select Degree first'
                            : availableSpecializations.length === 0
                            ? 'No courses available for this degree'
                            : 'Search course specialization...'
                        }
                        className={`w-full pl-9 pr-9 py-2.5 border rounded-xl text-sm transition-all focus:outline-none ${
                          !form.degree
                            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-white border-gray-200 focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600'
                        }`}
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      {form.degree && (
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      )}

                      {/* Dropdown list popup */}
                      {isDropdownOpen && form.degree && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 max-h-56 overflow-y-auto z-30 py-1.5">
                          {filteredCourses.length > 0 ? (
                            filteredCourses.map(c => (
                              <button
                                key={c._id || c.courseId}
                                type="button"
                                onClick={() => handleSelectCourse(c)}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-navy-50/70 transition-colors flex items-center justify-between group border-b border-gray-50 last:border-0"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-gray-800 group-hover:text-navy-800">
                                    {c.specialization}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {c.degree} — {c.specialization}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                    {c.duration} Yrs
                                  </span>
                                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                                    {c.level}
                                  </span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center">
                              <p className="text-sm text-gray-500">No matching specializations found</p>
                              <p className="text-xs text-gray-400 mt-0.5">Try a different search keyword</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">Filtered dynamically from MongoDB courses</p>
                </div>

                {/* Level (Automatically derived: UG / PG) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Level <span className="text-xs text-gray-400 font-normal">(Auto-derived)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={form.level ? `${form.level} (${form.level === 'PG' ? 'Postgraduate' : 'Undergraduate'})` : '—'}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-700 font-semibold cursor-not-allowed select-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-xs font-bold bg-navy-100 text-navy-800">
                      {form.level}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">B.Sc & B.Com = UG; M.Sc = PG</p>
                </div>

                {/* Year of Study (Dynamically restricted to allowed years) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year of Study <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.currentYear}
                    onChange={e => setForm(prev => ({ ...prev, currentYear: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600 transition-all font-medium text-gray-800"
                    required
                  >
                    {allowedYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Allowed: {allowedYears.join(', ')} ({form.duration || 3}-year course)
                  </p>
                </div>

                {/* Academic Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.currentAcademicYear}
                    onChange={e => setForm(prev => ({ ...prev, currentAcademicYear: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600 transition-all font-medium text-gray-800"
                    required
                  >
                    <option value="">Select Academic Year</option>
                    {academicYears.map(y => (
                      <option key={y.year} value={y.year}>
                        {y.year} {y.isCurrent ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">Active enrollment academic session</p>
                </div>

                {/* Batch (Auto-calculated from admission year and course duration) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch <span className="text-xs text-gray-400 font-normal">(Auto-calculated)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={calculatedBatch}
                      className="w-full px-3.5 py-2.5 border border-navy-100 rounded-xl text-sm bg-navy-50/50 text-navy-900 font-semibold cursor-not-allowed select-none font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-navy-600 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {form.duration || 3} Yrs
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Calculated: Admission Year + {form.duration || 3} years duration
                  </p>
                </div>
              </div>
            </div>

            {/* Personal & Contact Details Section */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-3">
                Personal & Contact Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="student@example.com"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
                  <input
                    type="text"
                    value={form.fatherName}
                    onChange={e => setForm(prev => ({ ...prev, fatherName: e.target.value }))}
                    placeholder="Father's full name"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600 transition-all"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Residential Address</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Permanent residential address"
                  rows="2"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-600 transition-all"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => navigate('/students')}
                className="px-6 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 transition-all shadow-xs"
              >
                {submitting ? 'Creating Student...' : 'Register Student & Generate Ledger'}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
