// En: frontend/src/components/AdminRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminRoute() {
  const { user, isLoading, token } = useAuth(); // Obtenemos el usuario completo

  // 1. Si aún estamos cargando la info
  if (isLoading) {
    return <div>Cargando...</div>;
  }

  // 2. Revisamos si está logueado Y si es admin
  // Si hay token y el rol es 'admin', le damos permiso
  if (token && user.role === 'admin') {
    return <Outlet />; // Muestra el contenido (AdminPanelPage)
  }

  // 3. Si no es admin (o no está logueado), lo redirigimos
  // Usamos 'replace' para que no pueda volver atrás con el botón del navegador
  return <Navigate to="/dashboard" replace />; 
}

export default AdminRoute;