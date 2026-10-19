import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import StudentProfilePage from './pages/StudentProfilePage';
import EditStudentPage from './pages/EditStudentPage';
import AddStudentPage from './pages/AddStudentPage';
import RecordPaymentPage from './pages/RecordPaymentPage';
import PaymentsPage from './pages/PaymentsPage';
import FeeStructurePage from './pages/FeeStructurePage';
import PendingFeesPage from './pages/PendingFeesPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogPage from './pages/AuditLogPage';
import ManageUsersPage from './pages/ManageUsersPage';
import SettingsPage from './pages/SettingsPage';
import ImportStudentsPage from './pages/ImportStudentsPage';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
        <div className="w-9 h-9 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/import" element={<ProtectedRoute adminOnly><ImportStudentsPage /></ProtectedRoute>} />
        <Route path="students/new" element={<ProtectedRoute adminOnly><AddStudentPage /></ProtectedRoute>} />
        <Route path="students/:id" element={<StudentProfilePage />} />
        <Route path="students/:id/edit" element={<ProtectedRoute adminOnly><EditStudentPage /></ProtectedRoute>} />
        <Route path="record-payment" element={<RecordPaymentPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="fee-structure" element={<ProtectedRoute><FeeStructurePage /></ProtectedRoute>} />
        <Route path="pending-fees" element={<ProtectedRoute><PendingFeesPage /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute adminOnly><ReportsPage /></ProtectedRoute>} />
        <Route path="audit-log" element={<ProtectedRoute adminOnly><AuditLogPage /></ProtectedRoute>} />
        <Route path="manage-users" element={<ProtectedRoute adminOnly><ManageUsersPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
