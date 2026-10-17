import { GraduationCap } from 'lucide-react';

/**
 * CollegeLogo Component
 * Official branding emblem for Sri Sai Degree & PG College, Vizianagaram
 */
export default function CollegeLogo({
  size = 'md',
  className = '',
  glow = false,
  showText = false,
  textColor = 'text-white',
  customSrc = null
}) {
  const sizeMap = {
    xs: { box: 'w-7 h-7 rounded-lg', icon: 'w-3.5 h-3.5', title: 'text-xs', sub: 'text-[8px]' },
    sm: { box: 'w-9 h-9 rounded-xl', icon: 'w-4.5 h-4.5', title: 'text-xs', sub: 'text-[9px]' },
    md: { box: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5', title: 'text-sm', sub: 'text-[10px]' },
    lg: { box: 'w-14 h-14 rounded-2xl', icon: 'w-7 h-7', title: 'text-base', sub: 'text-xs' },
    xl: { box: 'w-20 h-20 rounded-3xl', icon: 'w-10 h-10', title: 'text-lg', sub: 'text-xs' },
    hero: { box: 'w-24 h-24 sm:w-28 sm:h-28 rounded-3xl', icon: 'w-12 h-12 sm:w-14 sm:h-14', title: 'text-xl sm:text-2xl', sub: 'text-xs sm:text-sm' },
  };

  const dim = sizeMap[size] || sizeMap.md;
  const isDarkText = textColor.includes('slate-900') || textColor.includes('text-black');

  if (customSrc) {
    return (
      <div className={`relative flex items-center gap-3 ${className}`}>
        <img
          src={customSrc}
          alt="Sri Sai Degree & PG College Logo"
          className={`${dim.box} object-contain rounded-xl ${glow ? 'drop-shadow-[0_0_25px_rgba(59,130,246,0.6)]' : ''}`}
        />
        {showText && (
          <div className="text-left min-w-0">
            <h2 className={`font-bold tracking-wide uppercase leading-tight ${textColor} ${dim.title}`}>
              SRI SAI DEGREE & PG COLLEGE
            </h2>
            <p className={`${isDarkText ? 'text-slate-500' : 'text-slate-400'} font-semibold uppercase tracking-widest text-[9.5px] mt-0.5`}>
              VIZIANAGARAM · ANDHRA PRADESH
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className={`relative ${dim.box} ${
          isDarkText
            ? 'bg-[#0f1d38] text-white border border-[#1e293b]'
            : 'bg-white/[0.08] text-white border border-white/20'
        } backdrop-blur-sm flex items-center justify-center shrink-0 shadow-md ${
          glow ? 'shadow-[0_0_25px_rgba(59,130,246,0.5)] ring-2 ring-blue-400/40' : ''
        }`}
      >
        <GraduationCap className={`${dim.icon} text-white stroke-[1.8]`} />
      </div>

      {showText && (
        <div className="text-left min-w-0">
          <h2 className={`font-bold tracking-wide uppercase leading-tight ${textColor} ${dim.title}`}>
            SRI SAI DEGREE & PG COLLEGE
          </h2>
          <p className={`${isDarkText ? 'text-slate-500' : 'text-slate-400'} font-semibold uppercase tracking-widest text-[9.5px] mt-0.5`}>
            VIZIANAGARAM · ANDHRA PRADESH
          </p>
        </div>
      )}
    </div>
  );
}
