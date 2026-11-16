import { useState } from 'react';
import { User } from 'lucide-react';

export default function StudentAvatar({
  src,
  name = '',
  size = 'md',
  className = '',
  showBorder = true
}) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl'
  };

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-10 h-10'
  };

  const getInitials = (n) => {
    if (!n) return '';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;
  const currentIconSize = iconSizes[size] || iconSizes.md;
  const borderClass = showBorder ? 'border border-slate-200/80 shadow-2xs' : '';

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={name || 'Student photo'}
        onError={() => setImageError(true)}
        className={`${currentSize} rounded-full object-cover shrink-0 ${borderClass} ${className}`}
      />
    );
  }

  const initials = getInitials(name);

  return (
    <div
      className={`${currentSize} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 tracking-wider ${borderClass} ${className}`}
      title={name}
    >
      {initials ? initials : <User className={`${currentIconSize} text-white/90`} />}
    </div>
  );
}
