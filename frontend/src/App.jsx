// En: frontend/src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx'; // <--- IMPORTANTE: El "Cerebro" de las notificaciones

// Páginas y Componentes
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AdminPanelPage from './pages/AdminPanelPage.jsx';
import SemaphorePage from './pages/SemaphorePage.jsx';
import StatusPage from './pages/StatusPage.jsx';
import DocumentacionPage from './pages/DocumentacionPage.jsx';
import MainLayout from './components/MainLayout.jsx';
import NetworksPage from './pages/NetworksPage.jsx';
import TicketsPage from './pages/TicketsPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import RegisterPage from './pages/RegisterPage';

// Componente de Ruta Privada 
const PrivateRoute = ({ children, roles }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
        <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem'}}>
            <div className="spinner-orange" style={{width: '40px', height: '40px'}}></div>
            <span style={{color: '#64748b', fontWeight: 500}}>Cargando Sistema...</span>
        </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; 
  }
  
  return children;
};

// Componente que contiene la lógica de todas las rutas
function AppRoutes() {
  return (
    <Routes>
      {/* --- Rutas Públicas --- */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro/:token" element={<RegisterPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {/* La ruta /register pública a veces es necesaria para el primer admin, 
          pero idealmente debería estar protegida o eliminada en producción si usas AdminPanel */}
      <Route path="/register" element={<RegisterPage />} />
      
      {/* --- Rutas Protegidas --- */}
      <Route element={<MainLayout />}>
        
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        
        {/* SEMÁFOROS */}
        <Route path="/semaphores" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin', 'municipalidad']}> 
            <SemaphorePage />
          </PrivateRoute>} 
        />

        {/* TICKETS */}
        <Route path="/tickets" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin', 'municipalidad']}>
            <TicketsPage />
          </PrivateRoute>} 
        />
        
        {/* NOTIFICACIONES */}
        <Route path="/notifications" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin', 'municipalidad']}>
            <NotificationsPage />
          </PrivateRoute>} 
        />

        {/* ESTADOS */}
        <Route path="/status" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin']}>
            <StatusPage />
          </PrivateRoute>} 
        />

        {/* DOCUMENTACIÓN */}
        <Route path="/documentacion" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin', 'municipalidad']}>
            <DocumentacionPage />
          </PrivateRoute>} 
        />

        {/* CALENDARIO */}
        <Route path="/calendar" element={
          <PrivateRoute roles={['admin', 'user', 'superadmin', 'municipalidad']}>
            <CalendarPage />
          </PrivateRoute>} 
        />

        {/* REDES IOT */}
        <Route path="/networks" element={
          <PrivateRoute roles={['admin', 'superadmin']}>
            <NetworksPage />
          </PrivateRoute>
        } />

        {/* ADMINISTRACIÓN */}
        <Route path="/admin" element={
            <PrivateRoute roles={['admin', 'superadmin']}>
                <AdminPanelPage />
            </PrivateRoute>
        } />

      </Route>

      <Route path="*" element={
        <div style={{textAlign: 'center', padding: '4rem'}}>
            <h2>404: Página no encontrada</h2>
            <p>La ruta que buscas no existe.</p>
        </div>
      } />
    </Routes>
  );
}

// Componente principal App
function App() {
  return (
    <Router>
      <AuthProvider>
        {/* 🔥 AQUÍ ESTÁ LA CLAVE: NotificationProvider DEBE estar DENTRO de AuthProvider */}
        {/* Esto permite que useAuth() funcione dentro de NotificationContext para saber quién es el usuario */}
        <NotificationProvider>
            <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;