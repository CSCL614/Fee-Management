import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, CreditCard, History, BookOpen, FileText,
  AlertCircle, Settings, Shield, UserCog, LogOut, ChevronLeft,
  ChevronRight, GraduationCap, Menu, X
} from 'lucide-react';

const adminMenu = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/students', icon: Users, label: 'Students' },
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

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-white/15 text-white shadow-sm'
        : 'text-blue-100 hover:bg-white/10 hover:text-white'
    }`;

  const renderSidebarContent = (isMobile = false) => {
    const showText = isMobile || !collapsed;

    return (
      <>
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            {showText && (
              <div className="animate-fade-in">
                <h1 className="text-white font-bold text-sm leading-tight">Sri Vidya</h1>
                <p className="text-blue-200 text-xs">Fee Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menu.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={navLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {showText && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className={`flex items-center ${!showText ? 'justify-center' : 'gap-3 px-2'} mb-3`}>
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{user?.name?.charAt(0)}</span>
            </div>
            {showText && (
              <div className="animate-fade-in min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                <p className="text-blue-200 text-xs capitalize">{user?.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 w-full rounded-lg text-sm text-red-200 hover:bg-red-500/20 hover:text-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {showText && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse toggle (desktop only) */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-navy-700 border-2 border-navy-500 rounded-full items-center justify-center text-white hover:bg-navy-600 transition-colors z-10"
          >
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        )}
      </>
    );
  };

  return (
    <>
      {/* Mobile toggle (Top Right) */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 right-4 z-50 w-10 h-10 bg-navy-700 hover:bg-navy-800 rounded-xl flex items-center justify-center text-white shadow-md transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end" onClick={() => setMobileOpen(false)}>
          <div
            className="w-64 h-full bg-gradient-to-b from-navy-800 to-navy-950 flex flex-col relative shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-gradient-to-b from-navy-800 to-navy-950 fixed top-0 left-0 bottom-0 h-screen z-30 transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>
    </>
  );
}
