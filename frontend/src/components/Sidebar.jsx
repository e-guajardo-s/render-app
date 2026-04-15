// En: frontend/src/components/Sidebar.jsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const LOGO_URL = '/logo.png'; 

function Sidebar({ isOpen, onClose, user }) {
  const normalizedRole = (user?.role || '').toLowerCase();
  
  const navItems = [
    { name: 'Inicio',         path: '/dashboard',     requiredRole: 'user' },
    { name: 'Semáforos',      path: '/semaphores',    requiredRole: 'user' },
    { name: 'Estados',        path: '/status',        requiredRole: 'user' },
    { name: 'Tickets',        path: '/tickets',       requiredRole: 'user' },
    { name: 'Notificaciones', path: '/notifications', requiredRole: 'user' },
    { name: 'Calendario',     path: '/calendar',      requiredRole: 'user' },
    { name: 'Documentación',  path: '/documentacion', requiredRole: 'user' },
    { name: 'Redes IoT',      path: '/networks',      requiredRole: 'admin' },
    { name: 'Administración', path: '/admin',         requiredRole: 'admin' },
    { name: 'Comparativa',    path: '/compare',       requiredRole: 'user' },
    { name: 'Auditoría',      path: '/audit',         requiredRole: 'admin' },
    { name: 'Mi Perfil',      path: '/profile',       requiredRole: 'user' },
  ];
  
  // --- LÓGICA DE FILTRADO MODIFICADA ---
  const visibleNavItems = navItems.filter(item => {
    // 1. Super Admin ve TODO
    if (normalizedRole === 'superadmin') return true; 
    
    // 2. Admin ve 'admin' y 'user'
    if (normalizedRole === 'admin') {
      return item.requiredRole === 'user' || item.requiredRole === 'admin';
    }
    
    // 3. EXCEPCIÓN: Municipalidad (Ve 'user' PERO NO estados)
    if (normalizedRole === 'municipalidad') {
        // Si es una de las páginas restringidas, devolvemos false
      if (['/status', '/networks', '/admin', '/audit', '/compare'].includes(item.path)) {
            return false;
        }
        // Para el resto (Inicio, Semáforos, Documentación, Tickets, Notificaciones, Calendario), verifica si requiere 'user'
        return item.requiredRole === 'user';
    }

    // 4. Usuario normal (Técnico - Ve todo lo que sea 'user')
    if (normalizedRole === 'user') {
        return item.requiredRole === 'user';
    }

    return false;
  });
  
  // --- Función para formatear el rol (Actualizado para mostrar 'Técnico') ---
  const getDisplayRole = (role) => {
    if (role === 'superadmin') return 'Super Administrador';
    if (role === 'admin') return 'Administrador';
    if (role === 'municipalidad') return 'Municipalidad';
    if (role === 'user') return 'Técnico';
    return role;
  };
  // ------------------------------------------

  return (
    <>
      <div 
        className={isOpen ? 'sidebar-backdrop open' : 'sidebar-backdrop'}
        onClick={onClose}
      />

      <div className={isOpen ? 'sidebar-container open' : 'sidebar-container'}>
        
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src={LOGO_URL} alt="CJ Traffic SMART" className="sidebar-logo" />
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">CJ Traffic</span>
              <span className="sidebar-brand-smart">SMART</span>
            </div>
          </div>
          <button onClick={onClose} className="sidebar-close-button">×</button>
        </div>

        <ul className="sidebar-menu">
          {/* Mapeamos los enlaces visibles */}
          {visibleNavItems.map((item) => (
            <li 
              key={item.path} 
              className="sidebar-item" 
              onClick={onClose} // Cierra el menú al hacer clic en el enlace
            >
              <NavLink 
                to={item.path} 
                className={({ isActive }) => 
                  isActive ? 'sidebar-link active' : 'sidebar-link'
                }
              >
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
        
        <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid #eee', textAlign: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>
                Rol: {getDisplayRole(normalizedRole)}
            </span>
        </div>

      </div>
    </>
  );
}

export default Sidebar;