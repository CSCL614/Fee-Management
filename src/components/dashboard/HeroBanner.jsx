import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus, CreditCard, FileText, ArrowRight,
  GraduationCap, Search, Clock, CheckCircle2
} from 'lucide-react';
import heroImage from '../../assets/hero-students.jpg';

export default function HeroBanner() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-[#0e1d3d] text-white shadow-xl border border-navy-800/80">
      {/* Decorative ambient background accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Modern Split Layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 p-6 sm:p-8 lg:p-10 items-center">
        
        {/* Left Column: Text & Actions */}
        <div className="lg:col-span-7 space-y-5">
          {/* Institution & Role Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-200 text-xs font-semibold">
            <GraduationCap className="w-3.5 h-3.5 text-blue-300" />
            <span>Sri Sai Degree & PG College • {isAdmin ? 'Administrator Portal' : 'Accountant Collection Desk'}</span>
          </div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-[1.15]">
              Every Student. Every Fee. <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-indigo-200">
                One Simple System.
              </span>
            </h1>
          </motion.div>

          {/* Supporting Text */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12 }}
            className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed"
          >
            Manage admissions, fee collections, outstanding dues, and student records in one organized workspace.
          </motion.p>

          {/* Quick Actions (Role-Based) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.18 }}
            className="flex flex-wrap items-center gap-3 pt-2"
          >
            {isAdmin ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/students/new')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/25 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Enroll Student</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/record-payment')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Collect Fee</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/reports')}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-blue-200 hover:text-white font-medium transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Reports</span>
                  <ArrowRight className="w-3 h-3 opacity-70" />
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/record-payment')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/25 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Collect Student Fee</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/students')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <Search className="w-4 h-4 text-blue-300" />
                  <span>Search Student</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/pending-fees')}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-amber-200 hover:text-white font-medium transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Dues</span>
                  <ArrowRight className="w-3 h-3 opacity-70" />
                </motion.button>
              </>
            )}
          </motion.div>

          {/* Trust and Verification Footer Chips */}
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-navy-800/80 text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 100% Audit-Locked Ledgers
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Real-time Fee Reconciliation
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Academic Session 2026-27 Active
            </span>
          </div>
        </div>

        {/* Right Column: Polished Student Image Container */}
        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-navy-950/80 group"
          >
            {!imgError ? (
              <img
                src={heroImage}
                alt="Sri Sai Degree & PG College Students"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                className={`w-full h-full object-cover object-center transition-all duration-500 ${
                  imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                }`}
              />
            ) : (
              /* Graceful Fallback if image fails to load */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-navy-900 to-navy-950">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-300 mb-3">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wide">Sri Sai Degree & PG College</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs font-medium">
                  Vizianagaram, Andhra Pradesh • Fee Management Workspace
                </p>
              </div>
            )}

            {/* Subtle Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/20 to-transparent pointer-events-none" />

            {/* Live Campus Chip */}
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto px-3.5 py-2 rounded-xl bg-navy-900/90 backdrop-blur-md border border-white/15 flex items-center gap-2.5 shadow-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">Campus Ledger Active</p>
                <p className="text-[10px] text-slate-300">Synchronized with Student Records</p>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
