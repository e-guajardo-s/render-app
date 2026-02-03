// frontend/src/components/MainLayout.jsx

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { NotificationProvider } from '../context/NotificationContext.jsx';
import api from '../api.js';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import './MainLayout.css';
import { io } from "socket.io-client";

function MainLayout() {
  const { user, logoutContext } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [semaphores, setSemaphores] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState('');
  const [socket, setSocket] = useState(null);

  // --- Lógica de carga de datos y Socket ---
  useEffect(() => {
    const fetchSemaphores = async () => {
      setMapLoading(true);
      setMapError('');
      if (!user) {
        setMapError("No autenticado.");
        setMapLoading(false);
        return;
      }
      try {
        const response = await api.get('/api/semaphores');
        if (Array.isArray(response.data)) {
          setSemaphores(response.data);
        } else {
          setMapError("Error: Formato de datos inesperado.");
          setSemaphores([]);
        }
      } catch (err) {
        setMapError(err.response?.data?.message || "Error al cargar datos.");
        setSemaphores([]);
      } finally {
        setMapLoading(false);
      }
    };

    fetchSemaphores();

    const socketUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => console.log("Socket.IO Conectado"));
    
    newSocket.on('semaphore:update', (updatedSemaphore) => {
      setSemaphores(current =>
        current.map(sem => sem._id === updatedSemaphore._id ? updatedSemaphore : sem)
      );
    });

    return () => { newSocket.disconnect(); setSocket(null); };
  }, [user]);

  if (!user) return <div>Cargando...</div>;

  return (
    <div className="main-layout-container">
      <NotificationProvider>
          {/* Fila 1: Header */}
          <div className="main-header-area">
            <Header 
              user={user} 
              onLogout={() => { logoutContext(); navigate('/login'); }} 
              onMenuClick={() => setIsSidebarOpen(s => !s)}
              semaphores={semaphores}
              map={mapInstance} 
            />
            <Sidebar 
              isOpen={isSidebarOpen} 
              onClose={() => setIsSidebarOpen(false)} 
              user={user} 
            />
          </div>
          
          {/* Fila 2: Contenido (Donde va el DashboardPage) */}
          <main className="main-content-area">
            <Outlet context={{ 
                semaphores, 
                mapLoading, 
                mapError,
                onMapReady: setMapInstance,
                socket
            }} />
          </main>

          {/* Fila 3: Footer */}
          <footer className="main-footer-area">
            © 2025&nbsp;
            <a href="https://cjtraffic.cl/" target="_blank" rel="noopener noreferrer" style={{ color: '#ff9900', textDecoration: 'none', fontWeight: 'bold' }}>
                CJ Traffic
            </a>
          </footer>
      </NotificationProvider>
    </div>
  );
}

export default MainLayout;