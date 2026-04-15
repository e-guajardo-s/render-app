// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';

// Páginas
import LoginPage         from './pages/LoginPage.jsx';
import DashboardPage     from './pages/DashboardPage.jsx';
import AdminPanelPage    from './pages/AdminPanelPage.jsx';
import SemaphorePage     from './pages/SemaphorePage.jsx';
import StatusPage        from './pages/StatusPage.jsx';
import DocumentacionPage from './pages/DocumentacionPage.jsx';
import MainLayout        from './components/MainLayout.jsx';
import NetworksPage      from './pages/NetworksPage.jsx';
import TicketsPage       from './pages/TicketsPage.jsx';
import CalendarPage      from './pages/CalendarPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import RegisterPage      from './pages/RegisterPage';
import AuditPage        from './pages/AuditPage.jsx';
import ProfilePage      from './pages/ProfilePage.jsx';
import ComparePage      from './pages/ComparePage.jsx';

// ─── Ruta Privada ────────────────────────────────────────────────
const PrivateRoute = ({ children, roles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner-orange" style={{ width: '40px', height: '40px' }} />
        <span style={{ color: '#64748b', fontWeight: 500 }}>Cargando Sistema...</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

// ─── Rutas ───────────────────────────────────────────────────────
function AppRoutes() {
  const { user } = useAuth();
  const IS_PROD = import.meta.env.PROD;

  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro/:token" element={<RegisterPage />} />
      <Route path="/" element={<Navigate to={IS_PROD ? '/login' : '/dashboard'} replace />} />

      {/* Registro público: solo disponible en desarrollo.
          En producción se usa AdminPanel para crear usuarios. */}
      {!IS_PROD && (
        <Route path="/register" element={<RegisterPage />} />
      )}

      {/* Protegidas */}
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />

        <Route path="/semaphores" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin', 'municipalidad']}>
            <SemaphorePage />
          </PrivateRoute>
        } />

        <Route path="/tickets" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin', 'municipalidad']}>
            <TicketsPage />
          </PrivateRoute>
        } />

        <Route path="/notifications" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin', 'municipalidad']}>
            <NotificationsPage />
          </PrivateRoute>
        } />

        <Route path="/status" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin']}>
            <StatusPage />
          </PrivateRoute>
        } />

        <Route path="/documentacion" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin', 'municipalidad']}>
            <DocumentacionPage />
          </PrivateRoute>
        } />

        <Route path="/calendar" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin', 'municipalidad']}>
            <CalendarPage />
          </PrivateRoute>
        } />

        <Route path="/networks" element={
          <PrivateRoute roles={['admin', 'superadmin']}>
            <NetworksPage />
          </PrivateRoute>
        } />

        <Route path="/admin" element={
          <PrivateRoute roles={['admin', 'superadmin']}>
            <AdminPanelPage />
          </PrivateRoute>
        } />

        <Route path="/audit" element={
          <PrivateRoute roles={['admin', 'superadmin']}>
            <AuditPage />
          </PrivateRoute>
        } />

        <Route path="/compare" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin']}>
            <ComparePage />
          </PrivateRoute>
        } />

        <Route path="/profile" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin', 'municipalidad']}>
            <ProfilePage />
          </PrivateRoute>
        } />
      </Route>

      <Route path="*" element={
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <h2>404 — Página no encontrada</h2>
          <p>La ruta que buscas no existe.</p>
        </div>
      } />
    </Routes>
  );
}

// ─── App ─────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <AuthProvider>
        {/* SocketProvider crea UN solo socket para toda la app.
            NotificationProvider y las pages lo consumen via useSocket(). */}
        <SocketProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
