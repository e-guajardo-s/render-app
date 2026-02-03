// En: frontend/src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute() {
  const { token, isLoading } = useAuth(); // Obtenemos el token y el estado de carga

  // 1. Si aún estamos cargando la info del localStorage, mostramos "Cargando..."
  if (isLoading) {
    return <div>Cargando...</div>;
  }

  // 2. Si terminamos de cargar y NO hay token, redirigimos al login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 3. Si hay un token, mostramos el contenido de la ruta (el Dashboard)
  // <Outlet /> es el componente que se va a renderizar (ej. <Dashboard />)
  return <Outlet />;
}

export default ProtectedRoute;