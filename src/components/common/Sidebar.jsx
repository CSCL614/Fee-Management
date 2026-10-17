import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, CreditCard, History, BookOpen, FileText,
  AlertCircle, Settings, Shield, UserCog, LogOut, ChevronLeft,
  ChevronRight, GraduationCap, Menu, X, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CollegeLogo from './CollegeLogo';

const adminMenu = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/students/import', icon: FileSpreadsheet, label: 'Import Excel' },
  { to: '/record-payment', icon: CreditCard, label: 'Record Payment' },
  { to: '/payments', icon: History, label: 'Payment History' },
  { to: '/fee-structure', icon: BookOpen, label: 'Fee Structure' },
  { to: '/pending-fees', icon: AlertCircle, label: 'Pending Fees' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/audit-log', icon: Shield, label: 'Audit Log' },
  { to: '/manage-users', icon: UserCog, label: 'Manage Users' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const accountantMenu = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/record-payment', icon: CreditCard, label: 'Record Payment' },
  { to: '/payments', icon: History, label: 'Payment History' },
  { to: '/fee-structure', icon: BookOpen, label: 'Fee Structure' },
  { to: '/pending-fees', icon: AlertCircle, label: 'Pending Fees' },
];

export default function Sidebar({ collapsed: propCollapsed, setCollapsed: propSetCollapsed }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const collapsed = propCollapsed !== undefined ? propCollapsed : internalCollapsed;
  const setCollapsed = propSetCollapsed !== undefined ? propSetCollapsed : setInternalCollapsed;

  const menu = isAdmin ? adminMenu : accountantMenu;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderSidebarContent = (isMobile = false) => {
    const showText = isMobile || !collapsed;

    return (
      <>
        {/* Logo */}
        <div className={`px-4 py-5 border-b border-white/[0.08] ${collapsed && !isMobile ? 'px-3' : ''}`}>
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="shrink-0"
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/20 flex items-center justify-center text-white shrink-0 shadow-md">
                <GraduationCap className="w-5 h-5 text-white stroke-[1.8]" />
              </div>
            </motion.div>
            {showText && (
              <div className="min-w-0">
                <h1 className="text-white font-bold text-xs sm:text-[13px] leading-tight tracking-wide uppercase">
                  SRI SAI DEGREE & PG COLLEGE
                </h1>
                <p className="text-slate-400 text-[9px] font-semibold uppercase tracking-widest mt-0.5">
                  VIZIANAGARAM · ANDHRA PRADESH
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Label */}
        {showText && (
          <div className="px-5 pt-5 pb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Navigation</p>
          </div>
        )}

        {/* Menu items with smooth layoutId active indicator & icon scale */}
        <nav className={`flex-1 px-3 ${showText ? 'py-1' : 'py-4'} space-y-0.5 overflow-y-auto sidebar-scroll`}>
          {menu.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              title={collapsed && !isMobile ? item.label : undefined}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId={isMobile ? 'sidebar-active-indicator-mobile' : 'sidebar-active-indicator'}
                      className="absolute inset-0 bg-blue-600/20 rounded-lg border-l-[3px] border-blue-400"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <item.icon
                    className={`relative z-10 w-[18px] h-[18px] shrink-0 transition-all duration-200 group-hover:scale-110 ${
                      collapsed && !isMobile ? 'mx-auto' : ''
                    } ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}
                  />
                  {showText && <span className="relative z-10 truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="px-3 py-4 border-t border-white/[0.08] mt-auto">
          <div className={`flex items-center ${!showText ? 'justify-center' : 'gap-3 px-2'} mb-3`}>
            <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center shrink-0 border border-blue-500/15">
              <span className="text-blue-300 text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            {showText && (
              <div className="min-w-0">
                <p className="text-white text-[13px] font-semibold truncate">{user?.name}</p>
                <p className="text-slate-400 text-[11px] capitalize font-medium">{user?.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[13px] font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 active:scale-[0.98] transition-all duration-150 ${
              !showText ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5" />
            {showText && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse toggle (desktop only) */}
        {!isMobile && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-navy-800 border border-navy-600/50 rounded-full items-center justify-center text-slate-300 hover:text-white hover:bg-navy-700 transition-colors z-10 shadow-md cursor-pointer"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </motion.button>
        )}
      </>
    );
  };

  return (
    <>
      {/* Mobile toggle (Top Right) */}
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 right-4 z-50 w-10 h-10 bg-navy-800 hover:bg-navy-700 rounded-xl flex items-center justify-center text-white shadow-lg transition-colors cursor-pointer"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </motion.button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: 264 }}
              animate={{ x: 0 }}
              exit={{ x: 264 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-[264px] h-full bg-navy-800 flex flex-col relative shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
              {renderSidebarContent(true)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-navy-800 fixed top-0 left-0 bottom-0 h-screen z-30 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border-r border-navy-700/50 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>
    </>
  );
}
