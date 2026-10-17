import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from './helpers';

// Standard Easing curves for College ERP
export const EASING_SPRING = { type: 'spring', stiffness: 380, damping: 30 };
export const EASING_SUBTLE = [0.22, 1, 0.36, 1];
export const EASING_SMOOTH = [0.25, 0.1, 0.25, 1];

// 1. Unified Page Transition System
// - When entering a page: smooth fade in while moving slightly upward into its normal position (y: 14 -> 0, scale: 0.992 -> 1) in 420ms
// - When leaving a page: smooth fade out while moving slightly upward (y: 0 -> -8, scale: 1 -> 0.992) in 280ms
export const pageVariants = {
  initial: { opacity: 0, y: 14, scale: 0.992 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.992,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
  }
};

// 2. Stagger Containers for Cards & Grids
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.03
    }
  }
};

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: EASING_SUBTLE }
  }
};

// 3. Card & Section Reveal
export const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.40, ease: EASING_SUBTLE }
  }
};

// 4. Modal Dialogs
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: EASING_SUBTLE }
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 4,
    transition: { duration: 0.14, ease: [0.4, 0, 1, 1] }
  }
};

export const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

// 5. Dropdowns & Flyouts
export const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.97, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.16, ease: EASING_SUBTLE }
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -3,
    transition: { duration: 0.12, ease: [0.4, 0, 1, 1] }
  }
};

/**
 * AnimatedNumber Component: Smooth count-up for statistics.
 * Prevents re-animating when the value hasn't changed.
 * Respects prefers-reduced-motion.
 */
export function AnimatedNumber({ value = 0, isCurrency = false, duration = 650 }) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const [displayValue, setDisplayValue] = useState(numericValue);
  const prevValueRef = useRef(null);

  useEffect(() => {
    // If user prefers reduced motion, jump straight to target
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(numericValue);
      prevValueRef.current = numericValue;
      return;
    }

    // If value is the same as previous rendered, don't re-animate
    if (prevValueRef.current === numericValue) {
      return;
    }

    const startValue = prevValueRef.current !== null ? prevValueRef.current : 0;
    const diff = numericValue - startValue;
    prevValueRef.current = numericValue;

    if (diff === 0) {
      setDisplayValue(numericValue);
      return;
    }

    let startTime = null;
    let animationFrameId = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease out
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * ease);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(numericValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [numericValue, duration]);

  if (isCurrency) {
    return <span>{formatCurrency(displayValue)}</span>;
  }
  return <span>{displayValue.toLocaleString('en-IN')}</span>;
}

/**
 * Trigger subtle, celebratory confetti burst on payment success.
 * Uses a pure canvas overlay, self-cleaning after 1.8 seconds.
 */
export function triggerPaymentConfetti() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const colors = ['#2563EB', '#10B981', '#F59E0B', '#818CF8', '#06B6D4', '#172554'];
  const particleCount = 42;
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: width * 0.5 + (Math.random() - 0.5) * 160,
      y: height * 0.35 + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 6 - 2,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 10,
      opacity: 1
    });
  }

  const startTime = performance.now();
  const maxDuration = 1800;

  function render(now) {
    const elapsed = now - startTime;
    if (elapsed > maxDuration) {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16; // gravity
      p.vx *= 0.98; // air resistance
      p.rotation += p.vRotation;
      p.opacity = Math.max(0, 1 - elapsed / maxDuration);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.75);
      ctx.restore();
    });

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

/**
 * Animated SVG Checkmark for payment completion
 */
export function AnimatedCheckmark({ size = 48, color = '#10B981' }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      className="inline-block"
      initial="hidden"
      animate="visible"
    >
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke={color}
        strokeWidth="3"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: EASING_SUBTLE }}
      />
      <motion.path
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.5 27.5l7.5 7.5 15.5-16"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.22, duration: 0.3, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}
