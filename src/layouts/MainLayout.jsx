import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className={`transition-all duration-300 min-h-screen pt-16 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        <AnimatePresence mode="wait" initial={false}>
          <div key={location.pathname}>
            <Outlet context={{ collapsed }} />
          </div>
        </AnimatePresence>
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#0f172a',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '12px 18px',
            fontSize: '13px',
            fontWeight: 500
          },
          success: { iconTheme: { primary: '#16a34a', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#ffffff' } },
        }}
      />
    </div>
  );
}
