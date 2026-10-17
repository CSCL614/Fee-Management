import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CollegeLogo from '../common/CollegeLogo';
import { ArrowRight } from 'lucide-react';

/**
 * CinematicIntro Component
 * Premium Animated College Branding Intro Screen:
 * 
 * 1. Initial Screen:
 *    - Full-screen deep navy-blue background with subtle radial blue gradients
 *    - College logo in the center with smooth fade-in and scale-up effect
 *    - Subtle circular glow and elegant light sweep around the logo
 * 
 * 2. College Name Reveal:
 *    - Smooth fade-in and upward slide of "Sri Vidya Degree College"
 *    - Thin animated line beneath the college name expanding smoothly
 *    - Subtitle "College Fee Management System" reveal underneath
 *    - Elegant, readable, professional collegiate typography
 * 
 * 3. Transition to Login:
 *    - Brief hold of completed branding screen (~2.4s total intro duration)
 *    - Smooth crossfade and gentle zoom into the login page
 *    - Skip Intro button available at all times
 *    - Respects prefers-reduced-motion
 */
export default function CinematicIntro({ onComplete }) {
  const [step, setStep] = useState(1); // 1: Logo, 2: Name & Line, 3: Completed Hold

  useEffect(() => {
    // Respect prefers-reduced-motion immediately
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      onComplete();
      return;
    }

    // Sequence timing (total duration ~2.4s)
    // Step 1 -> Step 2: Reveal College Name and Animated Line after 650ms
    const timerStep2 = setTimeout(() => {
      setStep(2);
    }, 650);

    // Step 2 -> Step 3: Complete & Hold after 1500ms
    const timerStep3 = setTimeout(() => {
      setStep(3);
    }, 1500);

    // End intro and trigger smooth crossfade transition after 2400ms
    const timerComplete = setTimeout(() => {
      onComplete();
    }, 2400);

    return () => {
      clearTimeout(timerStep2);
      clearTimeout(timerStep3);
      clearTimeout(timerComplete);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#070D1B] flex items-center justify-center overflow-hidden select-none">
      
      {/* Dynamic Deep Navy Gradients & Ambient Glow */}
      <div className="absolute inset-0 bg-radial from-[#102046] via-[#0B152E] to-[#070D1B] opacity-90" />

      {/* Subtle Background Glow Orbs */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 0.25, 0.18], scale: [0.8, 1.15, 1.05] }}
        transition={{ duration: 2.2, ease: 'easeOut' }}
        className="absolute w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.18, 0.12] }}
        transition={{ duration: 2.0, delay: 0.4 }}
        className="absolute w-[400px] h-[400px] rounded-full bg-indigo-500/15 blur-[90px] pointer-events-none"
      />

      {/* Skip Intro Button */}
      <motion.button
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        onClick={onComplete}
        className="absolute top-6 right-6 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-slate-300 hover:text-white text-xs font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg"
      >
        <span>Skip Intro</span>
        <ArrowRight className="w-3.5 h-3.5 opacity-70" />
      </motion.button>

      {/* Center Branding Showcase */}
      <div className="relative z-10 text-center px-6 max-w-lg mx-auto flex flex-col items-center">
        
        {/* 1. College Logo Reveal with Circular Glow & Light Sweep */}
        <div className="relative mb-6">
          {/* Circular Glow Effect */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: [0, 0.5, 0.35],
              scale: [0.6, 1.3, 1.15]
            }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute -inset-6 rounded-full bg-blue-500/30 blur-2xl pointer-events-none"
          />

          {/* Light Sweep Halo */}
          <motion.div
            initial={{ rotate: 0, opacity: 0 }}
            animate={{ rotate: 360, opacity: [0, 0.4, 0.2] }}
            transition={{ duration: 2.4, ease: 'linear' }}
            className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-400/0 via-blue-400/25 to-blue-400/0 blur-md pointer-events-none"
          />

          {/* Centered Animated Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.75, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.75,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="relative z-10"
          >
            <CollegeLogo size="hero" glow={true} />
          </motion.div>
        </div>

        {/* 2. College Name & Animated Line Reveal */}
        <div className="space-y-3 min-h-[90px] flex flex-col items-center">
          <AnimatePresence>
            {step >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center"
              >
                {/* Configured College Name */}
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase text-white drop-shadow-md text-center">
                  SRI SAI DEGREE & PG COLLEGE
                </h1>

                {/* Thin Animated Line Beneath College Name */}
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 160, opacity: 1 }}
                  transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent my-2.5 rounded-full"
                />

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="text-xs sm:text-sm font-semibold tracking-widest text-blue-200/90 uppercase"
                >
                  VIZIANAGARAM · ANDHRA PRADESH
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Subtle Quality Tagline */}
        <AnimatePresence>
          {step >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-6 flex items-center gap-2 text-slate-400 text-xs font-medium tracking-widest uppercase"
            >
              <span>Smart</span>
              <span className="text-blue-400">•</span>
              <span>Simple</span>
              <span className="text-blue-400">•</span>
              <span>Secure</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
