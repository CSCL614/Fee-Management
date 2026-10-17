import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import CollegeLogo from '../components/common/CollegeLogo';
import CinematicIntro from '../components/auth/CinematicIntro';
import heroImage from '../assets/hero-students.jpg';
import {
  User, Lock, Eye, EyeOff, LogIn, Loader2,
  AlertCircle, CheckCircle2, ShieldCheck, Sparkles, HelpCircle
} from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Cinematic Intro state: plays once per session unless reduced motion is preferred
  // Also supports ?intro=true query param for testing / previewing anytime
  const [showIntro, setShowIntro] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('intro') === 'true') {
        return true;
      }
      const alreadyPlayed = sessionStorage.getItem('svdc_intro_played');
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return !alreadyPlayed && !prefersReduced;
    } catch {
      return false;
    }
  });

  const { user, login } = useAuth();
  const navigate = useNavigate();

  // If session already exists, navigate straight to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Load saved username if remember me was active
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('svdc_remember_username');
      if (savedUser) {
        setUsername(savedUser);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  const handleIntroComplete = () => {
    try {
      sessionStorage.setItem('svdc_intro_played', 'true');
    } catch {}
    setShowIntro(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password);

      // Save remember-me preference
      try {
        if (rememberMe) {
          localStorage.setItem('svdc_remember_username', username.trim());
        } else {
          localStorage.removeItem('svdc_remember_username');
        }
      } catch {}

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please verify your username and password.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#091122]">
      
      {/* 1. Cinematic Opening Animation Sequence */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="cinematic-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 pointer-events-auto"
          >
            <CinematicIntro onComplete={handleIntroComplete} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Premium Split-Screen Login Workspace */}
      <motion.div
        initial={{ opacity: showIntro ? 0 : 1, scale: showIntro ? 0.98 : 1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, delay: showIntro ? 0.1 : 0, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-screen flex flex-col lg:flex-row"
      >
        
        {/* Left Side: College Branding & Campus Photograph Panel */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-[#091122] overflow-hidden flex-col justify-between p-10 xl:p-14 text-white">
          
          {/* Background: Authentic Indian College Students Photograph */}
          <div className="absolute inset-0 z-0">
            <img
              src={heroImage}
              alt="Sri Sai Degree & PG College Campus"
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-cover object-center transition-all duration-700 ${
                imageLoaded ? 'opacity-35 scale-100' : 'opacity-20 scale-105'
              }`}
            />
            {/* Soft Navy Gradients for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#091122] via-[#091122]/80 to-[#091122]/60" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Top: Branding Header */}
          <div className="relative z-10">
            <CollegeLogo size="lg" glow={true} showText={true} />
          </div>

          {/* Middle: Welcoming Institutional Typography */}
          <div className="relative z-10 max-w-lg space-y-4 my-auto py-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Smart • Simple • Secure</span>
            </div>

            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Modern College Fee Management Designed for Higher Education.
            </h2>

            <p className="text-slate-300 text-sm xl:text-base leading-relaxed">
              Streamlining student admissions, modular fee structures, demand generation, and locked ledger reconciliation for college administrators and accountants.
            </p>
          </div>

          {/* Bottom: Verified Trust & Session Safeguards */}
          <div className="relative z-10 pt-6 border-t border-white/10 space-y-3">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Audit-Locked Ledgers
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-blue-400" /> Real-time Fee Reconciliation
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Academic Session 2026-27 • Security Authorization Tier-1 Active
            </p>
          </div>

        </div>

        {/* Right Side: Polished Login Card Form */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16 bg-[#F8FAFC]">
          
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: showIntro ? 0.3 : 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-9 border border-slate-200/80 shadow-[0_10px_35px_rgba(15,23,42,0.06)] space-y-6"
          >
            
            {/* Mobile Branding Header */}
            <div className="lg:hidden flex items-center justify-center pb-2">
              <CollegeLogo size="md" showText={true} textColor="text-slate-900" />
            </div>

            {/* Heading & Subtitle */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Welcome Back
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 uppercase tracking-wider">
                  ERP Login
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Your college management workspace, all in one place.
              </p>
            </div>

            {/* Error Message Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-700 text-xs font-medium flex items-start gap-2.5 shadow-xs"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Username Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-username"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="login-username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    placeholder="Enter assigned username"
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white focus:bg-white font-medium"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter security password"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-11 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50 hover:bg-white focus:bg-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-600">Remember username</span>
                </label>
                
                <span
                  title="Contact your college administrator to reset your ERP credentials."
                  className="text-[11px] font-medium text-slate-400 flex items-center gap-1 cursor-help hover:text-slate-600"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> Support
                </span>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                id="login-button"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-700 via-blue-600 to-navy-800 hover:from-blue-600 hover:to-navy-700 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 disabled:opacity-60 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </motion.button>

            </form>

            {/* Quick Demo Credentials for Immediate Testing */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Demo Workspace Credentials
                </p>
                <span className="text-[10px] text-slate-400">Click to autofill</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillCredentials('admin', 'admin123')}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-200 text-left transition-all group cursor-pointer"
                >
                  <span className="font-bold text-slate-800 group-hover:text-blue-700 block text-[11px]">Administrator</span>
                  <span className="font-mono text-[10px] text-slate-500">admin / admin123</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials('suresh', 'acc123')}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-200 text-left transition-all group cursor-pointer"
                >
                  <span className="font-bold text-slate-800 group-hover:text-emerald-700 block text-[11px]">Accountant</span>
                  <span className="font-mono text-[10px] text-slate-500">suresh / acc123</span>
                </button>
              </div>
            </div>

          </motion.div>

        </div>

      </motion.div>
    </div>
  );
}
